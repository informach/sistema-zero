import { createHash } from 'node:crypto'
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { basename, resolve } from 'node:path'

const [publicDirectory] = process.argv.slice(2)
if (!publicDirectory) throw new Error('Informe a pasta pública do aplicativo.')
const source = resolve(import.meta.dir, '../assets')
const target = resolve(publicDirectory, 'edisvg')
const manifest = JSON.parse(await readFile(resolve(source, 'manifest.json'), 'utf8'))
if (manifest.version !== 1 || !manifest.files) throw new Error('Acervo ediSVG inválido.')
const prepared = await Promise.all(
  Object.entries(manifest.files).map(async ([name, info]) => {
    if (
      basename(name) !== name ||
      !/^[a-zA-Z0-9.-]+$/.test(name) ||
      typeof info !== 'object' ||
      info === null ||
      !('sha256' in info) ||
      !('bytes' in info)
    )
      throw new Error('Entrada de arte inválida.')
    const content = await readFile(resolve(source, name))
    if (
      content.byteLength !== info.bytes ||
      createHash('sha256').update(content).digest('hex') !== info.sha256
    )
      throw new Error(`A arte ${name} mudou sem atualizar o manifesto.`)
    return { name, content }
  }),
)
await mkdir(target, { recursive: true })
for (const { name, content } of prepared) await writeFile(resolve(target, name), content)
for (const name of await readdir(target)) {
  if (
    name in manifest.files ||
    !/^(happy|celebrating|thinking|sleeping|speaking|chest|chestOpen)\.[a-f0-9]{12}\.(png|webp|edi-animation\.json)$/.test(
      name,
    )
  )
    continue
  await rm(resolve(target, name))
}
console.log(`ediSVG: ${prepared.length} recursos verificados e copiados.`)
