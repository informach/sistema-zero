import type { LiveCohort, LiveCourseSummary } from '@sistemazero/core/live'

/**
 * As datas de uma turma de curso ao vivo (14/10/2026): um encontro por AULA PUBLICADA do curso,
 * na ordem dele. A professora digita a hora "de parede" no fuso da turma; o servidor recebe o
 * instante em UTC. Regras PURAS, testadas em `tests/live-schedule.test.ts`.
 */

/** Fusos oferecidos: os do Brasil, mais o do computador de quem cria (quando é outro). */
export const LIVE_TIME_ZONES: readonly { value: string; label: string }[] = [
  { value: 'America/Sao_Paulo', label: 'Brasília (São Paulo, Rio, Minas, Sul)' },
  { value: 'America/Bahia', label: 'Bahia' },
  { value: 'America/Fortaleza', label: 'Nordeste (Fortaleza, Recife, Natal)' },
  { value: 'America/Belem', label: 'Pará e Amapá' },
  { value: 'America/Manaus', label: 'Amazonas, Roraima e Rondônia' },
  { value: 'America/Cuiaba', label: 'Mato Grosso e Mato Grosso do Sul' },
  { value: 'America/Rio_Branco', label: 'Acre' },
  { value: 'America/Noronha', label: 'Fernando de Noronha' },
]

export function timeZoneOptions(
  browserZone: string | undefined,
): { value: string; label: string }[] {
  if (!browserZone || LIVE_TIME_ZONES.some((zone) => zone.value === browserZone))
    return [...LIVE_TIME_ZONES]
  return [...LIVE_TIME_ZONES, { value: browserZone, label: `${browserZone} (este computador)` }]
}

/** Quanto o fuso está à frente do UTC naquele instante, em ms (negativo no Brasil). */
function zoneOffset(instant: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(instant))
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value)
  const asUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second'),
  )
  return asUtc - instant
}

/**
 * `2026-10-17T15:00` (o valor de um `datetime-local`) lido no fuso da turma → ISO em UTC.
 * `null` quando o texto não é uma data. ⚠️ Não usa `new Date(local)`: ele lê no fuso do
 * COMPUTADOR, e a turma pode ser de outro fuso.
 */
export function zonedLocalToUtcIso(local: string, timeZone: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local.trim())
  if (!match) return null
  const [, y, mo, d, h, mi] = match.map(Number) as [number, number, number, number, number, number]
  const wall = Date.UTC(y, mo - 1, d, h, mi)
  if (Number.isNaN(wall)) return null
  let instant = wall - zoneOffset(wall, timeZone)
  // Perto de uma troca de horário o offset do palpite pode ser o do outro lado: confere de novo.
  const second = zoneOffset(instant, timeZone)
  if (wall - second !== instant) instant = wall - second
  return new Date(instant).toISOString()
}

export type ScheduleResult =
  | { ok: true; schedule: { startsAt: string; endsAt: string }[] }
  | { ok: false; error: string }

/**
 * Os horários digitados (um par início/fim por aula publicada) → o `schedule` da turma. Diz o
 * encontro e o que consertar: fim antes do início, ou um encontro que começa antes do anterior
 * terminar (as aulas são na ordem do curso).
 */
export function buildSchedule(
  entries: readonly { start: string; end: string }[],
  timeZone: string,
): ScheduleResult {
  if (!entries.length)
    return { ok: false, error: 'Publique ao menos uma aula do curso para marcar os encontros.' }
  const schedule: { startsAt: string; endsAt: string }[] = []
  for (const [index, entry] of entries.entries()) {
    const startsAt = zonedLocalToUtcIso(entry.start, timeZone)
    const endsAt = zonedLocalToUtcIso(entry.end, timeZone)
    if (!startsAt || !endsAt)
      return { ok: false, error: `Informe o início e o fim do encontro ${index + 1}.` }
    if (Date.parse(endsAt) <= Date.parse(startsAt))
      return {
        ok: false,
        error: `No encontro ${index + 1}, o fim da chamada precisa ser depois do início.`,
      }
    const previous = schedule.at(-1)
    if (previous && Date.parse(startsAt) < Date.parse(previous.endsAt))
      return {
        ok: false,
        error: `O encontro ${index + 1} começa antes do fim do encontro ${index}. Os encontros seguem a ordem das aulas do curso.`,
      }
    schedule.push({ startsAt, endsAt })
  }
  return { ok: true, schedule }
}

/** As turmas de cada curso ao vivo; as que não são de nenhum curso listado ficam à parte. */
export function cohortsByCourse(
  courses: readonly LiveCourseSummary[],
  cohorts: readonly LiveCohort[],
): { byCourse: Map<string, LiveCohort[]>; others: LiveCohort[] } {
  const byCourse = new Map<string, LiveCohort[]>(courses.map((course) => [course.id, []]))
  const others: LiveCohort[] = []
  for (const cohort of cohorts) {
    const list = cohort.courseId ? byCourse.get(cohort.courseId) : undefined
    if (list) list.push(cohort)
    else others.push(cohort)
  }
  return { byCourse, others }
}

/** Junta duas páginas do catálogo sem repetir (a última versão de cada item vence). */
export function mergeById<T extends { id: string }>(previous: readonly T[], next: readonly T[]) {
  return [...new Map([...previous, ...next].map((item) => [item.id, item])).values()]
}
