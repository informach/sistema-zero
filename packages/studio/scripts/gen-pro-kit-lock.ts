import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

// Reuse exact, reviewed runtime versions and integrity hashes, with the kit's own root.
// A nested runtime graph requires an explicit resolver change instead of silently dropping nodes.
interface LockedPackage {
  version?: string
  dependencies?: Record<string, string>
  optionalDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  peerDependenciesMeta?: Record<string, { optional?: boolean }>
  [key: string]: unknown
}
const root = new URL('../pro-kits/canvas-survival/', import.meta.url)
const manifest = JSON.parse(await readFile(new URL('package.json', root), 'utf8'))
const runtime = JSON.parse(
  await readFile(
    new URL('../../studio-runtime/runtime/package-lock.json', import.meta.url),
    'utf8',
  ),
) as {
  lockfileVersion: number
  packages: Record<string, LockedPackage>
}
if (
  runtime.lockfileVersion !== 3 ||
  Object.keys(runtime.packages).some((path) => path.includes('/node_modules/'))
) {
  throw new Error('O lock do runtime mudou de estrutura; revise o gerador do kit.')
}
const packages: Record<string, LockedPackage> = {
  '': {
    name: manifest.name,
    dependencies: manifest.dependencies,
    devDependencies: manifest.devDependencies,
  },
}
const queue = Object.keys({ ...manifest.dependencies, ...manifest.devDependencies })
for (const [name, version] of Object.entries({
  ...manifest.dependencies,
  ...manifest.devDependencies,
})) {
  if (runtime.packages[`node_modules/${name}`]?.version !== version)
    throw new Error(`Versão não aprovada no runtime: ${name}`)
}
while (queue.length) {
  const name = queue.shift()!
  const path = `node_modules/${name}`
  if (packages[path]) continue
  const entry = runtime.packages[path]
  if (!entry) throw new Error(`Dependência ausente no lock do runtime: ${name}`)
  packages[path] = { ...entry, dev: true }
  queue.push(
    ...Object.keys(entry.dependencies ?? {}),
    ...Object.keys(entry.optionalDependencies ?? {}),
  )
  for (const peer of Object.keys(entry.peerDependencies ?? {})) {
    if (!entry.peerDependenciesMeta?.[peer]?.optional) queue.push(peer)
  }
}
const content = `${JSON.stringify(
  {
    name: manifest.name,
    lockfileVersion: 3,
    requires: true,
    packages: Object.fromEntries(
      Object.entries(packages).sort(([a], [b]) => a.localeCompare(b, 'en')),
    ),
  },
  null,
  2,
)}\n`
const destination = new URL('package-lock.json', root)
if (process.argv.includes('--check')) {
  if ((await readFile(destination, 'utf8')).replaceAll('\r\n', '\n') !== content)
    throw new Error('Lock do kit divergente do grafo aprovado. Execute gen:pro-kits.')
  console.log('Lock do kit conferido.')
} else {
  await writeFile(destination, content, 'utf8')
  console.log(
    `Gerado ${fileURLToPath(destination)} (${Object.keys(packages).length - 1} dependências).`,
  )
}
