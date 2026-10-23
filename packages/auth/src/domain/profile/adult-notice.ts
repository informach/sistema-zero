import { saoPauloDayKey } from '@sistemazero/core/time'

/**
 * Aviso aos responsáveis quando um perfil Kids completa 18 anos. Regra de produto: o perfil
 * NUNCA é cortado (um perfil válido não perde acesso ao completar 18 anos — ver
 * `ProfileAggregate.setBirthDate`); só o responsável recebe UM e-mail apontando a área adulta.
 *
 * Datas são dias civis `YYYY-MM-DD`. "Hoje" é o dia civil de São Paulo, a mesma régua da
 * idade no agregado (`assertBirthDate`).
 */
export const ADULT_AGE = 18

/**
 * Quantos dias para trás um aniversário de 18 anos ainda gera o aviso. Cobre o job atrasado,
 * um dia sem rodar e deploys; e impede avisar quem fez 18 anos muito antes de o recurso existir.
 */
export const ADULT_NOTICE_LOOKBACK_DAYS = 7

const DAY_MS = 86_400_000
const DAY_KEY = /^(\d{4})-(\d{2})-(\d{2})$/

function parseDayKey(value: string): { year: number; month: number; day: number } | null {
  const match = DAY_KEY.exec(value)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const utc = new Date(Date.UTC(year, month - 1, day))
  // Rejeita datas que o Date normalizaria (ex.: 2020-02-31).
  if (utc.getUTCFullYear() !== year || utc.getUTCMonth() !== month - 1 || utc.getUTCDate() !== day)
    return null
  return { year, month, day }
}

function toDayKey(utcMs: number): string {
  return new Date(utcMs).toISOString().slice(0, 10)
}

function addDays(dayKey: string, days: number): string {
  return toDayKey(Date.parse(`${dayKey}T00:00:00Z`) + days * DAY_MS)
}

/**
 * Dia civil em que quem nasceu em `birthDate` completa 18 anos. Nascido em 29/02: num ano
 * sem 29/02 o aniversário é 01/03 — a mesma conta de `assertBirthDate` (em 28/02 a pessoa
 * ainda não fez aniversário; em 01/03 já fez). `null` para data ilegível.
 */
export function adultBirthday(birthDate: string): string | null {
  const parsed = parseDayKey(birthDate)
  if (!parsed) return null
  // Date.UTC normaliza 29/02 inexistente para 01/03.
  return toDayKey(Date.UTC(parsed.year + ADULT_AGE, parsed.month - 1, parsed.day))
}

/** Primeiro dia (inclusive) da janela de aviso que termina em `today`. */
export function adultNoticeWindowStart(
  today: string,
  lookbackDays = ADULT_NOTICE_LOOKBACK_DAYS,
): string {
  return addDays(today, -lookbackDays)
}

/**
 * O aviso é devido quando o 18º aniversário caiu entre `today - lookbackDays` e `today`
 * (inclusive). Sem data de nascimento (ou ilegível) nunca é devido.
 */
export function isAdultNoticeDue(
  birthDate: string | null,
  today: string,
  lookbackDays = ADULT_NOTICE_LOOKBACK_DAYS,
): boolean {
  if (!birthDate) return false
  const birthday = adultBirthday(birthDate)
  if (!birthday) return false
  return birthday <= today && birthday >= adultNoticeWindowStart(today, lookbackDays)
}

/**
 * Faixa EXATA de datas de nascimento (inclusive) cujo 18º aniversário cai na janela que
 * termina em `today`. `adultBirthday` é monótona, então a pré-imagem da janela é uma faixa
 * contígua — é ela que vai ao SQL (`birth_date between from and to`).
 */
export function adultNoticeBirthDateRange(
  today: string,
  lookbackDays = ADULT_NOTICE_LOOKBACK_DAYS,
): { from: string; to: string } {
  const windowStart = adultNoticeWindowStart(today, lookbackDays)
  return {
    from: firstBirthDateReaching(windowStart),
    to: lastBirthDateReaching(today),
  }
}

/** Menor data de nascimento com 18º aniversário >= `day`. */
function firstBirthDateReaching(day: string): string {
  let candidate = sameDayYearsBefore(day)
  // 29/02 alvo num ano bissexto: o "mesmo dia" 18 anos antes não existe e o clamp cai em
  // 28/02, cujo aniversário fica antes do alvo → avança.
  while (birthdayOfValid(candidate) < day) candidate = addDays(candidate, 1)
  // 01/03 alvo: quem nasceu em 29/02 (ano bissexto) também faz 18 anos em 01/03 → recua.
  while (birthdayOfValid(addDays(candidate, -1)) >= day) candidate = addDays(candidate, -1)
  return candidate
}

/** Maior data de nascimento com 18º aniversário <= `day`. */
function lastBirthDateReaching(day: string): string {
  let candidate = sameDayYearsBefore(day)
  while (birthdayOfValid(candidate) > day) candidate = addDays(candidate, -1)
  while (birthdayOfValid(addDays(candidate, 1)) <= day) candidate = addDays(candidate, 1)
  return candidate
}

/** `adultBirthday` de uma data sabidamente válida (as geradas aqui). */
function birthdayOfValid(day: string): string {
  const birthday = adultBirthday(day)
  if (!birthday) throw new Error(`Dia civil inválido: ${day}`)
  return birthday
}

/** Mesmo dia/mês 18 anos antes, limitado ao último dia do mês (29/02 → 28/02). */
function sameDayYearsBefore(day: string): string {
  const parsed = parseDayKey(day)
  if (!parsed) throw new Error(`Dia civil inválido: ${day}`)
  const year = parsed.year - ADULT_AGE
  const lastDayOfMonth = new Date(Date.UTC(year, parsed.month, 0)).getUTCDate()
  return toDayKey(Date.UTC(year, parsed.month - 1, Math.min(parsed.day, lastDayOfMonth)))
}

/** Dia civil de São Paulo de `now` (o "hoje" do job). */
export function adultNoticeToday(now: Date): string {
  return saoPauloDayKey(now)
}
