import { circle, ellipse, polygon, roundRect, svg } from './pgzero-art'
import { Mapa } from './pgzero-art-wireframe-a'

/**
 * Art of the Wireframe recipes, sub-batch 2d (original, MIT, Sistema Zero 2026).
 */

// Pouso Lunar ---------------------------------------------------------------------------------

/** The moon's surface, left to right; the flat stretches are the landing pads (see PISTAS). */
const TERRENO: readonly (readonly [number, number])[] = [
  [0, 430],
  [50, 400],
  [90, 440],
  [120, 470],
  [200, 470],
  [240, 420],
  [280, 360],
  [320, 450],
  [360, 540],
  [420, 540],
  [450, 470],
  [500, 430],
  [540, 350],
  [580, 330],
  [620, 300],
  [670, 300],
  [700, 380],
  [740, 420],
  [800, 390],
]
const PISTAS = [
  [120, 200, 470],
  [360, 420, 540],
  [620, 670, 300],
] as const

/** The surface height at x, along the straight pieces between the points. */
const alturaDoChao = (x: number) => {
  for (let i = 0; i < TERRENO.length - 1; i++) {
    const [x0, y0] = TERRENO[i]!
    const [x1, y1] = TERRENO[i + 1]!
    if (x >= x0 && x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0)
  }
  return TERRENO.at(-1)![1]
}

/** The collision map (never drawn): white is the ground, black the sky. */
const mapaDaLua = () => {
  const mapa = new Mapa(800, 600)
  for (let x = 0; x < 800; x++) {
    const chao = alturaDoChao(x + 0.5)
    for (let y = 0; y < 600; y++) mapa.pintar(x, y, y + 0.5 >= chao ? [255, 255, 255] : [0, 0, 0])
  }
  return mapa.png()
}

const ceuDaLua = () =>
  svg('lua-ceu', 800, 600, (p) => {
    p.fillStyle = '#05050f'
    p.fillRect(0, 0, 800, 600)
    for (let i = 0; i < 90; i++)
      circle(p, (i * 173) % 800, (i * 97) % 420, i % 7 ? 1 : 1.8, '#ffffff')
    // The Earth, far away.
    circle(p, 690, 110, 34, '#1e88e5')
    circle(p, 680, 100, 12, '#43a047')
    circle(p, 702, 122, 9, '#43a047')
  })

const terrenoDaLua = () =>
  svg('lua-terreno', 800, 600, (p) => {
    polygon(p, [...TERRENO, [800, 600], [0, 600]], '#9e9e9e')
    for (const [x, y, r] of [
      [70, 500, 14],
      [260, 470, 10],
      [480, 520, 18],
      [560, 420, 9],
      [720, 480, 16],
      [160, 560, 12],
    ] as const) {
      circle(p, x, y, r, '#757575')
      circle(p, x + r * 0.2, y + r * 0.2, r * 0.7, '#8d8d8d')
    }
    for (const [comeco, fim, altura] of PISTAS) {
      p.fillStyle = '#fdd835'
      p.fillRect(comeco, altura - 2, fim - comeco, 4)
    }
  })

/** The lander 40 × 56, nose up: body down to y = 44 (the feet), the flame below when it burns. */
const modulo = (fogo: boolean) =>
  svg(fogo ? 'lua-modulo-fogo' : 'lua-modulo', 40, 56, (p) => {
    if (fogo)
      polygon(
        p,
        [
          [14, 40],
          [20, 56],
          [26, 40],
        ],
        '#ff9800',
      )
    p.strokeStyle = '#cfd8dc'
    p.lineWidth = 3
    p.beginPath()
    p.moveTo(10, 30)
    p.lineTo(4, 44)
    p.moveTo(30, 30)
    p.lineTo(36, 44)
    p.stroke()
    roundRect(p, 8, 18, 24, 16, 3, '#fbc02d')
    circle(p, 20, 12, 10, '#eceff1', '#90a4ae')
    circle(p, 20, 12, 5, '#0d47a1')
    p.fillStyle = '#616161'
    p.fillRect(16, 34, 8, 6)
  })

const pedacosDoModulo = () =>
  svg('lua-pedacos', 48, 24, (p) => {
    polygon(
      p,
      [
        [2, 22],
        [12, 8],
        [20, 22],
      ],
      '#fbc02d',
    )
    circle(p, 30, 16, 7, '#eceff1', '#90a4ae')
    polygon(
      p,
      [
        [36, 22],
        [44, 10],
        [47, 22],
      ],
      '#cfd8dc',
    )
    circle(p, 24, 8, 4, '#ff7043')
  })

// Quebra-Tijolos ------------------------------------------------------------------------------

const bolaDeTijolos = () =>
  svg('tijolos-bola', 12, 12, (p) => {
    circle(p, 6, 6, 5.5, '#ffffff', '#b0bec5')
    circle(p, 4.5, 4.5, 1.5, '#e3f2fd')
  })

// Sapo Atravessa ------------------------------------------------------------------------------

const TOCAS = [80, 240, 400, 560, 720]

const fundoDoSapo = () =>
  svg('sapo-fundo', 800, 600, (p) => {
    p.fillStyle = '#101010'
    p.fillRect(0, 0, 800, 60)
    // The bank with the five dens at the top.
    p.fillStyle = '#2e7d32'
    p.fillRect(0, 60, 800, 60)
    for (const x of TOCAS) roundRect(p, x - 24, 76, 48, 44, 10, '#0d47a1')
    // The river.
    p.fillStyle = '#1565c0'
    p.fillRect(0, 120, 800, 200)
    p.strokeStyle = '#42a5f5'
    p.lineWidth = 2
    for (let onda = 0; onda < 24; onda++) {
      const x = (onda * 137) % 800
      const y = 130 + ((onda * 53) % 180)
      p.beginPath()
      p.moveTo(x, y)
      p.quadraticCurveTo(x + 10, y - 4, x + 20, y)
      p.stroke()
    }
    // The safe grass in the middle, the road and the start.
    p.fillStyle = '#7cb342'
    p.fillRect(0, 320, 800, 40)
    p.fillStyle = '#37474f'
    p.fillRect(0, 360, 800, 200)
    p.fillStyle = '#eceff1'
    for (let faixa = 1; faixa < 5; faixa++)
      for (let x = 10; x < 800; x += 60) p.fillRect(x, 360 + faixa * 40 - 1, 30, 2)
    p.fillStyle = '#7cb342'
    p.fillRect(0, 560, 800, 40)
  })

/** The frog seen from above, nose up (Pygame Zero turns it with angle). */
const sapo = (pulando: boolean) =>
  svg(pulando ? 'sapo-pulando' : 'sapo-parado', 36, 36, (p) => {
    const perna = pulando ? 10 : 4
    for (const lado of [-1, 1]) {
      ellipse(p, 18 + lado * 12, 26 + perna / 2, 5, 6 + perna / 2, '#2e7d32')
      ellipse(p, 18 + lado * 12, 12, 4, 5, '#2e7d32')
    }
    ellipse(p, 18, 18, 11, 13, '#43a047')
    circle(p, 13, 9, 4, '#ffffff')
    circle(p, 23, 9, 4, '#ffffff')
    circle(p, 13, 8, 2, '#212121')
    circle(p, 23, 8, 2, '#212121')
  })

const sapoNaToca = () =>
  svg('sapo-toca', 40, 40, (p) => {
    circle(p, 20, 22, 16, '#66bb6a')
    ellipse(p, 20, 22, 10, 11, '#43a047')
    circle(p, 15, 15, 3.5, '#ffffff')
    circle(p, 25, 15, 3.5, '#ffffff')
    circle(p, 15, 14, 1.8, '#212121')
    circle(p, 25, 14, 1.8, '#212121')
  })

const mancha = () =>
  svg('sapo-mancha', 40, 40, (p) => {
    for (const [x, y, r] of [
      [20, 20, 12],
      [8, 12, 5],
      [32, 10, 4],
      [30, 32, 6],
      [9, 31, 4],
    ] as const)
      circle(p, x, y, r, '#b71c1c')
  })

/** A car seen from above, pointing right; `esquerda` mirrors it for the lanes that go left. */
const veiculo = (id: string, largura: number, cor: string, esquerda: boolean, caminhao = false) =>
  svg(id, largura, 34, (p) => {
    if (esquerda) {
      p.translate(largura, 0)
      p.scale(-1, 1)
    }
    p.fillStyle = '#212121'
    for (const x of [8, largura - 20]) {
      p.fillRect(x, 1, 12, 5)
      p.fillRect(x, 28, 12, 5)
    }
    if (caminhao) {
      roundRect(p, 2, 4, largura - 34, 26, 3, '#eceff1')
      roundRect(p, largura - 30, 5, 28, 24, 5, cor)
      roundRect(p, largura - 16, 9, 9, 16, 2, '#b3e5fc')
    } else {
      roundRect(p, 2, 4, largura - 4, 26, 9, cor)
      roundRect(p, largura - 24, 8, 10, 18, 3, '#b3e5fc')
      roundRect(p, 10, 9, 10, 16, 3, '#b3e5fc')
    }
  })

const trator = () =>
  svg('sapo-trator', 64, 36, (p) => {
    p.fillStyle = '#212121'
    p.fillRect(4, 0, 20, 8)
    p.fillRect(4, 28, 20, 8)
    p.fillRect(44, 4, 12, 6)
    p.fillRect(44, 26, 12, 6)
    roundRect(p, 6, 8, 54, 20, 4, '#43a047')
    roundRect(p, 8, 10, 20, 16, 3, '#2e7d32')
  })

const tronco = (id: string, largura: number) =>
  svg(id, largura, 30, (p) => {
    roundRect(p, 0, 2, largura, 26, 13, '#6d4c41')
    p.strokeStyle = '#4e342e'
    p.lineWidth = 2
    for (let x = 20; x < largura - 10; x += 26) {
      p.beginPath()
      p.moveTo(x, 8)
      p.lineTo(x + 12, 8)
      p.moveTo(x + 6, 20)
      p.lineTo(x + 18, 20)
      p.stroke()
    }
    ellipse(p, largura - 6, 15, 5, 12, '#a1887f')
  })

const tartarugas = () =>
  svg('sapo-tartarugas', 110, 30, (p) => {
    for (const x of [18, 55, 92]) {
      circle(p, x - 14, 15, 5, '#8bc34a')
      circle(p, x, 15, 13, '#c62828', '#7f0000')
      circle(p, x, 15, 6, '#e57373')
    }
  })

// Patrulha em Camadas -------------------------------------------------------------------------

/** A ridge that repeats every 800 px, so a layer 1600 px wide joins itself without a seam. */
const cordilheira = (base: number, picos: readonly (readonly [number, number])[]) =>
  Array.from({ length: 161 }, (_, i) => {
    const x = i * 10
    const y = picos.reduce(
      (alto, [vezes, altura]) => alto - altura * Math.sin((x / 800) * Math.PI * 2 * vezes),
      base,
    )
    return [x, y] as const
  })

const montanhasLonge = () =>
  svg('patrulha-longe', 1600, 450, (p) => {
    const ceu = p.createLinearGradient(0, 0, 0, 450)
    ceu.addColorStop(0, '#0b0628')
    ceu.addColorStop(1, '#3a1c71')
    p.fillStyle = ceu
    p.fillRect(0, 0, 1600, 450)
    for (let i = 0; i < 120; i++)
      circle(p, (i * 131) % 1600, (i * 71) % 220, i % 9 ? 1 : 1.8, '#ffffff')
    for (const x of [300, 1100]) circle(p, x, 90, 30, '#fff9c4')
    polygon(
      p,
      [
        ...cordilheira(260, [
          [2, 40],
          [5, 18],
        ]),
        [1600, 450],
        [0, 450],
      ],
      '#4a3a8a',
    )
  })

const morros = () =>
  svg('patrulha-morros', 1600, 450, (p) => {
    polygon(
      p,
      [
        ...cordilheira(320, [
          [3, 30],
          [7, 12],
        ]),
        [1600, 450],
        [0, 450],
      ],
      '#6a4fb3',
    )
  })

const chaoDaPatrulha = () =>
  svg('patrulha-chao', 1600, 450, (p) => {
    p.fillStyle = '#8d6e63'
    p.fillRect(0, 380, 1600, 70)
    p.fillStyle = '#6d4c41'
    p.fillRect(0, 380, 1600, 6)
    for (let i = 0; i < 40; i++)
      circle(p, ((i * 83) % 800) + (i % 2) * 800, 400 + ((i * 29) % 40), 3, '#a1887f')
  })

const buraco = () =>
  svg('patrulha-buraco', 80, 50, (p) => {
    p.fillStyle = '#1a0f0a'
    p.beginPath()
    p.moveTo(0, 4)
    p.lineTo(80, 4)
    p.lineTo(64, 50)
    p.lineTo(16, 50)
    p.closePath()
    p.fill()
    p.fillStyle = '#6d4c41'
    p.fillRect(0, 0, 80, 4)
  })

const pedra = () =>
  svg('patrulha-pedra', 40, 32, (p) => {
    polygon(
      p,
      [
        [2, 32],
        [8, 10],
        [20, 2],
        [34, 8],
        [38, 32],
      ],
      '#9e9e9e',
    )
    polygon(
      p,
      [
        [12, 14],
        [20, 6],
        [26, 12],
      ],
      '#cfcfcf',
    )
  })

/** The moon buggy, 72 × 40, its wheels touching the bottom edge. */
const jipe = (batido: boolean) =>
  svg(batido ? 'patrulha-jipe-batido' : 'patrulha-jipe', 72, 40, (p) => {
    if (batido) {
      p.translate(36, 20)
      p.rotate(-0.4)
      p.translate(-36, -20)
    }
    roundRect(p, 6, 10, 60, 16, 5, '#e53935')
    roundRect(p, 22, 2, 24, 12, 4, '#90caf9')
    p.fillStyle = '#fdd835'
    p.fillRect(62, 14, 8, 4)
    for (const x of [14, 36, 58]) {
      circle(p, x, 31, 8, '#263238')
      circle(p, x, 31, 3, '#b0bec5')
    }
  })

// Motos de Luz --------------------------------------------------------------------------------

const arenaDeLuz = () =>
  svg('motos-arena', 800, 600, (p) => {
    p.fillStyle = '#02040c'
    p.fillRect(0, 0, 800, 600)
    p.fillStyle = '#0a1a2e'
    p.fillRect(0, 50, 800, 550)
    p.strokeStyle = '#123a5a'
    p.lineWidth = 1
    p.beginPath()
    for (let x = 0; x <= 800; x += 40) {
      p.moveTo(x + 0.5, 50)
      p.lineTo(x + 0.5, 600)
    }
    for (let y = 50; y <= 600; y += 40) {
      p.moveTo(0, y + 0.5)
      p.lineTo(800, y + 0.5)
    }
    p.stroke()
    p.strokeStyle = '#4fc3f7'
    p.lineWidth = 3
    p.strokeRect(1.5, 51.5, 797, 547)
  })

/** A light cycle 14 × 24 seen from above, nose up. */
const motoDeLuz = (id: string, cor: string, brilho: string) =>
  svg(id, 14, 24, (p) => {
    roundRect(p, 3, 1, 8, 22, 4, cor)
    roundRect(p, 5, 4, 4, 8, 2, brilho)
    p.fillStyle = '#212121'
    p.fillRect(2, 2, 10, 3)
    p.fillRect(2, 19, 10, 3)
  })

// Arena de Dois Comandos ------------------------------------------------------------------------

const arenaDeComandos = () =>
  svg('comandos-arena', 800, 600, (p) => {
    p.fillStyle = '#120a1e'
    p.fillRect(0, 0, 800, 600)
    p.fillStyle = '#2a1f3d'
    p.fillRect(60, 70, 680, 500)
    p.strokeStyle = '#3a2d52'
    p.lineWidth = 1
    p.beginPath()
    for (let x = 60; x <= 740; x += 40) {
      p.moveTo(x + 0.5, 70)
      p.lineTo(x + 0.5, 570)
    }
    for (let y = 70; y <= 570; y += 40) {
      p.moveTo(60, y + 0.5)
      p.lineTo(740, y + 0.5)
    }
    p.stroke()
    p.strokeStyle = '#ff4081'
    p.lineWidth = 4
    p.strokeRect(58, 68, 684, 504)
  })

const esteira = () =>
  svg('comandos-esteira', 40, 40, (p) => {
    p.fillStyle = '#37474f'
    p.fillRect(2, 4, 8, 32)
    p.fillRect(30, 4, 8, 32)
    p.fillStyle = '#78909c'
    for (let y = 6; y < 36; y += 6) {
      p.fillRect(2, y, 8, 2)
      p.fillRect(30, y, 8, 2)
    }
    roundRect(p, 8, 8, 24, 24, 4, '#43a047')
  })

/** The turret 44 x 44: a dome in the middle and the gun pointing right (angle 0). */
const torre = () =>
  svg('comandos-torre', 44, 44, (p) => {
    p.fillStyle = '#1b5e20'
    p.fillRect(22, 19, 22, 6)
    circle(p, 22, 22, 10, '#66bb6a', '#1b5e20')
  })

const robo = () =>
  svg('comandos-robo', 30, 30, (p) => {
    roundRect(p, 5, 8, 20, 16, 3, '#e53935')
    roundRect(p, 8, 1, 14, 9, 2, '#ef5350')
    circle(p, 12, 5, 2, '#ffeb3b')
    circle(p, 18, 5, 2, '#ffeb3b')
    p.fillStyle = '#b71c1c'
    p.fillRect(7, 24, 5, 6)
    p.fillRect(18, 24, 5, 6)
    p.fillRect(1, 10, 4, 10)
    p.fillRect(25, 10, 4, 10)
  })

const pessoa = () =>
  svg('comandos-pessoa', 20, 30, (p) => {
    circle(p, 10, 6, 5, '#ffcc80')
    roundRect(p, 5, 11, 10, 11, 3, '#29b6f6')
    p.fillStyle = '#5d4037'
    p.fillRect(5, 22, 4, 8)
    p.fillRect(11, 22, 4, 8)
  })

const balaDoTanque = () =>
  svg('comandos-bala', 8, 8, (p) => {
    circle(p, 4, 4, 3.5, '#fff59d', '#fbc02d')
  })

// Bombas no Labirinto --------------------------------------------------------------------------

const chaoDoLabirinto = () =>
  svg('bombas-chao', 48, 48, (p) => {
    p.fillStyle = '#388e3c'
    p.fillRect(0, 0, 48, 48)
    p.fillStyle = '#43a047'
    p.fillRect(2, 2, 44, 44)
  })

const paredeDoLabirinto = () =>
  svg('bombas-parede', 48, 48, (p) => {
    p.fillStyle = '#455a64'
    p.fillRect(0, 0, 48, 48)
    p.fillStyle = '#78909c'
    p.fillRect(2, 2, 44, 44)
    p.fillStyle = '#90a4ae'
    p.fillRect(2, 2, 44, 6)
    p.fillStyle = '#546e7a'
    p.fillRect(2, 40, 44, 6)
  })

const tijoloDoLabirinto = () =>
  svg('bombas-tijolo', 48, 48, (p) => {
    p.fillStyle = '#5d2e1a'
    p.fillRect(0, 0, 48, 48)
    p.fillStyle = '#a1522c'
    for (const [x, y, w] of [
      [1, 1, 22],
      [25, 1, 22],
      [1, 17, 10],
      [13, 17, 22],
      [37, 17, 10],
      [1, 33, 22],
      [25, 33, 22],
    ] as const)
      p.fillRect(x, y, w, 14)
  })

const bombaDoLabirinto = () =>
  svg('bombas-bomba', 48, 48, (p) => {
    p.fillStyle = '#388e3c'
    p.fillRect(0, 0, 48, 48)
    circle(p, 24, 28, 15, '#212121')
    circle(p, 18, 22, 4, '#616161')
    p.strokeStyle = '#8d6e63'
    p.lineWidth = 3
    p.beginPath()
    p.moveTo(30, 15)
    p.quadraticCurveTo(36, 6, 42, 8)
    p.stroke()
    circle(p, 42, 8, 4, '#ffca28')
  })

const fogoDoLabirinto = () =>
  svg('bombas-fogo', 48, 48, (p) => {
    p.fillStyle = '#ff6f00'
    p.fillRect(0, 0, 48, 48)
    circle(p, 24, 24, 20, '#ffa000')
    circle(p, 24, 24, 12, '#ffeb3b')
    circle(p, 24, 24, 5, '#ffffff')
  })

const portaDoLabirinto = () =>
  svg('bombas-porta', 48, 48, (p) => {
    roundRect(p, 8, 4, 32, 42, 6, '#5d4037')
    roundRect(p, 12, 8, 24, 36, 4, '#26c6da')
    circle(p, 30, 26, 2.5, '#ffeb3b')
  })

const heroiDasBombas = () =>
  svg('bombas-heroi', 40, 40, (p) => {
    circle(p, 20, 14, 11, '#ffffff', '#90a4ae')
    roundRect(p, 13, 10, 14, 8, 3, '#ffcc80')
    circle(p, 17, 14, 2, '#212121')
    circle(p, 23, 14, 2, '#212121')
    roundRect(p, 11, 24, 18, 12, 4, '#1e88e5')
    circle(p, 20, 3, 3, '#e53935')
  })

const monstroDasBombas = () =>
  svg('bombas-monstro', 40, 40, (p) => {
    circle(p, 20, 20, 15, '#ab47bc', '#6a1b9a')
    circle(p, 14, 17, 5, '#ffffff')
    circle(p, 26, 17, 5, '#ffffff')
    circle(p, 15, 18, 2.5, '#212121')
    circle(p, 27, 18, 2.5, '#212121')
    p.fillStyle = '#ffffff'
    for (const x of [14, 19, 24]) p.fillRect(x, 26, 3, 4)
  })

// Corredor do Kung Fu --------------------------------------------------------------------------

type Ponto = readonly [number, number]
interface PoseDeLuta {
  joelhoDaFrente: Ponto
  peDaFrente: Ponto
  joelhoDeTras: Ponto
  peDeTras: Ponto
  cotoveloDaFrente: Ponto
  maoDaFrente: Ponto
  cotoveloDeTras: Ponto
  maoDeTras: Ponto
}
interface Traje {
  pele: string
  roupa: string
  sombra: string
  faixa: string
  cabeca: string
}

const GUARDA = {
  cotoveloDaFrente: [58, 40],
  maoDaFrente: [64, 32],
  cotoveloDeTras: [42, 42],
  maoDeTras: [52, 36],
} as const
const POSES_DE_LUTA: Record<string, PoseDeLuta> = {
  parado: {
    joelhoDaFrente: [56, 74],
    peDaFrente: [60, 93],
    joelhoDeTras: [42, 74],
    peDeTras: [36, 93],
    ...GUARDA,
  },
  andando1: {
    joelhoDaFrente: [60, 74],
    peDaFrente: [68, 93],
    joelhoDeTras: [40, 74],
    peDeTras: [28, 93],
    ...GUARDA,
  },
  andando2: {
    joelhoDaFrente: [54, 72],
    peDaFrente: [50, 90],
    joelhoDeTras: [46, 74],
    peDeTras: [44, 93],
    ...GUARDA,
  },
  andando3: {
    joelhoDaFrente: [44, 74],
    peDaFrente: [30, 93],
    joelhoDeTras: [58, 74],
    peDeTras: [66, 93],
    ...GUARDA,
  },
  andando4: {
    joelhoDaFrente: [46, 74],
    peDaFrente: [44, 93],
    joelhoDeTras: [54, 72],
    peDeTras: [52, 90],
    ...GUARDA,
  },
  soco: {
    joelhoDaFrente: [58, 74],
    peDaFrente: [64, 93],
    joelhoDeTras: [40, 74],
    peDeTras: [32, 93],
    cotoveloDaFrente: [68, 31],
    maoDaFrente: [88, 30],
    cotoveloDeTras: [40, 42],
    maoDeTras: [48, 38],
  },
  chute: {
    joelhoDaFrente: [68, 52],
    peDaFrente: [92, 46],
    joelhoDeTras: [46, 75],
    peDeTras: [42, 93],
    cotoveloDaFrente: [56, 40],
    maoDaFrente: [62, 33],
    cotoveloDeTras: [38, 38],
    maoDeTras: [28, 30],
  },
}

const HEROI_DO_KUNG_FU: Traje = {
  pele: '#ffcc80',
  roupa: '#fafafa',
  sombra: '#cfd8dc',
  faixa: '#212121',
  cabeca: 'heroi',
}
const CAPANGA: Traje = {
  pele: '#ffcc80',
  roupa: '#7b1fa2',
  sombra: '#4a148c',
  faixa: '#ffca28',
  cabeca: 'capanga',
}

/** A fighter 96 x 96 facing right (or mirrored), feet at the bottom edge; `giro` tips it over. */
const lutador = (id: string, traje: Traje, pose: PoseDeLuta, espelhar: boolean, giro = 0) =>
  svg(id, 96, 96, (p) => {
    if (espelhar) {
      p.translate(96, 0)
      p.scale(-1, 1)
    }
    if (giro) {
      p.translate(48, 94)
      p.rotate(giro)
      p.translate(-48, -94)
    }
    const membro = (de: Ponto, meio: Ponto, ate: Ponto, cor: string, largura: number) => {
      p.strokeStyle = cor
      p.lineWidth = largura
      p.lineCap = 'round'
      p.lineJoin = 'round'
      p.beginPath()
      p.moveTo(de[0], de[1])
      p.lineTo(meio[0], meio[1])
      p.lineTo(ate[0], ate[1])
      p.stroke()
    }
    const quadril: Ponto = [48, 56]
    const ombro: Ponto = [48, 31]
    membro(quadril, pose.joelhoDeTras, pose.peDeTras, traje.sombra, 10)
    circle(p, pose.peDeTras[0], pose.peDeTras[1], 3.5, '#3e2723')
    membro(ombro, pose.cotoveloDeTras, pose.maoDeTras, traje.sombra, 7)
    circle(p, pose.maoDeTras[0], pose.maoDeTras[1], 4, traje.pele)
    roundRect(p, 38, 25, 21, 35, 7, traje.roupa)
    p.fillStyle = traje.faixa
    p.fillRect(38, 51, 21, 5)
    membro(quadril, pose.joelhoDaFrente, pose.peDaFrente, traje.roupa, 10)
    circle(p, pose.peDaFrente[0], pose.peDaFrente[1], 3.5, '#3e2723')
    circle(p, 49, 15, 10, traje.pele)
    if (traje.cabeca === 'heroi') {
      // The black hair and the red headband with its tails flying behind.
      p.fillStyle = '#212121'
      p.beginPath()
      p.arc(49, 13, 10, Math.PI, 2 * Math.PI)
      p.fill()
      p.fillStyle = '#e53935'
      p.fillRect(39, 10, 20, 4)
      polygon(
        p,
        [
          [40, 11],
          [30, 8],
          [32, 15],
        ],
        '#e53935',
      )
    } else {
      // The goon's purple hood with an opening for the eyes.
      p.fillStyle = '#4a148c'
      p.beginPath()
      p.arc(49, 15, 10.5, 0, 2 * Math.PI)
      p.fill()
      p.fillStyle = traje.pele
      p.fillRect(48, 11, 10, 5)
    }
    circle(p, 54, 14, 1.6, '#212121')
    membro(ombro, pose.cotoveloDaFrente, pose.maoDaFrente, traje.roupa, 7)
    circle(p, pose.maoDaFrente[0], pose.maoDaFrente[1], 4.5, traje.pele)
  })

/** The corridor, 2000 x 410: the stairs to the next floor at x 400, the door the hero came in at 1600. */
const corredorDoKungFu = () =>
  svg('kungfu-corredor', 2000, 410, (p) => {
    p.fillStyle = '#4e1f1a'
    p.fillRect(0, 0, 2000, 410)
    // Wall panels, a little lighter, between dark wooden pillars.
    for (let x = 0; x < 2000; x += 250) {
      roundRect(p, x + 34, 40, 182, 250, 6, '#6d2a22')
      roundRect(p, x + 48, 54, 154, 222, 4, '#7f342a')
      p.fillStyle = '#2b0f0c'
      p.fillRect(x, 0, 26, 360)
      p.fillStyle = '#3b1611'
      p.fillRect(x + 4, 0, 6, 360)
    }
    // The red lanterns hang over the middle of the panels.
    for (let x = 125; x < 2000; x += 250) {
      p.strokeStyle = '#2b0f0c'
      p.lineWidth = 2
      p.beginPath()
      p.moveTo(x, 0)
      p.lineTo(x, 70)
      p.stroke()
      ellipse(p, x, 92, 18, 24, '#e53935')
      p.fillStyle = '#ffca28'
      p.fillRect(x - 10, 66, 20, 5)
      p.fillRect(x - 10, 113, 20, 5)
      ellipse(p, x, 92, 8, 16, '#ff7043')
    }
    // The beam along the ceiling.
    p.fillStyle = '#2b0f0c'
    p.fillRect(0, 0, 2000, 18)
    // The floor boards.
    p.fillStyle = '#8d5524'
    p.fillRect(0, 360, 2000, 50)
    p.fillStyle = '#6d4019'
    p.fillRect(0, 360, 2000, 6)
    for (let x = 0; x < 2000; x += 80) p.fillRect(x, 366, 3, 44)
    // The stairs climb to the left, ending at an opening in the ceiling.
    p.fillStyle = '#1a0907'
    p.fillRect(300, 0, 150, 120)
    for (let degrau = 0; degrau < 8; degrau++) {
      const x = 470 - degrau * 22
      const y = 360 - (degrau + 1) * 24
      p.fillStyle = degrau % 2 ? '#a0652c' : '#b07434'
      p.fillRect(x - 22, y, 44 + degrau * 22, 24)
    }
    p.strokeStyle = '#ffca28'
    p.lineWidth = 4
    p.beginPath()
    p.moveTo(500, 330)
    p.lineTo(320, 140)
    p.stroke()
    // The door at the other end of the corridor.
    roundRect(p, 1556, 170, 88, 190, 8, '#2b0f0c')
    roundRect(p, 1566, 180, 68, 180, 6, '#8d5524')
    circle(p, 1622, 272, 4, '#ffca28')
  })

export const WIREFRAME_D_ART: Record<string, () => Record<string, Uint8Array>> = {
  'pouso-lunar': () => ({
    'ceu.svg': ceuDaLua(),
    'terreno.svg': terrenoDaLua(),
    'mapa.png': mapaDaLua(),
    'modulo.svg': modulo(false),
    'modulo_fogo.svg': modulo(true),
    'pedacos.svg': pedacosDoModulo(),
  }),
  'quebra-tijolos': () => ({
    'bola.svg': bolaDeTijolos(),
  }),
  'sapo-atravessa': () => ({
    'fundo.svg': fundoDoSapo(),
    'sapo.svg': sapo(false),
    'sapo_pulando.svg': sapo(true),
    'sapo_na_toca.svg': sapoNaToca(),
    'mancha.svg': mancha(),
    'carro_amarelo.svg': veiculo('sapo-carro-amarelo', 60, '#fdd835', true),
    'trator.svg': trator(),
    'carro_rosa.svg': veiculo('sapo-carro-rosa', 60, '#ec407a', true),
    'caminhao.svg': veiculo('sapo-caminhao', 120, '#1e88e5', false, true),
    'carro_de_corrida.svg': veiculo('sapo-corrida', 64, '#e53935', true),
    'tartarugas.svg': tartarugas(),
    'tronco.svg': tronco('sapo-tronco', 130),
    'tronco_grande.svg': tronco('sapo-tronco-grande', 190),
  }),
  'patrulha-em-camadas': () => ({
    'montanhas_longe.svg': montanhasLonge(),
    'morros.svg': morros(),
    'chao.svg': chaoDaPatrulha(),
    'buraco.svg': buraco(),
    'pedra.svg': pedra(),
    'jipe.svg': jipe(false),
    'jipe_batido.svg': jipe(true),
  }),
  'motos-de-luz': () => ({
    'arena.svg': arenaDeLuz(),
    'moto_azul.svg': motoDeLuz('motos-azul', '#40c4ff', '#e1f5fe'),
    'moto_amarela.svg': motoDeLuz('motos-amarela', '#ffd600', '#fffde7'),
  }),
  'arena-de-dois-comandos': () => ({
    'arena.svg': arenaDeComandos(),
    'esteira.svg': esteira(),
    'torre.svg': torre(),
    'robo.svg': robo(),
    'pessoa.svg': pessoa(),
    'bala.svg': balaDoTanque(),
  }),
  'bombas-no-labirinto': () => ({
    'chao.svg': chaoDoLabirinto(),
    'parede.svg': paredeDoLabirinto(),
    'tijolo.svg': tijoloDoLabirinto(),
    'bomba.svg': bombaDoLabirinto(),
    'fogo.svg': fogoDoLabirinto(),
    'porta.svg': portaDoLabirinto(),
    'heroi.svg': heroiDasBombas(),
    'monstro.svg': monstroDasBombas(),
  }),
  'corredor-do-kung-fu': () => ({
    'fundo.svg': corredorDoKungFu(),
    'heroi_parado_direita.svg': lutador(
      'kungfu-heroi-parado-direita',
      HEROI_DO_KUNG_FU,
      POSES_DE_LUTA.parado!,
      false,
    ),
    'heroi_parado_esquerda.svg': lutador(
      'kungfu-heroi-parado-esquerda',
      HEROI_DO_KUNG_FU,
      POSES_DE_LUTA.parado!,
      true,
    ),
    'heroi_andando1_direita.svg': lutador(
      'kungfu-heroi-andando1-direita',
      HEROI_DO_KUNG_FU,
      POSES_DE_LUTA.andando1!,
      false,
    ),
    'heroi_andando1_esquerda.svg': lutador(
      'kungfu-heroi-andando1-esquerda',
      HEROI_DO_KUNG_FU,
      POSES_DE_LUTA.andando1!,
      true,
    ),
    'heroi_andando2_direita.svg': lutador(
      'kungfu-heroi-andando2-direita',
      HEROI_DO_KUNG_FU,
      POSES_DE_LUTA.andando2!,
      false,
    ),
    'heroi_andando2_esquerda.svg': lutador(
      'kungfu-heroi-andando2-esquerda',
      HEROI_DO_KUNG_FU,
      POSES_DE_LUTA.andando2!,
      true,
    ),
    'heroi_andando3_direita.svg': lutador(
      'kungfu-heroi-andando3-direita',
      HEROI_DO_KUNG_FU,
      POSES_DE_LUTA.andando3!,
      false,
    ),
    'heroi_andando3_esquerda.svg': lutador(
      'kungfu-heroi-andando3-esquerda',
      HEROI_DO_KUNG_FU,
      POSES_DE_LUTA.andando3!,
      true,
    ),
    'heroi_andando4_direita.svg': lutador(
      'kungfu-heroi-andando4-direita',
      HEROI_DO_KUNG_FU,
      POSES_DE_LUTA.andando4!,
      false,
    ),
    'heroi_andando4_esquerda.svg': lutador(
      'kungfu-heroi-andando4-esquerda',
      HEROI_DO_KUNG_FU,
      POSES_DE_LUTA.andando4!,
      true,
    ),
    'heroi_soco_direita.svg': lutador(
      'kungfu-heroi-soco-direita',
      HEROI_DO_KUNG_FU,
      POSES_DE_LUTA.soco!,
      false,
    ),
    'heroi_soco_esquerda.svg': lutador(
      'kungfu-heroi-soco-esquerda',
      HEROI_DO_KUNG_FU,
      POSES_DE_LUTA.soco!,
      true,
    ),
    'heroi_chute_direita.svg': lutador(
      'kungfu-heroi-chute-direita',
      HEROI_DO_KUNG_FU,
      POSES_DE_LUTA.chute!,
      false,
    ),
    'heroi_chute_esquerda.svg': lutador(
      'kungfu-heroi-chute-esquerda',
      HEROI_DO_KUNG_FU,
      POSES_DE_LUTA.chute!,
      true,
    ),
    'capanga_andando1_direita.svg': lutador(
      'kungfu-capanga-andando1-direita',
      CAPANGA,
      POSES_DE_LUTA.andando1!,
      false,
    ),
    'capanga_andando1_esquerda.svg': lutador(
      'kungfu-capanga-andando1-esquerda',
      CAPANGA,
      POSES_DE_LUTA.andando1!,
      true,
    ),
    'capanga_andando2_direita.svg': lutador(
      'kungfu-capanga-andando2-direita',
      CAPANGA,
      POSES_DE_LUTA.andando2!,
      false,
    ),
    'capanga_andando2_esquerda.svg': lutador(
      'kungfu-capanga-andando2-esquerda',
      CAPANGA,
      POSES_DE_LUTA.andando2!,
      true,
    ),
    'capanga_andando3_direita.svg': lutador(
      'kungfu-capanga-andando3-direita',
      CAPANGA,
      POSES_DE_LUTA.andando3!,
      false,
    ),
    'capanga_andando3_esquerda.svg': lutador(
      'kungfu-capanga-andando3-esquerda',
      CAPANGA,
      POSES_DE_LUTA.andando3!,
      true,
    ),
    'capanga_andando4_direita.svg': lutador(
      'kungfu-capanga-andando4-direita',
      CAPANGA,
      POSES_DE_LUTA.andando4!,
      false,
    ),
    'capanga_andando4_esquerda.svg': lutador(
      'kungfu-capanga-andando4-esquerda',
      CAPANGA,
      POSES_DE_LUTA.andando4!,
      true,
    ),
    'capanga_caindo_direita.svg': lutador(
      'kungfu-capanga-caindo-direita',
      CAPANGA,
      POSES_DE_LUTA.parado!,
      false,
      -1.2,
    ),
    'capanga_caindo_esquerda.svg': lutador(
      'kungfu-capanga-caindo-esquerda',
      CAPANGA,
      POSES_DE_LUTA.parado!,
      true,
      -1.2,
    ),
  }),
}
