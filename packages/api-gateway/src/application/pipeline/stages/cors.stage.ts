import { isOriginAllowed } from '../../../infrastructure/config/cors.config'
import { errorResponse } from '../responses'
import type { Stage } from '../stage.port'

/**
 * Checagem de origem por rota (403 se não permitida). O preflight (OPTIONS) e os
 * headers CORS padrão são tratados pelo plugin @elysiajs/cors no onRequest.
 * Requisições sem header Origin (não-CORS) não são rejeitadas.
 */
export function createCorsStage(): Stage {
  return {
    name: 'cors',
    run(ctx) {
      const origins = ctx.route?.route.cors?.origins
      if (!origins || origins.length === 0) return undefined
      const origin = ctx.request.headers.get('origin')
      if (!isOriginAllowed(origin, origins)) {
        return errorResponse(403, 'CORS_FORBIDDEN', 'Origem não permitida para esta rota')
      }
      return undefined
    },
  }
}
