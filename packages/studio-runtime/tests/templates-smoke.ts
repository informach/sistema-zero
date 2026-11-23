import { buildProRuntimeBridgeScript, STUDIO_PRO_ARTIFACT_LIMITS } from '@sistemazero/core/studio'
import { STUDIO_PRO_REMOTE_PACKAGES } from '@sistemazero/core/studio/pro-dependencies'
import {
  parseBuildRequest,
  trustedPackageJson,
  trustedViteConfig,
  undeclaredDependencyMessage,
} from '../src/contracts'
import { prepareRuntimeDependencyLock } from '../src/dependency-lock'
import { materializeTestTemplate } from './template-files'

/**
 * O build hospedado com as dependências de verdade (lote 4 da conclusão, 22/11/2026). O
 * `validation-smoke.ts` monta os kits; aqui entram os modelos genéricos que a criança escolhe ao
 * criar um projeto Pro (three-ts, react-ts e o phaser), pelo mesmo caminho do Worker sem
 * validação: a imagem de verdade, sem rede, sem root, o `vite build` com as dependências
 * confiáveis da imagem e o empacotamento do artefato. E uma faixa `^` com a trava preparada pelo
 * `prepare-dependencies` (`prepareRuntimeDependencyLock`), que o Worker aceita só com a trava
 * completa e igual à da imagem.
 *
 * Confere em cada artefato: a página e os módulos saem do próprio caminho (nenhum `import` de
 * outro site, nenhum `<script src>` absoluto), a biblioteca foi mesmo empacotada e o artefato
 * cabe nos limites. Requer a imagem construída localmente (`bun run build:image`).
 *
 * E as duas recusas (revisão do lote 4): o `import` de uma biblioteca que o projeto não declarou
 * (`nanoid`, que a imagem tem por ser dependência do postcss) para no plugin do catálogo com o
 * recado da criança, e um erro de sintaxe para no Vite (o Worker responde 422 nos dois).
 */

const args = process.argv.slice(2)
// `--dry`: só monta e confere os pedidos como o Worker (sem Docker), para conferir fora do CI.
const dry = args.includes('--dry')
const image = args.find((arg) => !arg.startsWith('--')) ?? 'sistemazero-studio-runtime:verify'

interface Case {
  label: string
  templateId: string
  /**
   * Um texto que só existe DENTRO da biblioteca empacotada (revisão do lote 4: `WebGLRenderer` e
   * `createRoot` estão no próprio código dos modelos e passavam com a biblioteca de fora). Os
   * recados internos do three e o gancho das ferramentas do React só vêm da biblioteca.
   */
  marker: string
  /** Troca o package.json do modelo (a faixa `^`) e manda a trava junto. */
  range?: { name: keyof typeof STUDIO_PRO_REMOTE_PACKAGES }
  /** O build TEM de falhar: acrescenta linhas no começo do `src/main.ts` e confere a saída. */
  refuse?: { kind: 'undeclared' | 'syntax'; lines: string[] }
}

const NANOID_MESSAGE =
  'A biblioteca nanoid não está no package.json deste jogo. Se ela é uma das bibliotecas do modelo, escreva ela no package.json; se não, tire o import.'

const CASES: Case[] = [
  { label: 'three-ts', templateId: 'three-ts', marker: 'THREE.WebGLRenderer:' },
  { label: 'react-ts', templateId: 'react-ts', marker: '__REACT_DEVTOOLS_GLOBAL_HOOK__' },
  { label: 'phaser', templateId: 'phaser-arcade', marker: 'Phaser' },
  {
    label: 'three-ts com ^ e trava',
    templateId: 'three-ts',
    marker: 'THREE.WebGLRenderer:',
    range: { name: 'three' },
  },
  {
    label: 'three-ts com import sem declarar',
    templateId: 'three-ts',
    marker: '',
    refuse: {
      kind: 'undeclared',
      lines: ["import { nanoid } from 'nanoid'", 'console.log(nanoid())'],
    },
  },
  {
    label: 'three-ts com erro de sintaxe',
    templateId: 'three-ts',
    marker: '',
    refuse: { kind: 'syntax', lines: ['const = ;'] },
  },
]

for (const item of CASES) {
  const { files, binaries } = await materializeTestTemplate(item.templateId)
  if (item.range) {
    const manifest = JSON.parse(files['package.json'] ?? '{}') as {
      dependencies?: Record<string, string>
    }
    const version = STUDIO_PRO_REMOTE_PACKAGES[item.range.name]
    if (manifest.dependencies?.[item.range.name] === undefined)
      throw new Error(`O modelo ${item.templateId} não declara ${item.range.name}.`)
    manifest.dependencies[item.range.name] = `^${version}`
    files['package.json'] = JSON.stringify(manifest, null, 2)
    files['package-lock.json'] = prepareRuntimeDependencyLock(files['package.json'])
  }
  if (item.refuse)
    files['src/main.ts'] = [...item.refuse.lines, files['src/main.ts'] ?? ''].join('\n')
  const input = parseBuildRequest({
    executionId: 'verify-1234567890abcdef',
    parentOrigin: 'https://kids.test',
    templateId: item.templateId,
    files,
    binaries,
  })
  if (dry) {
    console.log(
      JSON.stringify({
        template: item.label,
        files: Object.keys(input.files).length,
        // O Worker tira o package.json e a trava dos arquivos depois de conferir as dependências.
        sentLock: Boolean(files['package-lock.json']),
        dependencies: input.dependencies.dependencies,
        refuse: item.refuse?.kind,
      }),
    )
    continue
  }
  const script = `
const fs = require('node:fs');
const cp = require('node:child_process');
const path = require('node:path');
const root = '/workspace/builds/template-' + require('node:crypto').randomUUID();
if (process.getuid() === 0) throw new Error('Build must not run as root');
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
  fs.writeFileSync(root + '/package.json', ${JSON.stringify(trustedPackageJson(item.templateId as never, input.dependencies))});
  fs.writeFileSync(root + '/vite.config.mjs', ${JSON.stringify(trustedViteConfig(item.templateId as never, input.dependencies))});
  fs.writeFileSync(root + '/artifact-options.json', ${JSON.stringify(JSON.stringify({ consoleBridge: buildProRuntimeBridgeScript('https://kids.test') }))});
  fs.symlinkSync('/opt/sz-runtime/node_modules', root + '/node_modules');
  const run = (args) => cp.execFileSync('node', args, { cwd: root, stdio: 'inherit', timeout: 120000 });
  const start = Date.now();
  if (${JSON.stringify(Boolean(item.refuse))}) {
    // A recusa: o Vite tem de falhar, e a saída vai inteira para quem chamou conferir o recado.
    const build = cp.spawnSync('node', ['/opt/sz-runtime/node_modules/vite/bin/vite.js', 'build', '--config', './vite.config.mjs', '--configLoader', 'native'], { cwd: root, encoding: 'utf8', timeout: 120000 });
    process.stdout.write(JSON.stringify({ refused: build.status !== 0, output: [build.stdout || '', build.stderr || ''].join(String.fromCharCode(10)) }));
    process.exit(0);
  }
  run(['/opt/sz-runtime/node_modules/vite/bin/vite.js', 'build', '--config', './vite.config.mjs', '--configLoader', 'native']);
  run(['/opt/sz-runtime/pack-artifact.mjs', '${STUDIO_PRO_ARTIFACT_LIMITS.maxBytes}', '${STUDIO_PRO_ARTIFACT_LIMITS.maxFiles}']);
  const manifest = JSON.parse(fs.readFileSync(root + '/artifact-manifest.json'));
  const paths = manifest.files.map((file) => file.path);
  if (!paths.includes('index.html')) throw new Error('Artifact without index.html');
  if (paths.some((p) => p.startsWith('/') || p.includes('..') || /^[a-z]+:/i.test(p))) throw new Error('Artifact path outside the artifact');
  const html = fs.readFileSync(root + '/dist/index.html', 'utf8');
  for (const match of html.matchAll(/<script[^>]*src="([^"]+)"/g))
    if (/^(?:[a-z]+:)?\\/\\//i.test(match[1]) || match[1].startsWith('/')) throw new Error('Script outside the artifact: ' + match[1]);
  let packed = false;
  for (const p of paths.filter((p) => p.endsWith('.js'))) {
    const code = fs.readFileSync(root + '/dist/' + p, 'utf8');
    if (/(?:\\bimport\\s*\\(\\s*|\\bfrom\\s*)["'](?:https?:)?\\/\\//.test(code)) throw new Error('Module imported from another site in ' + p);
    if (/(?:\\bimport\\s*\\(\\s*|\\bfrom\\s*)["'](?:three|react|react-dom|phaser)(?:\\/[^"']*)?["']/.test(code)) throw new Error('Bare library import left in ' + p);
    if (code.includes(${JSON.stringify(item.marker)})) packed = true;
  }
  if (!packed) throw new Error('Library not packed: ' + ${JSON.stringify(item.marker)});
  const bytes = manifest.files.reduce((n, f) => n + f.bytes, 0);
  if (bytes > ${STUDIO_PRO_ARTIFACT_LIMITS.maxBytes} || manifest.files.length > ${STUDIO_PRO_ARTIFACT_LIMITS.maxFiles}) throw new Error('Artifact exceeds limit');
  console.log(JSON.stringify({ template: ${JSON.stringify(item.label)}, ok: true, uid: process.getuid(), durationMs: Date.now() - start, files: manifest.files.length, bytes, dependencies: ${JSON.stringify(input.dependencies.dependencies)} }));
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
      image,
    ],
    {
      stdin: new TextEncoder().encode(script),
      stdout: item.refuse ? 'pipe' : 'inherit',
      stderr: 'inherit',
    },
  )
  const code = await child.exited
  if (code !== 0) process.exit(code)
  if (item.refuse) {
    const result = JSON.parse(await new Response(child.stdout).text()) as {
      refused: boolean
      output: string
    }
    const message = undeclaredDependencyMessage(result.output)
    const ok =
      result.refused &&
      (item.refuse.kind === 'undeclared' ? message === NANOID_MESSAGE : message === null)
    console.log(JSON.stringify({ template: item.label, ok, refused: result.refused, message }))
    if (!ok) {
      console.error(result.output)
      process.exit(1)
    }
  }
}
