import { buildProConsoleBridgeScript, STUDIO_PRO_ARTIFACT_LIMITS } from '@sistemazero/core/studio'
import { trustedPackageJson, trustedViteConfig } from '../src/contracts'

// Explicit smoke command, separate from unit tests: requires the locally built image.
const image = process.argv[2] ?? 'sistemazero-studio-runtime:verify'
const script = `
const fs = require('node:fs');
const cp = require('node:child_process');
const root = '/workspace/builds/smoke-' + require('node:crypto').randomUUID();
if (process.getuid() === 0) throw new Error('Build must not run as root');
let protected = false;
try { fs.writeFileSync('/opt/sz-runtime/node_modules/write-probe', 'bad'); }
catch (error) { if (error.code !== 'EACCES') throw error; protected = true; }
if (!protected) throw new Error('Trusted dependencies are writable');
fs.mkdirSync(root + '/public', { recursive: true });
try {
  fs.writeFileSync(root + '/package.json', ${JSON.stringify(trustedPackageJson('vanilla-vite'))});
  fs.writeFileSync(root + '/vite.config.mjs', ${JSON.stringify(trustedViteConfig('vanilla-vite'))});
  fs.writeFileSync(root + '/artifact-options.json', ${JSON.stringify(JSON.stringify({ consoleBridge: buildProConsoleBridgeScript('https://kids.test') }))});
  fs.writeFileSync(root + '/index.html', '<html><head></head><body><script type="module" src="./main.ts"></script></body></html>');
  fs.writeFileSync(root + '/main.ts', 'import "./style.css"; const n: number = 42; console.log(n)');
  fs.writeFileSync(root + '/style.css', 'body { color: green }');
  fs.writeFileSync(root + '/postcss.config.cjs', 'throw new Error("UNTRUSTED_CONFIG")');
  fs.writeFileSync(root + '/public/bytes.bin', Buffer.from([0, 255, 42]));
  fs.symlinkSync('/opt/sz-runtime/node_modules', root + '/node_modules');
  cp.execFileSync('node', ['/opt/sz-runtime/node_modules/vite/bin/vite.js', 'build', '--config', './vite.config.mjs', '--configLoader', 'native'], { cwd: root, stdio: 'pipe' });
  cp.execFileSync('node', ['/opt/sz-runtime/pack-artifact.mjs', '${STUDIO_PRO_ARTIFACT_LIMITS.maxBytes}', '${STUDIO_PRO_ARTIFACT_LIMITS.maxFiles}'], { cwd: root });
  const manifest = JSON.parse(fs.readFileSync(root + '/artifact-manifest.json'));
  if (!manifest.files.some(file => file.path === 'bytes.bin' && file.bytes === 3)) throw new Error('Binary asset lost');
  console.log(JSON.stringify({ ok: true, uid: process.getuid(), files: manifest.files.length, bytes: manifest.files.reduce((n, f) => n + f.bytes, 0), protectedDependencies: protected }));
} finally { fs.rmSync(root, { recursive: true, force: true }); }
`
const child = Bun.spawn(
  ['docker', 'run', '--rm', '--network', 'none', '--entrypoint', 'node', '-i', image],
  {
    stdin: new TextEncoder().encode(script),
    stdout: 'inherit',
    stderr: 'inherit',
  },
)
process.exit(await child.exited)
