import { zlibSync } from 'fflate'
import { FIGURAS, FUNDOS, type NomeDaFigura } from '../../src/arte/catalogo'
import { JARDIM_ASSETS } from '../../src/arte/jardim-assets'
import type { Pincel } from '../../src/arte/pincel'
import { PincelSvg, svgEmTexto } from '../../src/arte/pincelSvg'

/**
 * Original art of the Pygame Zero examples, written as code (MIT, Sistema Zero 2026).
 * Vector images come out as SVG drawn with the same pincel as the Jogo 2D art; pixel art comes
 * out as PNG from character grids. Output is byte-for-byte reproducible: no clock, no random.
 */

const encoder = new TextEncoder()

const RGBA =
  /(fill|stroke|stop-color|flood-color)="rgba\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)"/g
const OPACITY: Record<string, string> = {
  fill: 'fill-opacity',
  stroke: 'stroke-opacity',
  'stop-color': 'stop-opacity',
  'flood-color': 'flood-opacity',
}
/**
 * `rgba(...)` as a colour is CSS, not SVG 1.1: browsers read it, but nanosvg (pygame-ce) and
 * other readers draw it opaque. The opacity goes to its own SVG attribute instead.
 */
export function portableSvgColors(body: string) {
  return body.replace(
    RGBA,
    (_, attribute: string, r: string, g: string, b: string, alpha: string) =>
      `${attribute}="rgb(${r},${g},${b})" ${OPACITY[attribute]}="${alpha}"`,
  )
}

/** An SVG with its own size in its root element: Pygame Zero (and pygame-ce) read it there. */
export function svg(id: string, width: number, height: number, draw: (p: Pincel) => void) {
  const pincel = new PincelSvg(id)
  draw(pincel)
  const body = portableSvgColors(svgEmTexto(pincel.arvore()))
  return encoder.encode(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>\n`,
  )
}

/** One Jogo 2D figure, centred in its own box, optionally mirrored. */
export function figura(
  id: string,
  nome: NomeDaFigura,
  width: number,
  height: number,
  options: { espelhar?: boolean; fase?: number } = {},
) {
  return svg(id, width, height, (p) => {
    if (options.espelhar) {
      p.translate(width, 0)
      p.scale(-1, 1)
    }
    FIGURAS[nome].desenhar(
      p,
      { x: 0, y: 0, w: width, h: height, fase: options.fase ?? 0 },
      { t: 0, chao: height },
    )
  })
}

// PNG ----------------------------------------------------------------------------------------

const CRC = new Int32Array(256).map((_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c
})
function crc32(bytes: Uint8Array) {
  let c = -1
  for (const byte of bytes) c = CRC[(c ^ byte) & 0xff]! ^ (c >>> 8)
  return (c ^ -1) >>> 0
}
function chunk(type: string, data: Uint8Array) {
  const out = new Uint8Array(12 + data.length)
  const view = new DataView(out.buffer)
  view.setUint32(0, data.length)
  out.set(encoder.encode(type), 4)
  out.set(data, 8)
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)))
  return out
}
/** RGBA pixels → PNG; the pinned JS compressor is identical across runtimes/platforms. */
export function png(width: number, height: number, rgba: Uint8Array) {
  const raw = new Uint8Array((width * 4 + 1) * height)
  for (let y = 0; y < height; y++)
    raw.set(rgba.subarray(y * width * 4, (y + 1) * width * 4), y * (width * 4 + 1) + 1)
  const header = new Uint8Array(13)
  const view = new DataView(header.buffer)
  view.setUint32(0, width)
  view.setUint32(4, height)
  header.set([8, 6, 0, 0, 0], 8)
  const parts = [
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', zlibSync(raw, { level: 9 })),
    chunk('IEND', new Uint8Array()),
  ]
  const out = new Uint8Array(parts.reduce((total, part) => total + part.length, 0))
  let at = 0
  for (const part of parts) {
    out.set(part, at)
    at += part.length
  }
  return out
}
export const hex = (value: string) => [
  Number.parseInt(value.slice(1, 3), 16),
  Number.parseInt(value.slice(3, 5), 16),
  Number.parseInt(value.slice(5, 7), 16),
]
/** Pixel art: one character per pixel ('.' is transparent), each pixel `scale` screen pixels. */
export function pixelArt(rows: readonly string[], palette: Record<string, string>, scale: number) {
  const width = rows[0]!.length * scale
  const height = rows.length * scale
  const rgba = new Uint8Array(width * height * 4)
  rows.forEach((row, y) => {
    if (row.length * scale !== width) throw new Error('Linha de pixel art com largura diferente.')
    ;[...row].forEach((symbol, x) => {
      if (symbol === '.') return
      const color = palette[symbol]
      if (!color) throw new Error(`Cor desconhecida na pixel art: ${symbol}`)
      const [r, g, b] = hex(color)
      for (let dy = 0; dy < scale; dy++)
        for (let dx = 0; dx < scale; dx++) {
          const at = ((y * scale + dy) * width + x * scale + dx) * 4
          rgba.set([r!, g!, b!, 255], at)
        }
    })
  })
  return png(width, height, rgba)
}

// Vector drawings ----------------------------------------------------------------------------

export function circle(p: Pincel, x: number, y: number, r: number, fill: string, stroke?: string) {
  p.beginPath()
  p.arc(x, y, r, 0, Math.PI * 2)
  p.fillStyle = fill
  p.fill()
  if (stroke) {
    p.strokeStyle = stroke
    p.stroke()
  }
}
export function ellipse(p: Pincel, x: number, y: number, rx: number, ry: number, fill: string) {
  p.beginPath()
  p.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2)
  p.fillStyle = fill
  p.fill()
}
export function roundRect(
  p: Pincel,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string,
  stroke?: string,
) {
  p.beginPath()
  p.roundRect(x, y, w, h, r)
  p.fillStyle = fill
  p.fill()
  if (stroke) {
    p.strokeStyle = stroke
    p.stroke()
  }
}
export function polygon(p: Pincel, points: readonly (readonly [number, number])[], fill: string) {
  p.beginPath()
  p.moveTo(points[0]![0], points[0]![1])
  for (const [x, y] of points.slice(1)) p.lineTo(x, y)
  p.closePath()
  p.fillStyle = fill
  p.fill()
}

const maca = () =>
  svg('maca', 64, 72, (p) => {
    p.lineWidth = 2
    p.strokeStyle = '#6b3b12'
    p.beginPath()
    p.moveTo(32, 18)
    p.quadraticCurveTo(33, 8, 38, 4)
    p.stroke()
    p.beginPath()
    p.moveTo(34, 14)
    p.quadraticCurveTo(46, 2, 56, 10)
    p.quadraticCurveTo(46, 18, 34, 14)
    p.fillStyle = '#4caf50'
    p.fill()
    p.beginPath()
    p.moveTo(32, 20)
    p.bezierCurveTo(14, 8, 0, 26, 6, 46)
    p.bezierCurveTo(10, 62, 22, 70, 32, 64)
    p.bezierCurveTo(42, 70, 54, 62, 58, 46)
    p.bezierCurveTo(64, 26, 50, 8, 32, 20)
    p.fillStyle = '#e53935'
    p.fill()
    p.strokeStyle = '#a31515'
    p.lineWidth = 2
    p.stroke()
    ellipse(p, 20, 34, 5, 9, '#ff8a80')
  })

const moeda = () =>
  svg('moeda', 40, 40, (p) => {
    circle(p, 20, 20, 18, '#f9c80e')
    p.lineWidth = 2.5
    circle(p, 20, 20, 18, 'rgba(0,0,0,0)', '#c98a00')
    circle(p, 20, 20, 12, '#ffd84d', '#e0a800')
    polygon(
      p,
      [
        [20, 11],
        [22.6, 17],
        [29, 17.2],
        [24, 21.2],
        [25.8, 27.6],
        [20, 24],
        [14.2, 27.6],
        [16, 21.2],
        [11, 17.2],
        [17.4, 17],
      ],
      '#c98a00',
    )
    ellipse(p, 13, 12, 3, 5, 'rgba(255,255,255,0.7)')
  })

const ponto = () =>
  svg('ponto', 24, 24, (p) => {
    circle(p, 12, 12, 10, '#ffffff')
    p.lineWidth = 3
    circle(p, 12, 12, 10, 'rgba(0,0,0,0)', '#3949ab')
    circle(p, 12, 12, 4.5, '#3949ab')
  })

const balao = () =>
  svg('balao', 76, 112, (p) => {
    const stripes = ['#e53935', '#fdd835', '#1e88e5', '#fdd835', '#e53935']
    p.save()
    p.beginPath()
    p.moveTo(38, 2)
    p.bezierCurveTo(78, 2, 82, 50, 56, 76)
    p.lineTo(20, 76)
    p.bezierCurveTo(-6, 50, -2, 2, 38, 2)
    p.clip()
    stripes.forEach((color, index) => {
      p.fillStyle = color
      p.fillRect(index * 15.2, 0, 15.2, 80)
    })
    p.restore()
    p.lineWidth = 2
    p.strokeStyle = '#5d2e0f'
    p.beginPath()
    p.moveTo(38, 2)
    p.bezierCurveTo(78, 2, 82, 50, 56, 76)
    p.lineTo(20, 76)
    p.bezierCurveTo(-6, 50, -2, 2, 38, 2)
    p.stroke()
    p.lineWidth = 1.5
    for (const [from, to] of [
      [22, 28],
      [54, 48],
    ] as const) {
      p.beginPath()
      p.moveTo(from, 76)
      p.lineTo(to, 92)
      p.stroke()
    }
    roundRect(p, 26, 90, 24, 18, 3, '#a0652b', '#5d2e0f')
    p.strokeStyle = '#7a4a1e'
    p.beginPath()
    p.moveTo(26, 97)
    p.lineTo(50, 97)
    p.stroke()
  })

const casa = () =>
  svg('casa', 120, 112, (p) => {
    roundRect(p, 12, 46, 96, 64, 2, '#f6d7a7', '#8d5524')
    polygon(
      p,
      [
        [4, 50],
        [60, 6],
        [116, 50],
      ],
      '#c62828',
    )
    p.lineWidth = 2
    p.strokeStyle = '#7f1515'
    p.beginPath()
    p.moveTo(4, 50)
    p.lineTo(60, 6)
    p.lineTo(116, 50)
    p.stroke()
    roundRect(p, 48, 72, 24, 38, 3, '#6d4c41', '#3e2723')
    circle(p, 67, 92, 2, '#ffd54f')
    for (const x of [20, 82]) {
      roundRect(p, x, 60, 20, 18, 2, '#90caf9', '#8d5524')
      p.strokeStyle = '#8d5524'
      p.beginPath()
      p.moveTo(x + 10, 60)
      p.lineTo(x + 10, 78)
      p.moveTo(x, 69)
      p.lineTo(x + 20, 69)
      p.stroke()
    }
    roundRect(p, 84, 16, 12, 22, 1, '#8d6e63', '#4e342e')
  })

type Pose = 'dancarino' | 'cima' | 'direita' | 'baixo' | 'esquerda'
/** A dancing robot: the pose moves its arms and legs. */
const dancarino = (pose: Pose) =>
  svg(`danca-${pose}`, 140, 200, (p) => {
    const crouch = pose === 'baixo' ? 14 : 0
    const limb = (x1: number, y1: number, x2: number, y2: number, color: string) => {
      p.lineCap = 'round'
      p.lineWidth = 12
      p.strokeStyle = color
      p.beginPath()
      p.moveTo(x1, y1)
      p.lineTo(x2, y2)
      p.stroke()
    }
    // legs
    const hipY = 134 + crouch
    if (pose === 'baixo') {
      limb(56, hipY, 38, 170, '#455a64')
      limb(38, 170, 50, 192, '#455a64')
      limb(84, hipY, 102, 170, '#455a64')
      limb(102, 170, 90, 192, '#455a64')
    } else {
      limb(58, hipY, 52, 192, '#455a64')
      limb(82, hipY, pose === 'direita' ? 104 : 88, 192, '#455a64')
    }
    // arms
    const shoulderY = 78 + crouch
    const arms: Record<Pose, [number, number, number, number]> = {
      dancarino: [30, 128, 110, 128],
      cima: [26, 26, 114, 26],
      direita: [36, 120, 132, 64],
      esquerda: [8, 64, 104, 120],
      baixo: [22, 120, 118, 120],
    }
    const [lx, ly, rx, ry] = arms[pose]
    limb(46, shoulderY, lx, ly + crouch, '#7e57c2')
    limb(94, shoulderY, rx, ry + crouch, '#7e57c2')
    // body and head
    roundRect(p, 42, 66 + crouch, 56, 74, 14, '#9575cd', '#4527a0')
    circle(p, 70, 102 + crouch, 9, '#ffd54f')
    roundRect(p, 46, 18 + crouch, 48, 42, 12, '#b39ddb', '#4527a0')
    circle(p, 60, 38 + crouch, 5, '#263238')
    circle(p, 80, 38 + crouch, 5, '#263238')
    p.lineWidth = 2.5
    p.strokeStyle = '#263238'
    p.beginPath()
    p.arc(70, 46 + crouch, 7, 0.2, Math.PI - 0.2)
    p.stroke()
    limb(70, 18 + crouch, 70, 8 + crouch, '#4527a0')
    circle(p, 70, 6 + crouch, 5, '#ff7043')
  })

type Direcao = 'cima' | 'direita' | 'baixo' | 'esquerda'
const ANGULO: Record<Direcao, number> = {
  cima: 0,
  direita: Math.PI / 2,
  baixo: Math.PI,
  esquerda: -Math.PI / 2,
}
const seta = (direcao: Direcao, acesa: boolean) =>
  svg(`seta-${direcao}-${acesa ? 'a' : 'n'}`, 84, 84, (p) => {
    roundRect(p, 4, 4, 76, 76, 16, acesa ? '#fff176' : '#37474f', acesa ? '#f57f17' : '#102027')
    p.save()
    p.translate(42, 42)
    p.rotate(ANGULO[direcao])
    polygon(
      p,
      [
        [0, -26],
        [22, 0],
        [9, 0],
        [9, 24],
        [-9, 24],
        [-9, 0],
        [-22, 0],
      ],
      acesa ? '#e65100' : '#eceff1',
    )
    p.restore()
  })

const palco = () =>
  svg('palco', 800, 600, (p) => {
    const sky = p.createLinearGradient(0, 0, 0, 440)
    sky.addColorStop(0, '#1a0b3d')
    sky.addColorStop(1, '#5b2a86')
    p.fillStyle = sky
    p.fillRect(0, 0, 800, 440)
    for (const [x, color] of [
      [160, 'rgba(255,241,118,0.18)'],
      [400, 'rgba(129,212,250,0.18)'],
      [640, 'rgba(244,143,177,0.18)'],
    ] as const)
      polygon(
        p,
        [
          [x - 18, 0],
          [x + 18, 0],
          [x + 150, 440],
          [x - 150, 440],
        ],
        color,
      )
    p.fillStyle = '#8d5524'
    p.fillRect(0, 440, 800, 160)
    p.strokeStyle = '#6d3f19'
    p.lineWidth = 2
    for (let y = 460; y < 600; y += 28) {
      p.beginPath()
      p.moveTo(0, y)
      p.lineTo(800, y)
      p.stroke()
    }
    p.fillStyle = '#b71c1c'
    p.fillRect(0, 0, 800, 26)
    for (let x = 0; x < 800; x += 50) circle(p, x + 25, 26, 25, '#c62828')
  })

const vaca = (regando: boolean) =>
  svg(`vaca-${regando ? 'r' : 'n'}`, 120, 96, (p) => {
    p.lineWidth = 2
    for (const x of [30, 44, 74, 88]) roundRect(p, x - 5, 58, 10, 32, 4, '#fafafa', '#424242')
    roundRect(p, 16, 26, 82, 44, 20, '#fafafa', '#424242')
    ellipse(p, 40, 40, 11, 8, '#424242')
    ellipse(p, 70, 52, 9, 7, '#424242')
    ellipse(p, 86, 34, 6, 5, '#424242')
    p.lineWidth = 3
    p.strokeStyle = '#424242'
    p.beginPath()
    p.moveTo(17, 40)
    p.quadraticCurveTo(4, 44, 8, 58)
    p.stroke()
    roundRect(p, 86, 12, 30, 30, 12, '#fafafa', '#424242')
    roundRect(p, 98, 30, 20, 14, 7, '#f8bbd0', '#424242')
    circle(p, 105, 37, 1.6, '#424242')
    circle(p, 111, 37, 1.6, '#424242')
    circle(p, 98, 22, 2.5, '#212121')
    polygon(
      p,
      [
        [90, 14],
        [86, 4],
        [95, 12],
      ],
      '#bcaaa4',
    )
    if (regando) {
      p.save()
      p.translate(18, 4)
      p.rotate(-0.5)
      roundRect(p, -2, 0, 26, 18, 4, '#4fc3f7', '#01579b')
      p.restore()
      for (const [x, y] of [
        [6, 20],
        [2, 30],
        [9, 34],
      ] as const)
        ellipse(p, x, y, 2.5, 4, '#29b6f6')
    }
  })

const flor = (estado: 'viva' | 'murcha') =>
  svg(`flor-${estado}`, 56, 80, (p) => {
    const murcha = estado === 'murcha'
    p.lineWidth = 4
    p.strokeStyle = murcha ? '#8d6e63' : '#43a047'
    p.beginPath()
    p.moveTo(28, 78)
    if (murcha) p.quadraticCurveTo(28, 40, 44, 34)
    else p.lineTo(28, 30)
    p.stroke()
    ellipse(p, 20, 60, 9, 4, murcha ? '#a1887f' : '#66bb6a')
    ellipse(p, 36, 52, 9, 4, murcha ? '#a1887f' : '#66bb6a')
    const cx = murcha ? 44 : 28
    const cy = murcha ? 38 : 24
    const petal = murcha ? '#bcaaa4' : '#ec407a'
    for (let k = 0; k < 6; k++) {
      const a = (k * Math.PI) / 3
      ellipse(
        p,
        cx + Math.cos(a) * 11,
        cy + Math.sin(a) * 11,
        murcha ? 6 : 8,
        murcha ? 6 : 8,
        petal,
      )
    }
    circle(p, cx, cy, 8, murcha ? '#8d6e63' : '#fdd835')
  })

const florMonstro = () =>
  svg('flor-monstro', 64, 80, (p) => {
    p.lineWidth = 5
    p.strokeStyle = '#2e7d32'
    p.beginPath()
    p.moveTo(32, 78)
    p.quadraticCurveTo(24, 56, 32, 44)
    p.stroke()
    polygon(
      p,
      [
        [32, 62],
        [12, 50],
        [30, 56],
      ],
      '#388e3c',
    )
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4
      ellipse(p, 32 + Math.cos(a) * 18, 26 + Math.sin(a) * 18, 9, 9, '#7b1fa2')
    }
    circle(p, 32, 26, 16, '#8bc34a', '#33691e')
    p.beginPath()
    p.moveTo(20, 28)
    p.quadraticCurveTo(32, 44, 44, 28)
    p.closePath()
    p.fillStyle = '#b71c1c'
    p.fill()
    for (const x of [24, 30, 36])
      polygon(
        p,
        [
          [x - 2, 28],
          [x + 2, 28],
          [x, 33],
        ],
        '#ffffff',
      )
    circle(p, 26, 20, 3, '#ffffff')
    circle(p, 38, 20, 3, '#ffffff')
    circle(p, 26, 20, 1.5, '#000000')
    circle(p, 38, 20, 1.5, '#000000')
  })

/** A background drawn by the Jogo 2D art at the game's window size. */
export const fundo = (
  id: string,
  nome: keyof typeof FUNDOS,
  width: number,
  height: number,
  chao: number,
) =>
  svg(id, width, height, (p) =>
    FUNDOS[nome](p, { w: width, h: height, chao }, { t: 0, chao, detalhe: 'cheio' }),
  )

/** The garden of the Jogo 2D (Cadê Todo Mundo?) sprites: a fox standing up. */
const raposa = () => {
  const { viewBox, body } = JARDIM_ASSETS.raposa
  return encoder.encode(
    `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="87" viewBox="${viewBox}">${portableSvgColors(body)}</svg>\n`,
  )
}

// Pixel art ----------------------------------------------------------------------------------

const ESTRELA = [
  '.......##.......',
  '.......##.......',
  '......####......',
  '......####......',
  '.....#####......',
  '##############..',
  '.############...',
  '..###oo##oo#....',
  '...#########....',
  '....#######.....',
  '....########....',
  '...####..####...',
  '...###....###...',
  '..###......###..',
  '..##........##..',
  '................',
].map((row) => row.padEnd(16, '.'))
const estrela = (cor: string, brilho: string) => pixelArt(ESTRELA, { '#': cor, o: brilho }, 4)

const HEROI = [
  '.....####.......',
  '....######......',
  '....#oooo#......',
  '....o.oo.o......',
  '....oooooo......',
  '.....oooo.......',
  '...########..s..',
  '..##########.s..',
  '..#.######.#.s..',
  '..o.######.oss..',
  '....######...s..',
  '....##..##......',
  '....##..##......',
  '....bb..bb......',
  '...bbb..bbb.....',
  '................',
]
const heroi = () => pixelArt(HEROI, { '#': '#1e88e5', o: '#ffcc80', s: '#cfd8dc', b: '#5d4037' }, 4)

const DRAGAO = (acordado: boolean) => [
  '................................',
  '..........gggg..................',
  '.........gggggg.................',
  `........gg${acordado ? 'ee' : '--'}gggg................`,
  '........gggggggggg..............',
  '........ggggggg.rr..............',
  '.........gggg.......sss.........',
  '.........ggggg....ssggggs.......',
  '........ggggggggsgggggggggs.....',
  '.......gggggggggggggggggggggg...',
  '......gggggyyyyyyyyyggggggggggg.',
  '.....gggggyyyyyyyyyyyggggg..gggg',
  '.....ggggyyyyyyyyyyyyyggg.....gg',
  '.....ggggyyyyyyyyyyyyyggg.......',
  '......gggyyyyyyyyyyyyggg........',
  '.......gggyyyyyyyyyyggg.........',
  '........gggggggggggggg..........',
  '........gg.gg....gg.gg..........',
  '.......ggg.gg....gg.ggg.........',
  '................................',
]
const dragao = (acordado: boolean) =>
  pixelArt(
    DRAGAO(acordado).map((row) => (acordado ? row.replace(/r/g, 'f') : row)),
    {
      g: acordado ? '#c62828' : '#2e7d32',
      y: acordado ? '#ffb300' : '#9ccc65',
      e: '#ffeb3b',
      '-': '#1b5e20',
      r: acordado ? '#ff7043' : '#1b5e20',
      f: '#ff7043',
      s: acordado ? '#8e0000' : '#1b5e20',
    },
    4,
  )

const OVOS = [
  '....oo....oo....',
  '...oooo..oooo...',
  '..oowoo..oooo...',
  '..oooooooooooo..',
  '.oooo.oowooooo..',
  '.ooooooooooooo..',
  '.bbbbbbbbbbbbbb.',
  'bbbbbbbbbbbbbbbb',
  '.bbbbbbbbbbbbbb.',
]
const ovos = () => pixelArt(OVOS, { o: '#fff3e0', w: '#ffcc80', b: '#795548' }, 4)

/** A dungeon floor of 64-pixel stones, three pixel-art tones in a fixed pattern. */
const masmorra = () => {
  const width = 800
  const height = 600
  const rgba = new Uint8Array(width * height * 4)
  const tones = [hex('#37474f'), hex('#455a64'), hex('#3e4a52')]
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const tx = Math.floor(x / 64)
      const ty = Math.floor(y / 64)
      const edge = x % 64 < 4 || y % 64 < 4
      const tone = edge ? hex('#263238') : tones[(tx * 7 + ty * 3) % 3]!
      const crack = !edge && (x % 64) * 2 + (y % 64) === 72 + ((tx + ty) % 3) * 8
      const [r, g, b] = crack ? hex('#263238') : tone
      rgba.set([r!, g!, b!, 255], (y * width + x) * 4)
    }
  for (let y = 0; y < 160; y++)
    for (let x = 0; x < width; x++) {
      if (y % 64 >= 4 && x % 64 >= 4) continue
      rgba.set([...hex('#1c262b'), 255], (y * width + x) * 4)
    }
  return png(width, height, rgba)
}

// Per game -----------------------------------------------------------------------------------

/** Every image of each example, by file name in its images/ folder. */
export const DK_ART: Record<string, () => Record<string, Uint8Array>> = {
  'ola-pgzero': () => ({ 'nave.svg': figura('nave', 'nave', 64, 74) }),
  'acerte-a-maca': () => ({ 'maca.svg': maca() }),
  'raposa-moedas': () => ({
    'raposa.svg': raposa(),
    'moeda.svg': moeda(),
    'fundo.svg': fundo('fundo', 'jardim', 640, 480, 480),
  }),
  'ligue-os-pontos': () => ({ 'ponto.svg': ponto() }),
  'estrela-vermelha': () => ({
    'estrela_vermelha.png': estrela('#e53935', '#ffcdd2'),
    'estrela_verde.png': estrela('#43a047', '#c8e6c9'),
    'estrela_azul.png': estrela('#1e88e5', '#bbdefb'),
    'estrela_amarela.png': estrela('#fdd835', '#fff9c4'),
    'estrela_roxa.png': estrela('#8e24aa', '#e1bee7'),
  }),
  'quiz-relampago': () => ({}),
  'voo-de-balao': () => ({
    'balao.svg': balao(),
    'passaro_cima.svg': figura('passaro-cima', 'passaro', 57, 35, {
      espelhar: true,
      fase: Math.PI / 2,
    }),
    'passaro_baixo.svg': figura('passaro-baixo', 'passaro', 57, 35, {
      espelhar: true,
      fase: -Math.PI / 2,
    }),
    'casa.svg': casa(),
    'arvore.svg': figura('arvore', 'arvore', 86, 138),
    'fundo.svg': fundo('fundo', 'floresta', 800, 600, 520),
  }),
  'desafio-da-danca': () => ({
    'dancarino.svg': dancarino('dancarino'),
    'dancarino_cima.svg': dancarino('cima'),
    'dancarino_direita.svg': dancarino('direita'),
    'dancarino_baixo.svg': dancarino('baixo'),
    'dancarino_esquerda.svg': dancarino('esquerda'),
    ...Object.fromEntries(
      (['cima', 'direita', 'baixo', 'esquerda'] as const).flatMap((direcao) => [
        [`seta_${direcao}.svg`, seta(direcao, false)],
        [`seta_${direcao}_acesa.svg`, seta(direcao, true)],
      ]),
    ),
    'palco.svg': palco(),
  }),
  'jardim-feliz': () => ({
    'vaca.svg': vaca(false),
    'vaca_regando.svg': vaca(true),
    'flor.svg': flor('viva'),
    'flor_murcha.svg': flor('murcha'),
    'flor_monstro.svg': florMonstro(),
    'jardim.svg': fundo('jardim', 'jardim', 800, 600, 600),
  }),
  'dragoes-dorminhocos': () => ({
    'heroi.png': heroi(),
    'dragao_dormindo.png': dragao(false),
    'dragao_acordado.png': dragao(true),
    'ovos.png': ovos(),
    'masmorra.png': masmorra(),
  }),
}
