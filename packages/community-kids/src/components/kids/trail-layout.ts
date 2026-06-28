import type { CourseDetailView, LessonOutlineView, ModuleOutlineView } from '@/lib/types'
import { type UnitTheme, unitThemeAt } from './unit-theme'

export type TrailNodeState = 'done' | 'current' | 'todo' | 'locked'

export interface TrailNode {
  lesson: LessonOutlineView
  /**
   * `current` = PRIMEIRA aula não concluída e LIBERADA (única). `locked` = aula
   * travada pela trava sequencial (estilo Duolingo) — nó não clicável.
   */
  state: TrailNodeState
  /** Coluna do serpenteado (−2..2) — multiplicada por --trail-step no render. */
  offset: number
}

/**
 * Baú de fim de unidade (gamificação): abre quando TODAS as aulas do módulo
 * estão concluídas — derivado client-side do outline; o XP (+25) é concedido
 * pelo backend no complete que fechou o módulo. Estado é só visual.
 */
export interface TrailChest {
  offset: number
  opened: boolean
}

export interface TrailUnit {
  module: ModuleOutlineView
  theme: UnitTheme
  nodes: TrailNode[]
  /** `null` em unidade sem aulas (não há o que fechar). */
  chest: TrailChest | null
}

/**
 * Padrão de colunas do serpenteado. O índice é GLOBAL (contínuo entre
 * unidades — e avança TAMBÉM no baú) e colunas consecutivas SEMPRE diferem
 * de 1 — os conectores ficam diagonais e nunca atravessam a legenda do nó
 * de cima.
 */
const OFFSETS = [0, 1, 2, 1, 0, -1, -2, -1] as const

/**
 * Deriva a trilha Duolingo do shape REAL do curso (members): módulo =
 * unidade temática, aula = nó, fim de unidade = baú. Quando o curso tem a
 * trava sequencial ligada, as aulas posteriores vêm `locked` do backend e
 * seus nós ficam não-clicáveis (cadeado); o baú nunca é clicável.
 */
export function buildTrail(course: CourseDetailView): TrailUnit[] {
  // A "atual" é a 1ª não concluída E não travada (a trava garante que a 1ª
  // pendente liberada é justamente a próxima na ordem).
  const currentId =
    course.modules.flatMap((m) => m.lessons).find((l) => !l.completed && !l.locked)?.id ?? null

  let globalIndex = 0
  const nextOffset = () => {
    const offset = OFFSETS[globalIndex % OFFSETS.length] as number
    globalIndex += 1
    return offset
  }

  return course.modules.map((module, moduleIndex) => ({
    module,
    theme: unitThemeAt(moduleIndex),
    nodes: module.lessons.map(
      (lesson): TrailNode => ({
        lesson,
        offset: nextOffset(),
        state: lesson.completed
          ? 'done'
          : lesson.locked
            ? 'locked'
            : lesson.id === currentId
              ? 'current'
              : 'todo',
      }),
    ),
    chest:
      module.lessons.length > 0
        ? { offset: nextOffset(), opened: module.lessons.every((l) => l.completed) }
        : null,
  }))
}

/** Texto do balão sobre o nó atual (uppercase via CSS). */
export function balloonLabel(course: CourseDetailView): string {
  return course.progress.completedLessons > 0 ? 'Continuar' : 'Começar'
}
