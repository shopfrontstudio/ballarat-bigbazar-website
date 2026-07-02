import { cp, mkdir, rm } from 'node:fs/promises';

const files = ['index.html', 'styles.css', 'script.js', 'data.js', 'assets'];

await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
await Promise.all(files.map((file) => cp(file, `dist/${file}`, { recursive: true })));
console.log('Production site built in dist/');
