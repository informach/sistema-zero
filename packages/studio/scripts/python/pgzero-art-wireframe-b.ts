import type { Pincel } from '../../src/arte/pincel'
import { circle, ellipse, pixelArt, polygon, roundRect, svg } from './pgzero-art'
import { Mapa } from './pgzero-art-wireframe-a'

/**
 * Art of the Wireframe recipes, sub-batch 2b (original, MIT, Sistema Zero 2026). Ships that turn
 * point to the right at angle 0, as Pygame Zero's angle does.
 */

const espacoComEstrelas = (id: string, width: number, height: number, semente: number) =>
  svg(id, width, height, (p) => {
    const ceu = p.createLinearGradient(0, 0, 0, height)
    ceu.addColorStop(0, '#02021a')
    ceu.addColorStop(1, '#0b1033')
    p.fillStyle = ceu
    p.fillRect(0, 0, width, height)
    for (let i = 0; i < Math.round((width * height) / 3000); i++) {
      const x = (i * 157 + semente * 31) % width
      const y = (i * 89 + semente * 13) % height
      circle(p, x, y, i % 6 ? 1 : 2, i % 11 ? '#ffffff' : '#ffd54f')
    }
  })

/** A ship seen from above pointing right; with fogo, a flame behind it. */
const naveDeLado = (id: string, cor: string, fogo: boolean) =>
  svg(id, 48, 32, (p) => {
    if (fogo)
      polygon(
        p,
        [
          [2, 16],
          [12, 10],
          [12, 22],
        ],
        '#ff9800',
      )
    polygon(
      p,
      [
        [46, 16],
        [12, 4],
        [16, 16],
        [12, 28],
      ],
      cor,
    )
    polygon(
      p,
      [
        [30, 16],
        [18, 12],
        [18, 20],
      ],
      '#e3f2fd',
    )
  })

/** An irregular rock: a polygon with uneven corners, the same for the same seed. */
const pedra = (id: string, raio: number, semente: number) =>
  svg(id, raio * 2 + 4, raio * 2 + 4, (p) => {
    const pontas: [number, number][] = []
    for (let i = 0; i < 10; i++) {
      const angulo = (i * Math.PI) / 5
      const r = raio * (0.78 + ((i * 7 + semente * 3) % 5) * 0.055)
      pontas.push([raio + 2 + r * Math.cos(angulo), raio + 2 + r * Math.sin(angulo)])
    }
    polygon(p, pontas, '#8d6e63')
    p.strokeStyle = '#d7ccc8'
    p.lineWidth = 2
    p.beginPath()
    p.moveTo(pontas[0]![0], pontas[0]![1])
    for (const [x, y] of pontas.slice(1)) p.lineTo(x, y)
    p.closePath()
    p.stroke()
    circle(p, raio * 0.8, raio * 0.9, raio * 0.18, '#6d4c41')
    circle(p, raio * 1.3, raio * 1.3, raio * 0.12, '#6d4c41')
  })

const tiroRedondo = (id: string, cor: string) =>
  svg(id, 8, 8, (p) => {
    circle(p, 4, 4, 3.5, cor)
  })

// Troca de Joias -----------------------------------------------------------------------------

const CORES_DAS_JOIAS = ['#e53935', '#fdd835', '#43a047', '#1e88e5', '#8e24aa', '#fb8c00']

/** Six jewels with six different cuts, so colour is not the only way to tell them apart. */
const joia = (numero: number) =>
  svg(`joia${numero}`, 52, 52, (p) => {
    const cor = CORES_DAS_JOIAS[numero]!
    roundRect(p, 3, 3, 46, 46, 8, '#1a1033')
    const lados = [3, 4, 5, 6, 8, 0][numero]!
    if (lados === 0) circle(p, 26, 26, 17, cor, '#ffffff')
    else {
      const pontas: [number, number][] = []
      for (let i = 0; i < lados; i++) {
        const angulo = -Math.PI / 2 + (i * 2 * Math.PI) / lados
        pontas.push([26 + 18 * Math.cos(angulo), 27 + 18 * Math.sin(angulo)])
      }
      polygon(p, pontas, cor)
    }
    circle(p, 20, 19, 4, 'rgba(255, 255, 255, 0.7)')
  })

const fundoDasJoias = () =>
  svg('joias-fundo', 520, 600, (p) => {
    const ceu = p.createLinearGradient(0, 0, 0, 600)
    ceu.addColorStop(0, '#311b92')
    ceu.addColorStop(1, '#1a237e')
    p.fillStyle = ceu
    p.fillRect(0, 0, 520, 600)
    roundRect(p, 44, 62, 432, 536, 12, '#0d0730')
  })

// Rastro de Ajudantes ------------------------------------------------------------------------

const ajudante = () =>
  svg('ajudante', 24, 24, (p) => {
    circle(p, 12, 12, 11, 'rgba(255, 152, 0, 0.35)')
    circle(p, 12, 12, 7, '#ffb74d', '#e65100')
    circle(p, 10, 10, 2.5, '#fff3e0')
  })

const drone = () =>
  svg('drone', 34, 26, (p) => {
    ellipse(p, 17, 13, 15, 9, '#7e57c2')
    circle(p, 12, 12, 4, '#ede7f6')
    circle(p, 12, 12, 2, '#311b92')
    p.fillStyle = '#b39ddb'
    p.fillRect(22, 4, 8, 3)
    p.fillRect(22, 19, 8, 3)
  })

const capsula = () =>
  svg('capsula', 26, 26, (p) => {
    roundRect(p, 2, 6, 22, 14, 7, '#e53935')
    p.fillStyle = '#ffffff'
    p.fillRect(11, 6, 4, 14)
  })

const laserDeLado = (id: string, comprimento: number, cor: string) =>
  svg(id, comprimento, 6, (p) => {
    roundRect(p, 0, 1, comprimento, 4, 2, cor)
  })

// Helicóptero Bombardeiro --------------------------------------------------------------------

/** Ground seen from above; the top and bottom edges match, so two copies scroll without a seam. */
const chaoVistoDeCima = () =>
  svg('heli-chao', 600, 800, (p) => {
    p.fillStyle = '#7cb342'
    p.fillRect(0, 0, 600, 800)
    p.fillStyle = '#9e9d24'
    p.fillRect(250, 0, 100, 800)
    p.fillStyle = '#fdd835'
    for (let y = 10; y < 800; y += 60) p.fillRect(296, y, 8, 30)
    for (let i = 0; i < 40; i++) {
      const x = (i * 131) % 600
      if (x > 230 && x < 370) continue
      const y = (i * 97) % 800
      circle(p, x, y, 14, '#33691e')
      circle(p, x - 4, y - 4, 7, '#558b2f')
    }
  })

const helicoptero = (quadro: number) =>
  svg(`heli${quadro}`, 56, 64, (p) => {
    p.fillStyle = '#455a64'
    p.fillRect(26, 34, 4, 26)
    p.fillRect(18, 56, 20, 4)
    ellipse(p, 28, 26, 13, 18, '#00897b')
    ellipse(p, 28, 18, 8, 7, '#b2dfdb')
    p.strokeStyle = '#263238'
    p.lineWidth = 3
    p.beginPath()
    const a = quadro ? Math.PI / 4 : 0
    for (const giro of [a, a + Math.PI / 2]) {
      p.moveTo(28 + 26 * Math.cos(giro), 24 + 26 * Math.sin(giro))
      p.lineTo(28 - 26 * Math.cos(giro), 24 - 26 * Math.sin(giro))
    }
    p.stroke()
  })

const tanque = (explodindo: boolean) =>
  svg(explodindo ? 'tanque-explodindo' : 'tanque', 40, 48, (p) => {
    roundRect(p, 4, 4, 32, 40, 6, explodindo ? '#3e2723' : '#5d4037')
    p.fillStyle = '#212121'
    p.fillRect(2, 4, 6, 40)
    p.fillRect(32, 4, 6, 40)
    circle(p, 20, 26, 9, explodindo ? '#4e342e' : '#8d6e63')
    if (!explodindo) {
      p.fillStyle = '#6d4c41'
      p.fillRect(18, 2, 4, 22)
    } else {
      for (let i = 0; i < 6; i++) {
        const angulo = (i * Math.PI) / 3
        circle(
          p,
          20 + 12 * Math.cos(angulo),
          24 + 12 * Math.sin(angulo),
          6,
          i % 2 ? '#ff7043' : '#ffca28',
        )
      }
    }
  })

const explosaoRedonda = (id: string, raio: number) =>
  svg(id, raio * 2, raio * 2, (p) => {
    circle(p, raio, raio, raio - 1, '#ff7043')
    circle(p, raio, raio, raio * 0.6, '#ffca28')
    circle(p, raio, raio, raio * 0.3, '#fffde7')
  })

// Cauda Espacial ---------------------------------------------------------------------------------

/** The boss: a hunched armoured creature facing left; its eye and tail are separate actors. */
const monstro = () =>
  svg('monstro', 200, 260, (p) => {
    ellipse(p, 120, 140, 76, 110, '#6a1b9a')
    ellipse(p, 110, 150, 58, 88, '#8e24aa')
    for (let y = 70; y < 230; y += 26) ellipse(p, 150, y, 20, 10, '#4a148c')
    polygon(
      p,
      [
        [50, 110],
        [20, 130],
        [52, 150],
      ],
      '#ce93d8',
    )
    polygon(
      p,
      [
        [60, 160],
        [24, 190],
        [64, 196],
      ],
      '#ce93d8',
    )
    ellipse(p, 70, 130, 26, 30, '#4a148c')
  })

const olho = (aberto: boolean) =>
  svg(aberto ? 'olho-aberto' : 'olho-fechado', 40, 40, (p) => {
    circle(p, 20, 20, 18, aberto ? '#fff59d' : '#4a148c', '#311b92')
    if (aberto) {
      circle(p, 18, 20, 9, '#e53935')
      circle(p, 16, 18, 3, '#ffffff')
    } else {
      p.strokeStyle = '#ce93d8'
      p.lineWidth = 3
      p.beginPath()
      p.moveTo(6, 20)
      p.lineTo(34, 20)
      p.stroke()
    }
  })

const gomo = () =>
  svg('gomo', 30, 30, (p) => {
    circle(p, 15, 15, 14, '#ab47bc', '#4a148c')
    circle(p, 11, 11, 4, '#e1bee7')
  })

const ferrao = () =>
  svg('ferrao', 36, 36, (p) => {
    polygon(
      p,
      [
        [18, 2],
        [34, 30],
        [18, 22],
        [2, 30],
      ],
      '#f06292',
    )
    circle(p, 18, 18, 6, '#880e4f')
  })

// Mochila a Jato -------------------------------------------------------------------------------

const fundoDoPlaneta = () =>
  svg('planeta-fundo', 800, 600, (p) => {
    const ceu = p.createLinearGradient(0, 0, 0, 600)
    ceu.addColorStop(0, '#000814')
    ceu.addColorStop(1, '#14213d')
    p.fillStyle = ceu
    p.fillRect(0, 0, 800, 600)
    for (let i = 0; i < 90; i++)
      circle(p, (i * 173) % 800, (i * i * 37 + i * 61) % 520, i % 7 ? 1 : 1.8, '#ffffff')
    circle(p, 660, 110, 46, '#ffb703', '#fb8500')
    ellipse(p, 650, 100, 14, 10, '#fb8500')
    p.fillStyle = '#6d6875'
    p.fillRect(0, 550, 800, 50)
    p.fillStyle = '#b5838d'
    p.fillRect(0, 550, 800, 6)
  })

const ASTRONAUTA = [
  '....wwww....',
  '...wwwwww...',
  '...wbbbbw...',
  '...wbccbw...',
  '...wwwwww...',
  '.ggwwwwwwr..',
  '.ggwwwwwwrr.',
  '.ggwwwwwwrr.',
  '.ggwwwwww...',
  '...ww..ww...',
  '...ww..ww...',
  '..www..www..',
]
const astronauta = (espelhar: boolean) =>
  pixelArt(
    espelhar ? ASTRONAUTA.map((linha) => [...linha].reverse().join('')) : ASTRONAUTA,
    { w: '#eceff1', b: '#263238', c: '#4fc3f7', g: '#90a4ae', r: '#e53935' },
    3,
  )

const chama = () =>
  svg('chama', 20, 26, (p) => {
    polygon(
      p,
      [
        [4, 0],
        [16, 0],
        [10, 26],
      ],
      '#ff9800',
    )
    polygon(
      p,
      [
        [7, 0],
        [13, 0],
        [10, 14],
      ],
      '#ffeb3b',
    )
  })

/** The three rocket parts stack exactly: each is 60 wide; base 70 tall, middle 50, tip 56. */
const parteDoFoguete = (qual: 'base' | 'meio' | 'ponta') =>
  svg(`foguete-${qual}`, 60, qual === 'base' ? 70 : qual === 'meio' ? 50 : 56, (p) => {
    if (qual === 'ponta') {
      polygon(
        p,
        [
          [30, 0],
          [52, 56],
          [8, 56],
        ],
        '#e53935',
      )
      circle(p, 30, 34, 7, '#b3e5fc', '#ffffff')
      return
    }
    p.fillStyle = '#eceff1'
    p.fillRect(8, 0, 44, qual === 'base' ? 54 : 50)
    p.fillStyle = '#90a4ae'
    p.fillRect(8, 0, 6, qual === 'base' ? 54 : 50)
    if (qual === 'base') {
      polygon(
        p,
        [
          [8, 30],
          [0, 70],
          [14, 54],
        ],
        '#e53935',
      )
      polygon(
        p,
        [
          [52, 30],
          [60, 70],
          [46, 54],
        ],
        '#e53935',
      )
      p.fillStyle = '#455a64'
      p.fillRect(18, 54, 24, 16)
    } else {
      circle(p, 30, 25, 9, '#4fc3f7', '#ffffff')
    }
  })

const combustivel = () =>
  svg('combustivel', 30, 38, (p) => {
    roundRect(p, 3, 6, 24, 30, 5, '#8e24aa')
    p.fillStyle = '#ce93d8'
    p.fillRect(10, 0, 10, 8)
    p.fillStyle = '#ffffff'
    p.fillRect(8, 18, 14, 4)
  })

const meteoro = () =>
  svg('meteoro', 34, 34, (p) => {
    circle(p, 17, 17, 14, '#ff7043', '#bf360c')
    circle(p, 12, 13, 4, '#ffab91')
    circle(p, 21, 21, 3, '#bf360c')
  })

// Bichinhos em Fila -----------------------------------------------------------------------------

/** Ledges of the level as (left, top, right): the level image is drawn from these. */
const LEDGES = [
  [30, 200, 680],
  [0, 310, 560],
  [300, 420, 800],
] as const
const ESPESSURA_DA_FASE = 26

/** The level: earth where there is ground, transparent where there is air (the map the critters read). */
const fase = () => {
  const mapa = new Mapa(800, 600)
  for (const [esquerda, topo, direita] of LEDGES)
    for (let y = topo; y < topo + ESPESSURA_DA_FASE; y++)
      for (let x = esquerda; x < direita; x++) {
        const grama = y < topo + 4
        const tom = (x * 7 + y * 13) % 5
        mapa.pintar(
          x,
          y,
          grama ? [76, 175 - tom * 6, 80] : [121 - tom * 8, 85 - tom * 5, 72 - tom * 4],
        )
      }
  // Small steps of 3 pixels on the middle floor: the critters climb them.
  mapa.retangulo(180, 307, 60, 3, [130, 90, 75])
  mapa.retangulo(380, 307, 40, 3, [130, 90, 75])
  // A stone wall at the left end of the middle floor: walking into it, a critter turns back.
  for (let y = 250; y < 310 + ESPESSURA_DA_FASE; y++)
    for (let x = 0; x < 14; x++) {
      const tom = ((x >> 2) + (y >> 3)) % 2
      mapa.pintar(x, y, tom ? [120, 120, 130] : [96, 96, 110])
    }
  return mapa.png()
}

const ceuDaFase = () =>
  svg('fase-ceu', 800, 600, (p) => {
    const ceu = p.createLinearGradient(0, 0, 0, 600)
    ceu.addColorStop(0, '#4fc3f7')
    ceu.addColorStop(1, '#b3e5fc')
    p.fillStyle = ceu
    p.fillRect(0, 0, 800, 600)
    for (let i = 0; i < 6; i++)
      ellipse(p, 80 + i * 140, 60 + (i % 2) * 40, 50, 18, 'rgba(255, 255, 255, 0.8)')
  })

const entrada = () =>
  svg('entrada', 60, 40, (p) => {
    roundRect(p, 0, 0, 60, 30, 6, '#6d4c41')
    p.fillStyle = '#3e2723'
    p.fillRect(8, 26, 44, 14)
  })

const saida = () =>
  svg('saida', 50, 64, (p) => {
    polygon(
      p,
      [
        [0, 24],
        [25, 0],
        [50, 24],
      ],
      '#c62828',
    )
    p.fillStyle = '#fff8e1'
    p.fillRect(6, 24, 38, 40)
    p.fillStyle = '#5d4037'
    p.fillRect(17, 36, 16, 28)
  })

/** Rows 0-5 of the critter; the walking frames differ only in the legs. */
const CORPO_DO_BICHO = [
  '..gggg..',
  '.gggggg.',
  '..ssss..',
  '..sksk..',
  '..ssss..',
  '.bbbbbb.',
  '.bbbbbb.',
]
const PERNAS_DO_BICHO = [
  ['.b....b.', 'bb....bb'],
  ['..b..b..', '.bb..bb.'],
]
const bicho = (quadro: number, espelhar: boolean) => {
  const linhas = [...CORPO_DO_BICHO, ...PERNAS_DO_BICHO[quadro]!]
  return pixelArt(
    espelhar ? linhas.map((linha) => [...linha].reverse().join('')) : linhas,
    { g: '#66bb6a', s: '#ffcc80', k: '#212121', b: '#1e88e5' },
    3,
  )
}
const bichoBloqueando = () =>
  pixelArt(
    [
      '...gggg...',
      '..gggggg..',
      '...ssss...',
      '...sksk...',
      '...ssss...',
      'ssbbbbbbss',
      '..bbbbbb..',
      '..b....b..',
      '.bb....bb.',
    ],
    { g: '#66bb6a', s: '#ffcc80', k: '#212121', b: '#e53935' },
    3,
  )

// Encanamento Apressado ----------------------------------------------------------------------

const LADOS: Record<string, readonly string[]> = {
  horizontal: ['esquerda', 'direita'],
  vertical: ['cima', 'baixo'],
  cruz: ['cima', 'baixo', 'esquerda', 'direita'],
  cima_direita: ['cima', 'direita'],
  cima_esquerda: ['cima', 'esquerda'],
  baixo_direita: ['baixo', 'direita'],
  baixo_esquerda: ['baixo', 'esquerda'],
  inicio: ['direita'],
}

/** The pipe arm from the centre of a 64-px tile to one side, as a thick rectangle. */
const braco = (p: Pincel, lado: string, largura: number, cor: string) => {
  const meia = largura / 2
  p.fillStyle = cor
  if (lado === 'cima') p.fillRect(32 - meia, 0, largura, 32 + meia)
  if (lado === 'baixo') p.fillRect(32 - meia, 32 - meia, largura, 32 + meia)
  if (lado === 'esquerda') p.fillRect(0, 32 - meia, 32 + meia, largura)
  if (lado === 'direita') p.fillRect(32 - meia, 32 - meia, 32 + meia, largura)
}

const cano = (nome: string) =>
  svg(`cano-${nome}`, 64, 64, (p) => {
    for (const lado of LADOS[nome]!) braco(p, lado, 26, '#78909c')
    for (const lado of LADOS[nome]!) braco(p, lado, 14, '#37474f')
    if (nome === 'inicio') {
      circle(p, 32, 32, 18, '#546e7a', '#cfd8dc')
      circle(p, 32, 32, 8, '#29b6f6')
    }
  })

const aguaNoCano = (nome: string) =>
  svg(`agua-${nome}`, 64, 64, (p) => {
    for (const lado of LADOS[nome]!) braco(p, lado, 12, '#29b6f6')
    if (nome === 'inicio') circle(p, 32, 32, 10, '#29b6f6')
  })

const quadradoVazio = () =>
  svg('vazio', 64, 64, (p) => {
    p.fillStyle = '#263238'
    p.fillRect(0, 0, 64, 64)
    p.strokeStyle = '#37474f'
    p.lineWidth = 2
    p.strokeRect(1, 1, 62, 62)
  })

const fundoDosCanos = () =>
  svg('canos-fundo', 800, 600, (p) => {
    p.fillStyle = '#102027'
    p.fillRect(0, 0, 800, 600)
    roundRect(p, 14, 90, 92, 380, 10, '#1c313a')
  })

/** Every image of sub-batch 2b, by game and file name in its images/ folder. */
export const WIREFRAME_B_ART: Record<string, () => Record<string, Uint8Array>> = {
  'rastro-de-ajudantes': () => ({
    'fundo.svg': espacoComEstrelas('rastro-fundo', 800, 600, 2),
    'nave.svg': naveDeLado('nave', '#29b6f6', false),
    'ajudante.svg': ajudante(),
    'tiro.svg': laserDeLado('tiro', 18, '#fff176'),
    'drone.svg': drone(),
    'capsula.svg': capsula(),
  }),
  'helicoptero-bombardeiro': () => ({
    'chao.svg': chaoVistoDeCima(),
    'heli0.svg': helicoptero(0),
    'heli1.svg': helicoptero(1),
    'tanque.svg': tanque(false),
    'tanque_explodindo.svg': tanque(true),
    'pedaco.svg': tiroRedondo('pedaco', '#212121'),
    'explosao.svg': explosaoRedonda('explosao', 16),
    'bala.svg': tiroRedondo('bala', '#ffeb3b'),
  }),
  'cauda-espacial': () => ({
    'fundo.svg': espacoComEstrelas('cauda-fundo', 800, 600, 5),
    'monstro.svg': monstro(),
    'olho_aberto.svg': olho(true),
    'olho_fechado.svg': olho(false),
    'gomo.svg': gomo(),
    'ferrao.svg': ferrao(),
    'nave.svg': naveDeLado('nave', '#66bb6a', false),
    'tiro.svg': laserDeLado('tiro', 16, '#80deea'),
  }),
  'mochila-a-jato': () => ({
    'fundo.svg': fundoDoPlaneta(),
    'astro_d.png': astronauta(false),
    'astro_e.png': astronauta(true),
    'chama.svg': chama(),
    'foguete_base.svg': parteDoFoguete('base'),
    'foguete_meio.svg': parteDoFoguete('meio'),
    'foguete_ponta.svg': parteDoFoguete('ponta'),
    'combustivel.svg': combustivel(),
    'meteoro.svg': meteoro(),
    'laser.svg': laserDeLado('laser', 24, '#ff5252'),
  }),
  'propulsor-no-espaco': () => ({
    'fundo.svg': espacoComEstrelas('propulsor-fundo', 800, 600, 7),
    'nave.svg': naveDeLado('nave', '#eceff1', false),
    'nave_fogo.svg': naveDeLado('nave-fogo', '#eceff1', true),
    'pedra_grande.svg': pedra('pedra-grande', 40, 1),
    'pedra_media.svg': pedra('pedra-media', 22, 2),
    'pedra_pequena.svg': pedra('pedra-pequena', 12, 3),
    'tiro.svg': tiroRedondo('tiro', '#fff176'),
  }),
  'encanamento-apressado': () => ({
    'fundo.svg': fundoDosCanos(),
    'vazio.svg': quadradoVazio(),
    ...Object.fromEntries(Object.keys(LADOS).map((nome) => [`cano_${nome}.svg`, cano(nome)])),
    ...Object.fromEntries(Object.keys(LADOS).map((nome) => [`agua_${nome}.svg`, aguaNoCano(nome)])),
  }),
  'troca-de-joias': () => ({
    'fundo.svg': fundoDasJoias(),
    ...Object.fromEntries([0, 1, 2, 3, 4, 5].map((numero) => [`joia${numero}.svg`, joia(numero)])),
  }),
  'bichinhos-em-fila': () => ({
    'ceu.svg': ceuDaFase(),
    'fase.png': fase(),
    'entrada.svg': entrada(),
    'saida.svg': saida(),
    'bicho_d0.png': bicho(0, false),
    'bicho_d1.png': bicho(1, false),
    'bicho_e0.png': bicho(0, true),
    'bicho_e1.png': bicho(1, true),
    'bicho_bloqueio.png': bichoBloqueando(),
  }),
}
