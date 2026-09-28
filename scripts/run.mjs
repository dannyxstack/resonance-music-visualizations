import { build, createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const root = fileURLToPath(new URL('../', import.meta.url));
process.chdir(root);
const checked = spawnSync(process.execPath, ['node_modules/typescript/bin/tsc', '-p', 'scenes/bay-area/tsconfig.app.json'], { stdio: 'inherit' });
if (checked.status !== 0) process.exit(checked.status || 1);
await build({ configFile: false, root: 'scenes/bay-area', base: './', plugins: [react()], build: { outDir: '../../public/visualizers/bay-area', emptyOutDir: true } });
if (process.argv[2] === 'dev') {
  const server = await createServer({ root, base: './', server: { host: '127.0.0.1', port: 5188, strictPort: true } });
  await server.listen();
  server.printUrls();
} else {
  await build({ root, base: './' });
}
