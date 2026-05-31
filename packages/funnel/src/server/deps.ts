import { getDb } from '../db/client'
import { createFunnelRepo, type FunnelRepo } from '../db/repo'
import { type Env, getEnv } from '../lib/env'
import { createGatewayClient, type GatewayClient } from '../lib/gateway-client'

export interface Deps {
  repo: FunnelRepo
  env: Env
  gateway: GatewayClient
}

let cached: Deps | undefined

/** Dependências reais (repo + env + cliente do gateway), montadas uma vez e
 *  cacheadas como singleton — o pool do Postgres deve ser reutilizado entre requests. */
export function getDeps(): Deps {
  if (!cached) {
    const env = getEnv()
    cached = {
      env,
      repo: createFunnelRepo(getDb()),
      gateway: createGatewayClient({
        baseUrl: env.GATEWAY_URL,
        consumerId: env.FUNNEL_CONSUMER_ID,
        hmacSecret: env.FUNNEL_HMAC_SECRET,
      }),
    }
  }
  return cached
}
