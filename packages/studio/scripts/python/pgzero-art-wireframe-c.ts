import { circle, ellipse, pixelArt, polygon, roundRect, svg } from './pgzero-art'
import { Mapa } from './pgzero-art-wireframe-a'

/**
 * Art of the Wireframe recipes, sub-batch 2c (original, MIT, Sistema Zero 2026).
 */

// Cavando por Gemas ---------------------------------------------------------------------------

const fundoDaCaverna = () =>
  svg('caverna-fundo', 800, 600, (p) => {
    const ar = p.createLinearGradient(0, 0, 0, 600)
    ar.addColorStop(0, '#120c08')
    ar.addColorStop(1, '#1f140c')
    p.fillStyle = ar
    p.fillRect(0, 0, 800, 600)
    p.fillStyle = '#000000'
    p.fillRect(0, 0, 800, 40)
  })

/** A brick wall tile: two rows of bricks with mortar between them. */
const parede = () =>
  svg('caverna-parede', 40, 40, (p) => {
    p.fillStyle = '#37474f'
    p.fillRect(0, 0, 40, 40)
    p.fillStyle = '#78909c'
    for (const [x, y, w] of [
      [1, 1, 18],
      [21, 1, 18],
      [1, 21, 8],
      [11, 21, 18],
      [31, 21, 8],
    ] as const)
      p.fillRect(x, y, w, 17)
    p.fillStyle = '#b0bec5'
    for (const [x, y, w] of [
      [1, 1, 18],
      [21, 1, 18],
      [1, 21, 8],
      [11, 21, 18],
      [31, 21, 8],
    ] as const)
      p.fillRect(x, y, w, 3)
  })

/** Soil: brown with a few lighter grains, always in the same places. */
const terra = () =>
  svg('caverna-terra', 40, 40, (p) => {
    p.fillStyle = '#795548'
    p.fillRect(0, 0, 40, 40)
    for (const [x, y, r] of [
      [7, 8, 2],
      [26, 6, 1.5],
      [33, 18, 2],
      [14, 22, 1.5],
      [6, 31, 2],
      [24, 33, 2],
      [36, 36, 1],
    ] as const)
      circle(p, x, y, r, '#a1887f')
    for (const [x, y] of [
      [18, 12],
      [30, 28],
      [10, 17],
    ] as const)
      circle(p, x, y, 1.5, '#4e342e')
  })

/** A round boulder; falling, with two dust lines above it. */
const pedra = (id: string, caindo: boolean) =>
  svg(id, 40, 40, (p) => {
    circle(p, 20, 21, 17, '#78909c', '#37474f')
    circle(p, 14, 15, 5, '#b0bec5')
    circle(p, 27, 28, 3, '#546e7a')
    circle(p, 12, 28, 2, '#546e7a')
    if (caindo) {
      p.strokeStyle = '#eceff1'
      p.lineWidth = 2
      p.beginPath()
      p.moveTo(10, 0)
      p.lineTo(10, 5)
      p.moveTo(30, 0)
      p.lineTo(30, 5)
      p.stroke()
    }
  })

/** A cut gem with light and dark facets. */
const gema = () =>
  svg('caverna-gema', 40, 40, (p) => {
    polygon(
      p,
      [
        [20, 4],
        [36, 16],
        [20, 37],
        [4, 16],
      ],
      '#26c6da',
    )
    polygon(
      p,
      [
        [20, 4],
        [28, 16],
        [12, 16],
      ],
      '#b2ebf2',
    )
    polygon(
      p,
      [
        [12, 16],
        [28, 16],
        [20, 37],
      ],
      '#00acc1',
    )
    polygon(
      p,
      [
        [28, 16],
        [36, 16],
        [20, 37],
      ],
      '#00838f',
    )
  })

/** The exit door: dark and barred while closed, glowing once every gem is taken. */
const saida = (aberta: boolean) =>
  svg(aberta ? 'caverna-saida-aberta' : 'caverna-saida', 40, 40, (p) => {
    p.fillStyle = '#5d4037'
    p.fillRect(0, 0, 40, 40)
    roundRect(p, 6, 4, 28, 36, 12, aberta ? '#ffee58' : '#263238')
    if (aberta) roundRect(p, 11, 9, 18, 31, 8, '#fffde7')
    else {
      p.fillStyle = '#90a4ae'
      for (const x of [12, 19, 26]) p.fillRect(x, 6, 3, 34)
    }
  })

// The miner, in pixel art (10 × 10, each pixel 4 screen pixels): a helmet with a lamp.
const MINERADOR_FRENTE = [
  '...yyyy...',
  '..yyllyy..',
  '..yyyyyy..',
  '...ssss...',
  '...sksk...',
  '...ssss...',
  '..bbbbbb..',
  '.sbbbbbbs.',
  '..bb..bb..',
  '..kk..kk..',
]
const MINERADOR_DIREITA = [
  '...yyyy...',
  '..yyyyyyl.',
  '..yyyyyy..',
  '...sssss..',
  '...ssssk..',
  '...sssss..',
  '...bbbb...',
  '..bbbbbs..',
  '...b..b...',
  '..kk..kk..',
]
const CORES_DO_MINERADOR = { y: '#fdd835', l: '#fffde7', s: '#ffcc80', k: '#212121', b: '#1e88e5' }
const minerador = (linhas: readonly string[]) => pixelArt(linhas, CORES_DO_MINERADOR, 4)
const espelhado = (linhas: readonly string[]) =>
  linhas.map((linha) => [...linha].reverse().join(''))

/** An empty cave cell for the editor: dark, with a faint outline to aim the mouse. */
const vazio = () =>
  svg('caverna-vazio', 40, 40, (p) => {
    p.fillStyle = '#120c08'
    p.fillRect(0, 0, 40, 40)
    p.strokeStyle = '#3e2723'
    p.lineWidth = 1
    p.strokeRect(0.5, 0.5, 39, 39)
  })

// Corrida Vista de Cima -------------------------------------------------------------------------

/** The track: a rounded rectangle band 120 px wide, the same shape in the picture and the guide. */
const PISTA = { x: 40, y: 60, w: 720, h: 500, raio: 140, largura: 120 }

/** Signed distance to the outside edge of the track (negative inside the outer rectangle). */
const distanciaDaBorda = (x: number, y: number) => {
  const meiaLargura = PISTA.w / 2
  const meiaAltura = PISTA.h / 2
  const qx = Math.abs(x - (PISTA.x + meiaLargura)) - (meiaLargura - PISTA.raio)
  const qy = Math.abs(y - (PISTA.y + meiaAltura)) - (meiaAltura - PISTA.raio)
  const fora = Math.hypot(Math.max(qx, 0), Math.max(qy, 0))
  return fora + Math.min(Math.max(qx, qy), 0) - PISTA.raio
}

/**
 * The guide the cars read (never drawn): red outside, blue in the infield and, on the track,
 * a grey that goes from 200 at the outer edge to 72 at the inner one (136 in the middle).
 */
const guiaDaPista = () => {
  const mapa = new Mapa(800, 600)
  for (let y = 0; y < 600; y++)
    for (let x = 0; x < 800; x++) {
      const dentro = -distanciaDaBorda(x + 0.5, y + 0.5)
      if (dentro < 0) mapa.pintar(x, y, [255, 0, 0])
      else if (dentro > PISTA.largura) mapa.pintar(x, y, [0, 0, 255])
      else {
        const tom = Math.round(200 - (dentro / PISTA.largura) * 128)
        mapa.pintar(x, y, [tom, tom, tom])
      }
    }
  return mapa.png()
}

const pistaDeCorrida = () =>
  svg('corrida-pista', 800, 600, (p) => {
    p.fillStyle = '#43a047'
    p.fillRect(0, 0, 800, 600)
    p.fillStyle = '#000000'
    p.fillRect(0, 0, 800, 50)
    const { x, y, w, h, raio, largura } = PISTA
    roundRect(p, x - 6, y - 6, w + 12, h + 12, raio + 6, '#eeeeee')
    roundRect(p, x, y, w, h, raio, '#546e7a')
    roundRect(
      p,
      x + largura,
      y + largura,
      w - 2 * largura,
      h - 2 * largura,
      raio - largura,
      '#eeeeee',
    )
    roundRect(
      p,
      x + largura + 6,
      y + largura + 6,
      w - 2 * largura - 12,
      h - 2 * largura - 12,
      14,
      '#388e3c',
    )
    // The middle line, dashed by hand.
    p.fillStyle = '#cfd8dc'
    for (let traco = 180; traco < 620; traco += 40) {
      p.fillRect(traco, y + largura / 2 - 2, 20, 4)
      p.fillRect(traco, y + h - largura / 2 - 2, 20, 4)
    }
    for (let traco = 220; traco < 400; traco += 40) {
      p.fillRect(x + largura / 2 - 2, traco, 4, 20)
      p.fillRect(x + w - largura / 2 - 2, traco, 4, 20)
    }
    // The finish line: a checkered strip across the top straight.
    for (let linha = 0; linha < 12; linha++)
      for (let coluna = 0; coluna < 2; coluna++) {
        p.fillStyle = (linha + coluna) % 2 ? '#212121' : '#ffffff'
        p.fillRect(420 + coluna * 6, y + linha * 10, 6, 10)
      }
    // Trees in the infield.
    for (const [cx, cy] of [
      [260, 250],
      [330, 330],
      [470, 260],
      [560, 340],
      [400, 290],
    ] as const) {
      circle(p, cx, cy, 22, '#2e7d32')
      circle(p, cx - 6, cy - 6, 9, '#66bb6a')
    }
  })

/** A racing car seen from above, pointing right (Pygame Zero's angle 0). */
const carrinho = (numero: number) => {
  const cores = ['#e53935', '#1e88e5', '#fdd835', '#8e24aa']
  return svg(`corrida-carro${numero}`, 40, 24, (p) => {
    p.fillStyle = '#212121'
    for (const [rx, ry] of [
      [6, 0],
      [26, 0],
      [6, 19],
      [26, 19],
    ] as const)
      p.fillRect(rx, ry, 8, 5)
    roundRect(p, 2, 3, 36, 18, 7, cores[numero]!)
    roundRect(p, 18, 6, 10, 12, 3, '#b3e5fc')
    p.fillStyle = '#ffffff'
    p.fillRect(4, 11, 12, 2)
  })
}

// Sinuca ------------------------------------------------------------------------------------------

const CACAPAS_DA_MESA = [
  [80, 110],
  [400, 104],
  [720, 110],
  [80, 490],
  [400, 496],
  [720, 490],
] as const

const mesaDeSinuca = () =>
  svg('sinuca-mesa', 800, 600, (p) => {
    p.fillStyle = '#101820'
    p.fillRect(0, 0, 800, 600)
    roundRect(p, 40, 70, 720, 460, 30, '#6d4c41')
    roundRect(p, 52, 82, 696, 436, 22, '#4e342e')
    p.fillStyle = '#1b5e20'
    p.fillRect(66, 96, 668, 408)
    p.fillStyle = '#2e7d32'
    p.fillRect(80, 110, 640, 380)
    // The little marks on the wood that help aiming.
    for (const x of [160, 240, 320, 480, 560, 640]) {
      circle(p, x, 76, 3, '#ffe0b2')
      circle(p, x, 524, 3, '#ffe0b2')
    }
    for (const y of [205, 300, 395]) {
      circle(p, 46, y, 3, '#ffe0b2')
      circle(p, 754, y, 3, '#ffe0b2')
    }
    p.strokeStyle = '#66bb6a'
    p.lineWidth = 2
    p.beginPath()
    p.moveTo(240, 110)
    p.lineTo(240, 490)
    p.stroke()
    for (const [x, y] of CACAPAS_DA_MESA) circle(p, x, y, 20, '#000000', '#3e2723')
  })

/** A pool ball: a coloured circle; the numbered ones get a white spot, like the real ones. */
const bolaDeSinuca = (id: string, cor: string, numerada: boolean) =>
  svg(id, 28, 28, (p) => {
    circle(p, 14, 14, 13, cor, '#263238')
    if (numerada) circle(p, 14, 14, 5, '#ffffff')
    circle(p, 9, 9, 2.5, '#ffffff')
  })

// Fliperama -------------------------------------------------------------------------------------

const BATEDORES = [
  [200, 250],
  [380, 250],
  [290, 370],
] as const
const RAIO_DO_BATEDOR = 26

/** True where the table is wall: the border, the round top corners, the launch lane and the slopes. */
const eParede = (x: number, y: number) => {
  if (x < 16 || y < 16 || x >= 584) return true
  if (x < 136 && y < 136 && Math.hypot(x - 136, y - 136) > 120) return true
  if (x > 464 && y < 136 && Math.hypot(x - 464, y - 136) > 120) return true
  // The wall between the table and the launch lane, and the lane's floor.
  if (x >= 520 && x < 532 && y >= 150) return true
  if (x >= 532 && y >= 760) return true
  // The slopes that lead the ball to the flippers.
  if (x < 200 && y >= 560 + (x - 16) * (128 / 184)) return true
  if (x > 400 && x < 520 && y >= 560 + (520 - x) * (128 / 120)) return true
  return false
}

/** The collision map (never drawn): black is free, white is wall, red is a bumper. */
const mapaDoFliperama = () => {
  const mapa = new Mapa(600, 800)
  for (let y = 0; y < 800; y++)
    for (let x = 0; x < 600; x++) {
      const px = x + 0.5
      const py = y + 0.5
      if (BATEDORES.some(([bx, by]) => Math.hypot(px - bx, py - by) <= RAIO_DO_BATEDOR))
        mapa.pintar(x, y, [255, 0, 0])
      else if (eParede(px, py)) mapa.pintar(x, y, [255, 255, 255])
      else mapa.pintar(x, y, [0, 0, 0])
    }
  return mapa.png()
}

const mesaDoFliperama = () =>
  svg('fliperama-mesa', 600, 800, (p) => {
    p.fillStyle = '#4a148c'
    p.fillRect(0, 0, 600, 800)
    // The playfield, with the same shape as the map.
    const campo = p.createLinearGradient(0, 0, 0, 800)
    campo.addColorStop(0, '#0d47a1')
    campo.addColorStop(1, '#1a237e')
    p.fillStyle = campo
    p.beginPath()
    p.moveTo(16, 136)
    p.arc(136, 136, 120, Math.PI, Math.PI * 1.5)
    p.lineTo(464, 16)
    p.arc(464, 136, 120, Math.PI * 1.5, Math.PI * 2)
    p.lineTo(584, 760)
    p.lineTo(532, 760)
    p.lineTo(532, 150)
    p.lineTo(520, 150)
    p.lineTo(520, 560)
    p.lineTo(400, 688)
    p.lineTo(400, 800)
    p.lineTo(200, 800)
    p.lineTo(200, 688)
    p.lineTo(16, 560)
    p.closePath()
    p.fill()
    // Stars painted on the playfield.
    for (let i = 0; i < 40; i++)
      circle(p, 40 + ((i * 131) % 460), 60 + ((i * 197) % 480), i % 5 ? 1.2 : 2, '#90caf9')
    // The launch spring at the bottom of the lane.
    p.fillStyle = '#b0bec5'
    for (let mola = 0; mola < 4; mola++) p.fillRect(540, 762 + mola * 9, 36, 4)
    for (const [bx, by] of BATEDORES) {
      circle(p, bx, by, RAIO_DO_BATEDOR, '#e53935', '#ffcdd2')
      circle(p, bx, by, RAIO_DO_BATEDOR - 9, '#ff8a80')
      circle(p, bx, by, 6, '#ffffff')
    }
    // The gate at the top of the lane: the ball goes out of it, but does not come back in.
    p.fillStyle = '#ffd54f'
    for (let traco = 60; traco < 150; traco += 14) p.fillRect(522, traco, 8, 8)
    circle(p, 200, 690, 10, '#cfd8dc')
    circle(p, 400, 690, 10, '#cfd8dc')
  })

/** Glow drawn over the bumpers for a moment after a hit. */
const brilhoDosBatedores = () =>
  svg('fliperama-brilho', 600, 800, (p) => {
    for (const [bx, by] of BATEDORES) {
      p.beginPath()
      p.arc(bx, by, RAIO_DO_BATEDOR + 6, 0, Math.PI * 2)
      p.strokeStyle = '#fff176'
      p.lineWidth = 5
      p.stroke()
      circle(p, bx, by, RAIO_DO_BATEDOR - 9, '#fff59d')
    }
  })

/** A flipper 98 × 24 with its pin (the anchor) at x = 12 on the left, or at x = 86 mirrored. */
const flipper = (espelhado: boolean) =>
  svg(espelhado ? 'fliperama-flipper-d' : 'fliperama-flipper-e', 98, 24, (p) => {
    const pino = espelhado ? 86 : 12
    const ponta = espelhado ? 12 : 92
    polygon(
      p,
      [
        [pino, 2],
        [ponta, 6],
        [ponta, 18],
        [pino, 22],
      ],
      '#ffb300',
    )
    circle(p, pino, 12, 10, '#ffb300')
    circle(p, ponta, 12, 6, '#ffb300')
    circle(p, pino, 12, 4, '#5d4037')
  })

const bolinha = () =>
  svg('fliperama-bola', 20, 20, (p) => {
    circle(p, 10, 10, 9.5, '#cfd8dc', '#607d8b')
    circle(p, 7, 7, 3, '#ffffff')
  })

// Minigolfe Maluco ----------------------------------------------------------------------------

type Retangulo = readonly [number, number, number, number]
interface Buraco {
  paredes: readonly Retangulo[]
  agua: readonly Retangulo[]
  buraco: readonly [number, number]
  inicio: readonly [number, number]
}
/** The course border, out to the screen edges: the ball can never leave the green. */
const BORDA: readonly Retangulo[] = [
  [0, 0, 800, 92],
  [0, 568, 800, 32],
  [0, 0, 52, 600],
  [748, 0, 52, 600],
]
const BURACOS: readonly Buraco[] = [
  { paredes: [[52, 312, 496, 256]], agua: [], buraco: [660, 500], inicio: [120, 190] },
  {
    paredes: [
      [250, 92, 24, 330],
      [500, 250, 24, 318],
    ],
    agua: [],
    buraco: [660, 160],
    inicio: [110, 500],
  },
  {
    paredes: [[600, 250, 20, 160]],
    agua: [[300, 190, 200, 280]],
    buraco: [700, 330],
    inicio: [100, 330],
  },
]

/** Red where the nearest side of a wall lies flat (top or bottom), blue where it stands. */
const pintarParede = (mapa: Mapa, [x, y, w, h]: Retangulo) => {
  for (let yy = y; yy < y + h; yy++)
    for (let xx = x; xx < x + w; xx++) {
      const deitada = Math.min(yy - y, y + h - 1 - yy)
      const emPe = Math.min(xx - x, x + w - 1 - xx)
      mapa.pintar(xx, yy, deitada <= emPe ? [255, 0, 0] : [0, 0, 255])
    }
}

const mapaDoBuraco = (buraco: Buraco) => {
  const mapa = new Mapa(800, 600)
  mapa.retangulo(0, 0, 800, 600, [255, 255, 255])
  // Mapa.pintar keeps the brightest channel, so each colour starts from black.
  const limpar = ([x, y, w, h]: Retangulo) => {
    for (let yy = y; yy < y + h; yy++)
      for (let xx = x; xx < x + w; xx++) mapa.rgba.set([0, 0, 0, 255], (yy * 800 + xx) * 4)
  }
  for (const parede of [...BORDA, ...buraco.paredes]) {
    limpar(parede)
    pintarParede(mapa, parede)
  }
  for (const agua of buraco.agua) {
    limpar(agua)
    mapa.retangulo(...agua, [0, 255, 0])
  }
  const [bx, by] = buraco.buraco
  for (let yy = by - 9; yy <= by + 9; yy++)
    for (let xx = bx - 9; xx <= bx + 9; xx++)
      if (Math.hypot(xx + 0.5 - bx, yy + 0.5 - by) <= 9)
        mapa.rgba.set([0, 0, 0, 255], (yy * 800 + xx) * 4)
  return mapa.png()
}

const desenhoDoBuraco = (numero: number, buraco: Buraco) =>
  svg(`golfe-buraco${numero}`, 800, 600, (p) => {
    p.fillStyle = '#1b2a1b'
    p.fillRect(0, 0, 800, 600)
    p.fillStyle = '#8d6e63'
    p.fillRect(40, 80, 720, 500)
    // Stripes of grass, as on a mown green.
    for (let faixa = 0; faixa < 12; faixa++) {
      p.fillStyle = faixa % 2 ? '#66bb6a' : '#5cb860'
      p.fillRect(52 + faixa * 58, 92, 58, 476)
    }
    for (const [x, y, w, h] of buraco.paredes) {
      p.fillStyle = '#8d6e63'
      p.fillRect(x, y, w, h)
      p.fillStyle = '#a1887f'
      p.fillRect(x + 3, y + 3, w - 6, h - 6)
    }
    for (const [x, y, w, h] of buraco.agua) {
      roundRect(p, x, y, w, h, 3, '#29b6f6')
      p.strokeStyle = '#e1f5fe'
      p.lineWidth = 2
      for (let onda = 0; onda < 5; onda++) {
        const oy = y + 40 + onda * 48
        p.beginPath()
        p.moveTo(x + 30, oy)
        p.quadraticCurveTo(x + w / 4, oy - 8, x + w / 2, oy)
        p.quadraticCurveTo(x + (3 * w) / 4, oy + 8, x + w - 30, oy)
        p.stroke()
      }
    }
    const [ix, iy] = buraco.inicio
    roundRect(p, ix - 16, iy - 16, 32, 32, 6, '#2e7d32')
    const [bx, by] = buraco.buraco
    circle(p, bx, by, 10, '#212121', '#33691e')
    p.fillStyle = '#eeeeee'
    p.fillRect(bx - 1, by - 46, 3, 46)
    polygon(
      p,
      [
        [bx + 2, by - 46],
        [bx + 26, by - 38],
        [bx + 2, by - 30],
      ],
      '#e53935',
    )
  })

const setaDeMira = () =>
  svg('golfe-seta', 60, 18, (p) => {
    p.fillStyle = '#ffffff'
    p.fillRect(10, 7, 34, 4)
    polygon(
      p,
      [
        [60, 9],
        [42, 1],
        [42, 17],
      ],
      '#ffffff',
    )
  })

const bolinhaDeGolfe = () =>
  svg('golfe-bolinha', 12, 12, (p) => {
    circle(p, 6, 6, 5.5, '#ffffff', '#9e9e9e')
  })

// Tiro ao Prato -----------------------------------------------------------------------------------

const campoDeTiro = () =>
  svg('prato-fundo', 800, 600, (p) => {
    const ceu = p.createLinearGradient(0, 0, 0, 380)
    ceu.addColorStop(0, '#4fc3f7')
    ceu.addColorStop(1, '#e1f5fe')
    p.fillStyle = ceu
    p.fillRect(0, 0, 800, 380)
    // Far hills and the grass.
    ellipse(p, 160, 400, 260, 90, '#81c784')
    ellipse(p, 600, 410, 320, 100, '#66bb6a')
    p.fillStyle = '#558b2f'
    p.fillRect(0, 390, 800, 210)
    for (let i = 0; i < 30; i++) {
      p.fillStyle = '#689f38'
      p.fillRect((i * 97) % 800, 410 + ((i * 53) % 180), 18, 3)
    }
    // Clouds.
    for (const [x, y] of [
      [140, 90],
      [560, 60],
      [700, 150],
    ] as const) {
      ellipse(p, x, y, 50, 18, '#ffffff')
      ellipse(p, x + 30, y - 10, 34, 16, '#ffffff')
    }
    // The two throwing houses.
    for (const x of [100, 700]) {
      p.fillStyle = '#8d6e63'
      p.fillRect(x - 40, 370, 80, 60)
      polygon(
        p,
        [
          [x - 50, 372],
          [x, 340],
          [x + 50, 372],
        ],
        '#6d4c41',
      )
      p.fillStyle = '#3e2723'
      p.fillRect(x - 14, 384, 28, 18)
    }
    // The shooter's half circle.
    p.fillStyle = '#d7ccc8'
    p.beginPath()
    p.arc(400, 600, 130, Math.PI, 0)
    p.fill()
  })

// The shooter seen from behind, in pixel art: a cap, a jacket and the gun.
const ATIRADOR = [
  '....rrrr....',
  '...rrrrrr...',
  '....ssss....',
  '..bbbbbbbb..',
  '.bbbbbbbbbb.',
  '.bbbbbbbbbb.',
  '.bb.bbbb.bb.',
  '.ss.bbbb.ss.',
  '....kkkk....',
  '....k..k....',
  '....k..k....',
  '...kk..kk...',
]
const atirador = (mira: number) => {
  const linhas = ATIRADOR.map((linha) => linha)
  // The gun: a dark bar from the hands, up and to the side it points to.
  const cano = mira === 0 ? [5, 6] : mira < 0 ? [1] : [10]
  for (const linha of [0, 1, 2, 3])
    linhas[linha] = [...linhas[linha]!].map((c, i) => (cano.includes(i) ? 'g' : c)).join('')
  return pixelArt(
    linhas,
    { r: '#c62828', s: '#ffcc80', b: '#1565c0', k: '#37474f', g: '#212121' },
    7,
  )
}

const miraQuadrada = () =>
  svg('prato-mira', 44, 44, (p) => {
    p.strokeStyle = '#d50000'
    p.lineWidth = 4
    p.strokeRect(2, 2, 40, 40)
    p.fillStyle = '#d50000'
    p.fillRect(20, 0, 4, 10)
    p.fillRect(20, 34, 4, 10)
    p.fillRect(0, 20, 10, 4)
    p.fillRect(34, 20, 10, 4)
  })

const prato = () =>
  svg('prato-inteiro', 32, 14, (p) => {
    ellipse(p, 16, 7, 15, 6, '#ff7043')
    ellipse(p, 16, 6, 9, 3, '#ffab91')
  })

/** The disc breaking: more and more pieces, further apart. */
const pratoQuebrando = (passo: number) =>
  svg(`prato-quebrando${passo}`, 40, 40, (p) => {
    const longe = 4 + passo * 5
    for (let caco = 0; caco < 5; caco++) {
      const angulo = (caco * Math.PI * 2) / 5 + passo
      const x = 20 + Math.cos(angulo) * longe
      const y = 20 + Math.sin(angulo) * longe
      polygon(
        p,
        [
          [x - 4, y - 2],
          [x + 3, y - 3],
          [x + 2, y + 3],
        ],
        passo === 3 ? '#ffccbc' : '#ff7043',
      )
    }
    if (passo === 1) circle(p, 20, 20, 8, '#fff59d')
  })

const sombraDoPrato = () =>
  svg('prato-sombra', 28, 8, (p) => {
    ellipse(p, 14, 4, 13, 3.5, '#33691e')
  })

// Rali com Minimapa -------------------------------------------------------------------------------

/** A wall tile of the maze: a grass block with a little tree, so the roads stand out. */
const quarteirao = () =>
  svg('rali-muro', 80, 80, (p) => {
    p.fillStyle = '#558b2f'
    p.fillRect(0, 0, 80, 80)
    p.fillStyle = '#689f38'
    p.fillRect(4, 4, 72, 72)
    circle(p, 40, 40, 18, '#2e7d32')
    circle(p, 34, 34, 7, '#66bb6a')
  })

const estrada = () =>
  svg('rali-estrada', 80, 80, (p) => {
    p.fillStyle = '#455a64'
    p.fillRect(0, 0, 80, 80)
    p.fillStyle = '#546e7a'
    for (const [x, y] of [
      [12, 18],
      [60, 30],
      [28, 62],
      [52, 70],
    ] as const)
      p.fillRect(x, y, 3, 3)
  })

/** A rally car seen from above, pointing right. */
const carroDeRali = (id: string, cor: string) =>
  svg(id, 50, 30, (p) => {
    p.fillStyle = '#212121'
    for (const [rx, ry] of [
      [8, 0],
      [34, 0],
      [8, 25],
      [34, 25],
    ] as const)
      p.fillRect(rx, ry, 10, 5)
    roundRect(p, 2, 4, 46, 22, 8, cor)
    roundRect(p, 26, 8, 12, 14, 3, '#b3e5fc')
    p.fillStyle = '#ffffff'
    p.fillRect(6, 13, 16, 4)
  })

const bandeirinha = () =>
  svg('rali-bandeira', 40, 56, (p) => {
    p.fillStyle = '#eceff1'
    p.fillRect(8, 4, 4, 50)
    polygon(
      p,
      [
        [12, 4],
        [38, 14],
        [12, 26],
      ],
      '#fdd835',
    )
    ellipse(p, 10, 54, 9, 3, '#263238')
  })

const painelDoRali = () =>
  svg('rali-painel', 200, 600, (p) => {
    p.fillStyle = '#1a237e'
    p.fillRect(0, 0, 200, 600)
    p.fillStyle = '#3949ab'
    p.fillRect(0, 0, 4, 600)
    // The mini-map's frame: the whole maze, ten times smaller (160 × 160).
    p.fillStyle = '#0d1440'
    p.fillRect(20, 230, 160, 160)
    p.strokeStyle = '#ffffff'
    p.lineWidth = 2
    p.strokeRect(19, 229, 162, 162)
  })

export const WIREFRAME_C_ART: Record<string, () => Record<string, Uint8Array>> = {
  'cavando-por-gemas': () => ({
    'fundo.svg': fundoDaCaverna(),
    'parede.svg': parede(),
    'terra.svg': terra(),
    'pedra.svg': pedra('caverna-pedra', false),
    'pedra_caindo.svg': pedra('caverna-pedra-caindo', true),
    'gema.svg': gema(),
    'saida.svg': saida(false),
    'saida_aberta.svg': saida(true),
    'minerador_frente.png': minerador(MINERADOR_FRENTE),
    'minerador_direita.png': minerador(MINERADOR_DIREITA),
    'minerador_esquerda.png': minerador(espelhado(MINERADOR_DIREITA)),
  }),
  'editor-de-cavernas': () => ({
    'vazio.svg': vazio(),
    'parede.svg': parede(),
    'terra.svg': terra(),
    'pedra.svg': pedra('editor-pedra', false),
    'pedra_caindo.svg': pedra('editor-pedra-caindo', true),
    'gema.svg': gema(),
    'saida.svg': saida(false),
    'saida_aberta.svg': saida(true),
    'minerador.png': minerador(MINERADOR_FRENTE),
  }),
  'corrida-vista-de-cima': () => ({
    'pista.svg': pistaDeCorrida(),
    'guia.png': guiaDaPista(),
    ...Object.fromEntries([0, 1, 2, 3].map((numero) => [`carro${numero}.svg`, carrinho(numero)])),
  }),
  fliperama: () => ({
    'mesa.svg': mesaDoFliperama(),
    'mapa.png': mapaDoFliperama(),
    'brilho.svg': brilhoDosBatedores(),
    'flipper_esquerdo.svg': flipper(false),
    'flipper_direito.svg': flipper(true),
    'bola.svg': bolinha(),
  }),
  'minigolfe-maluco': () => ({
    ...Object.fromEntries(
      BURACOS.map((buraco, i) => [`buraco${i + 1}.svg`, desenhoDoBuraco(i + 1, buraco)]),
    ),
    ...Object.fromEntries(BURACOS.map((buraco, i) => [`mapa${i + 1}.png`, mapaDoBuraco(buraco)])),
    'seta.svg': setaDeMira(),
    'bolinha.svg': bolinhaDeGolfe(),
  }),
  'tiro-ao-prato': () => ({
    'fundo.svg': campoDeTiro(),
    'atirador.png': atirador(0),
    'atirador_esquerda.png': atirador(-1),
    'atirador_direita.png': atirador(1),
    'mira.svg': miraQuadrada(),
    'prato.svg': prato(),
    'prato_quebrando1.svg': pratoQuebrando(1),
    'prato_quebrando2.svg': pratoQuebrando(2),
    'prato_quebrando3.svg': pratoQuebrando(3),
    'sombra.svg': sombraDoPrato(),
  }),
  'rali-com-minimapa': () => ({
    'muro.svg': quarteirao(),
    'estrada.svg': estrada(),
    'carro.svg': carroDeRali('rali-carro', '#1e88e5'),
    'vermelho.svg': carroDeRali('rali-vermelho', '#e53935'),
    'bandeira.svg': bandeirinha(),
    'painel.svg': painelDoRali(),
  }),
  sinuca: () => ({
    'mesa.svg': mesaDeSinuca(),
    'branca.svg': bolaDeSinuca('sinuca-branca', '#fafafa', false),
    ...Object.fromEntries(
      ['#fdd835', '#1e88e5', '#e53935', '#8e24aa', '#fb8c00', '#43a047'].map((cor, numero) => [
        `bola${numero + 1}.svg`,
        bolaDeSinuca(`sinuca-bola${numero + 1}`, cor, true),
      ]),
    ),
  }),
}
