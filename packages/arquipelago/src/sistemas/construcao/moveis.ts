import {
  type Festa,
  ilhaAberta,
  MOVEIS,
  type Movel,
  type MovelNaObra,
  type Obra,
} from '@sistemazero/arquipelago-contracts'
import { type Planta, planta } from './comodos'
import { type Aresta, arestasDaAbertura, chaveDaAresta, chavesDosTrechos } from './grade'
import { type Celula, chaveDaCelula, type Lote, naArea, noFixo, ocupante } from './lote'
import type { Resultado } from './obra'
import { celulasDoObjeto } from './projeto-azul'

/**
 * Os móveis da cozinha, da sala e do banheiro no modo Construir (V20, 30/10/2026): a arte de
 * `arte/casa/comodos.py` (contrato no README de lá). Eles vão nos cômodos novos da casa (o quarto é
 * o da plataforma), quantos couberem, e não têm função: deixam o cômodo com cara de cozinha, de
 * sala ou de banheiro e somam aconchego. O salvamento guarda cada um em tupla (`MovelNaObra`).
 *
 * Desde 31/10/2026: o café e a banca de feira (B7) abrem com a Vila Doce, e a decoração de festa
 * (B9) só aparece, no catálogo e na casa, durante a festa dela (`festa`). Fora da festa a peça
 * continua guardada onde estava e volta na próxima.
 */
export type CategoriaDoMovel = 'cozinha' | 'sala' | 'banheiro' | 'cafe' | 'festa'
export const CATEGORIAS_DOS_MOVEIS: readonly CategoriaDoMovel[] = [
  'cozinha',
  'sala',
  'banheiro',
  'cafe',
  'festa',
]

export interface DadosDoMovel {
  nome: string
  categoria: CategoriaDoMovel
  /** A área no chão em células (largura em x, fundo em z, sem giro); `null` é peça de parede. */
  area: { largura: number; fundo: number } | null
  /** O tapete fica por baixo: outro móvel ou objeto pode ficar em cima dele. */
  tapete?: true
  /** Ilumina o cômodo (a luminária de pé) para o aconchego. */
  luz?: true
  /** Conta como planta no aconchego. */
  planta?: true
  /** Peça de parede: a altura do meio dela acima do piso (as cenas de `arte/casa/cenas.py`). */
  altura?: number
  /** Decoração de festa: só aparece durante esta festa. */
  festa?: Festa
}

export const DADOS_DO_MOVEL: Readonly<Record<Movel, DadosDoMovel>> = {
  'balcao-pia': { nome: 'Balcão com pia', categoria: 'cozinha', area: { largura: 2, fundo: 1 } },
  balcao: { nome: 'Balcão', categoria: 'cozinha', area: { largura: 1, fundo: 1 } },
  'armario-alto': { nome: 'Armário alto', categoria: 'cozinha', area: { largura: 1, fundo: 1 } },
  'mesa-cozinha': { nome: 'Mesa', categoria: 'cozinha', area: { largura: 2, fundo: 1 } },
  'cadeira-cozinha': { nome: 'Cadeira', categoria: 'cozinha', area: { largura: 1, fundo: 1 } },
  'prateleira-potes': {
    nome: 'Prateleira de potes',
    categoria: 'cozinha',
    area: null,
    altura: 1.85,
  },
  sofa: { nome: 'Sofá', categoria: 'sala', area: { largura: 3, fundo: 1 } },
  poltrona: { nome: 'Poltrona', categoria: 'sala', area: { largura: 1, fundo: 1 } },
  'mesinha-centro': {
    nome: 'Mesinha de centro',
    categoria: 'sala',
    area: { largura: 2, fundo: 1 },
  },
  tapete: { nome: 'Tapete', categoria: 'sala', area: { largura: 3, fundo: 2 }, tapete: true },
  'estante-baixa': { nome: 'Estante baixa', categoria: 'sala', area: { largura: 2, fundo: 1 } },
  'luminaria-pe': {
    nome: 'Luminária de pé',
    categoria: 'sala',
    area: { largura: 1, fundo: 1 },
    luz: true,
  },
  planta: { nome: 'Planta', categoria: 'sala', area: { largura: 1, fundo: 1 }, planta: true },
  quadro: { nome: 'Quadro', categoria: 'sala', area: null, altura: 2.05 },
  banheira: { nome: 'Banheira', categoria: 'banheiro', area: { largura: 2, fundo: 1 } },
  'pia-banheiro': { nome: 'Pia', categoria: 'banheiro', area: { largura: 1, fundo: 1 } },
  espelho: { nome: 'Espelho', categoria: 'banheiro', area: null, altura: 1.5 },
  'vaso-sanitario': {
    nome: 'Vaso sanitário',
    categoria: 'banheiro',
    area: { largura: 1, fundo: 1 },
  },
  'box-chuveiro': {
    nome: 'Chuveiro com box',
    categoria: 'banheiro',
    area: { largura: 1, fundo: 1 },
  },
  tapetinho: {
    nome: 'Tapetinho',
    categoria: 'banheiro',
    area: { largura: 1, fundo: 1 },
    tapete: true,
  },
  toalheiro: { nome: 'Toalheiro', categoria: 'banheiro', area: null, altura: 1.2 },
  'cafe-mesa-redonda': {
    nome: 'Mesa redonda',
    categoria: 'cafe',
    area: { largura: 1, fundo: 1 },
  },
  'cafe-cadeira': { nome: 'Cadeira do café', categoria: 'cafe', area: { largura: 1, fundo: 1 } },
  'cafe-balcao': { nome: 'Balcão do café', categoria: 'cafe', area: { largura: 2, fundo: 1 } },
  'cafe-vitrine-doces': {
    nome: 'Vitrine de doces',
    categoria: 'cafe',
    area: { largura: 1, fundo: 1 },
  },
  'cafe-lousa-cardapio': {
    nome: 'Lousa do cardápio',
    categoria: 'cafe',
    area: null,
    altura: 1.6,
  },
  'cafe-banca-feira': {
    nome: 'Banca de feira',
    categoria: 'cafe',
    area: { largura: 2, fundo: 1 },
  },
  'cafe-caixote': { nome: 'Caixote', categoria: 'cafe', area: { largura: 1, fundo: 1 } },
  'festa-junina-bandeirinhas': {
    nome: 'Bandeirinhas',
    categoria: 'festa',
    area: null,
    altura: 2.6,
    festa: 'junina',
  },
  'festa-junina-lanterna-papel': {
    nome: 'Lanterna de papel',
    categoria: 'festa',
    area: null,
    altura: 2.2,
    festa: 'junina',
  },
  'festa-junina-fogueira': {
    nome: 'Fogueira de enfeite',
    categoria: 'festa',
    area: { largura: 1, fundo: 1 },
    festa: 'junina',
  },
  'festa-carnaval-serpentina': {
    nome: 'Serpentina',
    categoria: 'festa',
    area: null,
    altura: 2.5,
    festa: 'carnaval',
  },
  'festa-carnaval-mascara': {
    nome: 'Máscara de parede',
    categoria: 'festa',
    area: null,
    altura: 1.8,
    festa: 'carnaval',
  },
  'festa-carnaval-confete': {
    nome: 'Confete no chão',
    categoria: 'festa',
    area: { largura: 1, fundo: 1 },
    tapete: true,
    festa: 'carnaval',
  },
  'festa-fim-de-ano-arvore': {
    nome: 'Árvore de fim de ano',
    categoria: 'festa',
    area: { largura: 1, fundo: 1 },
    festa: 'fim-de-ano',
  },
  'festa-fim-de-ano-guirlanda': {
    nome: 'Guirlanda',
    categoria: 'festa',
    area: null,
    altura: 2,
    festa: 'fim-de-ano',
  },
  'festa-fim-de-ano-estrela-janela': {
    nome: 'Estrela de pendurar',
    categoria: 'festa',
    area: null,
    altura: 1.7,
    festa: 'fim-de-ano',
  },
  'festa-lanternas-lanterna-chao': {
    nome: 'Lanterna de chão',
    categoria: 'festa',
    area: { largura: 1, fundo: 1 },
    festa: 'lanternas',
  },
  'festa-lanternas-varal-de-luz': {
    nome: 'Varal de luz',
    categoria: 'festa',
    area: null,
    altura: 2.6,
    festa: 'lanternas',
  },
}

/**
 * As categorias que a criança vê no Construir agora: o café e a banca com a Vila Doce aberta, e a
 * decoração só durante uma festa.
 */
export function categoriasDisponiveis(
  jornada: number,
  festa: Festa | null,
): readonly CategoriaDoMovel[] {
  return CATEGORIAS_DOS_MOVEIS.filter(
    (c) => (c !== 'cafe' || ilhaAberta('vila-doce', jornada)) && (c !== 'festa' || festa !== null),
  )
}

/** Os móveis de uma categoria no catálogo agora (da festa, só os da festa em vigor). */
export function moveisDoCatalogo(categoria: CategoriaDoMovel, festa: Festa | null): Movel[] {
  return MOVEIS.filter(
    (id) =>
      DADOS_DO_MOVEL[id].categoria === categoria &&
      (DADOS_DO_MOVEL[id].festa === undefined || DADOS_DO_MOVEL[id].festa === festa),
  )
}

/** O móvel aparece na casa agora? (a decoração de festa, só na festa dela) */
export function movelAparece(id: Movel, festa: Festa | null): boolean {
  const daFesta = DADOS_DO_MOVEL[id].festa
  return daFesta === undefined || daFesta === festa
}

/** Um móvel lido da tupla do salvamento. */
export interface MovelPosto {
  id: Movel
  x: number
  z: number
  giro: number
}

export function lerMovel(t: MovelNaObra): MovelPosto | null {
  const id = MOVEIS[t[0]]
  return id ? { id, x: t[1], z: t[2], giro: t[3] } : null
}

export function tuplaDoMovel(m: MovelPosto): MovelNaObra {
  return [MOVEIS.indexOf(m.id), m.x, m.z, m.giro]
}

export function moveisDaObra(obra: Obra): MovelPosto[] {
  return obra.moveis.flatMap((t) => {
    const m = lerMovel(t)
    return m ? [m] : []
  })
}

export function ehDeParede(id: Movel): boolean {
  return DADOS_DO_MOVEL[id].area === null
}

export function ehTapete(id: Movel): boolean {
  return Boolean(DADOS_DO_MOVEL[id].tapete)
}

/** A área no chão com o giro (de lado, largura e fundo trocam). Peça de parede: uma célula. */
export function areaDoMovel(id: Movel, giro: number): { largura: number; fundo: number } {
  const area = DADOS_DO_MOVEL[id].area ?? { largura: 1, fundo: 1 }
  return giro % 2 === 0 ? area : { largura: area.fundo, fundo: area.largura }
}

/** As células do móvel de chão (a guardada é o canto de x e z menores); a da peça de parede. */
export function celulasDoMovel(m: MovelPosto): Celula[] {
  const { largura, fundo } = areaDoMovel(m.id, m.giro)
  const celulas: Celula[] = []
  for (let dz = 0; dz < fundo; dz++)
    for (let dx = 0; dx < largura; dx++) celulas.push({ x: m.x + dx, z: m.z + dz })
  return celulas
}

/** O canto do móvel com o meio na célula tocada (o dedo cai no meio dele). */
export function cantoDoMovelNoToque(id: Movel, giro: number, c: Celula): Celula {
  const { largura, fundo } = areaDoMovel(id, giro)
  return { x: c.x - Math.floor((largura - 1) / 2), z: c.z - Math.floor((fundo - 1) / 2) }
}

/**
 * A parede atrás da peça: o giro diz de que lado da célula ela fica (0 atrás em -z, 1 em -x, 2 em
 * +z, 3 em +x), o mesmo lado para onde vira o fundo do modelo.
 */
export function arestaAtras(c: Celula, giro: number): Aresta {
  switch (giro % 4) {
    case 0:
      return { eixo: 'x', x: c.x, z: c.z }
    case 1:
      return { eixo: 'z', x: c.x, z: c.z }
    case 2:
      return { eixo: 'x', x: c.x, z: c.z + 1 }
    default:
      return { eixo: 'z', x: c.x + 1, z: c.z }
  }
}

/** Para onde o fundo do modelo aponta com cada giro, no chão (x, z). */
export const FUNDO_DO_GIRO: readonly (readonly [number, number])[] = [
  [0, -1],
  [-1, 0],
  [0, 1],
  [1, 0],
]

/**
 * O lado da célula tocada com parede mais perto do dedo (o giro da peça de parede), entre as
 * paredes sem porta nem janela. Sem parede nenhuma em volta, `null`.
 */
export function giroDaParedeNoToque(
  obra: Obra,
  lote: Lote,
  onde: { x: number; z: number },
  p: Planta = planta(obra, lote),
): number | null {
  const c = { x: Math.floor(onde.x), z: Math.floor(onde.z) }
  const abertas = arestasComAbertura(obra)
  const distancias = [onde.z - c.z, onde.x - c.x, c.z + 1 - onde.z, c.x + 1 - onde.x]
  const lados = [0, 1, 2, 3]
    .filter((g) => {
      const k = chaveDaAresta(arestaAtras(c, g))
      return p.paredes.has(k) && !abertas.has(k)
    })
    .sort((a, b) => (distancias[a] ?? 0) - (distancias[b] ?? 0))
  return lados[0] ?? null
}

function arestasComAbertura(obra: Obra): Set<string> {
  return new Set(obra.aberturas.flatMap(arestasDaAbertura).map(chaveDaAresta))
}

/** As peças de parede que encostam numa aresta (de qualquer um dos dois lados). */
export function pecasNaAresta(obra: Obra, a: Aresta): MovelPosto[] {
  const k = chaveDaAresta(a)
  return moveisDaObra(obra).filter(
    (m) => ehDeParede(m.id) && chaveDaAresta(arestaAtras(m, m.giro)) === k,
  )
}

/** Alguma parede (ou cerca) passa entre duas células do grupo? */
function paredeEntre(celulas: readonly Celula[], p: Planta, cercas: Set<string>): boolean {
  const dele = new Set(celulas.map(chaveDaCelula))
  for (const c of celulas) {
    const vizinhas: [Celula, string][] = [
      [{ x: c.x + 1, z: c.z }, chaveDaAresta({ eixo: 'z', x: c.x + 1, z: c.z })],
      [{ x: c.x, z: c.z + 1 }, chaveDaAresta({ eixo: 'x', x: c.x, z: c.z + 1 })],
    ]
    for (const [v, aresta] of vizinhas)
      if (dele.has(chaveDaCelula(v)) && (p.paredes.has(aresta) || cercas.has(aresta))) return true
  }
  return false
}

/** As células ocupadas por móveis de chão que não são tapete (o que barra o corpo e os objetos). */
export function celulasDosMoveisAltos(obra: Obra): Set<string> {
  return new Set(
    moveisDaObra(obra)
      .filter((m) => !ehDeParede(m.id) && !ehTapete(m.id))
      .flatMap(celulasDoMovel)
      .map(chaveDaCelula),
  )
}

/** O móvel ainda tem o lugar dele na planta? (o cômodo, a parede atrás, sem porta nem janela) */
export function movelNoLugar(m: MovelPosto, obra: Obra, p: Planta): boolean {
  const celulas = celulasDoMovel(m)
  const comodos = new Set(celulas.map((c) => p.comodoDe.get(chaveDaCelula(c))))
  if (comodos.size !== 1 || comodos.has(undefined)) return false
  const i = [...comodos][0] as number
  if (p.comodos[i]?.quarto) return false
  if (!ehDeParede(m.id)) return !paredeEntre(celulas, p, chavesDosTrechos(obra.cercas))
  const atras = chaveDaAresta(arestaAtras(m, m.giro))
  return p.paredes.has(atras) && !arestasComAbertura(obra).has(atras)
}

/**
 * Pôr um móvel. De chão: todas as células no mesmo cômodo novo, sem parede no meio, sem ficar em
 * cima de objeto nem de outro móvel (o tapete fica por baixo dos outros, mas não de outro tapete).
 * De parede: na célula tocada de um cômodo novo, com parede (sem porta nem janela) atrás e sem
 * outra peça na mesma parede.
 */
export function porMovel(
  obra: Obra,
  lote: Lote,
  id: Movel,
  canto: Celula,
  giro: number,
): Resultado {
  if (obra.moveis.length >= lote.limites.moveis) return { ok: false, motivo: 'limite' }
  const novo: MovelPosto = { id, x: canto.x, z: canto.z, giro }
  const celulas = celulasDoMovel(novo)
  const p = planta(obra, lote)
  const comodos = new Set<number>()
  for (const c of celulas) {
    if (!naArea(lote.area, c)) return { ok: false, motivo: 'fora-do-lote' }
    const nome = ocupante(lote, c)
    if (nome) return { ok: false, motivo: 'ocupado', nome }
    if (noFixo(lote, c)) return { ok: false, motivo: 'movel-no-quarto' }
    const i = p.comodoDe.get(chaveDaCelula(c))
    if (i === undefined) return { ok: false, motivo: 'movel-fora-de-comodo' }
    comodos.add(i)
  }
  if (comodos.size > 1) return { ok: false, motivo: 'movel-fora-de-comodo' }
  const postos = moveisDaObra(obra)
  if (ehDeParede(id)) {
    const atras = arestaAtras(novo, giro)
    const k = chaveDaAresta(atras)
    if (!p.paredes.has(k)) return { ok: false, motivo: 'sem-parede-atras' }
    if (arestasComAbertura(obra).has(k)) return { ok: false, motivo: 'ja-tem-abertura' }
    const mesmoLado = postos.some(
      (m) => ehDeParede(m.id) && m.x === novo.x && m.z === novo.z && m.giro === giro,
    )
    if (mesmoLado) return { ok: false, motivo: 'tem-movel' }
  } else {
    if (paredeEntre(celulas, p, chavesDosTrechos(obra.cercas)))
      return { ok: false, motivo: 'tem-parede' }
    const minhas = new Set(celulas.map(chaveDaCelula))
    const tapete = ehTapete(id)
    const objetos = new Set(obra.objetos.flatMap(celulasDoObjeto).map(chaveDaCelula))
    if (!tapete && [...minhas].some((k) => objetos.has(k)))
      return { ok: false, motivo: 'tem-objeto' }
    for (const m of postos) {
      if (ehDeParede(m.id) || ehTapete(m.id) !== tapete) continue
      if (celulasDoMovel(m).some((c) => minhas.has(chaveDaCelula(c))))
        return { ok: false, motivo: 'tem-movel' }
    }
  }
  return { ok: true, obra: { ...obra, moveis: [...obra.moveis, tuplaDoMovel(novo)] } }
}

/**
 * O móvel que um toque do apagar tira na célula: primeiro o de chão (o tapete por último, por estar
 * por baixo), senão a peça de parede do lado mais perto do dedo. O índice em `obra.moveis`, ou -1.
 */
export function movelNoToque(obra: Obra, onde: { x: number; z: number }): number {
  const c = { x: Math.floor(onde.x), z: Math.floor(onde.z) }
  const k = chaveDaCelula(c)
  const postos = obra.moveis.map((t) => lerMovel(t))
  const naCelula = (filtro: (m: MovelPosto) => boolean) =>
    postos.findIndex(
      (m) => m !== null && filtro(m) && celulasDoMovel(m).some((x) => chaveDaCelula(x) === k),
    )
  const alto = naCelula((m) => !ehDeParede(m.id) && !ehTapete(m.id))
  if (alto >= 0) return alto
  const distancias = [onde.z - c.z, onde.x - c.x, c.z + 1 - onde.z, c.x + 1 - onde.x]
  let parede = -1
  for (const [i, m] of postos.entries()) {
    if (!m || !ehDeParede(m.id) || m.x !== c.x || m.z !== c.z) continue
    const atual = postos[parede]
    if (parede < 0 || !atual || (distancias[m.giro] ?? 0) < (distancias[atual.giro] ?? 0))
      parede = i
  }
  if (parede >= 0) return parede
  return naCelula((m) => ehTapete(m.id))
}

/** Tirar o móvel do toque (ele não fica guardado: o catálogo é livre, dá para pôr de novo). */
export function tirarMovel(obra: Obra, onde: { x: number; z: number }): Resultado {
  const i = movelNoToque(obra, onde)
  if (i < 0) return { ok: false, motivo: 'nada' }
  return { ok: true, obra: { ...obra, moveis: obra.moveis.filter((_, j) => j !== i) } }
}
