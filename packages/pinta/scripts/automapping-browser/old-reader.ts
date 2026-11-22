/** Run with Bun, passing a clean older checkout and the native-9 backup made by the browser. */

import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const [tree, document] = process.argv.slice(2)
if (!tree || !document) throw Error('Uso: bun old-reader.ts CHECKOUT ARQUIVO')
const from = (path: string) => import(pathToFileURL(resolve(tree, 'packages/pinta/src', path)).href)
const [
  { importPintaJson },
  { decodeRegionGalleryBackup },
  { sanitizePintaAsset, sanitizeRegionTilemapAsset },
] = await Promise.all([
  from('export/projectJson.ts'),
  from('export/regionBackup.ts'),
  from('core/project.ts'),
])
const text = await Bun.file(document).text(),
  raw = JSON.parse(text),
  record = raw.assets.find((a: { schema?: number }) => a.schema === 9)
if (!record || raw.version !== 9) throw Error('Documento precisa conter um mapa autoral 9.')
const legacy = importPintaJson(text),
  regional = decodeRegionGalleryBackup(text)
if (
  legacy.assets.length ||
  regional.assets.length ||
  !legacy.warnings.length ||
  !regional.warnings.length ||
  sanitizePintaAsset(record) !== null ||
  sanitizeRegionTilemapAsset(record) !== null
)
  throw Error('Leitor anterior admitiu o arquivo.')
console.log(
  JSON.stringify({
    checkout: execFileSync('git', ['-C', tree, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    envelope: raw.version,
    legacy: legacy.assets.length,
    regional: regional.assets.length,
    recordRefused: true,
    sha256: new Bun.CryptoHasher('sha256').update(text).digest('hex'),
  }),
)
