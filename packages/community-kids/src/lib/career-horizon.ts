import { type CourseTierSlug, courseTierOf } from '@sistemazero/member-shell/lib/course-tier'
import { LEVEL_STUDY, LEVEL_TIER } from '@/lib/career-map'
import { LEVEL_ORDER, levelInfo } from '@/lib/level-info'
import type { CourseLevelSlug, CourseTrack, StudentLevelSlug, StudentLevelView } from '@/lib/types'

/**
 * HORIZONTE DO CATÁLOGO — a régua PROVISÓRIA da carreira enquanto os 49 cursos não existem.
 *
 * A carreira exige 8 posições por degrau, com uma exceção: o degrau de ENTRADA tem 1. São 49 no
 * total, e o catálogo real tem punhados.
 * Sem isto a criança lê "faltam 8 cursos" de cursos que ninguém gravou e vê medalhões com
 * CADEADO, que para ela significa "você não fez o suficiente". Aqui derivamos duas coisas
 * do catálogo que as páginas JÁ buscam:
 *
 * - **horizonte**: o nível mais alto que o catálogo de HOJE consegue entregar de fato. O mapa
 *   mostra até ele e fecha com um nó de "tem mais pela frente" no lugar da fileira de cadeados.
 * - **progresso pronto**: quanto falta contando SÓ os cursos que existem.
 *
 * ⚠️ Nada aqui muda REGRA: o nível, o `remaining`, as travas e o que o Estúdio libera seguem
 * sendo do members/core. Isto é apresentação. Quando o catálogo encher, `careerHorizon`
 * devolve `god`, `visibleCareerLevels` devolve os 8 e a visão definitiva volta SOZINHA
 * (travado em `tests/career-horizon.test.ts`).
 *
 * Não precisamos espelhar os `requiredSlots` do core porque eles são deriváveis do que o kids
 * já espelha: `requiredSlots[nível_i] = ∪ dos LEVEL_STUDY[j].slots para j < i`. `LEVEL_TIER` e
 * `LEVEL_STUDY` já são travados contra o core em `tests/career-conformance.test.ts`, então esta
 * derivação herda essa garantia.
 */

/**
 * O que o horizonte precisa saber de um curso — só isso. É deliberadamente MENOR que o
 * `CatalogCourseView`: o mapa é um componente de CLIENTE, e receber a view inteira
 * mandaria título, subtítulo, capa e URL de vendas de 49 cursos no payload do RSC para
 * calcular três campos. `CatalogCourseView` satisfaz esta forma, então o servidor pode
 * passar a lista inteira OU só o recorte.
 */
export interface CareerCatalogEntry {
  level?: CourseLevelSlug
  track?: CourseTrack
  careerSlot?: number | null
}

/** Degraus na ordem da carreira, derivados da escada (sem espelho novo). */
export const TIER_ORDER: readonly CourseTierSlug[] = [
  ...new Set(
    LEVEL_ORDER.map((slug) => LEVEL_TIER[slug]).filter((tier): tier is CourseTierSlug => !!tier),
  ),
]

/**
 * Catálogo DESCONHECIDO (a busca falhou) — distinto de catálogo VAZIO. Vazio é informação
 * real e encolhe o mapa; falha não pode encolher nada, senão um soluço de rede tira postos
 * já conquistados da tela. `null` = não restringe (cai na visão definitiva).
 */
export type CatalogInput = readonly CareerCatalogEntry[] | null

/**
 * Posições (`careerSlot`) que TÊM curso publicado no catálogo, por degrau. Curso bônus
 * (`careerSlot` nulo) e curso `lenda` (sem degrau) ficam de fora: não são exigidos por
 * nenhum nível, então não movem o horizonte.
 */
export function readySlotsByTier(
  courses: readonly CareerCatalogEntry[],
): Map<CourseTierSlug, Set<number>> {
  const ready = new Map<CourseTierSlug, Set<number>>()
  for (const course of courses) {
    const tier = courseTierOf(course.level, course.track)
    if (!tier || typeof course.careerSlot !== 'number') continue
    const slots = ready.get(tier) ?? new Set<number>()
    slots.add(course.careerSlot)
    ready.set(tier, slots)
  }
  return ready
}

/**
 * Posições que o nível no índice `index` exige (cumulativo): tudo que os níveis ANTERIORES
 * estudam. Espelha `requiredSlots` do core sem duplicá-lo.
 */
function requiredSlotsUpTo(index: number): Map<CourseTierSlug, Set<number>> {
  const required = new Map<CourseTierSlug, Set<number>>()
  for (let i = 0; i < index; i += 1) {
    const slug = LEVEL_ORDER[i]
    if (!slug) continue
    const tier = LEVEL_TIER[slug]
    const study = LEVEL_STUDY[slug]
    if (!tier || !study) continue
    const slots = required.get(tier) ?? new Set<number>()
    for (const slot of study.slots) slots.add(slot)
    required.set(tier, slots)
  }
  return required
}

function coveredBy(
  required: Map<CourseTierSlug, Set<number>>,
  ready: Map<CourseTierSlug, Set<number>>,
): boolean {
  for (const [tier, slots] of required) {
    const have = ready.get(tier)
    for (const slot of slots) {
      if (!have?.has(slot)) return false
    }
  }
  return true
}

/**
 * O nível mais alto que o catálogo de HOJE consegue entregar. Catálogo vazio → `noob`
 * (a entrada não exige nada); catálogo completo → `god`, e a visão provisória se dissolve.
 * Catálogo desconhecido (`null`, a busca falhou) → topo: não restringe nada.
 */
export function careerHorizon(courses: CatalogInput): StudentLevelSlug {
  if (courses === null) return LEVEL_ORDER.at(-1) ?? 'god'
  const ready = readySlotsByTier(courses)
  let horizon: StudentLevelSlug = LEVEL_ORDER[0] ?? 'noob'
  for (let i = 1; i < LEVEL_ORDER.length; i += 1) {
    if (!coveredBy(requiredSlotsUpTo(i), ready)) break
    horizon = LEVEL_ORDER[i] ?? horizon
  }
  return horizon
}

/**
 * Níveis que o mapa DESENHA: até o horizonte ou até onde o aluno está, o que for mais alto.
 * O aluno entra na conta para que a EQUIPE (que resolve como `god`) e qualquer estado
 * estranho nunca vejam um mapa que não os inclui.
 */
export function visibleCareerLevels(
  currentSlug: StudentLevelSlug | string | undefined,
  horizon: StudentLevelSlug,
): StudentLevelSlug[] {
  const currentIndex = LEVEL_ORDER.indexOf(currentSlug as StudentLevelSlug)
  const highest = Math.max(LEVEL_ORDER.indexOf(horizon), currentIndex, 0)
  return LEVEL_ORDER.slice(0, highest + 1)
}

/** Sobrou nível fora do mapa? Então o mapa fecha com o nó "tem mais pela frente". */
export function hasHorizonNode(visible: readonly StudentLevelSlug[]): boolean {
  return visible.length < LEVEL_ORDER.length
}

/** Níveis que ficaram além do horizonte (o conteúdo do painel do nó de horizonte). */
export function levelsBeyondHorizon(visible: readonly StudentLevelSlug[]): StudentLevelSlug[] {
  return LEVEL_ORDER.slice(visible.length)
}

export type CareerProgress =
  | {
      kind: 'pending'
      tier: CourseTierSlug
      /** Cursos PRONTOS que ainda faltam concluir (nunca promete curso inexistente). */
      remaining: number
      /** Cursos deste degrau já concluídos e publicados. */
      done: number
      /** Cursos deste degrau que EXISTEM no catálogo (o denominador honesto). */
      ready: number
      /**
       * Frase de "quanto falta para o próximo posto". **`null` enquanto o degrau não tem
       * todos os cursos publicados** — dizer um número que não leva ao posto é falsa
       * esperança. Ver o comentário no `careerProgress`.
       */
      hint: string | null
    }
  /** Há próximo nível, mas a criança já fez tudo que existe. Não é derrota, é espera. */
  | { kind: 'up-to-date' }
  /** Já é Lenda: não há próximo nível. */
  | { kind: 'top' }

/**
 * Quanto falta para o próximo nível contando **só os cursos que existem**.
 *
 * `remaining` do members conta contra a régua final (8 por degrau; 1 na entrada). Aqui a contagem é
 * limitada ao catálogo: `done` sai da própria régua (exigidos − faltantes) e o teto é quantos
 * cursos daquele degrau estão publicados. Curso despublicado depois de qualificado só derruba
 * o número para 0 (clamp), nunca para negativo.
 */
export function careerProgress(
  level: StudentLevelView | null | undefined,
  courses: CatalogInput,
): CareerProgress {
  if (!level?.next || !level.remaining) return { kind: 'top' }
  const nextIndex = LEVEL_ORDER.indexOf(level.next)
  if (nextIndex < 0) return { kind: 'top' }
  const required = requiredSlotsUpTo(nextIndex)
  const ready = courses === null ? null : readySlotsByTier(courses)

  for (const tier of TIER_ORDER) {
    const missing = level.remaining[tier] ?? 0
    if (missing <= 0) continue
    const requiredSlots = required.get(tier)
    if (!requiredSlots) continue
    // Só contam as posições EXIGIDAS que existem de fato (bônus já fica fora do `ready`).
    // Catálogo desconhecido → conta como se tudo existisse, ou seja, os números do members.
    let readyCount = requiredSlots.size
    if (ready !== null) {
      const readySlots = ready.get(tier)
      readyCount = 0
      for (const slot of requiredSlots) {
        if (readySlots?.has(slot)) readyCount += 1
      }
    }
    const done = Math.max(0, requiredSlots.size - missing)
    const pending = Math.max(0, readyCount - done)
    const remaining = Math.min(missing, pending)
    if (remaining <= 0) return { kind: 'up-to-date' }
    // ⚠️ SÓ diz quanto falta quando o degrau tem TODOS os cursos publicados. A régua para
    // subir de nível é do members, não daqui — mudou só o que a tela mostra. Com o
    // degrau pela metade, "faltam 2 para virar Inventor(a)" é MENTIRA: a criança fecha os 2
    // e não sobe. Falsa esperança é pior que silêncio, então aqui a tela não fala do
    // assunto. Quando o degrau enche, o `remaining` do members vira verdade e a frase volta
    // sozinha. O retorno por curso, nesse meio-tempo, é a GAVETA nova no Estúdio.
    const nextLabel = levelInfo(level.next).label
    const hint =
      readyCount < requiredSlots.size
        ? null
        : remaining === 1
          ? `Falta 1 curso para você virar ${nextLabel}. Termine e publique o seu jogo no Mural!`
          : `Faltam ${remaining} cursos para você virar ${nextLabel}. Termine e publique os seus jogos no Mural!`
    return { kind: 'pending', tier, remaining, done, ready: readyCount, hint }
  }
  return { kind: 'up-to-date' }
}

/**
 * A frase do próximo marco, já limitada ao catálogo. Substitui o `nextLevelHint` em TODA
 * superfície (mapa, trilha, perfil, home) para não existirem dois números diferentes do mesmo
 * fato em telas seguidas. `null` = topo ou em dia (a UI mostra a mensagem própria).
 */
export function nextLevelHintWithin(
  level: StudentLevelView | null | undefined,
  courses: CatalogInput,
): string | null {
  const progress = careerProgress(level, courses)
  return progress.kind === 'pending' ? progress.hint : null
}
