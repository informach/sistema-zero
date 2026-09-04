/**
 * Catálogo das ferramentas do editor VETORIAL + helpers puros compartilhados
 * entre a caixa de ferramentas, o palco e o escopo (seleção por grupo, trava
 * do Shift). Só constantes e funções — o estado vive no `VectorEditorScope`.
 */
import { COPY } from '../../../core/copy'
import { newId } from '../../../core/id'
import { getPalette, type PaletteId, TRANSPARENT_INDEX } from '../../../core/palette'
import {
  type Bounds,
  boundsUnion,
  scaleShape,
  shapeBounds,
  translateShape,
} from '../../../vector/geometry'
import type { Vec2, VectorGradient, VectorShape } from '../../../vector/model'
import {
  Brush,
  Circle,
  Hand,
  Hexagon,
  type LucideIcon,
  MousePointer2,
  PenLine,
  PenTool,
  Pipette,
  Slash,
  Square,
  Star,
  Type,
} from '../../ui/icons'
import { toolShortcutMap } from '../useToolShortcuts'

export type VectorTool =
  | 'select'
  | 'reshape'
  | 'pan'
  | 'brush'
  | 'pen'
  | 'rect'
  | 'ellipse'
  | 'line'
  | 'polygon'
  | 'star'
  | 'text'
  | 'picker'

/**
 * Letras no padrão dos programas de desenho (V selecionar, A editar os pontos,
 * H mão, B pincel, T texto…). `A` sozinho é ferramenta; `Ctrl+A` continua
 * sendo "selecionar tudo".
 */
export const TOOLS: Array<{ id: VectorTool; icon: LucideIcon; label: string; shortcut: string }> = [
  { id: 'select', icon: MousePointer2, label: COPY.vector.select, shortcut: 'V' },
  { id: 'reshape', icon: PenTool, label: COPY.vector.reshape, shortcut: 'A' },
  { id: 'pan', icon: Hand, label: COPY.vector.pan, shortcut: 'H' },
  { id: 'brush', icon: Brush, label: COPY.vector.brush, shortcut: 'B' },
  // P está livre no mapa do vetor (o Lápis P é do pixel; mapas são por editor).
  // Ícone PenLine — o PenTool é do "editar os pontos".
  { id: 'pen', icon: PenLine, label: COPY.vector.pen, shortcut: 'P' },
  { id: 'rect', icon: Square, label: COPY.tools.rect, shortcut: 'U' },
  { id: 'ellipse', icon: Circle, label: COPY.tools.ellipse, shortcut: 'O' },
  { id: 'line', icon: Slash, label: COPY.tools.line, shortcut: 'L' },
  { id: 'polygon', icon: Hexagon, label: COPY.vector.polygon, shortcut: 'Y' },
  { id: 'star', icon: Star, label: COPY.vector.star, shortcut: 'S' },
  { id: 'text', icon: Type, label: COPY.vector.text, shortcut: 'T' },
  { id: 'picker', icon: Pipette, label: COPY.tools.picker, shortcut: 'I' },
]

export const TOOL_SHORTCUTS = toolShortcutMap(TOOLS)

/** No máximo de cores personalizadas guardadas na sessão (aparecem como swatches). */
export const MAX_CUSTOM_COLORS = 6

/**
 * Os SEIS degraus de espessura do contorno, compartilhados pela caixa de
 * ferramentas (bolinhas) e pelo slider de Aparência. Passo de 0,5 a partir de
 * meio pixel: o traço fino existe de verdade (pedido dela: o 1 era grosso demais
 * para ser o primeiro, e o 8 não se usava). O default 2 TEM que estar na lista.
 * Desenhos antigos podem carregar 4/6/8: continuam desenhando igual (o sanitize
 * aceita até 64), só não acendem degrau nenhum.
 */
export const STROKE_WIDTHS = [0.5, 1, 1.5, 2, 2.5, 3] as const

/**
 * Degrau do slider para uma espessura: o primeiro preset que a alcança
 * (arredonda para cima, como sempre foi). Acima do último (legado 4/6/8), o
 * ÚLTIMO degrau. Antes o `findIndex` devolvia -1 e o `Math.max(-1, 0)` deixava
 * o slider no degrau 0: o traço MAIS FINO para um traço grosso.
 */
export function strokeWidthIndex(width: number): number {
  const index = STROKE_WIDTHS.findIndex((preset) => preset >= width)
  return index === -1 ? STROKE_WIDTHS.length - 1 : index
}

/**
 * "0,5" e não "0.5": a vírgula é o decimal que a criança lê. Duas casas no
 * máximo: um legado "sujo" (0,30000000000000004) não pode chegar ao rótulo.
 */
export function formatStrokeWidth(width: number): string {
  return String(Math.round(width * 100) / 100).replace('.', ',')
}

/**
 * Diâmetro (px) da bolinha do preset na caixa: 6..16 para os seis degraus, em
 * passos de 2px que o olho distingue e que cabem no botão de 44px. A fórmula
 * antiga (`width * 2 + 4`) daria 5..10px com os degraus de meio pixel, quase
 * iguais entre si.
 */
export function strokeDotSize(width: number): number {
  return 4 + width * 4
}

/**
 * Degradê como `background` de CSS (amostras dos botões). O ângulo do modelo
 * não vira `deg` de propósito: a amostra é pequena e só precisa dizer "é um
 * degradê e são estas duas cores".
 */
export function gradientCss(gradient: VectorGradient): string {
  return gradient.type === 'radial'
    ? `radial-gradient(circle, ${gradient.from}, ${gradient.to})`
    : `linear-gradient(to right, ${gradient.from}, ${gradient.to})`
}

/**
 * Cores SUGERIDAS do vetorial: os hex de uma paleta do Pinta, sem o slot
 * transparente (no vetor quem faz esse papel é a célula "sem cor"). A cor do
 * vetor é livre — a paleta só troca as sugestões da grade, sem tocar no desenho.
 */
export function paletteSwatches(id: PaletteId): string[] {
  return getPalette(id).colors.filter((hex, index) => index !== TRANSPARENT_INDEX && hex !== '')
}

/**
 * A paleta sugerida do VETOR: uma pronta OU um SNAPSHOT de personalizada. O
 * snapshot (nome + cores copiadas, nunca a referência da biblioteca) é o que
 * deixa excluir a paleta da biblioteca sem quebrar a sessão aberta. Vive em
 * estado de sessão do escopo — kinds vetoriais não têm campo no asset (cor é
 * livre; a paleta só troca as SUGESTÕES da grade).
 */
export type VectorPaletteChoice =
  | { kind: 'builtin'; id: PaletteId }
  | { kind: 'custom'; name: string; colors: readonly string[] }

/** As 16 posições da escolha (formato `PintaPalette.colors`; [0]=transparente). */
export function vectorPaletteColors(choice: VectorPaletteChoice): readonly string[] {
  return choice.kind === 'custom' ? choice.colors : getPalette(choice.id).colors
}

/** Os swatches da grade para a escolha (sem transparente/slots vazios). */
export function vectorPaletteSwatches(choice: VectorPaletteChoice): string[] {
  if (choice.kind === 'builtin') return paletteSwatches(choice.id)
  return choice.colors.filter((hex, index) => index !== TRANSPARENT_INDEX && hex !== '')
}

/** Deslocamento da cópia (Duplicar e colar): "do lado" do original. */
const COPY_OFFSET = 12

/**
 * Deslocamento da cópia que a MANTÉM DENTRO do papel e FORA de cima do que já
 * está lá. Por eixo, os candidatos em ordem: +12; -12; a folga que sobra até a
 * borda da frente; a folga até a borda de trás. Os dois últimos existem porque
 * 12 é uma medida de cenário: num personagem de 32 px é um terço do papel (um
 * corpo de 16 px no meio não tem ±12 de folga para lado nenhum) e numa peça de
 * 16 px nem cabe. O primeiro par cujo destino não coincide com a caixa de uma
 * forma (ou a união de um grupo) existente vence: sem isso, num papel pequeno a
 * régua oscila entre dois lugares e a SEGUNDA cópia nasce exatamente em cima
 * da original (a criança duplica e "não acontece nada"). Sem candidato nenhum
 * (forma do tamanho do papel ou maior), +12: parcialmente fora, mas visível e
 * fora de cima do original. Duplicar e colar usam a MESMA régua.
 * ⚠️ A caixa é a do `shapeBounds` (sem rotação e sem o contorno): forma girada
 * perto da borda ainda pode nascer com uma pontinha fora.
 */
export function offsetInsideDoc(
  bounds: Bounds,
  doc: { width: number; height: number },
  occupied: readonly Bounds[] = [],
): { dx: number; dy: number } {
  const candidates = (start: number, size: number, limit: number): number[] => {
    // Papel sem medida (não acontece nos três kinds): a régua de sempre.
    if (!Number.isFinite(limit)) return [COPY_OFFSET]
    const room = limit - (start + size)
    const list: number[] = []
    if (room >= COPY_OFFSET) list.push(COPY_OFFSET)
    if (start >= COPY_OFFSET) list.push(-COPY_OFFSET)
    if (room > 0 && room < COPY_OFFSET) list.push(room)
    if (start > 0 && start < COPY_OFFSET) list.push(-start)
    return list.length > 0 ? list : [COPY_OFFSET]
  }
  const xs = candidates(bounds.x, bounds.width, doc.width)
  const ys = candidates(bounds.y, bounds.height, doc.height)
  const taken = (dx: number, dy: number): boolean =>
    occupied.some(
      (b) =>
        Math.abs(b.x - (bounds.x + dx)) < 0.5 &&
        Math.abs(b.y - (bounds.y + dy)) < 0.5 &&
        Math.abs(b.width - bounds.width) < 0.5 &&
        Math.abs(b.height - bounds.height) < 0.5,
    )
  // As diagonais (+12,+12 / -12,-12 / ...) vêm antes das cruzadas: são as que
  // mais parecem "do lado".
  const pairs: Array<{ dx: number; dy: number }> = []
  const push = (dx: number, dy: number): void => {
    if (!pairs.some((p) => p.dx === dx && p.dy === dy)) pairs.push({ dx, dy })
  }
  for (let i = 0; i < Math.min(xs.length, ys.length); i += 1) {
    push(xs[i] as number, ys[i] as number)
  }
  for (const dx of xs) for (const dy of ys) push(dx, dy)
  return pairs.find((p) => !taken(p.dx, p.dy)) ?? (pairs[0] as { dx: number; dy: number })
}

/**
 * As caixas que a cópia evita (`offsetInsideDoc`): cada forma e, por cima, a
 * UNIÃO de cada grupo (a cópia de um grupo compara a própria união com as que
 * já existem). Escondida conta: ao reaparecer, a cópia estaria em cima dela.
 */
export function occupiedBoundsOf(shapes: readonly VectorShape[]): Bounds[] {
  const groups = new Map<string, Bounds[]>()
  const result: Bounds[] = []
  for (const shape of shapes) {
    const bounds = shapeBounds(shape)
    result.push(bounds)
    if (!shape.groupId) continue
    const list = groups.get(shape.groupId) ?? []
    list.push(bounds)
    groups.set(shape.groupId, list)
  }
  for (const list of groups.values()) result.push(boundsUnion(list))
  return result
}

/** Expande ids para incluir TODOS os shapes dos mesmos grupos (seleção junta). */
export function expandToGroups(shapes: VectorShape[], ids: string[]): string[] {
  const groups = new Set<string>()
  for (const s of shapes) if (ids.includes(s.id) && s.groupId) groups.add(s.groupId)
  if (groups.size === 0) return ids
  const result = new Set(ids)
  // A EXPANSÃO pula membros trancados (mover o grupo não arrasta a trancada
  // junto); id EXPLÍCITO permanece — o painel seleciona trancada de propósito,
  // para destrancar.
  for (const s of shapes) {
    if (s.groupId && groups.has(s.groupId) && s.locked !== true) result.add(s.id)
  }
  return [...result]
}

/**
 * Clona formas para duplicar/colar: ids de forma sempre novos e cada grupo
 * original recebe exatamente um NOVO groupId. Assim as cópias continuam juntas
 * entre si sem ficarem acidentalmente ligadas aos originais.
 */
export function cloneShapesWithNewIds(
  shapes: readonly VectorShape[],
  dx: number,
  dy: number,
): VectorShape[] {
  const groupIds = new Map<string, string>()
  return shapes.map((shape) => {
    // A cópia nasce DESTRANCADA (é material novo — duplicar uma trancada é
    // justamente o jeito de mexer numa variação sem tocar no original).
    const { locked: _locked, ...clone } = structuredClone(shape)
    const moved = translateShape({ ...clone, id: newId() }, dx, dy)
    if (!shape.groupId) return moved
    const groupId = groupIds.get(shape.groupId) ?? newId()
    groupIds.set(shape.groupId, groupId)
    return { ...moved, groupId }
  })
}

/**
 * Formas coladas de OUTRO documento (área de transferência do app): no mesmo
 * tamanho de documento é o colar de sempre (ids novos, `offsetInsideDoc` — do
 * lado, dentro do papel e fora de cima do que já existe, `occupied`);
 * vindo de um documento de outro tamanho, a cópia ENCOLHE se não couber (fator
 * único, sem distorcer; nunca amplia) e CENTRALIZA no destino. Grupos são
 * preservados (cada grupo original vira um grupo novo), diferente do "trazer da
 * galeria", que achata tudo num grupo só.
 */
export function fitPastedShapes(
  shapes: readonly VectorShape[],
  from: { width: number; height: number },
  to: { width: number; height: number },
  occupied: readonly Bounds[] = [],
): VectorShape[] {
  if (from.width === to.width && from.height === to.height) {
    const offset = offsetInsideDoc(boundsUnion(shapes.map(shapeBounds)), to, occupied)
    return cloneShapesWithNewIds(shapes, offset.dx, offset.dy)
  }
  const clones = cloneShapesWithNewIds(shapes, 0, 0)
  const bounds = boundsUnion(clones.map(shapeBounds))
  const scale = Math.min(
    1,
    bounds.width > 0 ? to.width / bounds.width : 1,
    bounds.height > 0 ? to.height / bounds.height : 1,
  )
  const scaled =
    scale < 1
      ? clones.map((shape) => scaleShape(shape, { x: bounds.x, y: bounds.y }, scale, scale))
      : clones
  const after = boundsUnion(scaled.map(shapeBounds))
  const dx = to.width / 2 - (after.x + after.width / 2)
  const dy = to.height / 2 - (after.y + after.height / 2)
  return scaled.map((shape) => translateShape(shape, dx, dy))
}

/** Trava o ponto de arrasto: Shift = quadrado/círculo (formas) ou 45° (linha). */
export function constrainPoint(tool: VectorTool, start: Vec2, current: Vec2): Vec2 {
  const dx = current.x - start.x
  const dy = current.y - start.y
  if (tool === 'line') {
    const step = Math.PI / 4
    const snapped = Math.round(Math.atan2(dy, dx) / step) * step
    const len = Math.hypot(dx, dy)
    return { x: start.x + Math.cos(snapped) * len, y: start.y + Math.sin(snapped) * len }
  }
  const size = Math.max(Math.abs(dx), Math.abs(dy))
  return { x: start.x + (dx < 0 ? -size : size), y: start.y + (dy < 0 ? -size : size) }
}
