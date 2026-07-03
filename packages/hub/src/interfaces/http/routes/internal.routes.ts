import { PayloadTooLargeError } from '@sistemazero/core/http'
import { Elysia } from 'elysia'
import type { ShowcaseService } from '../../../application/showcase/showcase.service'
import { ValidationError } from '../../../domain/shared/errors'
import { ShowcaseByAuthorsBody } from '../dtos'
import { getRawBody, isOversizeBody } from '../raw-body'
import { assertWebhookSignature } from '../webhook-auth'

export interface InternalRoutesDeps {
  showcase: ShowcaseService
  webhookSecret: string
  toleranceSeconds: number
}

/** Janela máxima da consulta (report é semanal; um range gigante seria abuso). */
const MAX_WINDOW_MS = 45 * 86_400_000

function parseIsoDate(raw: string, field: string): Date {
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) throw new ValidationError(`${field} inválido (ISO-8601)`)
  return d
}

/**
 * Rotas S2S DIRETAS members→hub, autenticadas por HMAC sobre o corpo BRUTO
 * (`GATEWAY_HMAC_SECRET`, mesmo canônico dos webhooks — o members já assina com
 * ele). ⚠️ `showcase-by-authors` NUNCA é exposta no gateway: devolve os playIds
 * dos filhos de uma conta — na borda vazaria jogos entre famílias. O members é
 * quem garante que os `authorIds` pedidos são os perfis da conta do report.
 */
export function internalRoutes(deps: InternalRoutesDeps) {
  const verify = ({
    request,
    headers,
  }: {
    request: Request
    headers: Record<string, string | undefined>
  }) => {
    if (isOversizeBody(request)) throw new PayloadTooLargeError()
    assertWebhookSignature({
      secret: deps.webhookSecret,
      method: request.method,
      path: new URL(request.url).pathname,
      rawBody: getRawBody(request),
      signatureHeader: headers['x-signature'],
      toleranceSeconds: deps.toleranceSeconds,
    })
  }

  return new Elysia({ prefix: '/hub/internal' }).onTransform(verify).post(
    '/showcase-by-authors',
    async ({ body }) => {
      const from = parseIsoDate(body.from, 'from')
      const to = parseIsoDate(body.to, 'to')
      if (to.getTime() <= from.getTime() || to.getTime() - from.getTime() > MAX_WINDOW_MS) {
        throw new ValidationError('janela inválida')
      }
      const items = await deps.showcase.showcaseByAuthors(body.authorIds, from, to)
      return {
        items: items.map((i) => ({
          authorId: i.authorId,
          title: i.title,
          playId: i.playId,
          createdAt: i.createdAt.toISOString(),
        })),
      }
    },
    { body: ShowcaseByAuthorsBody },
  )
}
