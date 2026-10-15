import { buildProRuntimeBridgeScript, STUDIO_PRO_ARTIFACT_LIMITS } from '@sistemazero/core/studio'
import { parseBuildRequest, trustedPackageJson, trustedViteConfig } from '../src/contracts'
import { materializeTestTemplate } from './template-files'

// Explicit integration check: the actual image, no network, same non-root runtime and budgets.
const ids = [
  'canvas-puzzle',
  'canvas-survival',
  'three-exploration',
  'canvas-grid-arena',
  'phaser-tactics',
  'three-tactics',
] as const
for (const id of ids) {
  const { files, binaries } = await materializeTestTemplate(id)
  const input = parseBuildRequest({
    executionId: 'verify-1234567890abcdef',
    parentOrigin: 'https://kids.test',
    templateId: id,
    files,
    binaries,
    validate: true,
  })
  const script = `
const fs = require('node:fs');
const cp = require('node:child_process');
const path = require('node:path');
const root = '/workspace/builds/validation-' + require('node:crypto').randomUUID();
if (process.getuid() === 0) throw new Error('Validation must not run as root');
fs.mkdirSync(root, { recursive: true });
try {
  for (const [name, content] of Object.entries(${JSON.stringify(input.files)})) {
    fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
    fs.writeFileSync(path.join(root, name), content);
  }
  for (const [name, entry] of Object.entries(${JSON.stringify(binaries)})) {
    fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
    fs.writeFileSync(path.join(root, name), Buffer.from(entry.base64, 'base64'));
  }
  fs.writeFileSync(root + '/package.json', ${JSON.stringify(trustedPackageJson(id, input.dependencies))});
  fs.writeFileSync(root + '/vite.config.mjs', ${JSON.stringify(trustedViteConfig(id, input.dependencies))});
  fs.writeFileSync(root + '/artifact-options.json', ${JSON.stringify(JSON.stringify({ consoleBridge: buildProRuntimeBridgeScript('https://kids.test') }))});
  fs.writeFileSync(root + '/validation-options.json', ${JSON.stringify(JSON.stringify({ templateId: id }))});
  fs.symlinkSync('/opt/sz-runtime/node_modules', root + '/node_modules');
  const run = (args) => cp.execFileSync('node', args, { cwd: root, stdio: 'inherit', timeout: 120000 });
  const start = Date.now();
  run(['/opt/sz-runtime/check-project.mjs']);
  run(['/opt/sz-runtime/node_modules/vite/bin/vite.js', 'build', '--config', './vite.config.mjs', '--configLoader', 'native']);
  run(['/opt/sz-runtime/pack-artifact.mjs', '${STUDIO_PRO_ARTIFACT_LIMITS.maxBytes}', '${STUDIO_PRO_ARTIFACT_LIMITS.maxFiles}']);
  run(['/opt/sz-runtime/playtest.mjs']);
  const report = JSON.parse(fs.readFileSync(root + '/playtest-result.json'));
  const manifest = JSON.parse(fs.readFileSync(root + '/artifact-manifest.json'));
  const capture = fs.readFileSync(root + '/dist/' + report.screenshot);
  if (!capture.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) throw new Error('Capture is not PNG');
  const bytes = manifest.files.reduce((n, f) => n + f.bytes, capture.length);
  if (bytes > ${STUDIO_PRO_ARTIFACT_LIMITS.maxBytes} || manifest.files.length + 1 > ${STUDIO_PRO_ARTIFACT_LIMITS.maxFiles}) throw new Error('Artifact with capture exceeds limit');
  if (report.evidence.length !== 2 || report.evidence.some(item => item.status !== 'passed')) throw new Error('Missing evidence');
  console.log(JSON.stringify({ kit: ${JSON.stringify(id)}, ok: true, uid: process.getuid(), durationMs: Date.now() - start, bytes, captureBytes: capture.length, evidence: report.evidence }));
} finally { fs.rmSync(root, { recursive: true, force: true }); }
`
  const child = Bun.spawn(
    [
      'docker',
      'run',
      '--rm',
      '--network',
      'none',
      '--memory',
      '1g',
      '--cpus',
      '1',
      '--pids-limit',
      '256',
      '--entrypoint',
      'node',
      '-i',
      'sistemazero-studio-runtime:verify',
    ],
    { stdin: new TextEncoder().encode(script), stdout: 'inherit', stderr: 'inherit' },
  )
  const code = await child.exited
  if (code !== 0) process.exit(code)
}
