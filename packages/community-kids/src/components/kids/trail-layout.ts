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
  /** Posição lateral do serpenteado (−2..2) — multiplicada por --trail-step no render. */
  offset: number
}

/**
 * Baú de fim de unidade. Só a POSIÇÃO no serpenteado sai daqui: liberado, aberto
 * e o valor do prêmio vêm do servidor (`module.chest`), porque desde 09/2026 a
 * criança ABRE o baú com um clique e derivar isso no cliente não sobreviveria a
 * um F5. Ver `trail-chest.tsx`.
 */
export interface TrailChest {
  offset: number
}

export interface TrailUnit {
  module: ModuleOutlineView
  theme: UnitTheme
  nodes: TrailNode[]
  chest: TrailChest
}

export type TrailArtSide = 'left' | 'right'

export interface TrailArtPlacement {
  side: TrailArtSide
  top: number
  extraHeight: number
}

export interface TrailObstacle {
  left: number
  top: number
  width: number
  height: number
}

/** Medidas locais da unidade, sem a altura adicional reservada para a arte. */
export interface TrailArtArea {
  width: number
  height: number
  artWidth: number
  artHeight: number
  obstacles: readonly TrailObstacle[]
}

/** Encontra uma caixa livre considerando aulas, legendas, balão e baú reais. */
export function trailArtPlacement(
  { width, height, artWidth, artHeight, obstacles }: TrailArtArea,
  preferredSide: TrailArtSide,
): TrailArtPlacement {
  const gap = 12
  const sides: TrailArtSide[] = preferredSide === 'left' ? ['left', 'right'] : ['right', 'left']
  const middle = Math.max(0, (height - artHeight) / 2)
  const candidates = new Set([middle, 0, height - artHeight])
  for (const box of obstacles) {
    candidates.add(box.top + box.height + gap)
    candidates.add(box.top - gap - artHeight)
  }
  let best: (TrailArtPlacement & { clearance: number; distance: number }) | null = null

  for (const side of sides) {
    const left = side === 'left' ? 0 : width - artWidth
    for (const top of candidates) {
      if (top < 0 || top + artHeight > height || left < 0) continue
      let clearance = width
      for (const box of obstacles) {
        if (top >= box.top + box.height + gap || top + artHeight <= box.top - gap) continue
        const horizontalGap = Math.max(box.left - (left + artWidth), left - (box.left + box.width))
        clearance = Math.min(clearance, horizontalGap)
      }
      if (clearance < gap) continue
      const distance = Math.abs(top - middle)
      if (
        !best ||
        clearance > best.clearance ||
        (clearance === best.clearance && distance < best.distance)
      ) {
        best = { side, top, extraHeight: 0, clearance, distance }
      }
    }
  }

  if (best) return { side: best.side, top: best.top, extraHeight: 0 }
  // Unidade curta/estreita: mantém a arte inteira abaixo dos nós, dentro da unidade.
  const top = Math.max(height, ...obstacles.map((box) => box.top + box.height + gap))
  return { side: preferredSide, top, extraHeight: top + artHeight - height }
}

/**
 * Curva do serpenteado. O índice é GLOBAL (contínuo entre unidades — e avança
 * TAMBÉM no baú). A senoide desacelera perto das pontas e acelera ao cruzar o
 * centro, então os nós formam uma curva em vez de vários trechos retos.
 */
const TRAIL_AMPLITUDE = 2
const TRAIL_PERIOD = 12

function trailOffsetAt(index: number): number {
  const radians = (index / TRAIL_PERIOD) * Math.PI * 2
  const rounded = Math.round(Math.sin(radians) * TRAIL_AMPLITUDE * 100) / 100
  // `Math.sin(2π)` pode arredondar para -0; normalizar deixa o CSS e o JSON estáveis.
  return rounded === 0 ? 0 : rounded
}

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
    const offset = trailOffsetAt(globalIndex)
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
    chest: { offset: nextOffset() },
  }))
}

/** Texto do balão sobre o nó atual (uppercase via CSS). */
export function balloonLabel(course: CourseDetailView): string {
  return course.progress.completedLessons > 0 ? 'Continuar' : 'Começar'
}
