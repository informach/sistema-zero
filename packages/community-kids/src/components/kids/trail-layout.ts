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
  chest: TrailChest
}

/**
 * Padrão de colunas do serpenteado. O índice é GLOBAL (contínuo entre
 * unidades — e avança TAMBÉM no baú) e colunas consecutivas SEMPRE diferem
 * de 1 — os conectores ficam diagonais e nunca atravessam a legenda do nó
 * de cima.
 */
const OFFSETS = [0, 1, 2, 1, 0, -1, -2, -1] as const

/**
 * Módulos que VIRAM unidade na trilha: os que têm alguma aula para mostrar.
 *
 * O backend já entrega o outline só com aulas PUBLICADAS (`findOutline` com
 * `publishedOnly`), mas o módulo em si continua vindo — então um módulo que a
 * professora ainda está montando chegava aqui com `lessons: []` e desenhava um
 * banner sozinho, com "0/0 aulas", um baú impossível e nada embaixo. A criança
 * lia isso como "tem coisa aqui que eu não consigo abrir".
 *
 * Filtrar aqui (e não no `getMyCourse`) mantém a mudança na comunidade kids: o
 * backend segue contando e travando pelo outline inteiro, e o percentual do
 * curso não muda — módulo vazio não tem aula para somar em lugar nenhum.
 */
export function visibleModules(course: CourseDetailView): ModuleOutlineView[] {
  return course.modules.filter((module) => module.lessons.length > 0)
}

/**
 * Deriva a trilha Duolingo do shape REAL do curso (members): módulo =
 * unidade temática, aula = nó, fim de unidade = baú. Quando o curso tem a
 * trava sequencial ligada, as aulas posteriores vêm `locked` do backend e
 * seus nós ficam não-clicáveis (cadeado); o baú nunca é clicável.
 *
 * Numeração ("Unidade N") e tema saem do índice do que APARECE: com um módulo
 * vazio no meio, contar pelo índice cru pularia um número na cara da criança.
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

  return visibleModules(course).map((module, moduleIndex) => ({
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
    chest: { offset: nextOffset(), opened: module.lessons.every((l) => l.completed) },
  }))
}

/** Texto do balão sobre o nó atual (uppercase via CSS). */
export function balloonLabel(course: CourseDetailView): string {
  return course.progress.completedLessons > 0 ? 'Continuar' : 'Começar'
}
