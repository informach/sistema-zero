import { getDb } from '../db/client'
import { createFunnelRepo, type FunnelRepo } from '../db/repo'
import { startWebhookRetention } from '../db/retention'
import { type Env, getEnv } from '../lib/env'
import { createGatewayClient, type GatewayClient } from '../lib/gateway-client'
import { initSentry, mirrorErrorEvent } from '../lib/sentry'

export interface Deps {
  repo: FunnelRepo
  env: Env
  gateway: GatewayClient
  /** Log de diagnóstico (stderr) p/ os handlers que aceitam `log?:` via deps. */
  log: (msg: string, meta?: Record<string, unknown>) => void
}

let cached: Deps | undefined

/** Dependências reais (repo + env + cliente do gateway), montadas uma vez e
 *  cacheadas como singleton — o pool do Postgres deve ser reutilizado entre requests. */
export function getDeps(): Deps {
  if (!cached) {
    const env = getEnv()
    // Em produção o init real acontece no boot (`scripts/start.mjs`); aqui é o
    // fallback p/ dev (`astro dev`) — idempotente quando o wrapper já iniciou.
    initSentry({
      dsn: env.SENTRY_DSN,
      environment: env.NODE_ENV,
      release: process.env.RAILWAY_GIT_COMMIT_SHA,
    })
    cached = {
      env,
      repo: createFunnelRepo(getDb()),
      gateway: createGatewayClient({
        baseUrl: env.GATEWAY_URL,
        consumerId: env.FUNNEL_CONSUMER_ID,
        hmacSecret: env.FUNNEL_HMAC_SECRET,
      }),
      log: (msg, meta) => {
        console.error(msg, meta ?? '')
        // Convenção do monorepo: evento `*_error`/`*_failed` é sinal alertável →
        // espelha no Sentry (issue por nome). Sucessos (welcome.sent, grant.done…)
        // ficam só no stderr.
        if (/(error|failed)$/.test(msg)) mirrorErrorEvent(msg, meta)
      },
    }
    // Limpeza periódica do dedupe de webhooks (1x por processo, advisory lock).
    startWebhookRetention(getDb(), cached.log)
  }
  return cached
}
