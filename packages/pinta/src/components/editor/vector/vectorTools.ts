/**
 * Catálogo das ferramentas do editor VETORIAL + helpers puros compartilhados
 * entre a caixa de ferramentas, o palco e o escopo (seleção por grupo, trava
 * do Shift). Só constantes e funções — o estado vive no `VectorEditorScope`.
 */
import { COPY } from '../../../core/copy'
import type { Vec2, VectorShape } from '../../../vector/model'
import {
  Brush,
  Circle,
  Hand,
  Hexagon,
  type LucideIcon,
  MousePointer2,
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

/** Cores livres do vetorial (os hex da paleta Arcade, sem o slot transparente). */
export const SWATCHES = [
  '#ffffff',
  '#ff2121',
  '#ff93c4',
  '#ff8135',
  '#fff609',
  '#249ca3',
  '#78dc52',
  '#003fad',
  '#87f2ff',
  '#8e2ec4',
  '#a4839f',
  '#5c406c',
  '#e5cdc4',
  '#91463d',
  '#000000',
] as const

export const SWATCH_SET: ReadonlySet<string> = new Set(SWATCHES)

/** Expande ids para incluir TODOS os shapes dos mesmos grupos (seleção junta). */
export function expandToGroups(shapes: VectorShape[], ids: string[]): string[] {
  const groups = new Set<string>()
  for (const s of shapes) if (ids.includes(s.id) && s.groupId) groups.add(s.groupId)
  if (groups.size === 0) return ids
  const result = new Set(ids)
  for (const s of shapes) if (s.groupId && groups.has(s.groupId)) result.add(s.id)
  return [...result]
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
