import { createHash } from 'node:crypto'
import { gzipSync } from 'node:zlib'
import { assetToJson, createAsset } from '@sistemazero/pinta/assets'

export { readPintaCausalBlob } from '../src/server/pinta-causal-content'
export {
  r2CreateObjectUgc,
  r2DeleteObjectUgc,
  r2GetObjectUgc,
  r2PresignGetUgc,
  r2PresignPutUgc,
} from '../src/server/r2'

export function stagingPintaSheet() {
  const sheet = createAsset({ kind: 'tileset', name: 'terra-qa', tileSize: 16 })
  const gzip = gzipSync(assetToJson(sheet))
  return {
    gzip,
    expected: {
      itemId: sheet.id,
      kind: sheet.kind,
      formatVersion: 6,
      bytes: gzip.byteLength,
      sha256: createHash('sha256').update(gzip).digest('hex'),
    },
  }
}
