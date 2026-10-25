import { readdirSync, readFileSync } from 'node:fs'
import { pixelArt } from './pgzero-art'

/**
 * Original art of the Raylib examples, written as code (MIT, Sistema Zero 2026). The Clear Code
 * course draws small pixel-art textures and enlarges them with `draw_texture_ex(..., escala)`,
 * so this art is pixel art too: one character per pixel, encoded to PNG byte for byte
 * reproducibly (no clock, no random). Keys are the paths next to main.py.
 */

/** Press Start 2P (OFL), the same file the gabarito scenes use. */
export const PRESS_START_2P = new Uint8Array(
  readFileSync(new URL('../raylib/scenes/assets/fonts/pressstart2p.ttf', import.meta.url)),
)
export const PRESS_START_2P_OFL = readFileSync(
  new URL('../raylib/scenes/assets/fonts/OFL-pressstart2p.txt', import.meta.url),
  'utf8',
).replaceAll('\r\n', '\n')

// Nave (16 x 12): casco azul, cabine clara, chama laranja.
const NAVE = [
  '.......##.......',
  '......#oo#......',
  '......#oo#......',
  '.....##oo##.....',
  '....###cc###....',
  '...####cc####...',
  '..#####cc#####..',
  '.##############.',
  '###..######..###',
  '##....####....##',
  '......f..f......',
  '.....ff..ff.....',
]
const NAVE_CORES = { '#': '#4f7cff', o: '#d6f0ff', c: '#2b3fa8', f: '#ff9a3c' }

export const nave = (escala = 1) => pixelArt(NAVE, NAVE_CORES, escala)

// Pedra (16 x 16): asteroide cinza com crateras.
const PEDRA = [
  '.....######.....',
  '...##########...',
  '..####cc######..',
  '.####cccc######.',
  '.#####cc###cc##.',
  '##########cccc##',
  '###cc######cc###',
  '##cccc##########',
  '###cc#######cc##',
  '############cc##',
  '##############c.',
  '.#####cc#######.',
  '.####cccc######.',
  '..####cc######..',
  '...##########...',
  '.....######.....',
]
const PEDRA_CORES = { '#': '#9a8f86', c: '#6d635c' }
export const pedra = (escala = 1) => pixelArt(PEDRA, PEDRA_CORES, escala)

// Estrela (9 x 9) amarela com miolo claro.
const ESTRELA = [
  '....#....',
  '....#....',
  '...###...',
  '#########',
  '.##ooo##.',
  '..#####..',
  '..##.##..',
  '.##...##.',
  '.#.....#.',
]
export const estrela = (escala = 1) => pixelArt(ESTRELA, { '#': '#ffd23f', o: '#fff6c2' }, escala)

// Herói andando (12 x 16), quatro quadros: as pernas e os braços se alternam.
const HEROI_CABECA = [
  '....kkkk....',
  '...kkkkkk...',
  '...ppppkk...',
  '...pepppk...',
  '...ppppp....',
  '....ppp.....',
]
const HEROI_QUADROS = [
  [
    '...gggggg...',
    '..pgggggggp.',
    '..p.gggg..p.',
    '....gggg....',
    '....bbbb....',
    '...bb..bb...',
    '..bb....bb..',
    '..ss....ss..',
    '.sss....sss.',
    '............',
  ],
  [
    '...gggggg...',
    '...ggggggp..',
    '..pgggg.....',
    '....gggg....',
    '....bbbb....',
    '....bbbb....',
    '....bb.bb...',
    '....ss.ss...',
    '...sss.sss..',
    '............',
  ],
  [
    '...gggggg...',
    '.pgggggggp..',
    '.p..gggg..p.',
    '....gggg....',
    '....bbbb....',
    '...bb..bb...',
    '..bb....bb..',
    '..ss....ss..',
    '.sss....sss.',
    '............',
  ],
  [
    '...gggggg...',
    '..pgggggg...',
    '.....ggggp..',
    '....gggg....',
    '....bbbb....',
    '....bbbb....',
    '...bb.bb....',
    '...ss.ss....',
    '..sss.sss...',
    '............',
  ],
]
const HEROI_CORES = {
  k: '#3b2a1e',
  p: '#f2c38b',
  e: '#2b2b2b',
  g: '#38a169',
  b: '#2b4c8c',
  s: '#6b3f22',
}
const heroiLinhas = (quadro: number) => [...HEROI_CABECA, ...HEROI_QUADROS[quadro]!]

// Maçã (10 x 10) e cesta (16 x 8).
const MACA = [
  '.....g....',
  '....gl....',
  '..rr.rr...',
  '.rrrrrrrr.',
  'rrwrrrrrrr',
  'rwrrrrrrrr',
  'rrrrrrrrrr',
  'rrrrrrrrrr',
  '.rrrrrrrr.',
  '..rr..rr..',
]
export const maca = (escala = 1) =>
  pixelArt(MACA, { g: '#5b3a1e', l: '#4caf50', r: '#e53935', w: '#ffcdd2' }, escala)

// Dino (16 x 16): corpo verde, barriga clara, olho e duas pernas que se alternam.
const DINO_CORPO = [
  '.........gggggg.',
  '........ggwggggg',
  '........gggggggg',
  '........ggggg...',
  '........gggggll.',
  '.g.....gggg.....',
  '.gg...ggggggg...',
  '.ggg.gggggggg...',
  '.gggggggbbbg....',
  '..gggggbbbbg....',
  '...ggggbbbg.....',
  '....ggggggg.....',
]
const DINO_PERNAS = [
  ['.....gg..g......', '.....g...gg.....', '.....gg.........', '................'],
  ['.....g..gg......', '.....gg..g......', '.........gg.....', '................'],
  ['.....g...g......', '.....gg..gg.....', '................', '................'],
]
const DINO_CORES = { g: '#4caf50', w: '#ffffff', l: '#2e7d32', b: '#c5e1a5' }
const dinoLinhas = (quadro: number) => [...DINO_CORPO, ...DINO_PERNAS[quadro]!]

// Cactos de três tamanhos.
const CACTOS = [
  [
    '...gg...',
    '..gggg..',
    '..gggg..',
    'g.gggg..',
    'g.gggg.g',
    'gggggg.g',
    '..gggggg',
    '..gggg..',
    '..gggg..',
    '..gggg..',
  ],
  [
    '....gg....',
    '...gggg...',
    'g..gggg...',
    'g..gggg..g',
    'gg.gggg..g',
    '.ggggggggg',
    '...gggg...',
    '...gggg...',
    '...gggg...',
    '...gggg...',
    '...gggg...',
    '...gggg...',
  ],
  [
    '..gg....gg..',
    '.gggg..gggg.',
    '.gggg..gggg.',
    'ggggg.gggggg',
    '.gggggggggg.',
    '.gggg..gggg.',
    '.gggg..gggg.',
    '.gggg..gggg.',
  ],
]
export const cacto = (tipo: number, escala = 1) => pixelArt(CACTOS[tipo]!, { g: '#2e7d32' }, escala)

// Passarinho (12 x 8), asa para cima e para baixo.
const PASSARO = [
  [
    '..pp........',
    '..ppp.......',
    '...ppp......',
    '..pppppppppo',
    'ppppppppppp.',
    '....pppppp..',
    '............',
    '............',
  ],
  [
    '............',
    '............',
    '..........o.',
    '..ppppppppoo',
    'ppppppppppp.',
    '...ppp......',
    '..ppp.......',
    '..pp........',
  ],
]
const PASSARO_CORES = { p: '#7e57c2', o: '#ffb300' }

// Nuvem (16 x 6).
const NUVEM = [
  '.....wwww.......',
  '...wwwwwwww.....',
  '..wwwwwwwwwwww..',
  '.wwwwwwwwwwwwwww',
  'wwwwwwwwwwwwwwww',
  '.wwwwwwwwwwwwww.',
]
export const nuvem = (escala = 1) => pixelArt(NUVEM, { w: '#ffffff' }, escala)

// Laser (4 x 14) e estrelinha de fundo (5 x 5).
const LASER = [
  '.ww.',
  'wyyw',
  'wyyw',
  'wyyw',
  'wyyw',
  'wyyw',
  'wyyw',
  'wyyw',
  'wyyw',
  'wyyw',
  'wyyw',
  'wyyw',
  'wyyw',
  '.ww.',
]
export const laser = (escala = 1) => pixelArt(LASER, { w: '#fff59d', y: '#ff5252' }, escala)
const ESTRELINHA = ['..w..', '.wyw.', 'wyyyw', '.wyw.', '..w..']
export const estrelinha = (escala = 1) =>
  pixelArt(ESTRELINHA, { w: '#fff8e1', y: '#ffe082' }, escala)

const EXPLOSAO_CORES = { w: '#ffffff', y: '#ffeb3b', o: '#ff9800', r: '#9e3a1e' }

/** Explosão em anéis (18 x 18): cada quadro tem o anel maior e mais apagado. */
function explosaoLinhas(quadro: number) {
  const raio = 2.5 + quadro * 1.6
  const linhas: string[] = []
  for (let y = 0; y < 18; y++) {
    let linha = ''
    for (let x = 0; x < 18; x++) {
      const d = Math.hypot(x - 8.5, y - 8.5)
      if (d < raio - 3 && quadro < 2) linha += 'w'
      else if (d < raio - 1.5) linha += quadro < 3 ? 'y' : '.'
      else if (d < raio) linha += quadro < 4 ? 'o' : 'r'
      else linha += '.'
    }
    linhas.push(linha)
  }
  return linhas
}

// Monstrinhos (16 x 16), virados para a esquerda (o jogo espelha o do jogador).
const FAISCA = [
  '...k......k.....',
  '..kyk....kyk....',
  '..kyyk..kyyk....',
  '...kyyyyyyk.....',
  '..kyyyyyyyyk....',
  '..kyekyyekyk..kk',
  '..kyyyyyyyykkkyk',
  '..krryyyyrrkyyk.',
  '...kyyyyyyk.kyk.',
  '..kyyyyyyyyk.kk.',
  '.kyyyyyyyyyyk...',
  '.kyykyyyykyyk...',
  '.kyyyyyyyyyyk...',
  '..kyyyyyyyyk....',
  '...kyk..kyk.....',
  '...kkk..kkk.....',
]
const BOLHA = [
  '..........ww....',
  '.........wbbw...',
  '..........ww....',
  '.....kkkkkk.....',
  '....kbbbbbbk....',
  '...kbbbbbbbbk...',
  '..kbwbbbbbbbbk..',
  '..kbbekbbekbbk..',
  '.kbbbbbbbbbbbbk.',
  '.kbbbbddddbbbbk.',
  '.kbbbbbddbbbbbk.',
  '.kbbbbbbbbbbbbk.',
  '..kbbbbbbbbbbk..',
  '..kbbbbbbbbbbk..',
  '...kkbbbbbbkk...',
  '.....kkkkkk.....',
]
const BRASA = [
  '................',
  '..kkkk..........',
  '.krrrrk.........',
  'krerrrrk........',
  'krrrrrrk........',
  '.kkrrrrk...kkk..',
  '..krrrrrkkkrrrk.',
  '..krrrrrrrrrrrk.',
  '..kryyyrrrrrrk..',
  '..kryyyrrrrrrkoo',
  '..kryyyrrrrrkooy',
  '...krrrrrrrk.oyo',
  '...krrkkkrrk..o.',
  '...krk...krk....',
  '...kkk...kkk....',
  '................',
]
const FOLHINHA = [
  '.......kk.......',
  '......kllk......',
  '.....kllllk.....',
  '......klk.......',
  '.....kkkkkk.....',
  '....kggggggk....',
  '...kggggggggk...',
  '..kgggggggggk...',
  '..kgekggekggk...',
  '..kggggggggggk..',
  '.kggggppggggggk.',
  '.kggggggggggggk.',
  '.kggggggggggggk.',
  '..kggggggggggk..',
  '...kgk....kgk...',
  '...kkk....kkk...',
]
const MONSTRO_CORES = {
  k: '#2b2233',
  y: '#ffd54f',
  e: '#1b1b1b',
  r: '#e57373',
  w: '#e3f2fd',
  b: '#64b5f6',
  d: '#1e3a5f',
  o: '#ff9800',
  g: '#81c784',
  l: '#388e3c',
  p: '#f48fb1',
}
const MONSTROS: Record<string, readonly string[]> = {
  faisca: FAISCA,
  bolha: BOLHA,
  brasa: BRASA,
  folhinha: FOLHINHA,
}
export const monstrinho = (nome: string, escala = 1) =>
  pixelArt(MONSTROS[nome]!, MONSTRO_CORES, escala)

// Aventura do Herói: herói em três direções (16 x 15), gosma em dois quadros (16 x 14),
// árvore, pedra, mato, coração, folha e espada. Tudo no tamanho natural: o jogo amplia com ESCALA.
const HEROI_AVENTURA: Record<string, readonly string[]> = {
  baixo: [
    '.....kkkkkk.....',
    '....kccccccck...',
    '...kccccccccck..',
    '...kcppppppck...',
    '...kpekppekpk...',
    '...kpppppppppk..',
    '....kppprppk....',
    '...kggggggggk...',
    '..kpggggggggpk..',
    '..kpgggyyggggpk.',
    '...kggggggggk...',
    '...kbbbkkbbbk...',
    '...kbbk..kbbk...',
    '...kssk..kssk...',
    '...kkkk..kkkk...',
  ],
  lado: [
    '.....kkkkkk.....',
    '....kcccccccck..',
    '...kcccccccccck.',
    '...kcccppppppk..',
    '...kccpppekppk..',
    '...kcpppppppppk.',
    '....kpppprppk...',
    '....kgggggggk...',
    '...kgggpgggk....',
    '...kggypgggk....',
    '....kgggggk.....',
    '....kbbbbbk.....',
    '...kbbk.kbbk....',
    '...kssk.kssk....',
    '...kkkk.kkkk....',
  ],
  cima: [
    '.....kkkkkk.....',
    '....kcccccccck..',
    '...kccccccccck..',
    '...kccccccccck..',
    '...kccccccccck..',
    '...kcccccccccck.',
    '....kcccccccck..',
    '...kggggggggk...',
    '..kpggggggggpk..',
    '..kpggggggggpk..',
    '...kggggggggk...',
    '...kbbbkkbbbk...',
    '...kbbk..kbbk...',
    '...kssk..kssk...',
    '...kkkk..kkkk...',
  ],
}
const HEROI_AVENTURA_CORES = {
  k: '#2b2233',
  c: '#8d5524',
  p: '#f2c38b',
  e: '#1b1b1b',
  r: '#d9776a',
  g: '#3b82c4',
  y: '#ffd54f',
  b: '#5d4037',
  s: '#3e2723',
}
const GOSMA = [
  [
    '................',
    '................',
    '.....kkkkkk.....',
    '....kmmmmmmk....',
    '...kmwmmmmmmk...',
    '..kmmmmmmmmmmk..',
    '..kmmekmmekmmk..',
    '.kmmmmmmmmmmmmk.',
    '.kmmmmmddmmmmmk.',
    '.kmmmmmmmmmmmmk.',
    'kmmmmmmmmmmmmmmk',
    'kmmmmmmmmmmmmmmk',
    '.kkmmmmmmmmmmkk.',
    '...kkkkkkkkkk...',
  ],
  [
    '................',
    '................',
    '................',
    '......kkkk......',
    '....kkmmmmkk....',
    '...kmwmmmmmmk...',
    '..kmmekmmekmmk..',
    '.kmmmmmmmmmmmmk.',
    '.kmmmmmddmmmmmk.',
    'kmmmmmmmmmmmmmmk',
    'kmmmmmmmmmmmmmmk',
    'kmmmmmmmmmmmmmmk',
    '.kkmmmmmmmmmmkk.',
    '...kkkkkkkkkk...',
  ],
]
const GOSMA_CORES = { k: '#2b2233', m: '#9c6ade', w: '#e1d1f7', e: '#1b1b1b', d: '#5e3a8c' }
const ARVORE = [
  '......kkkk......',
  '....kkllllkk....',
  '...klllllllk....',
  '..kllldllllllk..',
  '..klllllllldlk..',
  '.klldllllllllk..',
  '.kllllllldlllk..',
  'klllllllllllllk.',
  'kllldllllllllllk',
  'klllllllldllllk.',
  '.kllllllllllllk.',
  '.kllldlllllldlk.',
  '..kllllllllllk..',
  '..kllllldllllk..',
  '...kklllllkk....',
  '.....kttk.......',
  '.....kttk.......',
  '.....kttk.......',
  '.....kttk.......',
  '.....kttk.......',
  '....kttttk......',
  '...kttttttk.....',
  '................',
  '................',
]
const PEDRA_AVENTURA = [
  '................',
  '................',
  '.....kkkkkk.....',
  '....kpppppppk...',
  '...kppqqpppppk..',
  '..kpppqqppppppk.',
  '..kppppppppqppk.',
  '.kpppppppppqqpk.',
  '.kpppqppppppppk.',
  '.kppqqppppppppk.',
  'kpppppppppppppk.',
  'kppppppppppppppk',
  '.kkpppppppppkk..',
  '...kkkkkkkkk....',
]
const MATO = [
  '................',
  '......l...l.....',
  '..l...ll.ll..l..',
  '..ll..lllll.ll..',
  '...ll.lllllll...',
  '.l.llllldlllll..',
  '.lllllllllllll..',
  '..llldlllllldl..',
  '.lllllllllllllll',
  'llllldllllllllll',
  '.llllllllldllll.',
  '..llllllllllll..',
]
const MATO_CORES = {
  k: '#2b2233',
  l: '#4caf50',
  d: '#2e7d32',
  t: '#795548',
  p: '#9e9e9e',
  q: '#757575',
}
const CORACAO = ['.rr.rr.', 'rwrrrrr', 'rrrrrrr', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...']
const FOLHA = ['.ll.', 'lldl', 'ldll', '.ll.']
const ESPADA = ['.ww.', '.ww.', '.ww.', '.ww.', '.ww.', '.ww.', 'yyyy', '.bb.', '.bb.', '.yy.']

/**
 * Folha de quadros no formato que o Pinta exporta: uma LINHA por animação, os quadros lado a
 * lado e `colunas = o maior número de quadros` (a animação mais curta deixa o fim da linha
 * vazio). Todo quadro tem o mesmo tamanho, então o jogo acha o tamanho do quadro dividindo a
 * largura da imagem pelas colunas e a altura pelas linhas: um desenho do Pinta de qualquer
 * tamanho entra no lugar.
 */
export function folhaDeQuadros(
  animacoes: readonly (readonly (readonly string[])[])[],
  cores: Record<string, string>,
  escala = 1,
) {
  const primeiro = animacoes[0]![0]!
  const largura = primeiro[0]!.length
  const altura = primeiro.length
  const colunas = Math.max(...animacoes.map((animacao) => animacao.length))
  const vazio = Array.from({ length: altura }, () => '.'.repeat(largura))
  const linhas: string[] = []
  for (const animacao of animacoes) {
    for (let y = 0; y < altura; y++) {
      linhas.push(Array.from({ length: colunas }, (_, c) => (animacao[c] ?? vazio)[y]).join(''))
    }
  }
  return pixelArt(linhas, cores, escala)
}

export const AVENTURA_ART = () => ({
  // Uma animação por direção, um quadro cada: baixo, lado e cima.
  'images/heroi.png': folhaDeQuadros(
    [[HEROI_AVENTURA.baixo!], [HEROI_AVENTURA.lado!], [HEROI_AVENTURA.cima!]],
    HEROI_AVENTURA_CORES,
  ),
  'images/gosma.png': folhaDeQuadros([[GOSMA[0]!, GOSMA[1]!]], GOSMA_CORES),
  'images/arvore.png': pixelArt(ARVORE, { ...MATO_CORES, l: '#2e7d32', d: '#1b5e20' }, 1),
  'images/pedra.png': pixelArt(PEDRA_AVENTURA, MATO_CORES, 1),
  'images/mato.png': pixelArt(MATO, MATO_CORES, 1),
  'images/coracao.png': pixelArt(CORACAO, { r: '#e53935', w: '#ffcdd2' }, 1),
  'images/folha.png': pixelArt(FOLHA, MATO_CORES, 1),
  'images/espada.png': pixelArt(ESPADA, { w: '#e0e0e0', y: '#ffb300', b: '#6d4c41' }, 1),
})

// Labirinto dos Robôs: o robô (16 x 18) e o lançador de energia (16 x 16), em folhas do Pinta.
const ROBO_CABECA = [
  '......aa........',
  '......kk........',
  '..kkkkkkkkkkkk..',
  '.kggggggggggggk.',
  '.kgwwgggggwwggk.',
  '.kgweggggggewgk.',
  '.kggggggggggggk.',
  '.kggddddddddggk.',
  '..kkkkkkkkkkkk..',
  '...kddddddddk...',
  'kkkdggggggggdkkk',
  'kgkdggyyyyggdkgk',
  'kgkdggyyyyggdkgk',
  'kkkdggggggggdkkk',
  '...kddddddddk...',
]
const ROBO_PES = [
  ['..kkkk....kkkk..', '..kddk....kddk..', '..kkkk....kkkk..'],
  ['.kkkk......kkkk.', '.kddk......kddk.', '.kkkk......kkkk.'],
]
const troca = (linhas: readonly string[], de: string, para: string) =>
  linhas.map((linha) => linha.split(de).join(para))
const roboParado = (pes: number) => [...ROBO_CABECA, ...ROBO_PES[pes]!]
// Atacando, os olhos e a luz do peito ficam vermelhos.
const roboBravo = (pes: number) => troca(troca(roboParado(pes), 'e', 'r'), 'y', 'o')
// Desligado, os olhos e a luz se apagam.
const roboDesligado = () => troca(troca(troca(roboParado(0), 'e', 'd'), 'w', 'd'), 'y', 'd')
const ROBO_CORES = {
  k: '#2b2233',
  g: '#90a4ae',
  d: '#546e7a',
  w: '#e0f7fa',
  e: '#00e5ff',
  a: '#ff5252',
  y: '#ffd54f',
  r: '#ff1744',
  o: '#ff9100',
}
const LANCADOR = [
  '......kkkk......',
  '.....kcwwck.....',
  '.....kcccck.....',
  '.....kbbbbk.....',
  '.....kbbbbk.....',
  '....kkbbbbkk....',
  '...kbbbbbbbbk...',
  '...kbbyybbbbk...',
  '...kbbbbbbbbk...',
  '...kkkbbbbkkk...',
  '.....kppppk.....',
  '.....kppppk.....',
  '....kkppppkk....',
  '....kssppssk....',
  '....kssssssk....',
  '....kssssssk....',
]
// Disparando, a ponta acende.
const LANCADOR_DISPARANDO = [
  '.....ywwwwy.....',
  '.....kwwwwk.....',
  '.....kcwwck.....',
  ...LANCADOR.slice(3),
]
const LANCADOR_CORES = {
  k: '#2b2233',
  c: '#00e5ff',
  w: '#e0f7fa',
  b: '#3d5afe',
  y: '#ffd54f',
  p: '#7e57c2',
  s: '#ffcc80',
}

/**
 * The 3D games' art, made in the Molda by scripts/raylib/molda-models.ts (models, textures and
 * the sky): this only reads what that script wrote, so the Molda never enters the type graph.
 */
const moldaArt = (key: string) => () => {
  const folder = new URL(`../raylib/models/${key}/`, import.meta.url)
  const files: Record<string, Uint8Array> = {}
  for (const path of readdirSync(folder, { recursive: true, encoding: 'utf8' })) {
    const name = path.split('\\').join('/')
    if (!name.includes('.')) continue
    files[name] = new Uint8Array(readFileSync(new URL(name, folder)))
  }
  return Object.fromEntries(Object.entries(files).sort(([a], [b]) => a.localeCompare(b)))
}

export const RAYLIB_GAME_ART: Record<string, () => Record<string, Uint8Array>> = {
  // Raylib 3D. A Primeira Cena desenha tudo com malhas geradas: nenhum arquivo.
  'primeira-cena-3d': () => ({}),
  'modelos-do-molda': moldaArt('modelos-do-molda'),
  'caixas-que-se-encostam': moldaArt('caixas-que-se-encostam'),
  'clarao-com-shader': moldaArt('clarao-com-shader'),
  'corrida-infinita': moldaArt('corrida-infinita'),
  'patrulha-espacial': moldaArt('patrulha-espacial'),
  'mundo-de-blocos': moldaArt('mundo-de-blocos'),
  // As paredes, o chão e o céu são do Molda; o robô e o lançador são folhas do Pinta.
  'labirinto-dos-robos': () => ({
    ...moldaArt('labirinto-dos-robos')(),
    // Linhas: parado, andando (dois quadros), atacando (dois quadros) e desligado.
    'images/robo.png': folhaDeQuadros(
      [
        [roboParado(0)],
        [roboParado(0), roboParado(1)],
        [roboBravo(0), roboBravo(1)],
        [roboDesligado()],
      ],
      ROBO_CORES,
    ),
    // Linhas: pronto e disparando.
    'images/lancador.png': folhaDeQuadros([[LANCADOR], [LANCADOR_DISPARANDO]], LANCADOR_CORES),
  }),
  'ola-raylib': () => ({
    'images/nave.png': nave(),
    'fonts/pressstart2p.ttf': PRESS_START_2P,
  }),
  // Encostou! e Câmera que Segue desenham tudo com formas: nenhuma imagem.
  encostou: () => ({}),
  'camera-que-segue': () => ({}),
  'sprites-timer-animacao': () => ({
    'images/heroi.png': folhaDeQuadros([[0, 1, 2, 3].map(heroiLinhas)], HEROI_CORES),
    'images/maca.png': maca(),
  }),
  'dino-corredor': () => ({
    // Linha 0 = correndo (dois quadros), linha 1 = pulando (um quadro).
    'images/dino.png': folhaDeQuadros(
      [[dinoLinhas(0), dinoLinhas(1)], [dinoLinhas(2)]],
      DINO_CORES,
    ),
    'images/cacto0.png': cacto(0),
    'images/cacto1.png': cacto(1),
    'images/cacto2.png': cacto(2),
    'images/passaro.png': folhaDeQuadros([[PASSARO[0]!, PASSARO[1]!]], PASSARO_CORES),
    'images/nuvem.png': nuvem(),
    'fonts/pressstart2p.ttf': PRESS_START_2P,
  }),
  'chuva-de-meteoros': () => ({
    'images/nave.png': nave(),
    'images/meteoro.png': pedra(),
    'images/laser.png': laser(),
    'images/estrela.png': estrelinha(),
    'images/explosao.png': folhaDeQuadros([[0, 1, 2, 3, 4].map(explosaoLinhas)], EXPLOSAO_CORES),
    'fonts/pressstart2p.ttf': PRESS_START_2P,
  }),
  'batalha-de-monstrinhos': () => ({
    'images/faisca.png': monstrinho('faisca'),
    'images/bolha.png': monstrinho('bolha'),
    'images/brasa.png': monstrinho('brasa'),
    'images/folhinha.png': monstrinho('folhinha'),
    'fonts/pressstart2p.ttf': PRESS_START_2P,
  }),
  'aventura-do-heroi': () => ({
    ...AVENTURA_ART(),
    'fonts/pressstart2p.ttf': PRESS_START_2P,
  }),
  'nave-que-desliza': () => ({
    'images/nave.png': nave(),
    'images/pedra.png': pedra(),
    'images/estrela.png': estrela(),
  }),
}
