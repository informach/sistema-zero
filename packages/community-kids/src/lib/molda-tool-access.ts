import {
  careerLevelAtLeast,
  MOLDA_TOOL_BAND_LEVELS,
  THREE_D_CREATION_MIN_LEVEL,
} from '@sistemazero/core/career'
import { isPrivilegedRole } from '@sistemazero/member-shell/lib/studio-tier'
import {
  MOLDA_TOOL_BANDS,
  type MoldaToolAccess,
  moldaToolFamilyIds,
} from '@sistemazero/molda/tools'
import { BEYOND_HORIZON_PHRASE } from '@/lib/career-horizon'
import { LEVEL_ORDER, levelInfo } from '@/lib/level-info'
import type { StudentLevelSlug } from '@/lib/types'

/**
 * A frase do nó do mapa da carreira para o que o catálogo de hoje ainda não alcança. A oficina
 * não promete posto que o mapa esconde: o que passa do horizonte aparece com ela.
 */
export const MOLDA_BEYOND_HORIZON = BEYOND_HORIZON_PHRASE

/** As faixas que o posto já abriu (a equipe abre todas). */
function openBands(levelSlug: string | null | undefined, role: string | undefined) {
  if (isPrivilegedRole(role)) return MOLDA_TOOL_BANDS
  return MOLDA_TOOL_BANDS.filter((band) =>
    careerLevelAtLeast(levelSlug, MOLDA_TOOL_BAND_LEVELS[band]),
  )
}

/**
 * Se a oficina vai trancar alguma coisa para esta criança. A página usa para só esperar o
 * catálogo (que dá o horizonte) quando há o que anunciar: a equipe e a Lenda nunca esperam.
 */
export function moldaToolAccessRestricted({
  levelSlug,
  role,
}: {
  levelSlug: string | null | undefined
  role: string | undefined
}): boolean {
  return openBands(levelSlug, role).length < MOLDA_TOOL_BANDS.length
}

/**
 * As ferramentas do Molda que a criança pode USAR, pelo posto da carreira.
 *
 * O Molda não conhece carreira: recebe as famílias liberadas (`toolAccess` do adapter), como o
 * Estúdio recebe os modos e o Pinta as ferramentas. As faixas abrem nos postos que fecham os três
 * cursos 3D (`MOLDA_TOOL_BAND_LEVELS`, no core): básico no Explorador(a), intermediário no
 * Arquiteto(a) de Mundos e profissional na Lenda.
 *
 * `undefined` = tudo liberado, e o pacote entende a ausência assim: a equipe (superadmin, admin,
 * staff), como nos outros portões, e a Lenda. É portão pedagógico, não de segurança: o Molda não
 * tem servidor e nenhuma dessas ferramentas tem custo por uso.
 *
 * `horizon` é o posto mais alto que o catálogo de hoje entrega (`careerHorizon`). O que abre além
 * dele vira `MOLDA_BEYOND_HORIZON`, e grupos seguidos com a mesma frase se juntam. `null` = o
 * horizonte é DESCONHECIDO (a busca do catálogo falhou ou demorou): aí nenhum posto é prometido,
 * porque nomear um posto que o mapa esconde é pior do que não nomear nenhum.
 */
export function moldaToolAccessFor({
  levelSlug,
  role,
  horizon,
}: {
  levelSlug: string | null | undefined
  role: string | undefined
  horizon: StudentLevelSlug | null
}): MoldaToolAccess | undefined {
  const open = openBands(levelSlug, role)
  if (open.length === MOLDA_TOOL_BANDS.length) return undefined
  const upcoming: { when: string; families: string[] }[] = []
  for (const band of MOLDA_TOOL_BANDS) {
    if (open.includes(band)) continue
    const level = MOLDA_TOOL_BAND_LEVELS[band]
    const beyond =
      horizon === null ||
      LEVEL_ORDER.indexOf(level as StudentLevelSlug) > LEVEL_ORDER.indexOf(horizon)
    const when = beyond ? MOLDA_BEYOND_HORIZON : `Abrem no nível ${levelInfo(level).label}`
    const families = moldaToolFamilyIds([band])
    const last = upcoming.at(-1)
    if (last?.when === when) last.families.push(...families)
    else upcoming.push({ when, families })
  }
  return { allow: moldaToolFamilyIds(open), upcoming }
}

/**
 * `/molda?nivel=explorer`: SÓ a equipe vê a oficina como a criança daquele posto. É o único jeito
 * de conferir o portão em staging, porque a conta da equipe resolve tudo liberado. Para quem não
 * é da equipe, posto que não existe ou posto em que o Molda ainda não abre, o parâmetro não muda
 * nada (`null`).
 */
export function moldaPreviewLevel(
  requested: string | string[] | undefined,
  role: string | undefined,
): StudentLevelSlug | null {
  if (!isPrivilegedRole(role) || typeof requested !== 'string') return null
  return careerLevelAtLeast(requested, THREE_D_CREATION_MIN_LEVEL)
    ? (requested as StudentLevelSlug)
    : null
}
