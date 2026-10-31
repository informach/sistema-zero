import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

// Only trusted editor build output belongs here. Uploaded artwork can never replace this code.
const [buildDirectory, sourceRevision] = process.argv.slice(2)
if (!buildDirectory || !sourceRevision || !/^[a-f0-9]{40}$/.test(sourceRevision))
  throw new Error('Informe a pasta do build ediSVG e o commit de origem com 40 caracteres.')
const files = [
  'edi-web-player.mjs',
  'edi-web-player.d.mts',
  'edi-web-data.mjs',
  'edi-web-data.d.mts',
  'edi-web-types.d.ts',
  'edi-player.licenses.txt',
]
const target = resolve(import.meta.dir, '../../packages/edisvg/vendor')
const contents = await Promise.all(
  files.map(async (name) => ({ name, content: await readFile(resolve(buildDirectory, name)) })),
)
if (
  !contents
    .find((file) => file.name.endsWith('licenses.txt'))
    ?.content.toString()
    .includes('MIT License')
)
  throw new Error('Licenças ausentes.')
await mkdir(target, { recursive: true })
const manifest = {
  format: 'edi-web-player-vendor',
  version: 1,
  sourceRevision,
  files: {} as Record<string, { bytes: number; sha256: string }>,
}
for (const { name, content } of contents) {
  const destination = name === 'edi-player.licenses.txt' ? 'THIRD_PARTY_LICENSES.txt' : name
  await writeFile(resolve(target, destination), content)
  manifest.files[destination] = {
    bytes: content.byteLength,
    sha256: createHash('sha256').update(content).digest('hex'),
  }
}
await writeFile(resolve(target, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
