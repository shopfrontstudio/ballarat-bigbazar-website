import { CATEGORIES, PRODUCTS, RECIPES } from './data.js';

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
const productById = (id) => PRODUCTS.find((product) => product.id === id);
const categoryById = (id) => CATEGORIES.find((category) => category.id === id);
const money = (value) => `$${value.toFixed(2)}`;
const escapeHtml = (text) => text.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const normalizeSearch = (text) => String(text || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/&/g, ' and ')
  .replace(/[^a-z0-9]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();
const searchTokens = (text) => normalizeSearch(text).split(' ').filter((token) => token.length > 1);

const CATEGORY_ALIASES = {
  masalas: ['masala', 'masalas', 'spice', 'spices', 'powder', 'curry powder', 'seasoning', 'mix'],
  rice: ['rice', 'basmati', 'chawal', 'sona masoori', 'poha', 'grain', 'grains'],
  flour: ['atta', 'aata', 'ata', 'flour', 'chapati flour', 'roti flour', 'wheat flour'],
  dals: ['dal', 'daal', 'dhal', 'lentil', 'lentils', 'pulse', 'pulses', 'toor', 'moong', 'chana', 'masoor', 'urad', 'rajma', 'beans', 'chickpeas'],
  snacks: ['snack', 'snacks', 'sweet', 'sweets', 'namkeen', 'biscuit', 'biscuits', 'bhujia', 'sev', 'rusk'],
  pantry: ['pantry', 'pickle', 'pickles', 'ghee', 'oil', 'papad', 'pappad', 'chutney', 'paste', 'sauce'],
  frozen: ['frozen', 'dairy', 'paneer', 'paratha', 'naan', 'samosa', 'yoghurt', 'yogurt', 'dahi', 'butter'],
  drinks: ['drink', 'drinks', 'tea', 'chai', 'beverage', 'juice', 'syrup', 'lassi'],
  fresh: ['fresh', 'produce', 'vegetable', 'vegetables', 'veg', 'sabzi', 'herb', 'herbs', 'fruit', 'fruits', 'greens'],
};

const PRODUCT_ALIASES = {
  'aashirvaad-10': ['ashirwad atta', 'ashirwad', 'ashirvaad', 'aashirwad', 'atta', 'aata', 'ata', 'chapati flour', 'roti flour'],
  'aashirvaad-multigrain-5': ['ashirwad atta', 'ashirwad', 'ashirvaad', 'aashirwad', 'atta', 'aata', 'ata', 'multigrain flour'],
  'pattu-toor-1': ['dal', 'daal', 'lentil', 'lentils', 'toor daal', 'tuvar dal', 'arhar dal'],
  'pattu-toor-2': ['dal', 'daal', 'lentil', 'lentils', 'toor daal', 'tuvar dal', 'arhar dal'],
  'indya-moong': ['dal', 'daal', 'lentil', 'lentils', 'mung dal', 'moong daal'],
  'pattu-chana-dal': ['dal', 'daal', 'lentil', 'lentils', 'gram dal', 'channa dal'],
  'pattu-urad': ['dal', 'daal', 'lentil', 'lentils', 'urad daal'],
  'indya-masoor': ['dal', 'daal', 'lentil', 'lentils', 'red lentils', 'masoor daal'],
  'indya-rajma': ['rajma', 'kidney beans', 'beans'],
  'indya-kabuli': ['chickpeas', 'chole', 'kabuli chana'],
  okra: ['bhindi', 'lady finger', 'ladyfinger'],
  'coriander-bunch': ['coriander', 'cilantro', 'dhaniya'],
  'curry-leaves': ['curry leaf', 'kadi patta', 'kari patta'],
  'mint-bunch': ['mint', 'pudina'],
  'green-chillies': ['green chilli', 'green chili', 'chilli', 'chili', 'mirchi'],
  ginger: ['adrak'],
  garlic: ['lahsun', 'lasun'],
  'baby-eggplant': ['eggplant', 'brinjal', 'baingan', 'aubergine'],
  'coconut-fresh': ['coconut', 'nariyal'],
  'onions-2kg': ['onion', 'onions', 'pyaaz', 'pyaz'],
  tomatoes: ['tomato', 'tomatoes', 'tamatar'],
  lemons: ['lemon', 'lemons', 'nimbu'],
};

function editDistance(a, b) {
  if (a === b) return 0;
  if (!a || !b) return Math.max(a.length, b.length);
  if (Math.abs(a.length - b.length) > 3) return 4;
  const previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    let prevDiag = previous[0];
    previous[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const tmp = previous[j];
      previous[j] = Math.min(
        previous[j] + 1,
        previous[j - 1] + 1,
        prevDiag + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      prevDiag = tmp;
    }
  }
  return previous[b.length];
}

function tokenMatches(queryToken, candidateTokens) {
  return candidateTokens.some((candidate) => {
    if (candidate === queryToken) return true;
    if (queryToken.length >= 4 && candidate.includes(queryToken)) return true;
    if (candidate.length >= 4 && queryToken.includes(candidate)) return true;
    const limit = queryToken.length <= 4 ? 1 : queryToken.length <= 8 ? 2 : 3;
    return editDistance(queryToken, candidate) <= limit;
  });
}

function productSearchTokens(product) {
  const category = categoryById(product.cat);
  return searchTokens([
    product.brand,
    product.name,
    product.size,
    category?.name,
    category?.blurb,
    ...(CATEGORY_ALIASES[product.cat] || []),
    ...(PRODUCT_ALIASES[product.id] || []),
  ].join(' '));
}

function resetShopSearch() {
  searchTerm = '';
  const input = $('#shop-search');
  if (input) input.value = '';
}

/* ---------- Cart ---------- */
const CART_KEY = 'bbb-cart';
let cart = {};
try { cart = JSON.parse(localStorage.getItem(CART_KEY)) || {}; } catch { cart = {}; }

const cartCount = () => Object.values(cart).reduce((sum, qty) => sum + qty, 0);
const cartTotal = () => Object.entries(cart).reduce((sum, [id, qty]) => sum + (productById(id)?.price || 0) * qty, 0);

function saveCart() {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  renderCartBadge();
  renderCartDrawer();
}

function addToCart(id, qty = 1) {
  cart[id] = (cart[id] || 0) + qty;
  saveCart();
  const product = productById(id);
  showToast(`Added ${product.brand} ${product.name} to your basket`);
  renderProductGrid();
}

function setQty(id, qty) {
  if (qty <= 0) delete cart[id];
  else cart[id] = qty;
  saveCart();
  renderProductGrid();
}

function renderCartBadge() {
  const badge = $('#cart-count');
  const count = cartCount();
  badge.hidden = count === 0;
  badge.textContent = count;
}

function renderCartDrawer() {
  const wrap = $('#cart-items');
  const entries = Object.entries(cart);
  $('#cart-total').textContent = money(cartTotal());
  $('#checkout-open').disabled = entries.length === 0;
  if (!entries.length) {
    wrap.innerHTML = `<div class="cart-empty"><span>🧺</span><p>Your basket is empty.</p><p class="cart-empty-hint">Browse the <a href="#/shop" data-close-drawer>shelves</a> or start with a <a href="#/recipes" data-close-drawer>recipe</a>.</p></div>`;
    return;
  }
  wrap.innerHTML = entries.map(([id, qty]) => {
    const product = productById(id);
    if (!product) return '';
    return `<div class="cart-row" data-id="${id}">
      <div class="cart-row-info"><strong>${escapeHtml(product.brand)} ${escapeHtml(product.name)}</strong><small>${escapeHtml(product.size)} · ${money(product.price)} each</small></div>
      <div class="qty-stepper"><button data-step="-1" aria-label="Reduce quantity">−</button><span>${qty}</span><button data-step="1" aria-label="Increase quantity">+</button></div>
      <strong class="cart-row-price">${money(product.price * qty)}</strong>
    </div>`;
  }).join('');
}

function openCart() {
  $('#cart-drawer').classList.add('open');
  $('#cart-drawer').setAttribute('aria-hidden', 'false');
  $('#drawer-overlay').hidden = false;
  document.body.classList.add('drawer-open');
}

function closeCart() {
  $('#cart-drawer').classList.remove('open');
  $('#cart-drawer').setAttribute('aria-hidden', 'true');
  $('#drawer-overlay').hidden = true;
  document.body.classList.remove('drawer-open');
}

/* ---------- Toast ---------- */
let toastTimer;
function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
}

/* ---------- Shop ---------- */
let activeCategory = 'all';
let searchTerm = '';

function renderChips() {
  const row = $('#chip-row');
  const chips = [{ id: 'all', name: 'Everything', emoji: '🛒' }, ...CATEGORIES];
  row.innerHTML = chips.map((chip) => `<button class="chip${chip.id === activeCategory ? ' active' : ''}" data-cat="${chip.id}" role="tab" aria-selected="${chip.id === activeCategory}">${chip.emoji} ${escapeHtml(chip.name)}</button>`).join('');
}

function filteredProducts() {
  const queryTokens = searchTokens(searchTerm);
  return PRODUCTS.filter((product) => {
    if (activeCategory !== 'all' && product.cat !== activeCategory) return false;
    if (!queryTokens.length) return true;
    const candidateTokens = productSearchTokens(product);
    return queryTokens.every((token) => tokenMatches(token, candidateTokens));
  });
}

function productTile(product, category) {
  return `<div class="product-tile product-tile-${product.cat}" style="background:${category.hue}">
    <span class="tile-emoji">${category.emoji}</span>
    <img src="assets/products/${product.id}.jpg" alt="${escapeHtml(product.brand)} ${escapeHtml(product.name)}" loading="lazy" onerror="this.remove()" />
  </div>`;
}

function productCard(product) {
  const category = categoryById(product.cat);
  const qty = cart[product.id] || 0;
  const action = qty
    ? `<div class="qty-stepper card-stepper"><button data-step="-1" aria-label="Reduce quantity">−</button><span>${qty}</span><button data-step="1" aria-label="Increase quantity">+</button></div>`
    : `<button class="add-button" data-add="${product.id}">Add <span>+</span></button>`;
  return `<article class="product-card" data-id="${product.id}">
    ${productTile(product, category)}
    <div class="product-info">
      <small class="product-brand">${escapeHtml(product.brand)}</small>
      <h3>${escapeHtml(product.name)}</h3>
      <p class="product-meta">${escapeHtml(product.size)}</p>
      <div class="product-buy"><strong>${money(product.price)}</strong>${action}</div>
    </div>
  </article>`;
}

function renderProductGrid() {
  const grid = $('#product-grid');
  if (!grid) return;
  const products = filteredProducts();
  const label = activeCategory === 'all' ? 'products' : categoryById(activeCategory).name.toLowerCase();
  $('#shop-count').textContent = `${products.length} ${products.length === 1 ? 'item' : 'items'} · ${label}`;
  grid.innerHTML = products.length
    ? products.map(productCard).join('')
    : `<p class="no-results">Nothing matched that search. Try simple words like “atta”, “ashirwad”, “dal”, “daal”, “lentil”, “bhindi” or “chilli”. Or <a href="mailto:ballaratbigbazar@gmail.com">email us</a>, we probably have it in store.</p>`;
}

function applyShopSearchFromHero(value) {
  searchTerm = value || '';
  activeCategory = 'all';
  const input = $('#shop-search');
  if (input) input.value = searchTerm;
  renderChips();
  renderProductGrid();
}

/* ---------- Recipes ---------- */
function recipeCard(recipe) {
  return `<a class="recipe-card" href="#/recipe/${recipe.id}">
    <div class="recipe-tile"><span>${recipe.emoji}</span><img src="assets/recipes/${recipe.id}.jpg" alt="${escapeHtml(recipe.name)}" loading="lazy" onerror="this.remove()" /></div>
    <div class="recipe-card-info">
      <h3>${escapeHtml(recipe.name)}</h3>
      <p>${escapeHtml(recipe.tagline)}</p>
      <div class="recipe-meta"><span>◷ ${escapeHtml(recipe.time)}</span><span>Serves ${recipe.serves}</span><span>${escapeHtml(recipe.difficulty)}</span></div>
    </div>
    <span class="recipe-go">Cook it →</span>
  </a>`;
}

function renderRecipeGrid() {
  $('#recipe-grid').innerHTML = RECIPES.map(recipeCard).join('');
}

function ingredientRow(ingredient, index) {
  const shoppable = Array.isArray(ingredient.products) && ingredient.products.length;
  const inCart = shoppable && ingredient.products.some((id) => cart[id]);
  return `<li class="ingredient${shoppable ? ' shoppable' : ''}" data-index="${index}">
    <label class="ingredient-check"><input type="checkbox" ${inCart ? 'checked' : ''}/><span>${escapeHtml(ingredient.label)}</span></label>
    ${shoppable
      ? `<button class="ingredient-shop" data-ingredient="${index}">${inCart ? 'In basket ✓' : 'Get it here +'}</button>`
      : '<small class="ingredient-pantry">from your pantry</small>'}
  </li>`;
}

let currentRecipe = null;

function renderRecipeDetail(recipeId) {
  const recipe = RECIPES.find((entry) => entry.id === recipeId);
  const wrap = $('#recipe-detail');
  currentRecipe = recipe || null;
  if (!recipe) {
    wrap.innerHTML = `<p class="no-results">We couldn't find that recipe. <a href="#/recipes">Back to all recipes</a>.</p>`;
    return;
  }
  const shoppableCount = recipe.ingredients.filter((ing) => ing.products?.length).length;
  wrap.innerHTML = `
    <a class="text-link recipe-back" href="#/recipes">← All recipes</a>
    <div class="recipe-hero">
      <div class="recipe-hero-tile"><span>${recipe.emoji}</span><img src="assets/recipes/${recipe.id}.jpg" alt="${escapeHtml(recipe.name)}" onerror="this.remove()" /></div>
      <div>
        <p class="eyebrow"><span></span> ${escapeHtml(recipe.tagline)}</p>
        <h2>${escapeHtml(recipe.name)}</h2>
        <p class="recipe-intro">${escapeHtml(recipe.intro)}</p>
        <div class="recipe-meta recipe-meta-large"><span>◷ ${escapeHtml(recipe.time)}</span><span>Serves ${recipe.serves}</span><span>${escapeHtml(recipe.difficulty)}</span></div>
      </div>
    </div>
    <div class="recipe-columns">
      <div class="recipe-ingredients">
        <h3>Ingredients</h3>
        <p class="recipe-hint">Tap <em>“Get it here”</em> on the ${shoppableCount} ingredients we stock to choose a brand and add it to your basket.</p>
        <ul class="ingredient-list">${recipe.ingredients.map(ingredientRow).join('')}</ul>
        <button class="button button-gold recipe-add-all" id="recipe-review-basket">Review basket (${cartCount()}) 🧺</button>
      </div>
      <div class="recipe-steps">
        <h3>Method</h3>
        <ol>${recipe.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join('')}</ol>
      </div>
    </div>`;
}

/* ---------- Brand picker ---------- */
let activeIngredient = null;

function openBrandModal(ingredient) {
  const body = $('#brand-modal-body');
  const options = ingredient.products.map(productById).filter(Boolean);
  body.innerHTML = `
    <p class="eyebrow"><span></span> On our shelves</p>
    <h3 id="brand-modal-title">${escapeHtml(ingredient.label)}</h3>
    <p class="modal-lead">Pick the brand you'd like—our team will pop it in your click &amp; collect basket.</p>
    <div class="brand-options">${options.map((product) => {
      const qty = cart[product.id] || 0;
      const category = categoryById(product.cat);
      return `<div class="brand-option" data-id="${product.id}">
        ${productTile(product, category)}
        <div class="brand-option-info"><strong>${escapeHtml(product.brand)} ${escapeHtml(product.name)}</strong><small>${escapeHtml(product.size)} · ${money(product.price)}</small></div>
        ${qty
          ? `<div class="qty-stepper"><button data-step="-1" aria-label="Reduce quantity">−</button><span>${qty}</span><button data-step="1" aria-label="Increase quantity">+</button></div>`
          : `<button class="add-button" data-add="${product.id}">Add +</button>`}
      </div>`;
    }).join('')}</div>`;
  $('#brand-modal').hidden = false;
  document.body.classList.add('drawer-open');
}

/* ---------- Checkout ---------- */
function orderSummaryText() {
  const lines = Object.entries(cart).map(([id, qty]) => {
    const product = productById(id);
    return `${qty} × ${product.brand} ${product.name} (${product.size}) — ${money(product.price * qty)}`;
  });
  lines.push('', `Estimated total: ${money(cartTotal())} (pay in store)`);
  return lines.join('\n');
}

function openCheckout() {
  if (!cartCount()) return;
  $('#checkout-form-wrap').hidden = false;
  $('#checkout-success').hidden = true;
  $('#checkout-modal').hidden = false;
  document.body.classList.add('drawer-open');
  closeCart();
  $('#drawer-overlay').hidden = false;
}

function closeModals() {
  $$('.modal').forEach((modal) => { modal.hidden = true; });
  if (!$('#cart-drawer').classList.contains('open')) {
    $('#drawer-overlay').hidden = true;
    document.body.classList.remove('drawer-open');
  }
}

async function submitOrder(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  const order = orderSummaryText();
  const fields = { 'form-name': 'click-collect', ...data, order };
  const submitButton = $('#checkout-submit');
  submitButton.disabled = true;
  submitButton.textContent = 'Sending…';
  try {
    await fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(fields).toString(),
    });
  } catch {
    /* offline or non-Netlify host — the email copy link below still works */
  }
  submitButton.disabled = false;
  submitButton.textContent = 'Send order';

  const subject = encodeURIComponent(`Click & collect order — ${data.name}`);
  const bodyText = encodeURIComponent(`${order}\n\nName: ${data.name}\nPhone: ${data.phone}\nEmail: ${data.email || '—'}\nPickup: ${data.pickup}\nNotes: ${data.notes || '—'}`);
  $('#success-mailto').href = `mailto:ballaratbigbazar@gmail.com?subject=${subject}&body=${bodyText}`;
  $('#success-summary').innerHTML = `<pre>${escapeHtml(order)}</pre><p><strong>Pickup:</strong> ${escapeHtml(data.pickup)} · <strong>Name:</strong> ${escapeHtml(data.name)}</p>`;
  $('#checkout-form-wrap').hidden = true;
  $('#checkout-success').hidden = false;
  cart = {};
  saveCart();
  renderProductGrid();
  form.reset();
}

/* ---------- Router ---------- */
const views = { home: '#view-home', shop: '#view-shop', recipes: '#view-recipes', recipe: '#view-recipe' };

function showView(name) {
  document.body.dataset.view = name;
  Object.entries(views).forEach(([key, selector]) => { $(selector).hidden = key !== name; });
  $$('.desktop-nav a, .mobile-nav a').forEach((link) => {
    const href = link.getAttribute('href');
    const isActive = (name === 'home' && href === '#/') || href === `#/${name}` || (name === 'recipe' && href === '#/recipes');
    link.classList.toggle('active', isActive);
  });
}

function route() {
  const hash = location.hash || '#/';
  if (!hash.startsWith('#/')) {
    showView('home');
    requestAnimationFrame(() => {
      $$('.reveal').forEach(observeReveal);
      document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' });
    });
    return;
  }
  const [section, param] = hash.slice(2).split('/');
  if (section === 'shop') {
    const previousCategory = activeCategory;
    activeCategory = param && categoryById(param) ? param : activeCategory;
    if (!categoryById(activeCategory) && activeCategory !== 'all') activeCategory = 'all';
    if (!param) {
      activeCategory = 'all';
      resetShopSearch();
    } else if (param !== previousCategory) {
      resetShopSearch();
    }
    showView('shop');
    renderChips();
    renderProductGrid();
  } else if (section === 'recipes') {
    showView('recipes');
    renderRecipeGrid();
  } else if (section === 'recipe' && param) {
    showView('recipe');
    renderRecipeDetail(param);
  } else {
    showView('home');
  }
  window.scrollTo({ top: 0 });
  $$('.reveal').forEach(observeReveal);
}

/* ---------- Reveal animation ---------- */
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -30px' });

function observeReveal(element) {
  if (!element.classList.contains('visible')) observer.observe(element);
}

/* ---------- Events ---------- */
document.addEventListener('click', (event) => {
  const add = event.target.closest('[data-add]');
  if (add) {
    addToCart(add.dataset.add);
    if (activeIngredient) openBrandModal(activeIngredient);
    if (currentRecipe && !$('#view-recipe').hidden) renderRecipeDetail(currentRecipe.id);
    return;
  }

  const step = event.target.closest('[data-step]');
  if (step) {
    const row = step.closest('[data-id]');
    if (row) {
      const id = row.dataset.id;
      setQty(id, (cart[id] || 0) + Number(step.dataset.step));
      if (activeIngredient) openBrandModal(activeIngredient);
      if (currentRecipe && !$('#view-recipe').hidden) renderRecipeDetail(currentRecipe.id);
    }
    return;
  }

  const shopIngredient = event.target.closest('[data-ingredient]');
  if (shopIngredient && currentRecipe) {
    activeIngredient = currentRecipe.ingredients[Number(shopIngredient.dataset.ingredient)];
    openBrandModal(activeIngredient);
    return;
  }

  if (event.target.closest('[data-close-drawer]')) closeCart();
  if (event.target.closest('#cart-open')) openCart();
  if (event.target.closest('#cart-close') || event.target === $('#drawer-overlay')) { closeCart(); closeModals(); }
  if (event.target.closest('#checkout-open')) openCheckout();
  if (event.target.closest('#recipe-review-basket')) openCart();
  if (event.target.closest('[data-close-modal]') || event.target.classList.contains('modal')) {
    activeIngredient = null;
    closeModals();
  }

  const chip = event.target.closest('.chip');
  if (chip) {
    activeCategory = chip.dataset.cat;
    resetShopSearch();
    renderChips();
    renderProductGrid();
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    activeIngredient = null;
    closeModals();
    closeCart();
  }
});

$('.hero-search')?.addEventListener('submit', (event) => {
  event.preventDefault();
  const value = event.currentTarget.querySelector('input')?.value.trim() || '';
  if (location.hash !== '#/shop') location.hash = '#/shop';
  requestAnimationFrame(() => applyShopSearchFromHero(value));
});

$('#shop-search').addEventListener('input', (event) => {
  searchTerm = event.target.value;
  renderProductGrid();
});

$('#checkout-form').addEventListener('submit', (event) => {
  event.preventDefault();
  submitOrder(event.target);
});

/* ---------- Mobile menu ---------- */
const menuButton = $('.menu-toggle');
const mobileNav = $('.mobile-nav');

menuButton?.addEventListener('click', () => {
  const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!isOpen));
  menuButton.setAttribute('aria-label', isOpen ? 'Open menu' : 'Close menu');
  mobileNav.classList.toggle('open', !isOpen);
  document.body.classList.toggle('menu-open', !isOpen);
});

mobileNav?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', 'Open menu');
  mobileNav.classList.remove('open');
  document.body.classList.remove('menu-open');
}));

/* ---------- Init ---------- */
window.addEventListener('hashchange', route);
document.getElementById('year').textContent = new Date().getFullYear();
renderCartBadge();
renderCartDrawer();
route();
