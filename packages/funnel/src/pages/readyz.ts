import type { APIRoute } from 'astro'
import { sql } from 'drizzle-orm'
import { getDb } from '../db/client'

export const prerender = false

/**
 * Readiness (healthcheck de DEPLOY, padrão do monorepo): pronto = banco
 * respondendo. `/health` segue como liveness puro (sempre 200). O ping tem teto
 * próprio de 5s — um Postgres pendurado não pode segurar o healthcheck.
 */
export const GET: APIRoute = async () => {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    await Promise.race([
      getDb().execute(sql`select 1`),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('db ping timeout')), 5_000)
      }),
    ])
    return new Response(JSON.stringify({ status: 'ready' }), {
      headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    })
  } catch {
    return new Response(JSON.stringify({ status: 'unavailable' }), {
      status: 503,
      headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    })
  } finally {
    if (timer) clearTimeout(timer)
  }
}
