import { circle, ellipse, polygon, roundRect, svg } from './pgzero-art'

/**
 * Art of the batch 3 games (original, MIT, Sistema Zero 2026). Each picture is an ordinary
 * image of the project: the child can redraw it in the Pinta and bring it back.
 */

// Bússola Maluca --------------------------------------------------------------------------

const fundoDaBussola = () =>
  svg('fundo-bussola', 800, 600, (p) => {
    p.fillStyle = '#7cb342'
    p.fillRect(0, 0, 800, 600)
    // Tufos de grama espalhados (sempre nos mesmos lugares).
    for (let i = 0; i < 70; i++) {
      const x = (i * 157) % 800
      const y = (i * 97 + 31) % 600
      p.fillStyle = i % 2 ? '#689f38' : '#8bc34a'
      p.beginPath()
      p.moveTo(x, y + 8)
      p.lineTo(x + 3, y)
      p.lineTo(x + 6, y + 8)
      p.closePath()
      p.fill()
    }
    // As quatro bordas de chegada, um pouco mais claras.
    p.fillStyle = 'rgba(255,255,255,0.18)'
    p.fillRect(0, 0, 800, 60)
    p.fillRect(0, 540, 800, 60)
    p.fillRect(0, 0, 60, 600)
    p.fillRect(740, 0, 60, 600)
  })

const ROUPA = '#1e88e5'
const PELE = '#ffcc80'
const CHAPEU = '#8d6e63'

/** The explorer seen from above, 40 x 56: the two steps swing the feet. */
const explorador = (olhando: 'cima' | 'baixo' | 'esquerda' | 'direita', passo: 1 | 2) =>
  svg(`explorador-${olhando}-${passo}`, 40, 56, (p) => {
    const lado = olhando === 'esquerda' ? -1 : olhando === 'direita' ? 1 : 0
    const frente = passo === 1 ? 1 : -1
    // Pés.
    p.fillStyle = '#4e342e'
    if (lado === 0) {
      p.fillRect(10, 44 + frente * 3, 8, 10)
      p.fillRect(22, 44 - frente * 3, 8, 10)
    } else {
      p.fillRect(14 + frente * 4, 44, 10, 9)
      p.fillRect(14 - frente * 4, 44, 10, 9)
    }
    // Corpo e mochila.
    roundRect(p, 8, 22, 24, 24, 8, ROUPA)
    if (olhando === 'cima') roundRect(p, 11, 24, 18, 16, 4, '#ef6c00')
    // Cabeça com chapéu.
    circle(p, 20 + lado * 2, 16, 10, PELE)
    ellipse(p, 20 + lado * 2, 10, 14, 5, CHAPEU)
    roundRect(p, 13 + lado * 2, 2, 14, 9, 4, CHAPEU)
    if (olhando === 'baixo') {
      circle(p, 16, 17, 1.6, '#3e2723')
      circle(p, 24, 17, 1.6, '#3e2723')
    } else if (lado !== 0) {
      circle(p, 20 + lado * 6, 17, 1.6, '#3e2723')
    }
  })

const pedra = () =>
  svg('pedra-bussola', 48, 40, (p) => {
    polygon(
      p,
      [
        [4, 34],
        [8, 14],
        [20, 4],
        [36, 8],
        [46, 24],
        [42, 36],
      ],
      '#78909c',
    )
    polygon(
      p,
      [
        [12, 16],
        [20, 8],
        [30, 10],
        [22, 18],
      ],
      '#b0bec5',
    )
  })

const bussola = () =>
  svg('bussola', 80, 80, (p) => {
    circle(p, 40, 40, 38, '#5d4037')
    circle(p, 40, 40, 32, '#fff8e1')
    p.fillStyle = '#5d4037'
    for (const [x, y, w, h] of [
      [38, 9, 4, 8],
      [38, 63, 4, 8],
      [9, 38, 8, 4],
      [63, 38, 8, 4],
    ] as const)
      p.fillRect(x, y, w, h)
  })

/** The needle points up (north) with no rotation: the game turns it with Actor.angle. */
const agulha = () =>
  svg('agulha', 80, 80, (p) => {
    polygon(
      p,
      [
        [40, 12],
        [46, 40],
        [34, 40],
      ],
      '#e53935',
    )
    polygon(
      p,
      [
        [34, 40],
        [46, 40],
        [40, 68],
      ],
      '#90a4ae',
    )
    circle(p, 40, 40, 4, '#37474f')
  })

// Cores e Bolinha ---------------------------------------------------------------------------

const TONS = { vermelho: '#e53935', verde: '#43a047', azul: '#1e88e5' } as const

/** A round button, 56 x 56, with a plus or a minus. */
const botaoDeCor = (canal: keyof typeof TONS, mais: boolean) =>
  svg(`${mais ? 'mais' : 'menos'}-${canal}`, 56, 56, (p) => {
    circle(p, 28, 30, 25, '#263238')
    circle(p, 28, 27, 25, TONS[canal])
    p.fillStyle = '#ffffff'
    p.fillRect(15, 24, 26, 7)
    if (mais) p.fillRect(24, 14, 8, 26)
  })

// Piano Maluco --------------------------------------------------------------------------------

/** A wide button with an icon on the left; the game writes the word on it. */
const botaoDoPiano = (id: string, cor: string, icone: (p: Parameters<typeof circle>[0]) => void) =>
  svg(id, 180, 60, (p) => {
    roundRect(p, 0, 4, 180, 56, 18, '#37474f')
    roundRect(p, 0, 0, 180, 54, 18, cor)
    icone(p)
  })

const botaoOuvir = () =>
  botaoDoPiano('botao-ouvir', '#8e24aa', (p) => {
    // Um alto-falante com duas ondas.
    polygon(
      p,
      [
        [18, 20],
        [28, 20],
        [40, 10],
        [40, 44],
        [28, 34],
        [18, 34],
      ],
      '#ffffff',
    )
    p.strokeStyle = '#ffffff'
    p.lineWidth = 3
    for (const raio of [8, 15]) {
      p.beginPath()
      p.arc(42, 27, raio, -0.8, 0.8)
      p.stroke()
    }
  })

const botaoJogar = () =>
  botaoDoPiano('botao-jogar', '#43a047', (p) => {
    // Uma nota musical.
    circle(p, 26, 38, 8, '#ffffff')
    p.fillStyle = '#ffffff'
    p.fillRect(31, 12, 4, 27)
    polygon(
      p,
      [
        [31, 12],
        [48, 18],
        [48, 24],
        [35, 19],
      ],
      '#ffffff',
    )
  })

// Duelo de Tanques ----------------------------------------------------------------------------

/** A tank seen from the side, 56 x 28, facing right (or left, mirrored). */
const tanque = (id: string, cor: string, escura: string, paraEsquerda: boolean) =>
  svg(id, 56, 28, (p) => {
    if (paraEsquerda) {
      p.translate(56, 0)
      p.scale(-1, 1)
    }
    // Esteira com rodas.
    roundRect(p, 2, 16, 52, 12, 6, '#37474f')
    for (const x of [10, 22, 34, 46]) circle(p, x, 22, 4, '#90a4ae')
    // Casco e torre.
    roundRect(p, 6, 9, 44, 9, 3, cor)
    roundRect(p, 18, 2, 20, 10, 5, escura)
  })

/** The barrel lies flat, pointing right from its base: the game turns it by its left end. */
const cano = () =>
  svg('cano', 26, 6, (p) => {
    roundRect(p, 0, 0, 26, 6, 2, '#455a64')
    p.fillStyle = '#263238'
    p.fillRect(22, 0, 4, 6)
  })

// Memória contra o Computador -----------------------------------------------------------------

type Pincel = Parameters<typeof circle>[0]

const versoDaCarta = () =>
  svg('verso', 100, 110, (p) => {
    roundRect(p, 0, 0, 100, 110, 12, '#5e35b1')
    roundRect(p, 8, 8, 84, 94, 8, '#7e57c2')
    for (let y = 18; y < 100; y += 18)
      for (let x = 18; x < 90; x += 18) circle(p, x, y, 4, '#b39ddb')
  })

const olhos = (p: Pincel, y: number, distancia: number) => {
  for (const lado of [-1, 1]) {
    circle(p, 50 + lado * distancia, y, 7, '#ffffff')
    circle(p, 50 + lado * distancia, y + 1, 3.5, '#212121')
  }
}

/** One face per animal, on a white card: just shapes, easy to redraw in the Pinta. */
const BICHOS_DA_MEMORIA: Record<string, (p: Pincel) => void> = {
  gato: (p) => {
    polygon(
      p,
      [
        [22, 40],
        [30, 14],
        [44, 34],
      ],
      '#fb8c00',
    )
    polygon(
      p,
      [
        [78, 40],
        [70, 14],
        [56, 34],
      ],
      '#fb8c00',
    )
    circle(p, 50, 56, 30, '#fb8c00')
    olhos(p, 50, 12)
    polygon(
      p,
      [
        [46, 62],
        [54, 62],
        [50, 67],
      ],
      '#e91e63',
    )
  },
  cachorro: (p) => {
    ellipse(p, 24, 52, 10, 22, '#6d4c41')
    ellipse(p, 76, 52, 10, 22, '#6d4c41')
    circle(p, 50, 56, 28, '#a1887f')
    olhos(p, 50, 11)
    ellipse(p, 50, 68, 8, 6, '#3e2723')
  },
  peixe: (p) => {
    polygon(
      p,
      [
        [20, 56],
        [6, 40],
        [6, 72],
      ],
      '#29b6f6',
    )
    ellipse(p, 54, 56, 34, 22, '#29b6f6')
    circle(p, 70, 50, 6, '#ffffff')
    circle(p, 71, 50, 3, '#212121')
  },
  sapo: (p) => {
    circle(p, 34, 36, 12, '#43a047')
    circle(p, 66, 36, 12, '#43a047')
    ellipse(p, 50, 62, 32, 24, '#43a047')
    olhos(p, 36, 16)
    roundRect(p, 34, 68, 32, 4, 2, '#1b5e20')
  },
  coruja: (p) => {
    ellipse(p, 50, 58, 30, 36, '#8d6e63')
    circle(p, 38, 46, 11, '#fff3e0')
    circle(p, 62, 46, 11, '#fff3e0')
    circle(p, 38, 46, 5, '#212121')
    circle(p, 62, 46, 5, '#212121')
    polygon(
      p,
      [
        [46, 56],
        [54, 56],
        [50, 64],
      ],
      '#ffb300',
    )
  },
  tartaruga: (p) => {
    circle(p, 82, 56, 10, '#9ccc65')
    ellipse(p, 48, 60, 32, 24, '#558b2f')
    for (const [x, y] of [
      [38, 54],
      [56, 54],
      [47, 68],
    ] as const)
      circle(p, x, y, 6, '#7cb342')
    circle(p, 85, 53, 2.5, '#212121')
  },
  abelha: (p) => {
    ellipse(p, 38, 36, 12, 8, '#e1f5fe')
    ellipse(p, 62, 36, 12, 8, '#e1f5fe')
    ellipse(p, 50, 60, 30, 22, '#fdd835')
    p.fillStyle = '#212121'
    p.fillRect(40, 40, 6, 40)
    p.fillRect(56, 40, 6, 40)
    circle(p, 74, 56, 3, '#212121')
  },
  polvo: (p) => {
    for (const x of [26, 38, 50, 62, 74]) roundRect(p, x - 4, 56, 8, 36, 4, '#ab47bc')
    circle(p, 50, 48, 26, '#ab47bc')
    olhos(p, 46, 10)
  },
}

const cartaDoBicho = (bicho: string) =>
  svg(`carta-${bicho}`, 100, 110, (p) => {
    roundRect(p, 0, 0, 100, 110, 12, '#ffffff')
    BICHOS_DA_MEMORIA[bicho]!(p)
  })

// Batalha Naval ---------------------------------------------------------------------------

/** One piece of a ship, 30 x 30: the hull seen from above, with a hatch in the middle. */
const casco = () =>
  svg('casco', 30, 30, (p) => {
    roundRect(p, 2, 3, 26, 24, 6, '#78909c')
    roundRect(p, 5, 6, 20, 18, 4, '#b0bec5')
    circle(p, 15, 15, 4, '#546e7a')
  })

/** A hit: an explosion over the piece (transparent around, so the hull shows below). */
const fogo = () =>
  svg('fogo', 30, 30, (p) => {
    polygon(
      p,
      [
        [15, 1],
        [19, 10],
        [29, 8],
        [22, 16],
        [28, 26],
        [17, 21],
        [12, 29],
        [10, 19],
        [1, 21],
        [8, 13],
        [3, 4],
        [12, 9],
      ],
      '#ff7043',
    )
    circle(p, 15, 15, 6, '#ffeb3b')
  })

/** A miss: rings of splashed water. */
const respingo = () =>
  svg('respingo', 30, 30, (p) => {
    circle(p, 15, 15, 11, '#e3f2fd')
    circle(p, 15, 15, 8, '#42a5f5')
    circle(p, 15, 15, 5, '#e3f2fd')
    circle(p, 15, 15, 2.5, '#42a5f5')
  })

// Atirador Espacial -----------------------------------------------------------------------

/** The starry sky, 800 x 600: the game draws it twice to scroll without a seam. */
const fundoDoEspaco = () =>
  svg('fundo-espaco', 800, 600, (p) => {
    p.fillStyle = '#0d1033'
    p.fillRect(0, 0, 800, 600)
    for (let i = 0; i < 90; i++) {
      const x = (i * 173) % 800
      const y = (i * 109 + 17) % 600
      circle(p, x, y, i % 7 === 0 ? 2.2 : 1.2, i % 3 ? '#ffffff' : '#b3e5fc')
    }
  })

/** The player's ship, 50 x 56, pointing up. */
const naveDoAtirador = () =>
  svg('nave-atirador', 50, 56, (p) => {
    polygon(
      p,
      [
        [25, 0],
        [36, 30],
        [50, 46],
        [34, 44],
        [25, 52],
        [16, 44],
        [0, 46],
        [14, 30],
      ],
      '#90a4ae',
    )
    polygon(
      p,
      [
        [25, 4],
        [32, 30],
        [25, 40],
        [18, 30],
      ],
      '#eceff1',
    )
    ellipse(p, 25, 22, 5, 8, '#29b6f6')
    polygon(
      p,
      [
        [18, 46],
        [25, 56],
        [32, 46],
      ],
      '#ff7043',
    )
  })

const tiroDoAtirador = () =>
  svg('tiro-atirador', 8, 20, (p) => {
    roundRect(p, 0, 0, 8, 20, 4, '#ffee58')
    roundRect(p, 2, 2, 4, 16, 2, '#ffffff')
  })

/** A rock: a lumpy polygon with a few craters (size 30, 50 or 80). */
const pedraDoEspaco = (nome: string, lado: number) =>
  svg(nome, lado, lado, (p) => {
    const meio = lado / 2
    const pontos: [number, number][] = []
    for (let i = 0; i < 10; i++) {
      const angulo = (i / 10) * Math.PI * 2
      const raio = meio * (i % 2 ? 0.86 : 0.98)
      pontos.push([meio + Math.cos(angulo) * raio, meio + Math.sin(angulo) * raio])
    }
    polygon(p, pontos, '#8d6e63')
    circle(p, meio * 0.7, meio * 0.7, lado * 0.12, '#6d4c41')
    circle(p, meio * 1.3, meio * 1.1, lado * 0.09, '#6d4c41')
    circle(p, meio * 0.9, meio * 1.4, lado * 0.07, '#6d4c41')
  })

// Boing! ----------------------------------------------------------------------------------

/** A bat, 16 x 100: a bright bar with a lighter stripe down the middle. */
const raquete = (nome: string, cor: string, clara: string) =>
  svg(nome, 16, 100, (p) => {
    roundRect(p, 0, 0, 16, 100, 8, cor)
    roundRect(p, 5, 8, 6, 84, 3, clara)
  })

const bolaDoBoing = () =>
  svg('bola-boing', 16, 16, (p) => {
    circle(p, 8, 8, 8, '#ffffff')
    circle(p, 6, 6, 3, '#e3f2fd')
  })

// Centopeia -------------------------------------------------------------------------------

/** A body part, 40 x 40: a round green segment with little legs on both sides. */
const corpoDaCentopeia = () =>
  svg('corpo-centopeia', 40, 40, (p) => {
    for (const x of [10, 20, 30]) {
      roundRect(p, x - 2, 2, 4, 8, 2, '#33691e')
      roundRect(p, x - 2, 30, 4, 8, 2, '#33691e')
    }
    circle(p, 20, 20, 15, '#7cb342')
    circle(p, 20, 20, 9, '#9ccc65')
  })

/** The head, 40 x 40, looking at us: so it works going left and going right. */
const cabecaDaCentopeia = () =>
  svg('cabeca-centopeia', 40, 40, (p) => {
    roundRect(p, 9, 0, 4, 12, 2, '#33691e')
    roundRect(p, 27, 0, 4, 12, 2, '#33691e')
    circle(p, 20, 22, 16, '#e53935')
    for (const lado of [-1, 1]) {
      circle(p, 20 + lado * 6, 19, 5, '#ffffff')
      circle(p, 20 + lado * 6, 20, 2.5, '#212121')
    }
    ellipse(p, 20, 30, 5, 2, '#b71c1c')
  })

/** A rock of the field, 40 x 40, with moss on top. */
const pedraDoCampo = () =>
  svg('pedra-campo', 40, 40, (p) => {
    ellipse(p, 20, 23, 17, 15, '#8d6e63')
    ellipse(p, 20, 13, 14, 6, '#689f38')
    circle(p, 13, 26, 3, '#6d4c41')
    circle(p, 26, 29, 2.5, '#6d4c41')
  })

/** The player, 32 x 36: a little blaster pointing up. */
const jogadorDaCentopeia = () =>
  svg('jogador-centopeia', 32, 36, (p) => {
    roundRect(p, 13, 0, 6, 14, 3, '#90a4ae')
    roundRect(p, 4, 12, 24, 18, 8, '#1e88e5')
    circle(p, 16, 20, 5, '#e3f2fd')
    roundRect(p, 2, 28, 10, 8, 4, '#263238')
    roundRect(p, 20, 28, 10, 8, 4, '#263238')
  })

/** The flying beetle, 40 x 32, seen from above with its wings open. */
const besouroVoador = () =>
  svg('besouro', 40, 32, (p) => {
    ellipse(p, 10, 10, 10, 7, '#b3e5fc')
    ellipse(p, 30, 10, 10, 7, '#b3e5fc')
    ellipse(p, 20, 19, 10, 12, '#6a1b9a')
    ellipse(p, 20, 21, 5, 8, '#ab47bc')
    circle(p, 16, 9, 3, '#ffeb3b')
    circle(p, 24, 9, 3, '#ffeb3b')
  })

const tiroDaCentopeia = () =>
  svg('tiro-centopeia', 6, 18, (p) => {
    roundRect(p, 0, 0, 6, 18, 3, '#ffeb3b')
  })

export const WATKISS_ART: Record<string, () => Record<string, Uint8Array>> = {
  centopeia: () => ({
    'corpo.svg': corpoDaCentopeia(),
    'cabeca.svg': cabecaDaCentopeia(),
    'pedra.svg': pedraDoCampo(),
    'jogador.svg': jogadorDaCentopeia(),
    'tiro.svg': tiroDaCentopeia(),
    'besouro.svg': besouroVoador(),
  }),
  boing: () => ({
    'raquete_azul.svg': raquete('raquete-azul', '#1e88e5', '#90caf9'),
    'raquete_laranja.svg': raquete('raquete-laranja', '#fb8c00', '#ffcc80'),
    'bola.svg': bolaDoBoing(),
  }),
  'atirador-espacial': () => ({
    'fundo.svg': fundoDoEspaco(),
    'nave.svg': naveDoAtirador(),
    'tiro.svg': tiroDoAtirador(),
    'pedra_pequena.svg': pedraDoEspaco('pedra-pequena', 30),
    'pedra_media.svg': pedraDoEspaco('pedra-media', 50),
    'pedra_grande.svg': pedraDoEspaco('pedra-grande', 80),
  }),
  'batalha-naval': () => ({
    'casco.svg': casco(),
    'fogo.svg': fogo(),
    'respingo.svg': respingo(),
  }),
  'memoria-contra-o-computador': () => ({
    'verso.svg': versoDaCarta(),
    ...Object.fromEntries(
      Object.keys(BICHOS_DA_MEMORIA).map((bicho) => [`carta_${bicho}.svg`, cartaDoBicho(bicho)]),
    ),
  }),
  'duelo-de-tanques': () => ({
    'tanque_azul.svg': tanque('tanque-azul', '#1e88e5', '#1565c0', false),
    'tanque_laranja.svg': tanque('tanque-laranja', '#fb8c00', '#ef6c00', true),
    'cano.svg': cano(),
  }),
  'piano-maluco': () => ({
    'botao_ouvir.svg': botaoOuvir(),
    'botao_jogar.svg': botaoJogar(),
  }),
  'cores-e-bolinha': () =>
    Object.fromEntries(
      (['vermelho', 'verde', 'azul'] as const).flatMap((canal) => [
        [`menos_${canal}.svg`, botaoDeCor(canal, false)],
        [`mais_${canal}.svg`, botaoDeCor(canal, true)],
      ]),
    ),
  'bussola-maluca': () => ({
    'fundo.svg': fundoDaBussola(),
    'pedra.svg': pedra(),
    'bussola.svg': bussola(),
    'agulha.svg': agulha(),
    ...Object.fromEntries(
      (['cima', 'baixo', 'esquerda', 'direita'] as const).flatMap((olhando) =>
        ([1, 2] as const).map((passo) => [
          `explorador_${olhando}_${passo}.svg`,
          explorador(olhando, passo),
        ]),
      ),
    ),
  }),
}
