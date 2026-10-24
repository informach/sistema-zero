import { circle, polygon, roundRect, svg } from './pgzero-art'
import { Mapa } from './pgzero-art-wireframe-a'

/**
 * Art of the Wireframe recipes, sub-batch 2e (original, MIT, Sistema Zero 2026).
 */

// Bolinha Rolante -----------------------------------------------------------------------------

type Trecho = readonly [
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  h0: number,
  h1: number,
  tipo: string,
]
/**
 * The course seen from above, far to near: x and y on the height map, the height at the far
 * edge (h0) and at the near edge (h1); a ramp is a piece whose height changes. Holes come last.
 */
const PISTA_DA_BOLINHA: readonly Trecho[] = [
  [200, 400, 20, 120, 240, 240, 'seguro'],
  [270, 330, 120, 260, 240, 170, 'rampa'],
  [150, 450, 260, 340, 170, 170, 'seguro'],
  [150, 200, 340, 460, 170, 110, 'rampa'],
  [100, 500, 460, 530, 110, 110, 'seguro'],
  [260, 340, 530, 600, 110, 60, 'rampa'],
  [200, 400, 600, 640, 60, 60, 'chegada'],
]
const BURACOS: readonly (readonly [number, number, number, number])[] = [
  [300, 400, 290, 330],
  [330, 420, 480, 515],
]
/** Same projection as tela_y in main.py. */
const telaY = (y: number, h: number) => 20 + y * 0.6 + (255 - h) * 0.8
const alturaNoTrecho = ([, , y0, y1, h0, h1]: Trecho, y: number) =>
  h0 + ((h1 - h0) * (y - y0)) / (y1 - y0)

const alturasDaBolinha = () => {
  const mapa = new Mapa(600, 640)
  for (const trecho of PISTA_DA_BOLINHA) {
    const [x0, x1, y0, y1, , , tipo] = trecho
    for (let y = y0; y < y1; y++) {
      const h = Math.round(alturaNoTrecho(trecho, y + 0.5))
      mapa.retangulo(x0, y, x1 - x0, 1, [
        h,
        tipo === 'chegada' ? 255 : 0,
        tipo === 'rampa' ? 0 : 255,
      ])
    }
  }
  // Holes are void: red 0 (and nothing else) in the whole rectangle.
  for (const [x0, x1, y0, y1] of BURACOS)
    for (let y = y0; y < y1; y++)
      for (let x = x0; x < x1; x++) mapa.rgba.fill(0, (y * 600 + x) * 4, (y * 600 + x) * 4 + 4)
  return mapa.png()
}

const pistaDaBolinha = () =>
  svg('bolinha-pista', 600, 600, (p) => {
    for (let estrela = 0; estrela < 60; estrela++)
      circle(p, (estrela * 137) % 600, (estrela * 89) % 600, (estrela % 3) * 0.6 + 0.6, '#b39ddb')
    for (const trecho of PISTA_DA_BOLINHA) {
      const [x0, x1, y0, y1, , h1, tipo] = trecho
      const longe = telaY(y0, alturaNoTrecho(trecho, y0))
      const perto = telaY(y1, h1)
      // The front wall below the near edge, then the top.
      polygon(
        p,
        [
          [x0, perto],
          [x1, perto],
          [x1, perto + 40],
          [x0, perto + 40],
        ],
        '#311b92',
      )
      polygon(
        p,
        [
          [x0, longe],
          [x1, longe],
          [x1, perto],
          [x0, perto],
        ],
        tipo === 'rampa' ? '#7e57c2' : '#9575cd',
      )
      if (tipo === 'chegada') {
        for (let x = x0; x < x1; x += 20)
          for (let y = y0, linha = 0; y < y1; y += 20, linha++)
            if (((x - x0) / 20 + linha) % 2 === 0)
              polygon(
                p,
                [
                  [x, telaY(y, 60)],
                  [x + 20, telaY(y, 60)],
                  [x + 20, telaY(Math.min(y + 20, y1), 60)],
                  [x, telaY(Math.min(y + 20, y1), 60)],
                ],
                '#fafafa',
              )
        continue
      }
      // The grid on the top, so the ramps read as slopes.
      p.strokeStyle = '#5e35b1'
      p.lineWidth = 1
      p.beginPath()
      for (let x = Math.ceil(x0 / 25) * 25; x <= x1; x += 25) {
        p.moveTo(x, longe)
        p.lineTo(x, perto)
      }
      for (let y = Math.ceil(y0 / 25) * 25; y <= y1; y += 25) {
        const ty = telaY(y, alturaNoTrecho(trecho, y))
        p.moveTo(x0, ty)
        p.lineTo(x1, ty)
      }
      p.stroke()
      p.strokeStyle = '#d1c4e9'
      p.lineWidth = 2
      p.beginPath()
      p.moveTo(x0, longe)
      p.lineTo(x1, longe)
      p.stroke()
    }
    for (const [x0, x1, y0, y1] of BURACOS) {
      const trecho = PISTA_DA_BOLINHA.find(
        (t) => t[0] <= x0 && x1 <= t[1] && t[2] <= y0 && y1 <= t[3],
      )!
      polygon(
        p,
        [
          [x0, telaY(y0, alturaNoTrecho(trecho, y0))],
          [x1, telaY(y0, alturaNoTrecho(trecho, y0))],
          [x1, telaY(y1, alturaNoTrecho(trecho, y1))],
          [x0, telaY(y1, alturaNoTrecho(trecho, y1))],
        ],
        '#120a26',
      )
    }
  })

const bolinha = () =>
  svg('bolinha-bolinha', 24, 24, (p) => {
    circle(p, 12, 12, 11, '#26c6da', '#006064')
    p.fillStyle = '#ffffff'
    p.fillRect(4, 10, 16, 4)
    circle(p, 8, 7, 3, '#e0f7fa')
  })

const bandeira = () =>
  svg('bolinha-bandeira', 40, 56, (p) => {
    p.fillStyle = '#ffffff'
    p.fillRect(4, 4, 3, 52)
    polygon(
      p,
      [
        [7, 4],
        [38, 13],
        [7, 22],
      ],
      '#ffca28',
    )
    roundRect(p, 0, 52, 11, 4, 2, '#bdbdbd')
  })

// Bolhas que se Dividem ------------------------------------------------------------------------

const fundoDasBolhas = () =>
  svg('bolhas-fundo', 800, 600, (p) => {
    const ceu = p.createLinearGradient(0, 0, 0, 560)
    ceu.addColorStop(0, '#4fc3f7')
    ceu.addColorStop(1, '#e1f5fe')
    p.fillStyle = ceu
    p.fillRect(0, 0, 800, 560)
    polygon(
      p,
      [
        [0, 560],
        [0, 420],
        [140, 300],
        [260, 400],
        [400, 260],
        [560, 410],
        [680, 320],
        [800, 400],
        [800, 560],
      ],
      '#90a4ae',
    )
    polygon(
      p,
      [
        [400, 260],
        [440, 298],
        [415, 292],
        [400, 305],
        [380, 290],
        [362, 296],
      ],
      '#fafafa',
    )
    polygon(
      p,
      [
        [0, 560],
        [0, 480],
        [200, 430],
        [420, 490],
        [640, 440],
        [800, 480],
        [800, 560],
      ],
      '#66bb6a',
    )
    // The brick floor, where the score is written.
    p.fillStyle = '#6d4c41'
    p.fillRect(0, 560, 800, 40)
    p.fillStyle = '#8d6e63'
    for (let linha = 0; linha < 2; linha++)
      for (let x = linha * 20 - 20; x < 800; x += 40) p.fillRect(x + 2, 562 + linha * 19, 36, 16)
  })

const jogadorDasBolhas = () =>
  svg('bolhas-jogador', 32, 48, (p) => {
    circle(p, 16, 10, 8, '#ffcc80')
    p.fillStyle = '#5d4037'
    p.fillRect(8, 2, 16, 5)
    roundRect(p, 8, 18, 16, 18, 4, '#ef5350')
    p.fillStyle = '#1e88e5'
    p.fillRect(9, 34, 6, 13)
    p.fillRect(17, 34, 6, 13)
    p.fillStyle = '#ffcc80'
    p.fillRect(23, 18, 5, 12)
  })

const pontaDoArpao = () =>
  svg('bolhas-ponta', 12, 14, (p) => {
    polygon(
      p,
      [
        [6, 0],
        [12, 10],
        [8, 9],
        [8, 14],
        [4, 14],
        [4, 9],
        [0, 10],
      ],
      '#ffeb3b',
    )
  })

const bolhaQueSeDivide = (tamanho: number, raio: number, cor: string, borda: string) =>
  svg(`bolhas-bolha${tamanho}`, raio * 2, raio * 2, (p) => {
    circle(p, raio, raio, raio - 1, cor, borda)
    circle(p, raio * 0.65, raio * 0.6, raio * 0.28, 'rgba(255,255,255,0.75)')
    circle(p, raio * 1.3, raio * 1.35, raio * 0.12, 'rgba(255,255,255,0.5)')
  })

// Masmorra para Quatro -------------------------------------------------------------------------

const paredeDaMasmorra = () =>
  svg('masmorra-parede', 32, 32, (p) => {
    p.fillStyle = '#37474f'
    p.fillRect(0, 0, 32, 32)
    p.fillStyle = '#546e7a'
    p.fillRect(1, 1, 14, 9)
    p.fillRect(17, 1, 14, 9)
    p.fillRect(1, 12, 6, 9)
    p.fillRect(9, 12, 14, 9)
    p.fillRect(25, 12, 6, 9)
    p.fillRect(1, 23, 14, 8)
    p.fillRect(17, 23, 14, 8)
  })

const chaoDaMasmorra = () =>
  svg('masmorra-chao', 32, 32, (p) => {
    p.fillStyle = '#4e342e'
    p.fillRect(0, 0, 32, 32)
    p.fillStyle = '#5d4037'
    p.fillRect(1, 1, 30, 30)
  })

const tesouroDaMasmorra = () =>
  svg('masmorra-tesouro', 24, 20, (p) => {
    roundRect(p, 2, 6, 20, 13, 2, '#8d6e63')
    roundRect(p, 2, 2, 20, 7, 3, '#a1887f')
    p.fillStyle = '#ffca28'
    p.fillRect(2, 8, 20, 2)
    p.fillRect(10, 7, 4, 6)
  })

const saidaDaMasmorra = (aberta: boolean) =>
  svg(aberta ? 'masmorra-saida-aberta' : 'masmorra-saida', 32, 32, (p) => {
    roundRect(p, 2, 2, 28, 28, 4, aberta ? '#fff59d' : '#3e2723')
    if (aberta) {
      for (let degrau = 0; degrau < 4; degrau++) {
        p.fillStyle = degrau % 2 ? '#fbc02d' : '#f9a825'
        p.fillRect(6 + degrau * 3, 6 + degrau * 6, 20 - degrau * 6, 5)
      }
    } else {
      p.fillStyle = '#6d4c41'
      for (let x = 6; x < 28; x += 6) p.fillRect(x, 4, 3, 24)
      circle(p, 16, 16, 3, '#ffca28')
    }
  })

const fantasmaDaMasmorra = () =>
  svg('masmorra-fantasma', 26, 26, (p) => {
    p.fillStyle = '#e0e0e0'
    p.beginPath()
    p.arc(13, 11, 10, Math.PI, 0)
    p.lineTo(23, 24)
    p.lineTo(19, 20)
    p.lineTo(15, 24)
    p.lineTo(11, 20)
    p.lineTo(7, 24)
    p.lineTo(3, 20)
    p.closePath()
    p.fill()
    circle(p, 9, 11, 2.5, '#263238')
    circle(p, 17, 11, 2.5, '#263238')
  })

const CORES_DOS_HEROIS: Record<string, readonly [string, string]> = {
  guerreira: ['#e53935', '#ffcc80'],
  mago: ['#3949ab', '#ffe0b2'],
  elfa: ['#43a047', '#ffcc80'],
  valente: ['#fdd835', '#d7a77a'],
}
/** A hero 26 x 28 seen from above-front; the walking frame swaps which foot is forward. */
const heroiDaMasmorra = (nome: string, lado: string, quadro: number) =>
  svg(`masmorra-${nome}-${lado}${quadro}`, 26, 28, (p) => {
    const [roupa, pele] = CORES_DOS_HEROIS[nome]!
    const passo = quadro === 1 ? 2 : -2
    p.fillStyle = '#3e2723'
    if (lado === 'baixo' || lado === 'cima') {
      p.fillRect(8, 21 + passo, 4, 6 - passo)
      p.fillRect(14, 21 - passo, 4, 6 + passo)
    } else {
      p.fillRect(10 + passo, 21, 4, 6)
      p.fillRect(12 - passo, 21, 4, 6)
    }
    roundRect(p, 6, 11, 14, 12, 4, roupa)
    circle(p, 13, 8, 7, pele)
    p.fillStyle = roupa
    p.beginPath()
    p.arc(13, 7, 7.5, Math.PI, 0)
    p.fill()
    if (lado === 'baixo') {
      circle(p, 10.5, 9, 1.3, '#212121')
      circle(p, 15.5, 9, 1.3, '#212121')
    } else if (lado === 'esquerda') circle(p, 9, 9, 1.3, '#212121')
    else if (lado === 'direita') circle(p, 17, 9, 1.3, '#212121')
  })

const herois = () => {
  const imagens: Record<string, Uint8Array> = {}
  for (const nome of Object.keys(CORES_DOS_HEROIS))
    for (const lado of ['baixo', 'cima', 'esquerda', 'direita'])
      for (const quadro of [1, 2])
        imagens[`${nome}_${lado}${quadro}.svg`] = heroiDaMasmorra(nome, lado, quadro)
  return imagens
}

// Duelo por Turnos -----------------------------------------------------------------------------

const arenaDoDuelo = () =>
  svg('duelo-arena', 800, 500, (p) => {
    const ceu = p.createLinearGradient(0, 0, 0, 360)
    ceu.addColorStop(0, '#311b92')
    ceu.addColorStop(1, '#ff8a65')
    p.fillStyle = ceu
    p.fillRect(0, 0, 800, 360)
    circle(p, 640, 150, 46, '#ffe082')
    // The castle wall behind the fighters.
    p.fillStyle = '#4e342e'
    p.fillRect(0, 230, 800, 140)
    for (let x = 0; x < 800; x += 60) p.fillRect(x, 210, 36, 24)
    p.fillStyle = '#5d4037'
    for (let linha = 0; linha < 5; linha++)
      for (let x = (linha % 2) * 30 - 30; x < 800; x += 60)
        p.fillRect(x + 2, 236 + linha * 27, 56, 24)
    p.fillStyle = '#795548'
    p.fillRect(0, 360, 800, 140)
    p.fillStyle = '#6d4c41'
    for (let x = 0; x < 800; x += 100) p.fillRect(x, 360, 4, 140)
  })

const heroiDoDuelo = () =>
  svg('duelo-heroi', 110, 150, (p) => {
    // Legs, body with the tunic, head with the helmet, and the sword raised.
    p.fillStyle = '#455a64'
    p.fillRect(36, 104, 14, 40)
    p.fillRect(58, 104, 14, 40)
    roundRect(p, 30, 58, 48, 54, 10, '#1e88e5')
    p.fillStyle = '#fdd835'
    p.fillRect(30, 96, 48, 6)
    circle(p, 54, 38, 20, '#ffcc80')
    p.fillStyle = '#90a4ae'
    p.beginPath()
    p.arc(54, 34, 21, Math.PI, 0)
    p.fill()
    p.fillRect(33, 33, 42, 6)
    circle(p, 62, 42, 2.5, '#212121')
    p.fillStyle = '#cfd8dc'
    p.fillRect(86, 6, 8, 74)
    p.fillStyle = '#6d4c41'
    p.fillRect(78, 78, 24, 7)
    p.fillRect(86, 85, 8, 18)
    circle(p, 86, 90, 8, '#ffcc80')
  })

const dragaoDoDuelo = () =>
  svg('duelo-dragao', 200, 190, (p) => {
    // Wing, tail, body, belly, neck and head, facing left at the hero.
    polygon(
      p,
      [
        [110, 70],
        [170, 4],
        [160, 50],
        [196, 40],
        [160, 96],
      ],
      '#2e7d32',
    )
    polygon(
      p,
      [
        [140, 150],
        [196, 170],
        [190, 150],
        [150, 128],
      ],
      '#43a047',
    )
    p.fillStyle = '#43a047'
    p.beginPath()
    p.ellipse(110, 128, 58, 46, 0, 0, Math.PI * 2)
    p.fill()
    p.fillStyle = '#c5e1a5'
    p.beginPath()
    p.ellipse(96, 140, 30, 30, 0, 0, Math.PI * 2)
    p.fill()
    p.fillStyle = '#43a047'
    p.fillRect(70, 150, 22, 36)
    p.fillRect(124, 150, 22, 36)
    p.fillRect(56, 58, 30, 56)
    roundRect(p, 10, 34, 70, 42, 16, '#43a047')
    polygon(
      p,
      [
        [56, 36],
        [64, 12],
        [72, 36],
      ],
      '#fdd835',
    )
    circle(p, 34, 48, 6, '#ffffff')
    circle(p, 32, 48, 3, '#b71c1c')
    p.fillStyle = '#1b5e20'
    p.fillRect(12, 64, 30, 4)
  })

const golpeDoDuelo = () =>
  svg('duelo-golpe', 90, 90, (p) => {
    const pontas: [number, number][] = []
    for (let i = 0; i < 16; i++) {
      const angulo = (i * Math.PI) / 8
      const raio = i % 2 ? 18 : 44
      pontas.push([45 + Math.cos(angulo) * raio, 45 + Math.sin(angulo) * raio])
    }
    polygon(p, pontas, '#ffeb3b')
    circle(p, 45, 45, 14, '#fff8e1')
  })

const escudoDoDuelo = () =>
  svg('duelo-escudo', 40, 46, (p) => {
    p.fillStyle = '#90caf9'
    p.beginPath()
    p.moveTo(2, 4)
    p.lineTo(38, 4)
    p.lineTo(38, 22)
    p.quadraticCurveTo(38, 38, 20, 45)
    p.quadraticCurveTo(2, 38, 2, 22)
    p.closePath()
    p.fill()
    p.fillStyle = '#1565c0'
    p.fillRect(17, 8, 6, 30)
    p.fillRect(8, 16, 24, 6)
  })

// Passarinho Saltitante ------------------------------------------------------------------------

const ceuDoPassarinho = () =>
  svg('passarinho-ceu', 800, 540, (p) => {
    const ceu = p.createLinearGradient(0, 0, 0, 540)
    ceu.addColorStop(0, '#4dd0e1')
    ceu.addColorStop(1, '#b2ebf2')
    p.fillStyle = ceu
    p.fillRect(0, 0, 800, 540)
    for (const [x, y, r] of [
      [120, 90, 30],
      [160, 80, 38],
      [200, 95, 28],
      [520, 150, 26],
      [556, 140, 34],
      [590, 152, 24],
    ] as const)
      circle(p, x, y, r, '#ffffff')
    // The city far away, then the bushes on the ground line.
    p.fillStyle = '#80cbc4'
    for (let x = 0, i = 0; x < 800; x += 50, i++) p.fillRect(x, 420 - ((i * 37) % 90), 44, 140)
    p.fillStyle = '#b2dfdb'
    for (let x = 6, i = 0; x < 800; x += 50, i++)
      for (let y = 430 - ((i * 37) % 90); y < 520; y += 18) p.fillRect(x, y, 8, 8)
    for (let x = 0; x < 820; x += 60) circle(p, x, 530, 34, '#66bb6a')
  })

const chaoDoPassarinho = () =>
  svg('passarinho-chao', 800, 60, (p) => {
    p.fillStyle = '#dce775'
    p.fillRect(0, 0, 800, 60)
    p.fillStyle = '#7cb342'
    p.fillRect(0, 0, 800, 10)
    p.fillStyle = '#c0ca33'
    for (let x = 0; x < 800; x += 24) p.fillRect(x, 16, 12, 6)
  })

/** A pipe 64 x 600; the cap is at the end that faces the gap (bottom for the top pipe). */
const canoDoPassarinho = (deCima: boolean) =>
  svg(deCima ? 'passarinho-cano-de-cima' : 'passarinho-cano-de-baixo', 64, 600, (p) => {
    p.fillStyle = '#43a047'
    p.fillRect(4, 0, 56, 600)
    p.fillStyle = '#66bb6a'
    p.fillRect(10, 0, 10, 600)
    const boca = deCima ? 572 : 0
    roundRect(p, 0, boca, 64, 28, 4, '#2e7d32')
    p.fillStyle = '#81c784'
    p.fillRect(6, boca + 4, 10, 20)
  })

const passarinho = (asaParaCima: boolean) =>
  svg(asaParaCima ? 'passarinho-cima' : 'passarinho-baixo', 40, 32, (p) => {
    p.fillStyle = '#fdd835'
    p.beginPath()
    p.ellipse(19, 17, 15, 12, 0, 0, Math.PI * 2)
    p.fill()
    circle(p, 26, 12, 6, '#ffffff')
    circle(p, 28, 12, 2.5, '#212121')
    polygon(
      p,
      [
        [32, 16],
        [40, 19],
        [32, 22],
      ],
      '#ff7043',
    )
    p.fillStyle = '#f9a825'
    p.beginPath()
    p.ellipse(12, asaParaCima ? 11 : 21, 9, 5, 0, 0, Math.PI * 2)
    p.fill()
  })

// Placar dos Campeões --------------------------------------------------------------------------

const fundoDoPlacar = () =>
  svg('placar-fundo', 800, 600, (p) => {
    const ceu = p.createLinearGradient(0, 0, 0, 600)
    ceu.addColorStop(0, '#1a237e')
    ceu.addColorStop(1, '#4a148c')
    p.fillStyle = ceu
    p.fillRect(0, 0, 800, 600)
    for (let i = 0; i < 70; i++)
      circle(p, (i * 173) % 800, (i * 97) % 600, (i % 3) * 0.7 + 0.6, '#c5cae9')
  })

const estrelaDoPlacar = () =>
  svg('placar-estrela', 56, 56, (p) => {
    const pontas: [number, number][] = []
    for (let i = 0; i < 10; i++) {
      const angulo = -Math.PI / 2 + (i * Math.PI) / 5
      const raio = i % 2 ? 11 : 26
      pontas.push([28 + Math.cos(angulo) * raio, 29 + Math.sin(angulo) * raio])
    }
    polygon(p, pontas, '#ffd54f')
    circle(p, 23, 26, 2.5, '#5d4037')
    circle(p, 33, 26, 2.5, '#5d4037')
  })

// Continuar? -----------------------------------------------------------------------------------

const fundoDoContinuar = () =>
  svg('continuar-fundo', 800, 600, (p) => {
    p.fillStyle = '#0b0f2b'
    p.fillRect(0, 0, 800, 600)
    for (let i = 0; i < 90; i++)
      circle(p, (i * 211) % 800, (i * 131) % 600, (i % 4) * 0.5 + 0.5, '#e8eaf6')
    circle(p, 660, 120, 60, '#5c6bc0')
    circle(p, 640, 104, 14, '#7986cb')
  })

const naveDoContinuar = () =>
  svg('continuar-nave', 48, 44, (p) => {
    polygon(
      p,
      [
        [24, 0],
        [34, 26],
        [48, 40],
        [30, 36],
        [24, 44],
        [18, 36],
        [0, 40],
        [14, 26],
      ],
      '#eceff1',
    )
    circle(p, 24, 20, 6, '#29b6f6')
    p.fillStyle = '#ff7043'
    p.fillRect(20, 38, 8, 6)
  })

const pedraDoContinuar = () =>
  svg('continuar-pedra', 40, 40, (p) => {
    polygon(
      p,
      [
        [12, 2],
        [30, 4],
        [38, 18],
        [32, 34],
        [14, 38],
        [2, 26],
        [4, 10],
      ],
      '#8d6e63',
    )
    circle(p, 14, 14, 4, '#6d4c41')
    circle(p, 26, 26, 5, '#6d4c41')
  })

export const WIREFRAME_E_ART: Record<string, () => Record<string, Uint8Array>> = {
  'bolinha-rolante': () => ({
    'pista.svg': pistaDaBolinha(),
    'alturas.png': alturasDaBolinha(),
    'bolinha.svg': bolinha(),
    'bandeira.svg': bandeira(),
  }),
  'bolhas-que-se-dividem': () => ({
    'fundo.svg': fundoDasBolhas(),
    'jogador.svg': jogadorDasBolhas(),
    'ponta.svg': pontaDoArpao(),
    'bolha1.svg': bolhaQueSeDivide(1, 16, '#ffca28', '#f57f17'),
    'bolha2.svg': bolhaQueSeDivide(2, 30, '#ab47bc', '#6a1b9a'),
    'bolha3.svg': bolhaQueSeDivide(3, 48, '#ef5350', '#b71c1c'),
  }),
  'masmorra-para-quatro': () => ({
    'parede.svg': paredeDaMasmorra(),
    'chao.svg': chaoDaMasmorra(),
    'tesouro.svg': tesouroDaMasmorra(),
    'saida.svg': saidaDaMasmorra(false),
    'saida_aberta.svg': saidaDaMasmorra(true),
    'fantasma.svg': fantasmaDaMasmorra(),
    ...herois(),
  }),
  'duelo-por-turnos': () => ({
    'arena.svg': arenaDoDuelo(),
    'heroi.svg': heroiDoDuelo(),
    'dragao.svg': dragaoDoDuelo(),
    'golpe.svg': golpeDoDuelo(),
    'escudo.svg': escudoDoDuelo(),
  }),
  'passarinho-saltitante': () => ({
    'ceu.svg': ceuDoPassarinho(),
    'chao.svg': chaoDoPassarinho(),
    'cano_de_cima.svg': canoDoPassarinho(true),
    'cano_de_baixo.svg': canoDoPassarinho(false),
    'passarinho_cima.svg': passarinho(true),
    'passarinho_baixo.svg': passarinho(false),
  }),
  'placar-dos-campeoes': () => ({
    'fundo.svg': fundoDoPlacar(),
    'estrela.svg': estrelaDoPlacar(),
  }),
  continuar: () => ({
    'fundo.svg': fundoDoContinuar(),
    'nave.svg': naveDoContinuar(),
    'pedra.svg': pedraDoContinuar(),
  }),
}
