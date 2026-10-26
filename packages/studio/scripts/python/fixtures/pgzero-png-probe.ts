import { createHash } from 'node:crypto'
import { png } from '../pgzero-art'

const rgba = new Uint8Array(64 * 64 * 4)
for (let y = 0; y < 64; y++) {
  for (let x = 0; x < 64; x++) {
    const at = (y * 64 + x) * 4
    rgba[at] = (x * 17 + y * 3) % 256
    rgba[at + 1] = (y * 11) % 256
    rgba[at + 2] = (x ^ y) * 3
    rgba[at + 3] = (x + y) % 5 === 0 ? 0 : 255
  }
}
const output = png(64, 64, rgba)
console.log(
  JSON.stringify({
    bytes: output.length,
    sha256: createHash('sha256').update(output).digest('hex'),
  }),
)
