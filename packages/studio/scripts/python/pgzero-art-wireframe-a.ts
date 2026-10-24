import { FIGURAS } from '../../src/arte/catalogo'
import { circle, ellipse, figura, fundo, pixelArt, png, polygon, svg } from './pgzero-art'

/**
 * Art of the Wireframe recipes, sub-batch 2a (original, MIT, Sistema Zero 2026). Maps that a
 * game reads with `images.x.get_at` are PNG drawn pixel by pixel from the same geometry as
 * the visible art, so the invisible map always matches what the child sees.
 */

/** A pixel canvas for collision maps: exact colours, no anti-aliasing. */
export class Mapa {
  readonly rgba: Uint8Array
  constructor(
    readonly width: number,
    readonly height: number,
  ) {
    this.rgba = new Uint8Array(width * height * 4)
  }
  /** Adds channels (r, g, b) to the pixel, opaque. */
  pintar(x: number, y: number, [r, g, b]: readonly [number, number, number]) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return
    const at = (Math.floor(y) * this.width + Math.floor(x)) * 4
    this.rgba[at] = Math.max(this.rgba[at]!, r)
    this.rgba[at + 1] = Math.max(this.rgba[at + 1]!, g)
    this.rgba[at + 2] = Math.max(this.rgba[at + 2]!, b)
    this.rgba[at + 3] = 255
  }
  retangulo(x: number, y: number, w: number, h: number, cor: readonly [number, number, number]) {
    for (let yy = Math.floor(y); yy < y + h; yy++)
      for (let xx = Math.floor(x); xx < x + w; xx++) this.pintar(xx, yy, cor)
  }
  png() {
    return png(this.width, this.height, this.rgba)
  }
}

// Barris na Rampa (Donkey Kong) ------------------------------------------------------------

/** Girders as (left x, top y at left, right x, top y at right); 14 px thick. */
const VIGAS = [
  [0, 570, 800, 556],
  [100, 482, 800, 452],
  [0, 340, 700, 370],
  [100, 262, 800, 232],
  [0, 120, 700, 150],
] as const
const ESPESSURA = 14
/** Ladders: x of the centre, the girder below (index) and the girder above. */
const ESCADAS = [
  [650, 0, 1],
  [200, 1, 2],
  [600, 2, 3],
  [250, 3, 4],
] as const
const topoDaViga = (index: number, x: number) => {
  const [x0, y0, x1, y1] = VIGAS[index]!
  return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0)
}

const mapaDosBarris = () => {
  const mapa = new Mapa(800, 600)
  for (const [index, [x0, , x1]] of VIGAS.entries())
    for (let x = x0; x < x1; x++) {
      const topo = Math.round(topoDaViga(index, x))
      for (let y = topo; y < topo + ESPESSURA; y++) mapa.pintar(x, y, [255, 0, 0])
    }
  for (const [x, abaixo, acima] of ESCADAS) {
    const topo = Math.round(topoDaViga(acima, x))
    const base = Math.round(topoDaViga(abaixo, x))
    mapa.retangulo(x - 10, topo, 20, base - topo, [0, 0, 255])
  }
  return mapa.png()
}

const fundoDosBarris = () =>
  svg('barris-fundo', 800, 600, (p) => {
    p.fillStyle = '#0b0b2b'
    p.fillRect(0, 0, 800, 600)
    for (const [x, abaixo, acima] of ESCADAS) {
      const topo = topoDaViga(acima, x) + ESPESSURA
      const base = topoDaViga(abaixo, x)
      p.strokeStyle = '#4dd0e1'
      p.lineWidth = 3
      p.beginPath()
      p.moveTo(x - 9, topo)
      p.lineTo(x - 9, base)
      p.moveTo(x + 9, topo)
      p.lineTo(x + 9, base)
      for (let y = topo + 8; y < base; y += 12) {
        p.moveTo(x - 9, y)
        p.lineTo(x + 9, y)
      }
      p.stroke()
    }
    for (const [x0, y0, x1, y1] of VIGAS) {
      polygon(
        p,
        [
          [x0, y0],
          [x1, y1],
          [x1, y1 + ESPESSURA],
          [x0, y0 + ESPESSURA],
        ],
        '#e53935',
      )
      p.strokeStyle = '#ff8a80'
      p.lineWidth = 2
      p.beginPath()
      p.moveTo(x0, y0 + 1)
      p.lineTo(x1, y1 + 1)
      p.stroke()
      for (let x = x0 + 10; x < x1; x += 28) {
        const y = y0 + ((y1 - y0) * (x - x0)) / (x1 - x0)
        p.strokeStyle = '#8e0000'
        p.beginPath()
        p.moveTo(x, y + 2)
        p.lineTo(x + 14, y + ESPESSURA - 2)
        p.moveTo(x + 14, y + 2)
        p.lineTo(x, y + ESPESSURA - 2)
        p.stroke()
      }
    }
    // Where the barrels come from (the gorilla of the Jogo 2D art) and the finish flag.
    FIGURAS.gorila.desenhar(p, { x: 20, y: 36, w: 70, h: 84 }, { t: 0, chao: 120 })
    p.fillStyle = '#fdd835'
    p.fillRect(660, 70, 4, 60)
    polygon(
      p,
      [
        [664, 70],
        [700, 82],
        [664, 94],
      ],
      '#43a047',
    )
  })

/** A barrel seen from its end; the four frames turn its cross by 22.5° each, so it rolls. */
const barril = (quadro: number) =>
  svg(`barril${quadro}`, 32, 32, (p) => {
    circle(p, 16, 16, 15, '#a0522d', '#5d2e0f')
    p.lineWidth = 3
    p.strokeStyle = '#3e2009'
    p.beginPath()
    for (const volta of [0, Math.PI / 2]) {
      const angulo = volta + (quadro * Math.PI) / 8
      p.moveTo(16 + 12 * Math.cos(angulo), 16 + 12 * Math.sin(angulo))
      p.lineTo(16 - 12 * Math.cos(angulo), 16 - 12 * Math.sin(angulo))
    }
    p.stroke()
    circle(p, 16, 16, 5, '#d7a26b', '#5d2e0f')
  })

const HEROI_ARCADE = [
  '....rrrrr...',
  '...rrrrrrrr.',
  '...bbbsssk..',
  '..bsbssskss.',
  '..bsbbsssksss',
  '..bbsssskkkk',
  '....sssssss.',
  '...rrbrrr...',
  '..rrrbrrbrrr',
  '.rrrrbbbbrrrr',
  '.ssrbybbybrss',
  '.sssbbbbbbsss',
  '.ssbbbbbbbbss',
  '...bbb..bbb..',
  '..kkk....kkk.',
  '.kkkk....kkkk',
].map((row) => row.padEnd(13, '.').slice(0, 13))
const heroiArcade = () =>
  pixelArt(
    HEROI_ARCADE,
    { r: '#43a047', b: '#fb8c00', s: '#ffcc80', k: '#5d4037', y: '#fdd835' },
    2,
  )

// Salto nas Plataformas (Super Mario) -------------------------------------------------------

/** A five-pointed star with a soft glow, the prize on each platform. */
const estrelaDourada = () =>
  svg('estrela-dourada', 32, 32, (p) => {
    const pontas: [number, number][] = []
    for (let i = 0; i < 10; i++) {
      const raio = i % 2 ? 6.5 : 15
      const angulo = -Math.PI / 2 + (i * Math.PI) / 5
      pontas.push([16 + raio * Math.cos(angulo), 17 + raio * Math.sin(angulo)])
    }
    circle(p, 16, 17, 14, 'rgba(255, 241, 118, 0.35)')
    polygon(p, pontas, '#fdd835')
    p.strokeStyle = '#f57f17'
    p.lineWidth = 1.5
    p.beginPath()
    p.moveTo(pontas[0]![0], pontas[0]![1])
    for (const [x, y] of pontas.slice(1)) p.lineTo(x, y)
    p.closePath()
    p.stroke()
    circle(p, 13, 13, 2, '#fffde7')
  })

// Pirâmide de Cubos (Q*bert) ----------------------------------------------------------------

/** An isometric cube 64×64: the top face in the given colour, two shaded sides. */
const cuboIsometrico = (id: string, topo: string, borda: string) =>
  svg(id, 64, 64, (p) => {
    polygon(
      p,
      [
        [0, 16],
        [32, 32],
        [32, 64],
        [0, 48],
      ],
      '#3949ab',
    )
    polygon(
      p,
      [
        [64, 16],
        [32, 32],
        [32, 64],
        [64, 48],
      ],
      '#1a237e',
    )
    polygon(
      p,
      [
        [32, 0],
        [64, 16],
        [32, 32],
        [0, 16],
      ],
      topo,
    )
    p.strokeStyle = borda
    p.lineWidth = 2
    p.beginPath()
    p.moveTo(32, 1)
    p.lineTo(63, 16)
    p.lineTo(32, 31)
    p.lineTo(1, 16)
    p.closePath()
    p.stroke()
  })

/** The hopper: a round orange creature with a long snout and big feet (original design). */
const pulador = () =>
  svg('pulador', 40, 40, (p) => {
    ellipse(p, 13, 36, 7, 3.5, '#5d4037')
    ellipse(p, 27, 36, 7, 3.5, '#5d4037')
    circle(p, 20, 20, 14, '#fb8c00', '#e65100')
    p.fillStyle = '#ffb74d'
    p.beginPath()
    p.ellipse(31, 24, 8, 5, 0.3, 0, Math.PI * 2)
    p.fill()
    circle(p, 36, 26, 3, '#e65100')
    circle(p, 16, 14, 5, '#ffffff')
    circle(p, 24, 14, 5, '#ffffff')
    circle(p, 17, 15, 2.2, '#212121')
    circle(p, 25, 15, 2.2, '#212121')
  })

const bolinhaVermelha = () =>
  svg('bolinha', 24, 24, (p) => {
    circle(p, 12, 12, 11, '#e53935', '#8e0000')
    circle(p, 8, 8, 3, '#ffcdd2')
  })

const fundoDaPiramide = () =>
  svg('piramide-fundo', 500, 500, (p) => {
    const ceu = p.createLinearGradient(0, 0, 0, 500)
    ceu.addColorStop(0, '#0d0221')
    ceu.addColorStop(1, '#2a0845')
    p.fillStyle = ceu
    p.fillRect(0, 0, 500, 500)
    for (let i = 0; i < 60; i++) {
      const x = (i * 97) % 500
      const y = (i * 61) % 500
      circle(p, x, y, i % 3 ? 1 : 1.8, '#fff9c4')
    }
  })

// Cipó sobre o Poço (Pitfall) ---------------------------------------------------------------

const CHAO_DO_CIPO = 470
const POCO: readonly [number, number] = [260, 540]

/** Sky, the far side of the path, the tree trunks and the dark pit. */
const fundoDoCipo = () =>
  svg('cipo-fundo', 800, 600, (p) => {
    const ceu = p.createLinearGradient(0, 0, 0, 600)
    ceu.addColorStop(0, '#81d4fa')
    ceu.addColorStop(1, '#c5e1a5')
    p.fillStyle = ceu
    p.fillRect(0, 0, 800, 600)
    for (const x of [70, 190, 610, 730]) {
      p.fillStyle = '#6d4c41'
      p.fillRect(x - 14, 90, 28, CHAO_DO_CIPO - 90)
      p.fillStyle = '#4e342e'
      p.fillRect(x + 4, 90, 6, CHAO_DO_CIPO - 90)
    }
    // The branch the vine hangs from.
    p.fillStyle = '#5d4037'
    p.fillRect(300, 162, 200, 14)
    p.fillStyle = '#558b2f'
    p.fillRect(0, CHAO_DO_CIPO - 12, 800, 12)
    p.fillStyle = '#3e2723'
    p.fillRect(POCO[0], CHAO_DO_CIPO - 12, POCO[1] - POCO[0], 600 - CHAO_DO_CIPO + 12)
    p.fillStyle = '#1b0f0b'
    p.fillRect(POCO[0] + 12, CHAO_DO_CIPO + 20, POCO[1] - POCO[0] - 24, 600)
  })

/** The canopy, drawn over the vine so it looks hung from inside the leaves. */
const copas = () =>
  svg('cipo-copas', 800, 600, (p) => {
    const tons = ['#2e7d32', '#388e3c', '#43a047']
    for (let i = 0; i < 26; i++) {
      const x = (i * 37) % 820
      const y = 40 + ((i * 53) % 90)
      circle(p, x, y, 48 + (i % 3) * 8, tons[i % 3]!)
    }
    for (let i = 0; i < 18; i++) circle(p, (i * 61) % 800, 150 + ((i * 29) % 20), 3, '#c5e1a5')
  })

/** The front edge of the path, drawn over the explorer's feet; open over the pit. */
const chaoDaFrente = () =>
  svg('cipo-chao', 800, 140, (p) => {
    for (const [inicio, fim] of [
      [0, POCO[0]],
      [POCO[1], 800],
    ] as const) {
      p.fillStyle = '#8d6e63'
      p.fillRect(inicio, 5, fim - inicio, 135)
      p.fillStyle = '#a1887f'
      p.fillRect(inicio, 5, fim - inicio, 8)
      for (let x = inicio + 14; x < fim - 10; x += 34) circle(p, x, 40 + (x % 3) * 20, 4, '#6d4c41')
    }
  })

const cipo = () =>
  svg('cipo', 10, 260, (p) => {
    p.strokeStyle = '#33691e'
    p.lineWidth = 5
    p.beginPath()
    p.moveTo(5, 0)
    for (let y = 0; y <= 260; y += 20) p.lineTo(y % 40 ? 6.5 : 3.5, y)
    p.stroke()
    for (let y = 30; y < 250; y += 45) ellipse(p, y % 2 ? 7 : 3, y, 3.5, 6, '#7cb342')
  })

const EXPLORADOR = [
  '.....hhhhh......',
  '....hhhhhhh.....',
  '..hhhhhhhhhhh...',
  '.....ssssss.....',
  '.....sksskss....',
  '.....ssssss.....',
  '......ssss......',
  '....gggggggg....',
  '...gggggggggg...',
  '..ssgggggggggss.',
  '..ss.gggggggss..',
  '.....gggggggg...',
  '.....bbbbbbbb...',
  '.....pppppppp...',
  '.....ppp..ppp...',
  '.....ppp..ppp...',
  '.....ppp..ppp...',
  '.....ppp..ppp...',
  '....bbbb..bbbb..',
  '....bbbb..bbbb..',
]
const PALETA_EXPLORADOR = {
  h: '#8d6e63',
  s: '#ffcc80',
  k: '#3e2723',
  g: '#9e9d24',
  b: '#4e342e',
  p: '#6d4c41',
}
const explorador = (espelhar: boolean) =>
  pixelArt(
    espelhar ? EXPLORADOR.map((linha) => [...linha].reverse().join('')) : EXPLORADOR,
    PALETA_EXPLORADOR,
    2,
  )

/** A log seen from its end: it rolls by turning (Actor.angle). */
const tronco = () =>
  svg('tronco', 34, 34, (p) => {
    circle(p, 17, 17, 16, '#795548', '#3e2723')
    circle(p, 17, 17, 11, '#d7ccc8', '#a1887f')
    circle(p, 17, 17, 6, '#bcaaa4', '#a1887f')
    p.strokeStyle = '#6d4c41'
    p.lineWidth = 2
    p.beginPath()
    p.moveTo(17, 4)
    p.lineTo(17, 12)
    p.stroke()
  })

const tesouro = () =>
  svg('tesouro', 40, 30, (p) => {
    p.fillStyle = '#6d4c41'
    p.fillRect(2, 10, 36, 18)
    p.fillStyle = '#8d6e63'
    p.fillRect(2, 4, 36, 9)
    p.fillStyle = '#fdd835'
    p.fillRect(2, 12, 36, 3)
    p.fillRect(17, 10, 6, 10)
    circle(p, 20, 4, 4, '#fff176', '#f9a825')
  })

// Mina que Desmorona (Manic Miner) ----------------------------------------------------------

const fundoDaMina = () =>
  svg('mina-fundo', 800, 400, (p) => {
    p.fillStyle = '#1a1a2e'
    p.fillRect(0, 0, 800, 400)
    for (let i = 0; i < 70; i++) {
      const x = (i * 113) % 800
      const y = (i * 47) % 400
      ellipse(p, x, y, 18 + (i % 4) * 6, 10 + (i % 3) * 4, i % 2 ? '#242444' : '#20203c')
    }
    for (let i = 0; i < 14; i++) circle(p, (i * 151) % 800, 30 + ((i * 89) % 340), 2.5, '#4dd0e1')
  })

/** Legs of the three walking frames (rows 12 to 15 of the miner). */
const PERNAS_DO_MINEIRO = [
  ['...pp.pp....', '...pp.pp....', '...bb.bb....', '..bbb.bbb...'],
  ['...ppp.pp...', '..pp...pp...', '..bb....bb..', '.bbb....bbb.'],
  ['....pppp....', '....pp.p....', '....bb.b....', '...bbb.bb...'],
]
const mineiro = (quadro: number, espelhar: boolean) => {
  const linhas = [
    '....yyy.....',
    '...hhhhhy...',
    '..hhhhhhhh..',
    '...ssssss...',
    '...skssks...',
    '...ssssss...',
    '..ccccccc...',
    '.sccccccccs.',
    '.sccccccccs.',
    '..ccccccc...',
    '...bbbbbb...',
    ...PERNAS_DO_MINEIRO[quadro]!,
  ]
  return pixelArt(
    espelhar ? linhas.map((linha) => [...linha].reverse().join('')) : linhas,
    {
      y: '#fff176',
      h: '#fbc02d',
      s: '#ffcc80',
      k: '#3e2723',
      c: '#1e88e5',
      b: '#5d4037',
      p: '#455a64',
    },
    2,
  )
}

const robo = () =>
  svg('robo', 30, 34, (p) => {
    p.fillStyle = '#90a4ae'
    p.fillRect(5, 8, 20, 18)
    p.fillStyle = '#607d8b'
    p.fillRect(8, 26, 5, 8)
    p.fillRect(17, 26, 5, 8)
    p.fillStyle = '#ef5350'
    p.fillRect(8, 13, 14, 5)
    p.strokeStyle = '#cfd8dc'
    p.lineWidth = 2
    p.beginPath()
    p.moveTo(15, 8)
    p.lineTo(15, 2)
    p.stroke()
    circle(p, 15, 2, 2, '#ffeb3b')
  })

const porta = (aberta: boolean) =>
  svg(aberta ? 'porta-aberta' : 'porta', 40, 50, (p) => {
    p.fillStyle = '#5d4037'
    p.fillRect(0, 0, 40, 50)
    p.fillStyle = aberta ? '#fff59d' : '#8d6e63'
    p.fillRect(5, 5, 30, 45)
    if (aberta) {
      p.fillStyle = '#ffb300'
      p.fillRect(5, 5, 8, 45)
    } else {
      for (const y of [16, 30]) {
        p.fillStyle = '#6d4c41'
        p.fillRect(5, y, 30, 3)
      }
      circle(p, 29, 28, 2.5, '#fdd835')
    }
  })

const chave = () =>
  svg('chave', 22, 22, (p) => {
    circle(p, 7, 7, 6, '#fdd835', '#f57f17')
    circle(p, 7, 7, 2.5, '#1a1a2e')
    p.fillStyle = '#fdd835'
    p.fillRect(11, 6, 10, 3)
    p.fillRect(17, 9, 3, 5)
    p.fillRect(13, 9, 2, 4)
  })

// Escudos contra Invasores (Space Invaders) -------------------------------------------------

const ceuEstrelado = (id: string, width: number, height: number, semente: number) =>
  svg(id, width, height, (p) => {
    p.fillStyle = '#05051a'
    p.fillRect(0, 0, width, height)
    for (let i = 0; i < Math.round((width * height) / 4000); i++) {
      const x = (i * 131 + semente * 17) % width
      const y = (i * 71 + semente * 29) % height
      circle(p, x, y, i % 5 ? 1 : 1.8, i % 7 ? '#ffffff' : '#90caf9')
    }
  })

/** Three original invaders, one per row (a jellyfish, a one-eyed blob, a horned robot). */
const INVASORES: Record<string, { linhas: string[]; cor: string }> = {
  invasor_a: {
    cor: '#f06292',
    linhas: [
      '....####....',
      '..########..',
      '.##.####.##.',
      '############',
      '############',
      '.#..#..#..#.',
      '#..#..#..#..',
      '.#..#..#..#.',
    ],
  },
  invasor_b: {
    cor: '#4dd0e1',
    linhas: [
      '...######...',
      '.##########.',
      '###..##..###',
      '###..##..###',
      '############',
      '..##....##..',
      '.##......##.',
      '##........##',
    ],
  },
  invasor_c: {
    cor: '#aed581',
    linhas: [
      '#..........#',
      '.#..####..#.',
      '..########..',
      '.##.#..#.##.',
      '############',
      '.##########.',
      '.#.#....#.#.',
      '#..........#',
    ],
  },
}
const invasor = (nome: string) => {
  const { linhas, cor } = INVASORES[nome]!
  return pixelArt(linhas, { '#': cor }, 3)
}

const canhao = () =>
  svg('canhao', 52, 28, (p) => {
    p.fillStyle = '#43a047'
    p.fillRect(2, 14, 48, 14)
    p.fillRect(10, 8, 32, 8)
    p.fillRect(22, 0, 8, 10)
    p.fillStyle = '#a5d6a7'
    p.fillRect(4, 16, 44, 3)
  })

const tiroDoCanhao = () =>
  svg('tiro', 4, 16, (p) => {
    p.fillStyle = '#ffffff'
    p.fillRect(0, 0, 4, 16)
  })

const bomba = () =>
  svg('bomba', 10, 18, (p) => {
    p.strokeStyle = '#ffeb3b'
    p.lineWidth = 3
    p.beginPath()
    p.moveTo(5, 0)
    for (let y = 3; y <= 18; y += 3) p.lineTo(y % 6 ? 1.5 : 8.5, y)
    p.stroke()
  })

const explosao = () =>
  svg('explosao', 28, 28, (p) => {
    const pontas: [number, number][] = []
    for (let i = 0; i < 16; i++) {
      const raio = i % 2 ? 6 : 13
      const angulo = (i * Math.PI) / 8
      pontas.push([14 + raio * Math.cos(angulo), 14 + raio * Math.sin(angulo)])
    }
    polygon(p, pontas, '#ff7043')
    circle(p, 14, 14, 5, '#fff59d')
  })

// Mergulho Alienígena (Galaxian) ------------------------------------------------------------

const ceuProfundo = (id: string) =>
  svg(id, 600, 800, (p) => {
    const ceu = p.createLinearGradient(0, 0, 0, 800)
    ceu.addColorStop(0, '#000010')
    ceu.addColorStop(1, '#1a0033')
    p.fillStyle = ceu
    p.fillRect(0, 0, 600, 800)
    ellipse(p, 420, 260, 180, 90, 'rgba(126, 87, 194, 0.18)')
    ellipse(p, 160, 560, 150, 70, 'rgba(66, 165, 245, 0.14)')
  })

/** Stars on a transparent layer: blitted twice to scroll without a seam. */
const estrelasQuePassam = (id: string) =>
  svg(id, 600, 800, (p) => {
    for (let i = 0; i < 110; i++) {
      const x = (i * 149) % 600
      const y = (i * 263) % 800
      circle(p, x, y, i % 6 ? 1.1 : 2, i % 9 ? '#ffffff' : '#ffe082')
    }
  })

/** A winged bug alien; the two frames flap its wings. */
const alien = (quadro: number) =>
  svg(`alien${quadro}`, 34, 28, (p) => {
    const asa = quadro ? 6 : 12
    polygon(
      p,
      [
        [17, 14],
        [1, 14 - asa],
        [5, 22],
      ],
      '#ef5350',
    )
    polygon(
      p,
      [
        [17, 14],
        [33, 14 - asa],
        [29, 22],
      ],
      '#ef5350',
    )
    ellipse(p, 17, 15, 7, 11, '#ffca28')
    circle(p, 14, 10, 2.2, '#212121')
    circle(p, 20, 10, 2.2, '#212121')
    p.strokeStyle = '#ffca28'
    p.lineWidth = 1.5
    p.beginPath()
    p.moveTo(14, 5)
    p.lineTo(11, 1)
    p.moveTo(20, 5)
    p.lineTo(23, 1)
    p.stroke()
  })

const explosaoQuadro = (quadro: number) =>
  svg(`explosao${quadro}`, 34, 34, (p) => {
    const tamanho = 5 + quadro * 4
    const pontas: [number, number][] = []
    for (let i = 0; i < 12; i++) {
      const raio = i % 2 ? tamanho / 2 : tamanho
      const angulo = (i * Math.PI) / 6 + quadro
      pontas.push([17 + raio * Math.cos(angulo), 17 + raio * Math.sin(angulo)])
    }
    polygon(p, pontas, ['#fff59d', '#ffb74d', '#e64a19'][quadro - 1]!)
  })

// Nave-Mãe (Phoenix) ------------------------------------------------------------------------

/** The mothership: a wide hull with a dome; the pilot sits in the dome. */
const naveMae = () =>
  svg('nave-mae', 320, 90, (p) => {
    polygon(
      p,
      [
        [10, 52],
        [60, 26],
        [260, 26],
        [310, 52],
        [260, 76],
        [60, 76],
      ],
      '#546e7a',
    )
    p.fillStyle = '#78909c'
    p.fillRect(60, 30, 200, 10)
    for (let x = 40; x <= 280; x += 30) circle(p, x, 62, 4, '#ffca28')
    ellipse(p, 160, 34, 46, 28, 'rgba(129, 212, 250, 0.55)')
    p.strokeStyle = '#b3e5fc'
    p.lineWidth = 2
    p.beginPath()
    p.ellipse(160, 34, 46, 28, 0, Math.PI, Math.PI * 2)
    p.stroke()
  })

const piloto = () =>
  svg('piloto', 26, 26, (p) => {
    circle(p, 13, 14, 10, '#66bb6a', '#2e7d32')
    circle(p, 9, 12, 3, '#ffffff')
    circle(p, 17, 12, 3, '#ffffff')
    circle(p, 9, 12, 1.4, '#000000')
    circle(p, 17, 12, 1.4, '#000000')
    p.strokeStyle = '#1b5e20'
    p.lineWidth = 1.5
    p.beginPath()
    p.moveTo(9, 19)
    p.lineTo(17, 19)
    p.stroke()
  })

/** Every image of sub-batch 2a, by game and file name in its images/ folder. */
export const WIREFRAME_A_ART: Record<string, () => Record<string, Uint8Array>> = {
  'barris-na-rampa': () => ({
    'mapa.png': mapaDosBarris(),
    'fundo.svg': fundoDosBarris(),
    'barril0.svg': barril(0),
    'barril1.svg': barril(1),
    'barril2.svg': barril(2),
    'barril3.svg': barril(3),
    'heroi.png': heroiArcade(),
  }),
  'piramide-de-cubos': () => ({
    'cubo.svg': cuboIsometrico('cubo', '#4fc3f7', '#e1f5fe'),
    'cubo_pintado.svg': cuboIsometrico('cubo-pintado', '#fdd835', '#fff9c4'),
    'pulador.svg': pulador(),
    'bolinha.svg': bolinhaVermelha(),
    'fundo.svg': fundoDaPiramide(),
  }),
  'cipo-sobre-o-poco': () => ({
    'fundo.svg': fundoDoCipo(),
    'copas.svg': copas(),
    'chao.svg': chaoDaFrente(),
    'cipo.svg': cipo(),
    'explorador.png': explorador(false),
    'explorador_esq.png': explorador(true),
    'tronco.svg': tronco(),
    'tesouro.svg': tesouro(),
  }),
  'mina-que-desmorona': () => ({
    'fundo.svg': fundoDaMina(),
    'mineiro_d0.png': mineiro(0, false),
    'mineiro_d1.png': mineiro(1, false),
    'mineiro_d2.png': mineiro(2, false),
    'mineiro_e0.png': mineiro(0, true),
    'mineiro_e1.png': mineiro(1, true),
    'mineiro_e2.png': mineiro(2, true),
    'robo.svg': robo(),
    'porta.svg': porta(false),
    'porta_aberta.svg': porta(true),
    'chave.svg': chave(),
  }),
  'escudos-contra-invasores': () => ({
    'fundo.svg': ceuEstrelado('invasores-fundo', 800, 600, 1),
    'invasor_a.png': invasor('invasor_a'),
    'invasor_b.png': invasor('invasor_b'),
    'invasor_c.png': invasor('invasor_c'),
    'canhao.svg': canhao(),
    'tiro.svg': tiroDoCanhao(),
    'bomba.svg': bomba(),
    'explosao.svg': explosao(),
  }),
  'mergulho-alienigena': () => ({
    'fundo.svg': ceuProfundo('mergulho-fundo'),
    'estrelas.svg': estrelasQuePassam('mergulho-estrelas'),
    'nave.svg': figura('nave', 'nave', 44, 52),
    'tiro.svg': tiroDoCanhao(),
    'bomba.svg': bomba(),
    'alien0.svg': alien(0),
    'alien1.svg': alien(1),
    'explosao1.svg': explosaoQuadro(1),
    'explosao2.svg': explosaoQuadro(2),
    'explosao3.svg': explosaoQuadro(3),
  }),
  'nave-mae': () => ({
    'fundo.svg': ceuProfundo('nave-mae-fundo'),
    'estrelas.svg': estrelasQuePassam('nave-mae-estrelas'),
    'nave_mae.svg': naveMae(),
    'piloto.svg': piloto(),
    'nave.svg': figura('nave', 'nave', 44, 52),
    'tiro.svg': tiroDoCanhao(),
    'bomba.svg': bomba(),
  }),
  'salto-nas-plataformas': () => ({
    'fundo.svg': fundo('fundo', 'floresta', 800, 600, 560),
    'dino.svg': figura('dino', 'dino', 56, 60),
    'estrela.svg': estrelaDourada(),
  }),
}
