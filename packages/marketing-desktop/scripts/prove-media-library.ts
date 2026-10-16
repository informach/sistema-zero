import { mkdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import type { BunPlugin } from 'bun'

// Isolated renderer proof: real shared UI, controlled transport, no credentials/network/inference.
const baseline = process.argv.includes('--baseline')
const require = createRequire(import.meta.url)
const directory = path.resolve(
  '.cache',
  baseline ? 'media-library-baseline' : 'media-library-review',
)
await mkdir(directory, { recursive: true })
const plugins: BunPlugin[] = [
  {
    name: 'one-react-runtime',
    setup(build) {
      build.onResolve({ filter: /^react(?:\/jsx-runtime|\/jsx-dev-runtime)?$/ }, (args) => ({
        path: require.resolve(args.path),
      }))
    },
  },
]
if (baseline) {
  const original = Bun.spawn(
    ['git', 'show', 'd8271493d:packages/marketing-workbench/src/media-library.tsx'],
    { stdout: 'pipe' },
  )
  const previous = await new Response(original.stdout).text()
  if ((await original.exited) !== 0) throw new Error('Baseline unavailable')
  plugins.push({
    name: 'review-baseline',
    setup(build) {
      build.onLoad({ filter: /[\\/]media-library\.tsx$/ }, () => ({
        contents: previous,
        loader: 'tsx',
      }))
    },
  })
}
const result = await Bun.build({
  entrypoints: ['../marketing-workbench/tests/media-library.browser.tsx'],
  outdir: directory,
  naming: 'renderer.js',
  target: 'browser',
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  plugins,
})
if (!result.success) throw new AggregateError(result.logs, 'UI proof build failed')
await writeFile(
  path.join(directory, 'index.html'),
  '<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src \'self\'; style-src \'self\' \'unsafe-inline\'"><title>Media library review</title><div id="root"></div><script src="renderer.js"></script>',
)
await writeFile(
  path.join(directory, 'main.cjs'),
  `
const { app, BrowserWindow } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
app.setPath('userData', path.join(__dirname, 'profile'));
app.whenReady().then(async () => {
  const window = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true } });
  window.webContents.on('console-message', event => console.log(event.message));
  try {
    await window.loadFile(path.join(__dirname, 'index.html'));
    const deadline = Date.now() + 60000;
    while (Date.now() < deadline) {
      const result = await window.webContents.executeJavaScript('window.mediaLibraryProof');
      if (result) {
        await fs.writeFile(path.join(__dirname, 'evidence.json'), JSON.stringify(result, null, 2));
        if (result.ok) await fs.writeFile(path.join(__dirname, 'result.png'), (await window.webContents.capturePage()).toPNG());
        console.log(JSON.stringify(result)); app.exit(result.ok ? 0 : 1); return;
      }
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    throw new Error('Renderer proof timed out');
  } catch (error) { console.error(error); app.exit(1); }
});
`,
)
const binary: unknown = require('electron')
if (typeof binary !== 'string') throw new Error('Electron runtime missing')
process.exit(
  await Bun.spawn([binary, path.join(directory, 'main.cjs')], {
    stdout: 'inherit',
    stderr: 'inherit',
  }).exited,
)
