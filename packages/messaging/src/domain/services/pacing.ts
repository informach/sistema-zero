/**
 * Ritmo de envio do WhatsApp (anti-ban) — funções PURAS. A Evolution usa o
 * protocolo do WhatsApp Web (não-oficial), então um número que dispara rápido/em
 * volume é banido. Aqui está a política, isolada e testável (recebe relógio e RNG):
 *
 *  - Cada número (instância) é uma "lane" SERIALIZADA: só envia de novo quando
 *    `now >= nextAvailableAt`.
 *  - Entre mensagens há um delay ALEATÓRIO em [minDelayMs, maxDelayMs] (jitter →
 *    não parece robô disparando de X em X segundos).
 *  - Após `restAfterN` envios, um DESCANSO maior (`restDurationMs`) simula uma
 *    pessoa fazendo uma pausa.
 *  - Teto DIÁRIO por número (`dailyCap`), com reset quando vira o dia (UTC).
 *  - AQUECIMENTO: número novo começa com teto baixo (`warmupStartCap`) e sobe
 *    linearmente até `dailyCap` ao longo de `warmupDays`.
 *
 * O worker apenas orquestra; toda a aritmética de tempo/contadores está aqui.
 */
import type { Rng } from '../ports/rng.port'

export interface PacingConfig {
  minDelayMs: number
  maxDelayMs: number
  restAfterN: number
  restDurationMs: number
  warmupDays: number
  warmupStartCap: number
}

/** Snapshot do estado de ritmo de uma lane (número). */
export interface LaneState {
  enabled: boolean
  status: 'CONNECTED' | 'DISCONNECTED' | 'PAUSED' | 'BANNED'
  dailyCap: number
  sentToday: number
  /** Dia (UTC, 'YYYY-MM-DD') ao qual `sentToday` se refere; null = nunca enviou. */
  dayCursor: string | null
  messagesSinceRest: number
  nextAvailableAt: Date
  warmupStartedAt: Date | null
}

/** Campos de ritmo atualizados após um envio bem-sucedido pela lane. */
export interface PacingUpdate {
  sentToday: number
  messagesSinceRest: number
  dayCursor: string
  nextAvailableAt: Date
}

const DAY_MS = 24 * 60 * 60 * 1000

/** Dia UTC ('YYYY-MM-DD') de um instante. */
export function utcDay(now: Date): string {
  return now.toISOString().slice(0, 10)
}

/**
 * Teto diário efetivo considerando o aquecimento. Sem `warmupStartedAt` → teto
 * cheio. Durante o aquecimento, sobe linearmente de `warmupStartCap` até `dailyCap`.
 */
export function effectiveDailyCap(lane: LaneState, config: PacingConfig, now: Date): number {
  if (!lane.warmupStartedAt) return lane.dailyCap
  const dayIndex = Math.floor((now.getTime() - lane.warmupStartedAt.getTime()) / DAY_MS)
  if (dayIndex >= config.warmupDays) return lane.dailyCap
  if (dayIndex <= 0) return Math.min(config.warmupStartCap, lane.dailyCap)
  const ramp =
    config.warmupStartCap + ((lane.dailyCap - config.warmupStartCap) * dayIndex) / config.warmupDays
  return Math.max(config.warmupStartCap, Math.min(lane.dailyCap, Math.round(ramp)))
}

/** Quantas mensagens a lane já enviou no dia de `now` (reseta ao virar o dia). */
function sentTodayAt(lane: LaneState, now: Date): number {
  return lane.dayCursor === utcDay(now) ? lane.sentToday : 0
}

/** Capacidade restante da lane hoje (>= 0). */
export function remainingToday(lane: LaneState, config: PacingConfig, now: Date): number {
  return Math.max(0, effectiveDailyCap(lane, config, now) - sentTodayAt(lane, now))
}

/**
 * A lane pode enviar AGORA? Habilitada, conectada, fora do intervalo de
 * delay/descanso e com cota diária restante.
 */
export function isLaneAvailable(lane: LaneState, config: PacingConfig, now: Date): boolean {
  if (!lane.enabled || lane.status !== 'CONNECTED') return false
  if (now.getTime() < lane.nextAvailableAt.getTime()) return false
  return remainingToday(lane, config, now) > 0
}

/**
 * Estado de ritmo após um envio bem-sucedido: incrementa contadores (resetando
 * no virar do dia), agenda o próximo envio com jitter e injeta o descanso quando
 * atinge `restAfterN`.
 */
export function computeNextLaneState(
  lane: LaneState,
  config: PacingConfig,
  now: Date,
  rng: Rng,
): PacingUpdate {
  const today = utcDay(now)
  const sameDay = lane.dayCursor === today
  const sentToday = (sameDay ? lane.sentToday : 0) + 1
  let messagesSinceRest = (sameDay ? lane.messagesSinceRest : 0) + 1

  let delay = rng.intBetween(config.minDelayMs, config.maxDelayMs)
  if (messagesSinceRest >= config.restAfterN) {
    delay += config.restDurationMs
    messagesSinceRest = 0
  }

  return {
    sentToday,
    messagesSinceRest,
    dayCursor: today,
    nextAvailableAt: new Date(now.getTime() + delay),
  }
}

export interface BackoffConfig {
  baseMs: number
  maxMs: number
}

/**
 * Próxima tentativa de uma mensagem que falhou de forma transitória: backoff
 * exponencial com "full jitter" (delay aleatório em [0, cap]), `cap` dobrando a
 * cada tentativa até `maxMs`. Vale para e-mail e WhatsApp.
 */
export function computeRetryAt(attempts: number, config: BackoffConfig, now: Date, rng: Rng): Date {
  const cap = Math.min(config.maxMs, config.baseMs * 2 ** Math.max(0, attempts))
  const delay = rng.intBetween(0, Math.max(0, Math.floor(cap)))
  return new Date(now.getTime() + delay)
}
