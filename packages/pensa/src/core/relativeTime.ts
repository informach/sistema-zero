/**
 * "Editado há 2 dias" (11/09/2026, o cartão do plano das telas-modelo): o tempo desde a última
 * mudança, com o `Intl.RelativeTimeFormat` em pt-BR. Só DUAS palavras prontas: "agora" e "ontem"
 * (`numeric: 'auto'`); o resto é número ("há 2 dias", "há 1 semana"), porque o `auto` também
 * daria "anteontem", "semana passada" e "mês passado", que com o "Editado" na frente leem torto
 * ("Editado semana passada"). Puro: o `now` é parâmetro (os testes fixam).
 *
 * A régua dos degraus é a de quem lê: minutos até a hora, horas até o dia, dias até a semana,
 * semanas até o mês, meses até o ano. Data no futuro (relógio do aparelho atrasado) ou inválida
 * vira "agora", nunca "daqui a 3 minutos".
 */

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const WEEK = 7 * DAY
const MONTH = 30 * DAY
const YEAR = 365 * DAY

const words = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' })
const numbers = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'always' })

/** "agora", "há 5 minutos", "ontem", "há 2 semanas"… (sem o "Editado"). */
export function timeAgo(iso: string, now: number = Date.now()): string {
  const at = Date.parse(iso)
  const elapsed = Number.isFinite(at) ? now - at : 0
  if (elapsed < MINUTE) return words.format(0, 'second')
  if (elapsed < HOUR) return numbers.format(-Math.floor(elapsed / MINUTE), 'minute')
  if (elapsed < DAY) return numbers.format(-Math.floor(elapsed / HOUR), 'hour')
  if (elapsed < 2 * DAY) return words.format(-1, 'day')
  if (elapsed < WEEK) return numbers.format(-Math.floor(elapsed / DAY), 'day')
  if (elapsed < MONTH) return numbers.format(-Math.floor(elapsed / WEEK), 'week')
  if (elapsed < YEAR) return numbers.format(-Math.floor(elapsed / MONTH), 'month')
  return numbers.format(-Math.floor(elapsed / YEAR), 'year')
}

/** A linha do cartão: "Editado há 2 dias", "Editado ontem", "Editado agora". */
export function editedAgo(iso: string, now: number = Date.now()): string {
  return `Editado ${timeAgo(iso, now)}`
}
