/** Original procedural pixel art for Arena dos Guardiões. No external image/font/input. */
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { zlibSync } from 'fflate'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const check = process.argv.includes('--check')
const size = 64,
  frames = 10,
  width = size * frames,
  height = size
type Color = readonly [number, number, number, number]
const rgba = (hex: string): Color => [
  Number.parseInt(hex.slice(1, 3), 16),
  Number.parseInt(hex.slice(3, 5), 16),
  Number.parseInt(hex.slice(5, 7), 16),
  255,
]
const ink = rgba('#152c3a'),
  cream = rgba('#fff4d0'),
  eye = rgba('#132331')

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff
  for (const value of bytes) {
    crc ^= value
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
  }
  return (crc ^ 0xffffffff) >>> 0
}
function chunk(type: string, data: Uint8Array) {
  const name = Buffer.from(type),
    combined = Buffer.concat([name, data]),
    header = Buffer.alloc(4),
    crc = Buffer.alloc(4)
  header.writeUInt32BE(data.length)
  crc.writeUInt32BE(crc32(combined))
  return Buffer.concat([header, combined, crc])
}
function png(pixels: Uint8Array) {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header[8] = 8
  header[9] = 6
  const raw = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y++)
    raw.set(pixels.subarray(y * width * 4, (y + 1) * width * 4), y * (width * 4 + 1) + 1)
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    // The native zlib implementation differs between Bun/Node and OS builds.
    // Pure JavaScript compression keeps the authored PNG bytes reproducible.
    chunk('IDAT', zlibSync(raw, { level: 9 })),
    chunk('IEND', new Uint8Array()),
  ])
}
const assets = []
for (const role of ['player', 'seeker', 'drifter'] as const) {
  const pixels = new Uint8Array(width * height * 4)
  for (let frame = 0; frame < frames; frame++) {
    const dying = frame >= 7,
      shrink = dying ? [1, 0.75, 0.42][frame - 7]! : 1
    const bob = frame === 1 || frame === 3 || frame === 5 ? -2 : 0
    const walk = frame >= 2 && frame <= 5 ? (frame % 2 ? 3 : -3) : 0
    const color = role === 'player' ? '#69d59d' : role === 'seeker' ? '#ed8764' : '#b19ae8'
    const main = rgba(frame === 6 ? '#fff4d0' : color)
    const dark = rgba(role === 'player' ? '#2a8266' : role === 'seeker' ? '#9c4758' : '#685b9a')
    const light = rgba(role === 'player' ? '#c6f2ae' : role === 'seeker' ? '#ffd29a' : '#e0d8ff')
    const put = (x: number, y: number, color: Color) => {
      const px = Math.floor((x - 32) * shrink + 32),
        py = Math.floor((y - 32) * shrink + 32 + bob)
      if (px < 0 || px >= size || py < 0 || py >= size) return
      pixels.set(color, (py * width + frame * size + px) * 4)
    }
    const rect = (x: number, y: number, w: number, h: number, color: Color) => {
      for (let row = y; row < y + h; row++)
        for (let col = x; col < x + w; col++) put(col, row, color)
    }
    const ellipse = (cx: number, cy: number, rx: number, ry: number, color: Color) => {
      for (let y = Math.floor(cy - ry); y <= cy + ry; y++)
        for (let x = Math.floor(cx - rx); x <= cx + rx; x++)
          if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) put(x, y, color)
    }
    const diamond = (cx: number, cy: number, rx: number, ry: number, color: Color) => {
      for (let y = cy - ry; y <= cy + ry; y++)
        for (let x = cx - rx; x <= cx + rx; x++)
          if (Math.abs(x - cx) / rx + Math.abs(y - cy) / ry <= 1) put(x, y, color)
    }
    if (role === 'player') {
      // A small garden guardian with a leaf crest, scarf, mitts and a round visor.
      rect(20, 43 + walk, 9, 11, ink)
      rect(35, 43 - walk, 9, 11, ink)
      rect(21, 44 + walk, 6, 7, dark)
      rect(36, 44 - walk, 6, 7, dark)
      ellipse(32, 35, 17, 15, ink)
      ellipse(32, 34, 14, 13, main)
      rect(13, 32 - walk, 6, 13, ink)
      rect(45, 32 + walk, 6, 13, ink)
      rect(14, 34 - walk, 4, 8, main)
      rect(46, 34 + walk, 4, 8, main)
      ellipse(32, 24, 18, 15, ink)
      ellipse(32, 23, 15, 12, main)
      ellipse(32, 25, 12, 7, dark)
      rect(22, 21, 20, 9, cream)
      rect(25, 23, 3, 5, eye)
      rect(36, 23, 3, 5, eye)
      rect(28, 38, 8, 6, light)
      rect(20, 34, 24, 4, cream)
      diamond(35, 9, 11, 7, ink)
      diamond(35, 8, 8, 5, light)
      rect(29, 8, 3, 8, dark)
    } else if (role === 'seeker') {
      // Orange thorn-crab: triangular silhouette and two unmistakable horn leaves.
      for (const [x, shift] of [
        [13, walk],
        [43, -walk],
      ] as const) {
        rect(x, 39 + shift, 9, 6, ink)
        rect(x - 2, 43 + shift, 6, 7, dark)
      }
      diamond(32, 30, 22, 23, ink)
      diamond(32, 29, 19, 20, main)
      diamond(20, 13, 5, 10, ink)
      diamond(20, 12, 3, 7, light)
      diamond(44, 13, 5, 10, ink)
      diamond(44, 12, 3, 7, light)
      rect(21, 25, 9, 9, cream)
      rect(35, 25, 9, 9, cream)
      rect(25, 27, 4, 5, eye)
      rect(36, 27, 4, 5, eye)
      rect(25, 38, 14, 3, dark)
      diamond(32, 17, 4, 5, light)
    } else {
      // Lavender drifting lantern: broad bell and trailing asymmetric ribbons.
      for (const [x, shift] of [
        [18, walk],
        [29, -walk],
        [40, walk],
      ] as const) {
        rect(x, 40, 6, 12 + shift, ink)
        rect(x + 1, 40, 4, 9 + shift, light)
      }
      ellipse(32, 29, 23, 19, ink)
      ellipse(32, 28, 20, 16, main)
      rect(12, 34, 40, 9, ink)
      rect(14, 34, 36, 6, dark)
      ellipse(25, 26, 4, 6, cream)
      ellipse(39, 26, 4, 6, cream)
      rect(25, 25, 2, 5, eye)
      rect(39, 25, 2, 5, eye)
      diamond(32, 15, 5, 5, light)
      rect(28, 35, 8, 2, cream)
    }
    if (frame === 6) {
      rect(7, 17, 3, 8, cream)
      rect(5, 20, 7, 2, cream)
    }
    if (dying) {
      for (const [x, y] of [
        [8 + (frame - 7) * 3, 10],
        [51, 17 + (frame - 7) * 3],
        [11, 49],
        [48, 47],
      ] as const)
        diamond(x, y, 3, 3, light)
    }
  }
  const data = png(pixels),
    file = `${role}.png`
  const entry = {
    id: `canvas-survival-${role}-v1`,
    role,
    file,
    width,
    height,
    bytes: data.length,
    sha256: createHash('sha256').update(data).digest('hex'),
    sprite: {
      frameW: size,
      frameH: size,
      animations: [
        { name: 'idle', from: 0, to: 1, fps: 4, loop: true },
        { name: 'walk', from: 2, to: 5, fps: 8, loop: true },
        { name: 'hurt', from: 6, to: 6, fps: 10, loop: false },
        { name: 'death', from: 7, to: 9, fps: 10, loop: false },
      ],
      hitbox:
        role === 'player'
          ? { x: 0.265625, y: 0.25, w: 0.46875, h: 0.5 }
          : role === 'seeker'
            ? { x: 0.1875, y: 0.1875, w: 0.625, h: 0.625 }
            : { x: 0.140625, y: 0.15625, w: 0.71875, h: 0.5625 },
    },
    license: {
      name: 'CC0-1.0',
      attribution: 'Arte original procedural do Sistema Zero, 2026. Veja PACK-LICENSE.md.',
    },
  }
  assets.push(entry)
  await output(file, data)
}
await output(
  'manifest.json',
  Buffer.from(JSON.stringify({ version: 1, frameSize: size, assets }, null, 2) + '\n'),
)
console.log(
  `${check ? 'Verified' : 'Generated'} ${assets.length} original sprite sheets (${assets.reduce((total, asset) => total + asset.bytes, 0)} PNG bytes).`,
)

async function output(name: string, data: Uint8Array) {
  const path = resolve(root, 'assets', name)
  if (check) {
    const current = await readFile(path)
    if (!current.equals(Buffer.from(data)))
      throw new Error(`Pack out of date: ${name}. Run bun scripts/generate-pack.ts.`)
  } else {
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, data)
  }
}
