// پوشهٔ dist را برای انتشار روی GitHub Pages می‌سازد.
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist');
for (const p of ['index.html', 'css', 'js', 'config', 'shared', 'data']) {
  if (existsSync(p)) cpSync(p, `dist/${p}`, { recursive: true });
  else console.warn('missing:', p);
}
writeFileSync('dist/.nojekyll', '');
console.log('dist ready');
