/**
 * As cenas do jogo D (lote 8 da conclusão do plano do Estúdio, 22/11/2026), escritas contra o
 * esquema das cenas do Pinta (versão 2): o mundo de 96 × 72 peças em seis regiões, três cavernas
 * e quatro casas, ligadas por portas com destino e chegada. Tudo determinístico (semente fixa).
 *
 * As portas guardam `destino` (o desenho da outra cena) e `chegada` (o id do objeto onde o
 * jogador aparece lá). As regiões são retângulos `role: 'region'` com o nome e as vizinhas (em
 * par, separadas por vírgula). As entidades (moedas, inimigos e baús) ficam em camadas de objetos
 * com o tipo, e as do mundo levam a região delas (`regiao`).
 */
import type {
  PintaScene,
  PintaSceneLayer,
  PintaSceneObject,
} from '@sistemazero/core/studio/pinta-scene'
import { P, PECA, PECAS, SOLIDAS, sorteio } from './arte'

type Celulas = number[]
const VAZIA = -1

export interface Regiao {
  nome: string
  x0: number
  y0: number
  x1: number
  y1: number
  vizinhas: string[]
}

/** As seis regiões do mundo (em peças), 3 × 2, vizinhas pelos lados. */
export const REGIOES: Regiao[] = [
  { nome: 'Vila', x0: 0, y0: 0, x1: 32, y1: 36, vizinhas: ['Floresta', 'Lago'] },
  { nome: 'Floresta', x0: 32, y0: 0, x1: 64, y1: 36, vizinhas: ['Vila', 'Montanha', 'Campo'] },
  { nome: 'Montanha', x0: 64, y0: 0, x1: 96, y1: 36, vizinhas: ['Floresta', 'Ruínas'] },
  { nome: 'Lago', x0: 0, y0: 36, x1: 32, y1: 72, vizinhas: ['Vila', 'Campo'] },
  { nome: 'Campo', x0: 32, y0: 36, x1: 64, y1: 72, vizinhas: ['Floresta', 'Lago', 'Ruínas'] },
  { nome: 'Ruínas', x0: 64, y0: 36, x1: 96, y1: 72, vizinhas: ['Montanha', 'Campo'] },
]

/** O nome sem acento, para os ids dos objetos. */
const semAcento = (nome: string) => nome.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

/** O centro de cada região, em peças: é onde o robô da prova visita cada uma. */
export const centroDaRegiao = (r: Regiao): [number, number] => [
  (r.x0 + r.x1) / 2,
  (r.y0 + r.y1) / 2,
]

/**
 * Nenhum inimigo nasce a menos de 6 peças (192 px) de uma chegada, do início ou do centro de uma
 * região: o inimigo persegue quem está a menos de 140 px, e o herói apanhava toda vez que saía da
 * caverna 3 (revisão do lote 8).
 */
export const RAIO_SEM_INIMIGO = 6

export const CENAS = {
  mundo: 'jogo-d-mundo',
  cavernas: ['jogo-d-caverna-1', 'jogo-d-caverna-2', 'jogo-d-caverna-3'],
  casas: ['jogo-d-casa-1', 'jogo-d-casa-2', 'jogo-d-casa-3', 'jogo-d-casa-4'],
} as const

class Grade {
  readonly camadas = new Map<string, Celulas>()
  constructor(
    readonly colunas: number,
    readonly linhas: number,
  ) {}
  camada(nome: string) {
    let c = this.camadas.get(nome)
    if (!c) {
      c = Array(this.colunas * this.linhas).fill(VAZIA)
      this.camadas.set(nome, c)
    }
    return c
  }
  por(nome: string, x: number, y: number, peca: number) {
    if (x < 0 || y < 0 || x >= this.colunas || y >= this.linhas) return
    this.camada(nome)[y * this.colunas + x] = peca
  }
  ler(nome: string, x: number, y: number) {
    return this.camadas.get(nome)?.[y * this.colunas + x] ?? VAZIA
  }
  /** Livre para uma entidade: chão sem nada sólido por cima. */
  livre(x: number, y: number) {
    if (x < 1 || y < 1 || x >= this.colunas - 1 || y >= this.linhas - 1) return false
    for (const [nome, celulas] of this.camadas) {
      if (nome === 'chao' || nome === 'caminho' || nome === 'decoracao') continue
      const v = celulas[y * this.colunas + x]!
      if (v !== VAZIA && SOLIDAS.includes(PECAS[v]!)) return false
      if (v !== VAZIA && (nome === 'copas' || nome === 'telhados')) return false
    }
    return true
  }
}

const objeto = (
  id: string,
  nome: string,
  tipo: string,
  x: number,
  y: number,
  extra: Partial<PintaSceneObject> = {},
): PintaSceneObject => ({
  id,
  name: nome,
  type: tipo,
  x,
  y,
  width: PECA,
  height: PECA,
  properties: {},
  ...extra,
})

const tiles = (
  id: string,
  nome: string,
  cells: Celulas,
  extra: Partial<Extract<PintaSceneLayer, { kind: 'tiles' }>> = {},
): PintaSceneLayer => ({
  id,
  name: nome,
  kind: 'tiles',
  visible: true,
  tilesetId: 'pecas',
  cells,
  ...extra,
})
const objetos = (id: string, nome: string, lista: PintaSceneObject[]): PintaSceneLayer => ({
  id,
  name: nome,
  kind: 'objects',
  visible: true,
  objects: lista,
})

function cena(
  id: string,
  nome: string,
  g: Grade,
  camadas: PintaSceneLayer[],
  tilesetImagem: string,
): PintaScene {
  // Cada entidade leva a chave dela (lugar/objeto): é o que o programa guarda quando a criança
  // pega a moeda, abre o baú ou afasta o inimigo (o bloco "dado do objeto" não lê o id).
  for (const camada of camadas)
    if (camada.kind === 'objects' && ['moedas', 'inimigos', 'baus'].includes(camada.id))
      for (const o of camada.objects) o.properties = { ...o.properties, chave: `${id}/${o.id}` }
  return {
    version: 2,
    id,
    name: nome,
    tileSize: PECA,
    cols: g.colunas,
    rows: g.linhas,
    tilesets: [
      {
        id: 'pecas',
        name: 'Peças do jogo D',
        image: tilesetImagem,
        columns: 8,
        count: PECAS.length,
        solid: SOLIDAS.map((p) => P[p]),
        platform: [],
      },
    ],
    layers: camadas,
  }
}

/** Espalha entidades em peças livres de uma área, sem repetir lugar. */
function espalhar(
  g: Grade,
  a: () => number,
  quantas: number,
  area: { x0: number; y0: number; x1: number; y1: number },
  ocupadas: Set<string>,
  longeDe: [number, number][] = [],
) {
  const lugares: [number, number][] = []
  for (let tentativa = 0; lugares.length < quantas && tentativa < quantas * 60; tentativa++) {
    const x = area.x0 + Math.floor(a() * (area.x1 - area.x0)),
      y = area.y0 + Math.floor(a() * (area.y1 - area.y0)),
      chave = `${x},${y}`
    if (ocupadas.has(chave) || !g.livre(x, y)) continue
    if (longeDe.some(([px, py]) => Math.hypot(px - x, py - y) < RAIO_SEM_INIMIGO)) continue
    ocupadas.add(chave)
    lugares.push([x, y])
  }
  if (lugares.length < quantas)
    throw new Error(`Não coube: ${quantas} entidades em ${JSON.stringify(area)}.`)
  return lugares
}

export function mundo(tilesetImagem: string) {
  const g = new Grade(96, 72),
    a = sorteio(2026)
  // Chão: grama com flores no campo, areia em volta do lago.
  for (let y = 0; y < g.linhas; y++)
    for (let x = 0; x < g.colunas; x++) {
      const campo = x >= 32 && x < 64 && y >= 36
      g.por('chao', x, y, campo && a() < 0.25 ? P['grama-flores'] : P.grama)
    }
  // O lago (região Lago), com a margem de areia.
  for (let y = 40; y < 68; y++)
    for (let x = 4; x < 28; x++) {
      const d = ((x - 16) / 11) ** 2 + ((y - 54) / 12) ** 2
      if (d < 1) g.por('agua', x, y, P.agua)
      else if (d < 1.35) g.por('caminho', x, y, P.areia)
    }
  // Caminhos: a cruz que liga as regiões e uma volta.
  for (let x = 2; x < 94; x++) for (const y of [17, 18]) g.por('caminho', x, y, P.caminho)
  for (let y = 2; y < 70; y++) for (const x of [47, 48]) g.por('caminho', x, y, P.caminho)
  for (let x = 48; x < 94; x++) for (const y of [53, 54]) g.por('caminho', x, y, P.caminho)
  // Cercas na borda do mundo, e a camada de colisão (invisível) por trás delas.
  for (let x = 0; x < g.colunas; x++) {
    g.por('cercas', x, 0, P.cerca)
    g.por('cercas', x, g.linhas - 1, P.cerca)
    g.por('colisao', x, 0, P.pedra)
    g.por('colisao', x, g.linhas - 1, P.pedra)
  }
  for (let y = 0; y < g.linhas; y++) {
    g.por('cercas', 0, y, P.cerca)
    g.por('cercas', g.colunas - 1, y, P.cerca)
    g.por('colisao', 0, y, P.pedra)
    g.por('colisao', g.colunas - 1, y, P.pedra)
  }
  // A vila: quatro casas (paredes, porta, janelas e telhado na frente).
  const casas = [
    [5, 5],
    [16, 5],
    [5, 24],
    [16, 24],
  ] as const
  casas.forEach(([cx, cy]) => {
    for (let y = cy; y < cy + 4; y++)
      for (let x = cx; x < cx + 6; x++) {
        if (y >= cy + 2)
          g.por(
            'casas',
            x,
            y,
            x === cx + 2 ? P['porta-casa'] : x === cx + 4 ? P.janela : P['parede-casa'],
          )
        if (y === cy + 2 || (y === cy + 3 && x !== cx + 2)) g.por('colisao', x, y, P.pedra)
        if (y < cy + 2) g.por('telhados', x, y, P.telhado)
      }
  })
  // A floresta: árvores densas (tronco que segura, copa na frente).
  for (let y = 2; y < 34; y += 3)
    for (let x = 33; x < 63; x += 3) {
      if (Math.abs(y - 17.5) < 3 || Math.abs(x - 47.5) < 3) continue
      if (a() < 0.18) continue
      const ox = x + Math.floor(a() * 2),
        oy = y + Math.floor(a() * 2)
      g.por('troncos', ox, oy + 1, P.tronco)
      g.por('copas', ox, oy, P.copa)
    }
  // Árvores soltas no resto e arbustos.
  for (let k = 0; k < 120; k++) {
    const x = 1 + Math.floor(a() * 94),
      y = 1 + Math.floor(a() * 70)
    if (x >= 32 && x < 64 && y < 36) continue
    if (!g.livre(x, y) || !g.livre(x, y + 1) || g.ler('caminho', x, y) !== VAZIA) continue
    if (a() < 0.5) {
      g.por('troncos', x, y + 1, P.tronco)
      g.por('copas', x, y, P.copa)
    } else g.por('troncos', x, y, P.arbusto)
  }
  // Montanha e ruínas: pedras, e as três entradas de caverna.
  for (let k = 0; k < 140; k++) {
    const x = 65 + Math.floor(a() * 30),
      y = 1 + Math.floor(a() * 70)
    if (g.ler('caminho', x, y) !== VAZIA || !g.livre(x, y)) continue
    g.por('troncos', x, y, P.pedra)
  }
  const entradas = [
    [72, 6],
    [88, 10],
    [80, 62],
  ] as const
  entradas.forEach(([x, y]) => {
    for (const [dx, dy] of [
      [0, 1],
      [-1, 0],
      [1, 0],
      [0, 0],
    ] as const)
      g.camada('troncos')[(y + dy) * g.colunas + x + dx] = VAZIA
    g.por('casas', x, y, P['entrada-caverna'])
  })
  // Decoração miúda.
  for (let k = 0; k < 160; k++) {
    const x = 1 + Math.floor(a() * 94),
      y = 1 + Math.floor(a() * 70)
    if (g.livre(x, y) && g.ler('caminho', x, y) === VAZIA) g.por('decoracao', x, y, P.pedrinhas)
  }
  // Névoa (na frente, com paralaxe) sobre o pântano das ruínas.
  for (let y = 40; y < 70; y++)
    for (let x = 66; x < 94; x++) if (a() < 0.5) g.por('nevoa', x, y, P.nevoa)

  // Portas e chegadas: a porta fica na porta da casa ou na boca da caverna; a chegada (no mundo)
  // fica uma peça abaixo, de volta.
  // Nada nasce em cima do início do herói.
  const ocupadas = new Set<string>()
  for (let dy = -2; dy <= 2; dy++)
    for (let dx = -2; dx <= 2; dx++) ocupadas.add(`${11 + dx},${15 + dy}`)
  const portas: PintaSceneObject[] = [],
    chegadas: PintaSceneObject[] = []
  casas.forEach(([cx, cy], i) => {
    const px = cx + 2,
      py = cy + 3
    ocupadas.add(`${px},${py}`)
    ocupadas.add(`${px},${py + 1}`)
    portas.push(
      objeto(`porta-casa-${i + 1}`, `Porta da casa ${i + 1}`, 'porta', px * PECA, py * PECA, {
        role: 'door',
        properties: { destino: CENAS.casas[i]!, chegada: 'chegada' },
      }),
    )
    chegadas.push(
      objeto(
        `saida-casa-${i + 1}`,
        `Saída da casa ${i + 1}`,
        'chegada',
        px * PECA + PECA / 2,
        (py + 1) * PECA + PECA / 2,
        {
          shape: 'point',
          width: 0,
          height: 0,
        },
      ),
    )
  })
  entradas.forEach(([x, y], i) => {
    ocupadas.add(`${x},${y}`)
    ocupadas.add(`${x},${y + 1}`)
    portas.push(
      objeto(`porta-caverna-${i + 1}`, `Entrada da caverna ${i + 1}`, 'porta', x * PECA, y * PECA, {
        role: 'door',
        properties: { destino: CENAS.cavernas[i]!, chegada: 'chegada' },
      }),
    )
    chegadas.push(
      objeto(
        `saida-caverna-${i + 1}`,
        `Saída da caverna ${i + 1}`,
        'chegada',
        x * PECA + PECA / 2,
        (y + 1) * PECA + PECA / 2,
        {
          shape: 'point',
          width: 0,
          height: 0,
        },
      ),
    )
  })

  // Entidades por região: 57 moedas, 15 inimigos e 3 baús em cada (75; a região e as vizinhas somam no máximo 300).
  const moedas: PintaSceneObject[] = [],
    inimigos: PintaSceneObject[] = [],
    baus: PintaSceneObject[] = [],
    nascimentos: PintaSceneObject[] = []
  const semInimigo: [number, number][] = [
    [11, 15],
    ...casas.map(([cx, cy]): [number, number] => [cx + 2, cy + 4]),
    ...entradas.map(([x, y]): [number, number] => [x, y + 1]),
    ...REGIOES.map(centroDaRegiao),
  ]
  for (const r of REGIOES) {
    const area = { x0: r.x0 + 1, y0: r.y0 + 1, x1: r.x1 - 1, y1: r.y1 - 1 }
    const chave = semAcento(r.nome)
    moedas.push(
      ...espalhar(g, a, 57, area, ocupadas).map(([x, y], i) =>
        objeto(`moeda-${chave}-${i + 1}`, 'Moeda', 'moeda', x * PECA, y * PECA, {
          properties: { regiao: r.nome },
        }),
      ),
    )
    inimigos.push(
      ...espalhar(g, a, 15, area, ocupadas, semInimigo).map(([x, y], i) =>
        objeto(`inimigo-${chave}-${i + 1}`, 'Gosma', 'inimigo', x * PECA, y * PECA, {
          role: 'enemy',
          properties: { regiao: r.nome },
        }),
      ),
    )
    baus.push(
      ...espalhar(g, a, 3, area, ocupadas).map(([x, y], i) =>
        objeto(`bau-${chave}-${i + 1}`, 'Baú', 'bau', x * PECA, y * PECA, {
          properties: { regiao: r.nome },
        }),
      ),
    )
    nascimentos.push(
      ...espalhar(g, a, 2, area, ocupadas).map(([x, y], i) =>
        objeto(`nasce-${chave}-${i + 1}`, 'Ninho', 'nasce', x * PECA, y * PECA, {
          properties: { regiao: r.nome },
        }),
      ),
    )
  }
  const regioes = REGIOES.map((r) =>
    objeto(`regiao-${semAcento(r.nome)}`, r.nome, 'regiao', r.x0 * PECA, r.y0 * PECA, {
      role: 'region',
      // Semiaberta: 1 px a menos, para a borda comum ficar numa região só (o tocador confere as
      // bordas incluídas, e o herói parado na borda ficava nas duas).
      width: (r.x1 - r.x0) * PECA - 1,
      height: (r.y1 - r.y0) * PECA - 1,
      properties: { vizinhas: r.vizinhas.join(',') },
    }),
  )
  const inicio = objeto('inicio', 'Início', 'inicio', 11 * PECA + PECA / 2, 15 * PECA + PECA / 2, {
    role: 'start',
    shape: 'point',
    width: 0,
    height: 0,
  })
  const camadas: PintaSceneLayer[] = [
    tiles('colisao', 'Colisão', g.camada('colisao'), { collision: true }),
    tiles('chao', 'Chão', g.camada('chao')),
    tiles('caminho', 'Caminho', g.camada('caminho')),
    tiles('agua', 'Água', g.camada('agua')),
    tiles('decoracao', 'Decoração', g.camada('decoracao')),
    tiles('cercas', 'Cercas', g.camada('cercas')),
    tiles('troncos', 'Troncos e pedras', g.camada('troncos')),
    tiles('casas', 'Casas', g.camada('casas')),
    objetos('moedas', 'Moedas', moedas),
    objetos('inimigos', 'Inimigos', inimigos),
    objetos('baus', 'Baús', baus),
    objetos('nascimentos', 'Ninhos', nascimentos),
    tiles('copas', 'Copas', g.camada('copas'), { front: true }),
    tiles('telhados', 'Telhados', g.camada('telhados'), { front: true }),
    tiles('nevoa', 'Névoa', g.camada('nevoa'), {
      front: true,
      opacity: 0.6,
      parallaxX: 1.15,
      parallaxY: 1.15,
    }),
    objetos('regioes', 'Regiões', regioes),
    objetos('portas', 'Portas', portas),
    objetos('chegadas', 'Chegadas', [inicio, ...chegadas]),
  ]
  return { cena: cena(CENAS.mundo, 'O mundo do jogo D', g, camadas, tilesetImagem), grade: g }
}

/** Uma caverna: chão escuro, paredes, morcegos, moedas, um baú e a saída de volta ao mundo. */
export function caverna(i: number, tilesetImagem: string) {
  const g = new Grade(40, 30),
    a = sorteio(700 + i)
  for (let y = 0; y < g.linhas; y++)
    for (let x = 0; x < g.colunas; x++) {
      g.por('chao', x, y, P['chao-caverna'])
      const borda = x === 0 || y === 0 || x === g.colunas - 1 || y === g.linhas - 1
      if (borda || (a() < 0.08 && !(x > 17 && x < 23))) g.por('paredes', x, y, P['parede-caverna'])
    }
  const saida = { x: 20, y: g.linhas - 2 }
  for (const [dx, dy] of [
    [0, 0],
    [0, -1],
    [0, -2],
    [-1, 0],
    [1, 0],
  ] as const)
    g.camada('paredes')[(saida.y + dy) * g.colunas + saida.x + dx] = VAZIA
  const ocupadas = new Set([`${saida.x},${saida.y}`, `${saida.x},${saida.y - 1}`])
  const nome = CENAS.cavernas[i]!
  const moedas = espalhar(g, a, 32, { x0: 1, y0: 1, x1: 39, y1: 29 }, ocupadas).map(([x, y], k) =>
    objeto(`moeda-${k + 1}`, 'Moeda', 'moeda', x * PECA, y * PECA),
  )
  const inimigos = espalhar(g, a, 10, { x0: 1, y0: 1, x1: 39, y1: 26 }, ocupadas, [
    [saida.x, saida.y - 2],
  ]).map(([x, y], k) =>
    objeto(`inimigo-${k + 1}`, 'Morcego', 'inimigo', x * PECA, y * PECA, { role: 'enemy' }),
  )
  const [[bx, by]] = espalhar(g, a, 1, { x0: 2, y0: 2, x1: 38, y1: 14 }, ocupadas) as [
    [number, number],
  ]
  const camadas: PintaSceneLayer[] = [
    tiles('chao', 'Chão', g.camada('chao')),
    tiles('paredes', 'Paredes', g.camada('paredes')),
    objetos('moedas', 'Moedas', moedas),
    objetos('inimigos', 'Inimigos', inimigos),
    objetos('baus', 'Baús', [objeto('bau-1', 'Baú', 'bau', bx * PECA, by * PECA)]),
    objetos('portas', 'Portas', [
      objeto('porta-saida', 'Saída', 'porta', saida.x * PECA, saida.y * PECA, {
        role: 'door',
        properties: { destino: CENAS.mundo, chegada: `saida-caverna-${i + 1}` },
      }),
    ]),
    objetos('chegadas', 'Chegadas', [
      objeto(
        'chegada',
        'Chegada',
        'chegada',
        saida.x * PECA + PECA / 2,
        (saida.y - 2) * PECA + PECA / 2,
        {
          role: 'start',
          shape: 'point',
          width: 0,
          height: 0,
        },
      ),
    ]),
  ]
  return { cena: cena(nome, `Caverna ${i + 1}`, g, camadas, tilesetImagem), grade: g }
}

/** Uma casa: piso, paredes, mesa, tapete, a cama (onde se guarda o jogo), moedas e um baú. */
export function casa(i: number, tilesetImagem: string) {
  const g = new Grade(14, 10),
    a = sorteio(900 + i)
  for (let y = 0; y < g.linhas; y++)
    for (let x = 0; x < g.colunas; x++) {
      g.por('chao', x, y, P['piso-casa'])
      if (x === 0 || x === g.colunas - 1 || y <= 1 || y === g.linhas - 1)
        g.por('paredes', x, y, P['parede-interior'])
    }
  const saida = { x: 7, y: g.linhas - 1 }
  g.camada('paredes')[saida.y * g.colunas + saida.x] = VAZIA
  g.por('moveis', 3, 4, P.mesa)
  g.por('moveis', 4, 4, P.mesa)
  g.por('chao', 7, 5, P.tapete)
  g.por('chao', 8, 5, P.tapete)
  g.por('chao', 11, 3, P.cama)
  const ocupadas = new Set([`${saida.x},${saida.y}`, `${saida.x},${saida.y - 1}`, '11,3'])
  const moedas = espalhar(g, a, 5, { x0: 1, y0: 2, x1: 13, y1: 9 }, ocupadas).map(([x, y], k) =>
    objeto(`moeda-${k + 1}`, 'Moeda', 'moeda', x * PECA, y * PECA),
  )
  const [[bx, by]] = espalhar(g, a, 1, { x0: 1, y0: 2, x1: 13, y1: 9 }, ocupadas) as [
    [number, number],
  ]
  const camadas: PintaSceneLayer[] = [
    tiles('chao', 'Chão', g.camada('chao')),
    tiles('paredes', 'Paredes', g.camada('paredes')),
    tiles('moveis', 'Móveis', g.camada('moveis')),
    objetos('moedas', 'Moedas', moedas),
    objetos('baus', 'Baús', [objeto('bau-1', 'Baú', 'bau', bx * PECA, by * PECA)]),
    objetos('cama', 'Cama', [
      objeto('cama', 'Cama', 'cama', 11 * PECA, 3 * PECA, { role: 'trigger' }),
    ]),
    objetos('portas', 'Portas', [
      objeto('porta-saida', 'Saída', 'porta', saida.x * PECA, saida.y * PECA, {
        role: 'door',
        properties: { destino: CENAS.mundo, chegada: `saida-casa-${i + 1}` },
      }),
    ]),
    objetos('chegadas', 'Chegadas', [
      objeto(
        'chegada',
        'Chegada',
        'chegada',
        saida.x * PECA + PECA / 2,
        (saida.y - 2) * PECA + PECA / 2,
        {
          role: 'start',
          shape: 'point',
          width: 0,
          height: 0,
        },
      ),
    ]),
  ]
  return { cena: cena(CENAS.casas[i]!, `Casa ${i + 1}`, g, camadas, tilesetImagem), grade: g }
}
