import { Elysia } from 'elysia'
import type { AiCopyService } from '../../../application/ai/ai-copy.service'
import { assertInternalCaller, requireStaff } from '../auth'
import { AiCaptionBody, AiScriptBody } from '../dtos'

export interface AiRoutesDeps {
  ai: AiCopyService
  internalToken?: string
  requireStaffEnabled: boolean
}

/**
 * IA da copy (F5): gera/melhora legenda e roteiro no padrão Light Copy. As
 * rotas de escrita NÃO mudam o banco — só leem o conteúdo e devolvem sugestão
 * (a pessoa revisa e salva pelo fluxo normal). `GET /status` deixa o front
 * esconder os botões quando não há chave configurada.
 */
export function aiRoutes(deps: AiRoutesDeps) {
  return new Elysia()
    .onBeforeHandle(({ headers }) => {
      assertInternalCaller(headers['x-internal-token'], deps.internalToken)
      requireStaff(headers, deps.requireStaffEnabled)
    })
    .get('/marketing/ai/status', () => ({ configured: deps.ai.isConfigured() }))
    .post(
      '/marketing/ai/caption',
      ({ body }) =>
        deps.ai.caption({
          contentId: body.contentId,
          format: body.format,
          mode: body.mode,
          caption: body.caption,
        }),
      { body: AiCaptionBody },
    )
    .post(
      '/marketing/ai/script',
      ({ body }) =>
        deps.ai.script({
          contentId: body.contentId,
          mode: body.mode,
          script: body.script,
          instruction: body.instruction,
        }),
      { body: AiScriptBody },
    )
}
