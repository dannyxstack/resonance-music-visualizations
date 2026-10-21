import { build, createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { copyFile } from 'node:fs/promises';
const root = fileURLToPath(new URL('../', import.meta.url));
process.chdir(root);
// These static visualizer pages are served without Vite's module transform.
// Ship the pinned browser bundle so exports also work in the Docker/Nginx build.
await copyFile('src/membership.js', 'public/visualizers/shared/membership.js');
await copyFile('node_modules/mediabunny/dist/bundles/mediabunny.min.mjs', 'public/visualizers/shared/vendor/mediabunny.min.js');
await copyFile('node_modules/mediabunny/LICENSE', 'public/visualizers/shared/vendor/MEDIABUNNY-LICENSE');
const checked = spawnSync(process.execPath, ['node_modules/typescript/bin/tsc', '-p', 'scenes/bay-area/tsconfig.app.json'], { stdio: 'inherit' });
if (checked.status !== 0) process.exit(checked.status || 1);
await build({ configFile: false, root: 'scenes/bay-area', base: './', plugins: [react()], build: { outDir: '../../public/visualizers/bay-area', emptyOutDir: true } });
if (process.argv[2] === 'dev') {
  const server = await createServer({ root, base: './', server: { host: '127.0.0.1', port: 5188, strictPort: true, proxy: { '/api': 'http://127.0.0.1:8032' } } });
  await server.listen();
  server.printUrls();
} else {
  await build({ root, base: './' });
}
