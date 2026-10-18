import { createHash } from 'node:crypto'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
/** Generate canonical contracts into the immutable trusted container image. */
for (const [entry, output, label] of [
  ['../core/src/studio/portable-path.ts', 'portable-path.generated.mjs', 'caminhos portátil'],
  ['scripts/python-playtest-contract.ts', 'python-playtest.generated.mjs', 'playtest Python'],
  [
    '../core/src/learning/execution-observation.ts',
    'execution-observation.generated.mjs',
    'observação dos objetivos',
  ],
]) {
  const build = await Bun.build({
    entrypoints: [path.join(root, entry)],
    target: 'node',
    format: 'esm',
    splitting: false,
    minify: true,
  })
  if (!build.success || build.outputs.length !== 1)
    throw new AggregateError(build.logs, `Falha ao gerar o contrato ${label}.`)
  const source = `// Generated from ${entry} by validation-profile.ts. Do not edit.\n${await build.outputs[0].text()}`
  const target = path.join(root, 'runtime', output)
  if (process.argv.includes('--check')) {
    if ((await readFile(target, 'utf8').catch(() => '')) !== source)
      throw new Error(`Contrato ${label} desatualizado. Gere o perfil e reconstrua a imagem.`)
  } else await writeFile(target, source)
}
const groups = ['runtime', 'src', '../core/src/studio']
const files = [
  'Dockerfile',
  '../core/src/learning/project-execution.ts',
  '../core/src/learning/execution-observation.ts',
]
for (const directory of groups) {
  for (const file of await readdir(path.join(root, directory), { withFileTypes: true })) {
    if (
      file.isFile() &&
      /\.(?:ts|mjs|json)$/.test(file.name) &&
      !/\.(?:test|spec)\./.test(file.name) &&
      file.name !== 'validation-profile.json'
    )
      files.push(`${directory}/${file.name}`)
  }
}
const hash = createHash('sha256')
for (const file of files.sort()) {
  hash
    .update(file)
    .update('\0')
    .update((await readFile(path.join(root, file), 'utf8')).replaceAll('\r\n', '\n'))
    .update('\0')
}
const output = `${JSON.stringify({ profileVersion: 1, runtimeFingerprint: hash.digest('hex') }, null, 2)}\n`
const target = path.join(root, 'runtime/validation-profile.json')
if (process.argv.includes('--check')) {
  if ((await readFile(target, 'utf8').catch(() => '')) !== output)
    throw new Error(
      'Perfil desatualizado. Rode bun run gen:validation-profile no studio-runtime e reconstrua a imagem.',
    )
} else await writeFile(target, output)
console.log('Studio runtime validation profile verified.')
