import type { ProjectAsset } from '../../../../core/project'

function image(name: string, width: number, height: number, drawing: string): ProjectAsset {
  return {
    id: `receita-${name}`,
    name,
    kind: 'image',
    source: 'library',
    width,
    height,
    dataUrl: `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${drawing}</svg>`)}`,
  }
}

const hero = image(
  'heroi-oficina',
  128,
  128,
  Array.from({ length: 16 }, (_, frame) => {
    const x = (frame % 4) * 32
    const y = Math.floor(frame / 4) * 32
    const step = frame % 2 === 0 ? 0 : 2
    return `<g transform="translate(${x} ${y})"><circle cx="16" cy="9" r="7" fill="#ffe0ad"/><rect x="9" y="15" width="14" height="11" rx="3" fill="#2f83b4"/><path d="M12 25v${5 - step}m8-${5 - step}v${step + 3}" stroke="#183653" stroke-width="4"/></g>`
  }).join(''),
)
hero.sprite = {
  frameW: 32,
  frameH: 32,
  animations: [
    { name: 'parado', from: 0, to: 0, fps: 1, loop: false },
    { name: 'andando', from: 0, to: 3, fps: 8, loop: true },
    { name: 'aceno', from: 4, to: 7, fps: 10, loop: false },
  ],
}

const backdrop = image(
  'fundo-oficina',
  640,
  360,
  '<path fill="#d5edf0" d="M0 0h640v360H0z"/><circle cx="530" cy="60" r="30" fill="#ffe7a3"/><path fill="#80bfb0" d="m0 270 90-90 100 100 130-120 140 120 100-90 80 90v80H0z"/><path fill="#436f70" d="M0 320h640v40H0z"/>',
)

/** A short local WAV: the example can be opened and exported without a network request. */
function sound(): ProjectAsset {
  const samples = 2205
  const bytes = new Uint8Array(44 + samples * 2)
  const view = new DataView(bytes.buffer)
  const tag = (offset: number, text: string) => {
    for (let index = 0; index < text.length; index++) bytes[offset + index] = text.charCodeAt(index)
  }
  tag(0, 'RIFF')
  view.setUint32(4, bytes.length - 8, true)
  tag(8, 'WAVE')
  tag(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, 22050, true)
  view.setUint32(28, 44100, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  tag(36, 'data')
  view.setUint32(40, samples * 2, true)
  for (let index = 0; index < samples; index++) {
    const envelope = 1 - index / samples
    view.setInt16(
      44 + index * 2,
      Math.sin((index / 22050) * Math.PI * 2 * 660) * 6500 * envelope,
      true,
    )
  }
  return {
    id: 'receita-sino-oficina',
    name: 'sino-oficina',
    kind: 'audio',
    source: 'library',
    dataUrl: `data:audio/wav;base64,${btoa(String.fromCharCode(...bytes))}`,
  }
}

const pieces = image(
  'pecas-oficina',
  64,
  16,
  '<path fill="#b9e0d0" d="M0 0h16v16H0z"/><path fill="#496e68" d="M16 0h16v16H16z"/><path d="M38 0v16m4-16v16m-4-12h4m-4 6h4" stroke="#d49752" stroke-width="2"/><path fill="#5ea777" d="M48 0h16v16H48z"/>',
)
const map = image('mapa-oficina', 320, 192, '<path fill="#b9e0d0" d="M0 0h320v192H0z"/>')
map.tilemap = {
  tileSize: 16,
  cols: 20,
  rows: 12,
  grid: Array.from({ length: 12 }, (_, row) =>
    Array.from({ length: 20 }, (_, column) => {
      if (row === 11 || column === 19) return '1'
      if (column === 10 && row >= 6) return '2'
      if (row === 7 && column >= 11 && column <= 16) return '1'
      if (row === 10 && column >= 3 && column <= 6) return '3'
      return '.'
    }).join(' '),
  ).join(';'),
  solid: [1],
  tileset: { dataUrl: pieces.dataUrl, width: 64, height: 16 },
}

export const ADVANCED_RECIPE_ASSETS: ProjectAsset[] = [hero, backdrop, map, sound()]

export function assetsForRecipe(names: readonly string[]): ProjectAsset[] {
  return names.map((name) => {
    const asset = ADVANCED_RECIPE_ASSETS.find((entry) => entry.name === name)
    if (!asset) throw new Error(`Material ausente da receita avançada: ${name}`)
    return asset
  })
}
