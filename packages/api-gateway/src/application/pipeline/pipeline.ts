import { envelope } from '@sistemazero/core/http'
import type { GatewayContext, Stage } from './stage.port'

export interface Pipeline {
  run(ctx: GatewayContext): Promise<Response>
}

/**
 * Executa a cadeia (Chain of Responsibility):
 *  - `stages`: rodam em ordem; a 1ª Response curto-circuita (vira `ctx.response`);
 *  - `finalizers`: rodam SEMPRE (mesmo após curto-circuito) — transformam a
 *    resposta, mesclam headers e logam. Um finalizer que lança não derruba a resposta.
 * Ao final, mescla `ctx.responseHeaders` na Response e a retorna.
 */
export function createPipeline(stages: readonly Stage[], finalizers: readonly Stage[]): Pipeline {
  return {
    async run(ctx: GatewayContext): Promise<Response> {
      try {
        for (const stage of stages) {
          const outcome = await stage.run(ctx)
          if (outcome instanceof Response) {
            ctx.response = outcome
            break
          }
          if (ctx.response) break
        }
      } catch (error) {
        // Exceção INESPERADA num stage não pode pular os finalizers (log/métricas/
        // refund). Vira 500 e segue para o pós-processamento.
        ctx.logger.error('pipeline.stage_failed', {
          requestId: ctx.requestId,
          route: ctx.route?.route.id,
          error: error instanceof Error ? error.message : String(error),
        })
        ctx.response = new Response(
          JSON.stringify(envelope('INTERNAL_ERROR', 'Erro interno do gateway')),
          {
            status: 500,
            headers: { 'content-type': 'application/json' },
          },
        )
      }

      if (!ctx.response) {
        ctx.response = new Response(
          JSON.stringify(envelope('INTERNAL_ERROR', 'Pipeline sem resposta')),
          {
            status: 500,
            headers: { 'content-type': 'application/json' },
          },
        )
      }

      for (const finalizer of finalizers) {
        try {
          await finalizer.run(ctx)
        } catch (error) {
          ctx.logger.error('pipeline.finalizer_failed', {
            stage: finalizer.name,
            requestId: ctx.requestId,
            error: error instanceof Error ? error.message : String(error),
          })
        }
      }

      return mergeResponseHeaders(ctx.response, ctx.responseHeaders)
    },
  }
}

/** Mescla os headers acumulados em `ctx.responseHeaders` na resposta final. */
function mergeResponseHeaders(response: Response, extra: Headers): Response {
  let count = 0
  extra.forEach(() => {
    count++
  })
  if (count === 0) return response
  const headers = new Headers(response.headers)
  extra.forEach((value, key) => {
    headers.set(key, value)
  })
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}
