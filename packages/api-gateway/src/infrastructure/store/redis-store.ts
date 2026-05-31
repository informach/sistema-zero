import { RedisClient } from 'bun'
import type {
  BreakerCounters,
  GatewayStore,
  RateLimitHit,
  SlidingWindowHit,
} from '../../domain/ports/gateway-store.port'

// Cliente Redis NATIVO do Bun (não ioredis — que lança TypeError de socket sob o
// Bun e viraria unhandledRejection → shutdown). `send(cmd, args[])` p/ EVAL etc.

// Contador de janela fixa atômico (gate de tentativa do breaker): INCR + (PEXPIRE
// 1ª vez) + PTTL. O chamador cujo retorno for `count === 1` ganha o slot.
const INCR_LUA = `
local c = redis.call('INCR', KEYS[1])
if c == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
local ttl = redis.call('PTTL', KEYS[1])
return {c, ttl}
`

// Registra resultado do breaker ATOMICAMENTE: incrementa total e (em falha) fail
// na MESMA janela, devolvendo ambos. Evita o denominador inconsistente de dois
// INCR separados. ARGV[1]='1'(ok)/'0'(falha), ARGV[2]=windowMs.
const RECORD_OUTCOME_LUA = `
local total = redis.call('HINCRBY', KEYS[1], 't', 1)
local fail = tonumber(redis.call('HGET', KEYS[1], 'f')) or 0
if ARGV[1] == '0' then fail = redis.call('HINCRBY', KEYS[1], 'f', 1) end
if total == 1 then redis.call('PEXPIRE', KEYS[1], tonumber(ARGV[2])) end
return {total, fail}
`

// Sliding-window-counter atômico: rola a janela (prev/curr), incrementa e devolve
// a contagem ponderada (string p/ preservar fração) + fim da janela.
const SLIDING_LUA = `
local d = redis.call('HMGET', KEYS[1], 's', 'c', 'p')
local start = tonumber(d[1])
local curr = tonumber(d[2]) or 0
local prev = tonumber(d[3]) or 0
local win = tonumber(ARGV[1])
local now = tonumber(ARGV[2])
if not start then start = now; curr = 0; prev = 0 end
local elapsed = now - start
if elapsed >= win then
  local passed = math.floor(elapsed / win)
  if passed == 1 then prev = curr; curr = 0; start = start + win
  else prev = 0; curr = 0; start = now end
end
local e2 = now - start
local weight = (win - e2) / win
if weight < 0 then weight = 0 end
curr = curr + 1
redis.call('HMSET', KEYS[1], 's', start, 'c', curr, 'p', prev, 'w', win)
redis.call('PEXPIRE', KEYS[1], win * 2)
return {tostring(prev * weight + curr), tostring(start + win)}
`

// Refund da janela: só debita se a janela ainda for a mesma do hit original
// (ARGV[1] = resetMs; '' = sem checagem). Evita creditar a janela nova após rollover.
const SLIDING_REFUND_LUA = `
local c = tonumber(redis.call('HGET', KEYS[1], 'c'))
if not c or c <= 0 then return 0 end
if ARGV[1] ~= '' then
  local s = tonumber(redis.call('HGET', KEYS[1], 's')) or 0
  local w = tonumber(redis.call('HGET', KEYS[1], 'w')) or 0
  if (s + w) ~= tonumber(ARGV[1]) then return 0 end
end
redis.call('HINCRBY', KEYS[1], 'c', -1)
return 1
`

/**
 * GatewayStore sobre Redis (cliente nativo do Bun) — estado compartilhado entre
 * réplicas: rate limit global preciso (sliding-window via Lua atômico), cache de
 * sessão/JWKS e estado de circuit breaker.
 */
export function createRedisStore(url: string): GatewayStore {
  const client = new RedisClient(url)

  return {
    async init() {
      await client.connect()
    },

    async slidingWindow(key, windowMs, now): Promise<SlidingWindowHit> {
      const t = now ?? Date.now()
      const res = (await client.send('EVAL', [
        SLIDING_LUA,
        '1',
        key,
        String(windowMs),
        String(t),
      ])) as Array<string | number>
      return { count: Number(res?.[0] ?? 0), resetMs: Number(res?.[1] ?? t + windowMs) }
    },
    async slidingWindowRefund(key, windowResetMs) {
      await client.send('EVAL', [
        SLIDING_REFUND_LUA,
        '1',
        key,
        windowResetMs !== undefined ? String(windowResetMs) : '',
      ])
    },

    async increment(key, windowMs, now): Promise<RateLimitHit> {
      const t = now ?? Date.now()
      const res = (await client.send('EVAL', [INCR_LUA, '1', key, String(windowMs)])) as Array<
        string | number
      >
      const count = Number(res?.[0] ?? 0)
      const ttl = Number(res?.[1] ?? windowMs)
      const nextReset = t + (ttl >= 0 ? ttl : windowMs)
      return { count, nextReset, start: nextReset - windowMs }
    },

    async recordOutcome(key, ok, windowMs): Promise<BreakerCounters> {
      const res = (await client.send('EVAL', [
        RECORD_OUTCOME_LUA,
        '1',
        key,
        ok ? '1' : '0',
        String(windowMs),
      ])) as Array<string | number>
      return { total: Number(res?.[0] ?? 0), fail: Number(res?.[1] ?? 0) }
    },

    async reset(key) {
      if (key) await client.del(key)
    },
    async get<T>(key: string): Promise<T | null> {
      const v = await client.get(key)
      if (v == null) return null
      // Valor corrompido / escrito por outro componente: trate como ausência em
      // vez de propagar um throw de parse (que viraria 500/crash no chamador).
      try {
        return JSON.parse(v) as T
      } catch {
        return null
      }
    },
    async set<T>(key: string, value: T, ttlMs: number) {
      await client.send('SET', [key, JSON.stringify(value), 'PX', String(ttlMs)])
    },
    async del(key) {
      await client.del(key)
    },
    async kill() {
      client.close()
    },
  }
}
