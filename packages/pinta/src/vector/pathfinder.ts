/**
 * MISTURAR formas: virar uma só, tirar a da frente, ficar com o pedaço em
 * comum, tirar o pedaço em comum.
 *
 * Este módulo é a ORQUESTRAÇÃO. O achatamento mora no `flatten.ts` e a conta
 * no `polygonClip.ts`; aqui ficam a dobra sobre várias formas, o teto de
 * caracteres e a IDENTIDADE do resultado (id, estilo, lugar na pilha).
 */
import { CHORD_TOLERANCE, polyPointCount, shapeToPoly } from './flatten'
import { parsePathD } from './geometry'
import { MAX_PATH_CHARS, type VectorShape } from './model'
import { type ClipOp, clipPolys, type Poly, polyArea, polyToPathD, type Ring } from './polygonClip'
import { simplifyRDP } from './smoothing'

export type PathfinderOp = 'unir' | 'menos-frente' | 'intersecao' | 'excluir'

export type PathfinderRefusal =
  /** Traço aberto: não tem miolo para juntar nem para recortar. */
  | 'open-path'
  /** `d` fora do nosso dialeto: ilegível, o que NÃO é a mesma coisa que aberto. */
  | 'bad-path'
  /** Linha, texto ou figura na seleção. */
  | 'not-shapes'
  /** Menos de duas formas que servem. */
  | 'needs-two'
  /** Nem se encostam: as quatro contas dariam em nada ou em tudo. */
  | 'apart'
  /** A conta zerou (interseção vazia, ou a da frente comeu tudo). */
  | 'empty'
  /** Passou do teto de caracteres mesmo depois de simplificar. */
  | 'too-big'
  /** O encadeamento não fechou. A rede de segurança. */
  | 'geometry-failed'

export type PathfinderResult =
  | { ok: true; shapes: VectorShape[]; resultId: string }
  | { ok: false; reason: PathfinderRefusal }

const OP_TO_CLIP: Record<PathfinderOp, ClipOp> = {
  unir: 'union',
  'menos-frente': 'difference',
  intersecao: 'intersect',
  excluir: 'xor',
}

/**
 * A forma ENCERRA uma área? É a régua de quem pode entrar na mistura.
 *
 * Traço só entra FECHADO (tantos `Z` quantos `M`). O pincel nunca fecha (o
 * `catmullRomToPath` não emite `Z`), então um rabisco cai aqui e recebe uma
 * frase que diz o que fazer, em vez de virar uma lente sem sentido.
 */
export function isPathfinderEligible(shape: VectorShape): boolean {
  switch (shape.type) {
    case 'rect':
    case 'ellipse':
    case 'polygon':
      return true
    case 'path': {
      // ⚠️ Não usar `toEditablePath` para medir isto: ele devolve `null` com
      // mais de um `M`, e um resultado COM FURO tem que poder entrar numa
      // segunda mistura.
      const parsed = parsePathD(shape.d)
      if (!parsed) return false
      let moves = 0
      let closes = 0
      for (const command of parsed.commands) {
        const op = command.op.toUpperCase()
        if (op === 'M') moves += 1
        else if (op === 'Z') closes += 1
      }
      return moves > 0 && moves === closes
    }
    default:
      return false
  }
}

function boundsOfPoly(poly: Poly): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY
  for (const ring of poly) {
    for (const p of ring) {
      if (p.x < minX) minX = p.x
      if (p.x > maxX) maxX = p.x
      if (p.y < minY) minY = p.y
      if (p.y > maxY) maxY = p.y
    }
  }
  return { minX, minY, maxX, maxY }
}

/**
 * Componentes cujas caixas se encostam. Formas de componentes diferentes não
 * podem se cruzar; união/xor podem concatená-las sem executar clipping.
 */
function touchingComponents(polys: Poly[]): number[][] {
  const caixas = polys.map(boundsOfPoly)
  const parent = polys.map((_, index) => index)

  function root(index: number): number {
    let current = index
    while (parent[current] !== current) current = parent[current] ?? current
    while (parent[index] !== index) {
      const next = parent[index] ?? index
      parent[index] = current
      index = next
    }
    return current
  }

  function connect(a: number, b: number): void {
    const rootA = root(a)
    const rootB = root(b)
    if (rootA !== rootB) parent[rootB] = rootA
  }

  for (let i = 0; i < caixas.length; i += 1) {
    for (let j = i + 1; j < caixas.length; j += 1) {
      const a = caixas[i]
      const b = caixas[j]
      if (!a || !b) continue
      if (a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY) {
        connect(i, j)
      }
    }
  }

  const groups = new Map<number, number[]>()
  for (let index = 0; index < polys.length; index += 1) {
    const componentRoot = root(index)
    const group = groups.get(componentRoot)
    if (group) group.push(index)
    else groups.set(componentRoot, [index])
  }
  return [...groups.values()]
}

/** Teto determinístico para não transformar um clique em vários segundos. */
const MAX_CLIP_EDGE_PAIR_BUDGET = 250_000

/**
 * A dobra. Todas acumulam o binário sobre o acumulador.
 *
 * ⭐ "Tirar a da frente" dobra DIFERENÇAS (o de trás menos cada um dos outros)
 * em vez de "o de trás menos a união dos da frente": as duas dão o mesmo
 * desenho, mas dobrando diferenças o acumulador só ENCOLHE, e cada passo corta
 * contra um operando simples em vez de contra uma união cheia de emendas.
 *
 * A realimentação sai de graça: o `windingNumber` soma sobre TODOS os anéis,
 * então o furo de um passo lê como "fora" no passo seguinte.
 */
function fold(polys: Poly[], clip: ClipOp): Poly | null | 'empty' | 'too-big' {
  let acc = polys[0]
  if (!acc) return 'empty'
  let work = 0
  for (let i = 1; i < polys.length; i += 1) {
    const next = polys[i]
    if (!next) continue
    work += polyPointCount(acc) * polyPointCount(next)
    if (work > MAX_CLIP_EDGE_PAIR_BUDGET) return 'too-big'
    const step = clipPolys(acc, next, clip)
    if (step === null) return null
    if (step.length === 0) return 'empty'
    acc = step
  }
  return acc
}

function foldByComponents(
  polys: Poly[],
  components: number[][],
  clip: ClipOp,
): Poly | null | 'empty' | 'too-big' {
  if (clip === 'intersect') {
    if (components.length > 1) return 'empty'
    return fold(polys, clip)
  }

  if (clip === 'difference') {
    const baseComponent = components.find((component) => component.includes(0)) ?? [0]
    return fold(
      baseComponent.map((index) => polys[index]).filter((poly): poly is Poly => poly !== undefined),
      clip,
    )
  }

  const combined: Poly = []
  for (const component of components) {
    const group = component
      .map((index) => polys[index])
      .filter((poly): poly is Poly => poly !== undefined)
    if (group.length === 1) {
      const only = group[0]
      if (only) combined.push(...only)
      continue
    }
    const result = fold(group, clip)
    if (result === null || result === 'empty' || result === 'too-big') return result
    combined.push(...result)
  }
  return combined
}

/** RDP em cada anel, preservando o fechamento (o primeiro ponto não se repete). */
function simplifyPoly(poly: Poly, epsilon: number): Poly {
  const out: Poly = []
  for (const ring of poly) {
    const first = ring[0]
    if (!first) continue
    // O RDP fixa as PONTAS, então o anel entra com o primeiro repetido no fim
    // e o repetido sai depois; sem isso o ponto de partida nunca simplificaria.
    const aberto = simplifyRDP([...ring, first], epsilon)
    const fechado: Ring = aberto.slice(0, -1)
    if (fechado.length >= 3) out.push(fechado)
  }
  return out
}

/**
 * O `d`, dentro do teto.
 *
 * ⚠️ Chega aqui já simplificado a 0.01 pelo chamador, então o primeiro passe da
 * lista é o MESMO de propósito: custa um `join` e mantém esta função sozinha
 * correta se alguém a chamar com um polígono cru.
 *
 * ⚠️ Acima do `MAX_PATH_CHARS` o `sanitizeVectorShape` DESCARTA a forma no
 * próximo load, e o desenho perde um pedaço em silêncio. Por isso a última
 * saída é RECUSAR: numa tolerância maior um círculo de 100px vira um
 * tridecágono, e entregar isso chamando de círculo é pior que dizer não.
 */
function emitirD(poly: Poly): string | null {
  const direto = polyToPathD(poly)
  if (direto.length <= MAX_PATH_CHARS) return direto
  // 0.01 fica ABAIXO das duas casas do `round2`: só tira ponto colinear, sem
  // mudança representável no desenho.
  for (const epsilon of [0.01, 0.1, 0.3]) {
    const d = polyToPathD(simplifyPoly(poly, epsilon))
    if (d.length > 0 && d.length <= MAX_PATH_CHARS) return d
  }
  return null
}

/**
 * Mistura as formas escolhidas numa só e devolve o DOCUMENTO INTEIRO já
 * trocado (mesmo idioma do `alignShapes`: formas e ids entram, formas saem).
 *
 * ⚠️ `shapes` chega em Z-ORDER: índice 0 = FUNDO, último = frente. É a ordem
 * natural do `currentShapes()`, e "tirar a da frente" depende dela. NUNCA
 * reordenar por `ids` — a ordem em que a criança TOCOU não é a do desenho.
 */
export function pathfinderShapes(
  shapes: VectorShape[],
  ids: string[],
  op: PathfinderOp,
): PathfinderResult {
  const escolhidos = new Set(ids)
  // Escondida não participa: o funil de render e export respeita o olhinho, e
  // uma forma que a criança NÃO VÊ não pode comer a que ela vê.
  const partes = shapes.filter((s) => escolhidos.has(s.id) && s.hidden !== true)

  // Ordem das recusas: da mais acionável para a mais genérica.
  // ⚠️ ILEGÍVEL não é ABERTO: mandar a criança fechar um traço que veio num
  // formato que não sabemos ler é uma instrução que ela não tem como seguir.
  if (partes.some((s) => s.type === 'path' && parsePathD(s.d) === null)) {
    return { ok: false, reason: 'bad-path' }
  }
  if (partes.some((s) => s.type === 'path' && !isPathfinderEligible(s))) {
    return { ok: false, reason: 'open-path' }
  }
  if (partes.some((s) => !isPathfinderEligible(s))) return { ok: false, reason: 'not-shapes' }
  if (partes.length < 2) return { ok: false, reason: 'needs-two' }

  const polys: Poly[] = []
  for (const parte of partes) {
    const flat = shapeToPoly(parte, CHORD_TOLERANCE)
    if (!flat.ok)
      return { ok: false, reason: flat.reason === 'bad-path' ? 'bad-path' : 'not-shapes' }
    polys.push(flat.poly)
  }
  const components = touchingComponents(polys)
  if (components.every((component) => component.length === 1)) {
    return { ok: false, reason: 'apart' }
  }

  const dobrado = foldByComponents(polys, components, OP_TO_CLIP[op])
  if (dobrado === null) return { ok: false, reason: 'geometry-failed' }
  if (dobrado === 'empty') return { ok: false, reason: 'empty' }
  if (dobrado === 'too-big') return { ok: false, reason: 'too-big' }

  /**
   * ⭐⭐ Tirar a da frente que não tira NADA é RECUSA, não sucesso.
   *
   * O `apart` acima pergunta "nenhum par se encosta?", e com TRÊS formas as duas
   * da frente podem se encostar ENTRE SI enquanto nenhuma toca a base: a guarda
   * não dispara, a conta devolve a base intacta, e o efeito é o pior possível —
   * as da frente SOMEM do desenho e nada foi recortado. Não é clique morto, é
   * perda de desenho.
   *
   * A régua é a ÁREA e não as caixas, então ela também pega o caso das caixas
   * que se cruzam sem as formas se cruzarem. As outras três contas não precisam
   * disto: unir formas soltas de fato as junta numa forma só (é a promessa do
   * botão), e interseção vazia já cai no `empty`.
   */
  if (op === 'menos-frente') {
    const base = polys[0]
    const antes = base ? Math.abs(polyArea(base)) : 0
    if (antes > 0 && Math.abs(Math.abs(polyArea(dobrado)) - antes) / antes < 1e-6) {
      return { ok: false, reason: 'apart' }
    }
  }

  // Um passe de RDP abaixo do disco de gravação sempre: tira os pontos
  // colineares que o noding cria, sem mudança representável no desenho.
  const enxuto = simplifyPoly(dobrado, 0.01)
  const alvo = enxuto.length > 0 ? enxuto : dobrado
  if (polyPointCount(alvo) < 3) return { ok: false, reason: 'empty' }

  const d = emitirD(alvo)
  if (d === null) return { ok: false, reason: 'too-big' }

  const base = partes[0] // o de TRÁS
  if (!base) return { ok: false, reason: 'needs-two' }

  /**
   * ⭐ O resultado guarda o ID, o LUGAR, o ESTILO e o GRUPO do de trás.
   *
   * O id é obrigação, não gosto: com um id novo, `selectedIds` fica órfão por
   * um render, `selected` vira `[]` e a faixa da seleção INTEIRA devolve null.
   * Ela está no FLUXO, então o palco pularia uns 54px e voltaria. É a lição do
   * corte com a tesoura, um degrau pior.
   *
   * A frase para a criança: a forma de trás é quem manda; ela cresce, encolhe
   * ou ganha um buraco, e continua com a cor dela.
   */
  const resultado: VectorShape = {
    id: base.id,
    fill: base.fill,
    stroke: base.stroke,
    opacity: base.opacity,
    // A geometria já saiu no lugar certo. Herdar a rotação a aplicaria DE NOVO,
    // e em volta de outro centro.
    rotation: 0,
    ...(base.groupId ? { groupId: base.groupId } : {}),
    type: 'path',
    d,
  }

  // ⚠️ Filtrar pelos ids dos PARTICIPANTES, não pela seleção crua: uma forma
  // escondida que estivesse selecionada sumiria do desenho sem entrar na conta.
  const idsDasPartes = new Set(partes.map((s) => s.id))
  return {
    ok: true,
    // Um passe só: o de trás vira o resultado NO LUGAR dele e os outros somem.
    shapes: shapes.flatMap((s) =>
      s.id === base.id ? [resultado] : idsDasPartes.has(s.id) ? [] : [s],
    ),
    resultId: base.id,
  }
}
