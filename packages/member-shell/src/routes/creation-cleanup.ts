import 'server-only'
import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { getEnv } from '../lib/env'
import type { GatewayModule } from '../server/gateway'
import { r2DeleteUgcPrefixes } from '../server/r2'

interface CleanupJob {
  id: string
  accountId: string
  userIds: string[]
  prefixes: string[]
  attempts: number
}

function authorized(request: Request, expected: string): boolean {
  const value = request.headers.get('authorization')
  if (!value?.startsWith('Bearer ')) return false
  const provided = Buffer.from(value.slice('Bearer '.length))
  const wanted = Buffer.from(expected)
  return provided.length === wanted.length && timingSafeEqual(provided, wanted)
}

/** Worker HTTP para um scheduler: claim distribuído no Members, limpeza no R2, ack durável. */
export function createCreationCleanupWorkerRoutes(deps: {
  gateway: GatewayModule
  deletePrefixes?: typeof r2DeleteUgcPrefixes
}) {
  return {
    creationCleanupWorker: {
      POST: async (request: Request) => {
        const secret = getEnv().CREATION_CLEANUP_CRON_SECRET
        if (!secret) {
          return NextResponse.json(
            { error: { code: 'SERVICE_UNAVAILABLE', message: 'Worker não configurado.' } },
            { status: 503 },
          )
        }
        if (!authorized(request, secret)) {
          return NextResponse.json(
            { error: { code: 'UNAUTHORIZED', message: 'Credencial inválida.' } },
            { status: 401 },
          )
        }

        let completed = 0
        let failed = 0
        for (let index = 0; index < 25; index += 1) {
          const claimed = await deps.gateway.gatewayFetchHmac<{ job?: CleanupJob }>(
            '/members/internal/creation-cleanups/claim',
            { method: 'POST' },
          )
          if (claimed.status === 204) break
          const job = claimed.body?.job
          if (claimed.status >= 400 || !job) {
            return NextResponse.json(
              { completed, failed, upstreamStatus: claimed.status },
              { status: 502 },
            )
          }
          try {
            await (deps.deletePrefixes ?? r2DeleteUgcPrefixes)(job.prefixes)
            const finalizeBody = { accountId: job.accountId, userIds: job.userIds }
            for (const path of [
              '/hub/internal/account-deletion/finalize',
              '/members/internal/account-deletion/finalize',
            ]) {
              const finalized = await deps.gateway.gatewayFetchHmac(path, {
                method: 'POST',
                body: finalizeBody,
              })
              if (finalized.status >= 400) throw new Error(`finalize ${path} ${finalized.status}`)
            }
            const ack = await deps.gateway.gatewayFetchHmac(
              `/members/internal/creation-cleanups/${encodeURIComponent(job.id)}/complete`,
              { method: 'POST' },
            )
            if (ack.status >= 400) throw new Error(`ack ${ack.status}`)
            completed += 1
          } catch (error) {
            failed += 1
            const message = error instanceof Error ? error.message : 'Falha desconhecida'
            await deps.gateway.gatewayFetchHmac(
              `/members/internal/creation-cleanups/${encodeURIComponent(job.id)}/fail`,
              { method: 'POST', body: { error: message, attempts: job.attempts } },
            )
          }
        }
        return NextResponse.json({ completed, failed })
      },
    },
  }
}
