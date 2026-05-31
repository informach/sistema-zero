import type { Logger } from '@sistemazero/core/logging'
import type { LoadBalancer, UpstreamTarget } from '../../domain/load-balancing/load-balancer.port'
import type { Forwarder } from '../../domain/proxy/forwarder.port'
import type { CircuitBreaker } from '../../domain/resilience/circuit-breaker.port'
import type { HealthRegistry } from '../../domain/resilience/health.port'
import { isIdempotent } from '../../domain/resilience/retry-policy'
import type { HttpMethod } from '../../domain/routing/route'
import type { UpstreamStats } from '../load-balancing/upstream-stats'
import { backoffDelayMs, RETRYABLE_STATUSES, sleep } from '../resilience/retry-executor'
import { sanitizeResponseHeaders } from './header-rules'
import { idleTimeoutStream } from './stream-guards'
import { type UpstreamErrorKind, upstreamErrorResponse } from './upstream-error'

export interface ProxyInput {
  serviceId: string
  targets: readonly UpstreamTarget[]
  lb: LoadBalancer
  method: HttpMethod
  path: string
  headers: Headers
  body: RequestInit['body']
  stickyKey?: string
  timeoutMs: number
  retry: {
    maxRetries: number
    baseDelayMs: number
    maxDelayMs: number
    /** Timeout por tentativa; default = `timeoutMs`. Capado pelo budget restante. */
    perTryTimeoutMs?: number
    budgetMs?: number
  }
  requestId: string
}

/** Resultado do proxy: a resposta + observabilidade (destino escolhido, nº de tentativas). */
export interface ProxyResult {
  response: Response
  targetId?: string
  attempts: number
}

export interface ProxyEngineDeps {
  forwarder: Forwarder
  health: HealthRegistry
  stats: UpstreamStats
  breaker: CircuitBreaker
  logger: Logger
}

/**
 * Orquestra o encaminhamento (Proxy): escolhe destino (LB) → circuit breaker →
 * timeout por tentativa → encaminha (stream) → registra saúde/stats/breaker →
 * decide retry (só métodos idempotentes, re-escolhendo o destino). Mitiga SPOF
 * (ejeta/contorna instâncias ruins) e protege a latência (timeout + budget).
 */
export class ProxyEngine {
  constructor(private readonly deps: ProxyEngineDeps) {}

  async proxy(input: ProxyInput): Promise<ProxyResult> {
    const {
      serviceId,
      targets,
      lb,
      method,
      path,
      headers,
      body,
      stickyKey,
      timeoutMs,
      retry,
      requestId,
    } = input
    const bodyRetryable = body == null || typeof body === 'string'
    const maxAttempts = isIdempotent(method) && bodyRetryable ? retry.maxRetries + 1 : 1
    const start = Date.now()
    // Timeout por tentativa: explícito (perTryTimeoutMs) ou o timeout do serviço.
    const perTry = retry.perTryTimeoutMs ?? timeoutMs
    let lastError: UpstreamErrorKind = 'bad_gateway'
    let lastTargetId: string | undefined

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Capa o timeout desta tentativa pelo budget restante → a latência ponta-a-ponta
      // fica limitada por budgetMs (não só os sleeps de backoff).
      const attemptTimeout =
        retry.budgetMs !== undefined
          ? Math.min(perTry, retry.budgetMs - (Date.now() - start))
          : perTry
      if (attemptTimeout <= 0) {
        lastError = 'timeout'
        break
      }

      const healthy = targets.filter((t) => this.deps.health.isHealthy(t.id))
      const pool = healthy.length > 0 ? healthy : targets // fail-open se todos ejetados
      const target = lb.pick({ healthy: pool, stickyKey, stats: this.deps.stats })
      if (!target)
        return { response: upstreamErrorResponse('no_target', requestId), attempts: attempt }
      lastTargetId = target.id

      const decision = await this.deps.breaker.beforeCall(serviceId, target.id)
      if (!decision.allow) {
        lastError = 'open_circuit'
        this.deps.logger.warn('proxy.attempt_failed', {
          serviceId,
          requestId,
          target: target.id,
          attempt: attempt + 1,
          reason: 'open_circuit',
        })
        if (attempt < maxAttempts - 1) continue
        break
      }

      const ctrl = new AbortController()
      const to = setTimeout(() => ctrl.abort(), attemptTimeout)
      to.unref?.()
      // Relógio MONOTÔNICO para medir latência (imune a ajustes de NTP/wall-clock).
      const t0 = performance.now()
      this.deps.stats.begin(target.id)
      try {
        const upstream = await this.deps.forwarder.forward({
          method,
          target,
          path,
          headers,
          body,
          signal: ctrl.signal,
        })
        this.deps.stats.end(target.id, performance.now() - t0)
        const ok = upstream.status < 500
        if (ok) this.deps.health.recordSuccess(target.id)
        else this.deps.health.recordFailure(target.id)
        await this.deps.breaker.onResult(serviceId, target.id, ok, decision.token)

        if (RETRYABLE_STATUSES.has(upstream.status) && attempt < maxAttempts - 1) {
          lastError = upstream.status === 504 ? 'timeout' : 'bad_gateway'
          if (await this.maybeBackoff(attempt, retry, start)) {
            this.deps.logger.warn('proxy.attempt_failed', {
              serviceId,
              requestId,
              target: target.id,
              attempt: attempt + 1,
              status: upstream.status,
            })
            void upstream.body?.cancel()
            continue
          }
        }
        // Sucesso (ou erro não-retentável): repassa a resposta streamada, com idle
        // timeout no CORPO (o timeout de conexão cobre só os headers). Usa `perTry`
        // (não o valor capado por budget — o corpo já está fluindo, não é retry).
        const stream =
          upstream.body && perTry > 0
            ? idleTimeoutStream(upstream.body, perTry, () => ctrl.abort())
            : upstream.body
        const response = new Response(stream, {
          status: upstream.status,
          statusText: upstream.statusText,
          headers: withRequestId(sanitizeResponseHeaders(upstream.headers), requestId),
        })
        return { response, targetId: target.id, attempts: attempt + 1 }
      } catch {
        this.deps.stats.end(target.id, performance.now() - t0)
        this.deps.health.recordFailure(target.id)
        await this.deps.breaker.onResult(serviceId, target.id, false, decision.token)
        lastError = ctrl.signal.aborted ? 'timeout' : 'connect'
        if (attempt < maxAttempts - 1 && (await this.maybeBackoff(attempt, retry, start))) {
          this.deps.logger.warn('proxy.attempt_failed', {
            serviceId,
            requestId,
            target: target.id,
            attempt: attempt + 1,
            reason: lastError,
          })
          continue
        }
        break
      } finally {
        clearTimeout(to)
      }
    }

    this.deps.logger.warn('proxy.exhausted', {
      serviceId,
      requestId,
      reason: lastError,
      attempts: maxAttempts,
    })
    return {
      response: upstreamErrorResponse(lastError, requestId),
      targetId: lastTargetId,
      attempts: maxAttempts,
    }
  }

  /** Aplica backoff se ainda couber no budget; retorna false se o budget estourou. */
  private async maybeBackoff(
    attempt: number,
    retry: ProxyInput['retry'],
    start: number,
  ): Promise<boolean> {
    const delay = backoffDelayMs(attempt, retry.baseDelayMs, retry.maxDelayMs)
    if (retry.budgetMs !== undefined && Date.now() - start + delay > retry.budgetMs) return false
    await sleep(delay)
    return true
  }
}

function withRequestId(headers: Headers, requestId: string): Headers {
  if (!headers.has('x-request-id')) headers.set('x-request-id', requestId)
  return headers
}
