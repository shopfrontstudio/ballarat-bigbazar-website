#!/usr/bin/env python3
"""
Fetch exact, reusable product pack images for the Ballarat Bigbazar sample site.

Primary source:
  Open Food Facts product photos. OFF content is open data; product/photos are
  commonly distributed under Creative Commons BY-SA terms and must be attributed.

This script is intentionally conservative:
  - it only searches products already listed in data.js
  - it skips fresh produce and items that already have a local image unless --force is used
  - it saves a photo only when brand + product wording score as a likely exact match
  - it writes a source/audit file so every downloaded image is traceable

Run from the project root:
  python3 scripts/fetch_open_product_images.py
"""

from __future__ import annotations

import argparse
import io
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
DATA_JS = ROOT / "data.js"
PRODUCT_DIR = ROOT / "assets" / "products"
SOURCE_JSON = PRODUCT_DIR / "open-image-sources.json"
SOURCE_MD = ROOT / "IMAGE_SOURCES.md"

OFF_SEARCH_URL = "https://world.openfoodfacts.org/cgi/search.pl"
USER_AGENT = "BallaratBigbazarSample/1.0 (+https://github.com/shopfrontstudio/ballarat-bigbazar)"

STOP_WORDS = {
    "and",
    "the",
    "mix",
    "pc",
    "pcs",
    "pack",
    "family",
    "fine",
    "coarse",
    "plain",
    "whole",
    "pure",
    "fresh",
    "frozen",
    "soft",
    "drink",
}

BRAND_ALIASES = {
    "aashirvaad": ["aashirvaad", "ashirvaad", "ashirwad", "aashirwad"],
    "brooke bond": ["brooke bond", "red label"],
    "wagh bakri": ["wagh bakri"],
    "thums up": ["thums up", "thumsup"],
}

SEARCH_ALIASES = {
    "shan-butter": ["Shan Butter Chicken Masala 50g"],
    "shan-korma": ["Shan Chicken White Korma Mix 40g", "Shan White Korma 40g"],
    "mdh-bombay-biryani": ["MDH Bombay Biryani Masala 100g"],
    "mdh-kitchen-king": ["MDH Kitchen King Masala 100g"],
    "mdh-chana": ["MDH Chana Masala 100g"],
    "everest-chicken": ["Everest Chicken Masala 100g"],
    "daawat-trad-5": ["Daawat Traditional Basmati Rice 5kg"],
    "daawat-select-5": ["Daawat Select Basmati Rice 5kg"],
    "daawat-everyday-5": ["Daawat Everyday Basmati Rice 5kg"],
    "fortune-basmati-5": ["Fortune Classic Basmati Rice 5kg"],
    "wagh-bakri-1kg": ["Wagh Bakri Premium Tea 1kg"],
    "red-label-900": ["Brooke Bond Red Label Tea 900g"],
    "thums-up": ["Thums Up 300ml"],
    "frooti-2l": ["Frooti Mango Drink 2L", "Frooti 2L"],
    "appy-fizz": ["Appy Fizz 600ml"],
}


@dataclass
class Product:
    id: str
    cat: str
    brand: str
    name: str
    size: str


def normalize(text: str) -> str:
    text = text.lower().replace("&", " and ")
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def tokens(text: str) -> set[str]:
    out = set()
    for token in normalize(text).split():
        if len(token) < 3:
            continue
        if token in STOP_WORDS:
            continue
        out.add(token)
    return out


def parse_products() -> list[Product]:
    source = DATA_JS.read_text(encoding="utf-8")
    pattern = re.compile(
        r"\{\s*id:\s*'(?P<id>[^']+)'\s*,\s*cat:\s*'(?P<cat>[^']+)'\s*,\s*brand:\s*'(?P<brand>[^']+)'\s*,\s*name:\s*'(?P<name>[^']+)'\s*,\s*size:\s*'(?P<size>[^']+)'",
        re.S,
    )
    return [Product(**match.groupdict()) for match in pattern.finditer(source)]


def existing_source_data() -> dict[str, Any]:
    if SOURCE_JSON.exists():
        return json.loads(SOURCE_JSON.read_text(encoding="utf-8"))
    return {"license_note": "Product photos from Open Food Facts; reuse requires source attribution and licence compliance.", "products": {}}


def query_terms(product: Product) -> list[str]:
    base = [
        f"{product.brand} {product.name} {product.size}",
        f"{product.brand} {product.name}",
    ]
    return [*SEARCH_ALIASES.get(product.id, []), *base]


def off_search(term: str, page_size: int) -> list[dict[str, Any]]:
    params = {
        "search_terms": term,
        "search_simple": "1",
        "action": "process",
        "json": "1",
        "page_size": str(page_size),
        "fields": "code,product_name,brands,quantity,image_front_url,image_url,image_small_url,url",
    }
    url = f"{OFF_SEARCH_URL}?{urllib.parse.urlencode(params)}"
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=35) as response:
        data = json.loads(response.read().decode("utf-8"))
    return data.get("products", []) or []


def brand_matches(product: Product, candidate: dict[str, Any]) -> bool:
    brand = normalize(product.brand)
    haystack = normalize(f"{candidate.get('brands', '')} {candidate.get('product_name', '')}")
    aliases = BRAND_ALIASES.get(brand, [brand])
    if brand in {"dt", "ck", "kt"}:
        return brand in haystack.split()
    if brand in {"pantry"}:
        return True
    return any(alias in haystack for alias in aliases)


def candidate_score(product: Product, candidate: dict[str, Any]) -> int:
    image_url = candidate.get("image_front_url") or candidate.get("image_url")
    if not image_url:
        return -100
    if not brand_matches(product, candidate):
        return -50

    target_tokens = tokens(product.name)
    candidate_text = f"{candidate.get('brands', '')} {candidate.get('product_name', '')} {candidate.get('quantity', '')}"
    candidate_tokens = tokens(candidate_text)
    overlap = target_tokens & candidate_tokens

    score = 40 + (len(overlap) * 15)
    if normalize(product.name) in normalize(candidate_text):
        score += 30
    size_bits = tokens(product.size.replace("kg", " kg").replace("ml", " ml"))
    if size_bits and size_bits & candidate_tokens:
        score += 8
    if not overlap:
        score -= 40
    if len(target_tokens) >= 2 and len(overlap) < 2:
        score -= 15
    return score


def choose_match(product: Product, page_size: int) -> tuple[dict[str, Any] | None, str, int]:
    best: tuple[dict[str, Any] | None, str, int] = (None, "", -100)
    seen_codes = set()
    for term in query_terms(product):
        try:
            candidates = off_search(term, page_size)
        except Exception as exc:
            print(f"  search failed for {product.id} / {term}: {exc}", file=sys.stderr)
            continue
        time.sleep(0.4)
        for candidate in candidates:
            code = candidate.get("code")
            if code and code in seen_codes:
                continue
            seen_codes.add(code)
            score = candidate_score(product, candidate)
            if score > best[2]:
                best = (candidate, term, score)
    if best[2] >= 70:
        return best
    return (None, best[1], best[2])


def download_image(url: str) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=45) as response:
        return response.read()


def save_catalogue_jpg(raw: bytes, out_path: Path) -> None:
    image = Image.open(io.BytesIO(raw))
    image = ImageOps.exif_transpose(image).convert("RGBA")

    # White square canvas gives pack shots a clean, catalogue-style look while
    # preserving the exact photographed product.
    canvas_size = 900
    image.thumbnail((760, 760), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (canvas_size, canvas_size), (255, 255, 255, 255))
    x = (canvas_size - image.width) // 2
    y = (canvas_size - image.height) // 2
    canvas.alpha_composite(image, (x, y))
    canvas.convert("RGB").save(out_path, "JPEG", quality=88, optimize=True, progressive=True)


def write_markdown_report(source_data: dict[str, Any], missing: list[Product], skipped: list[Product]) -> None:
    rows = []
    for product_id, item in sorted(source_data.get("products", {}).items()):
        rows.append(
            f"| `{product_id}` | {item.get('brand', '')} {item.get('name', '')} | "
            f"[Open Food Facts]({item.get('source_url', '')}) | {item.get('license', '')} |"
        )
    missing_rows = [f"- `{p.id}` — {p.brand} {p.name} ({p.size})" for p in missing]
    skipped_rows = [f"- `{p.id}` — image already existed" for p in skipped]

    content = "\n".join(
        [
            "# Product image sources",
            "",
            "This file records reusable product images used by the Ballarat Bigbazar sample catalogue.",
            "",
            "Downloaded product pack photos are sourced from Open Food Facts. Open Food Facts publishes its data and uploaded product photos under open licences; reuse requires attribution and licence compliance. Do not replace missing products with random marketplace, Google, Blinkit, Zepto, Coles or Woolworths images unless the licence is explicitly reusable.",
            "",
            "## Downloaded open-licensed product photos",
            "",
            "| Product ID | Product | Source | Licence note |",
            "| --- | --- | --- | --- |",
            *(rows or ["| — | No fetched open product photos yet | — | — |"]),
            "",
            "## Products still needing an exact reusable image",
            "",
            *(missing_rows or ["- None found in this run."]),
            "",
            "## Existing local images skipped",
            "",
            *(skipped_rows[:120] or ["- None."]),
            "",
        ]
    )
    SOURCE_MD.write_text(content, encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--force", action="store_true", help="replace existing product images too")
    parser.add_argument("--include-fresh", action="store_true", help="also search fresh produce items")
    parser.add_argument("--page-size", type=int, default=8, help="Open Food Facts candidates per query")
    parser.add_argument("--dry-run", action="store_true", help="search and report without downloading")
    args = parser.parse_args()

    products = parse_products()
    PRODUCT_DIR.mkdir(parents=True, exist_ok=True)
    source_data = existing_source_data()
    source_data.setdefault("products", {})

    downloaded: list[Product] = []
    missing: list[Product] = []
    skipped: list[Product] = []

    for product in products:
        out_path = PRODUCT_DIR / f"{product.id}.jpg"
        if product.cat == "fresh" and not args.include_fresh:
            skipped.append(product)
            continue
        if out_path.exists() and not args.force:
            skipped.append(product)
            continue

        print(f"Searching {product.id}: {product.brand} {product.name} {product.size}")
        candidate, term, score = choose_match(product, args.page_size)
        if not candidate:
            print(f"  no confident open match (best score {score})")
            missing.append(product)
            continue

        image_url = candidate.get("image_front_url") or candidate.get("image_url")
        source_url = f"https://world.openfoodfacts.org/product/{candidate.get('code')}" if candidate.get("code") else ""
        print(f"  matched {candidate.get('brands')} — {candidate.get('product_name')} ({score})")
        print(f"  source {source_url or image_url}")

        if not args.dry_run:
            raw = download_image(image_url)
            save_catalogue_jpg(raw, out_path)
            time.sleep(0.3)

        source_data["products"][product.id] = {
            "brand": product.brand,
            "name": product.name,
            "size": product.size,
            "source": "Open Food Facts",
            "source_url": source_url,
            "image_url": image_url,
            "matched_product_name": candidate.get("product_name"),
            "matched_brands": candidate.get("brands"),
            "matched_quantity": candidate.get("quantity"),
            "matched_code": candidate.get("code"),
            "search_term": term,
            "match_score": score,
            "license": "Open Food Facts open data/photos; attribution required, commonly CC BY-SA/ODbL depending on data/media.",
        }
        downloaded.append(product)

    SOURCE_JSON.write_text(json.dumps(source_data, indent=2, ensure_ascii=False), encoding="utf-8")
    write_markdown_report(source_data, missing, skipped)

    print()
    print(f"Downloaded: {len(downloaded)}")
    print(f"Missing exact open image: {len(missing)}")
    print(f"Skipped: {len(skipped)}")
    print(f"Wrote: {SOURCE_MD.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
