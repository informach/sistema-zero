import 'server-only'
import { createStudioPythonLanguageRoutes } from '@sistemazero/member-shell/server/python-language-routes'
import { getEnv } from '@/lib/env'
import { gatewayFetch } from './gateway'
import { requireLocalAdminSession } from './local-admin-session'

/** Authoring only: identity comes from the Admin cookie and Members checks the current draft. */
export const studioPythonLanguageRoutes = createStudioPythonLanguageRoutes(
  {
    requireUploadSession: (request) =>
      requireLocalAdminSession('Sem permissão para analisar o projeto de autoria.', {
        allowStaff: true,
        signal: request.signal,
      }),
  },
  {
    contextKinds: ['authoring'],
    environment: getEnv,
    members: {
      authorizePythonAnalysis: (input, options) =>
        gatewayFetch('/members/studio/python-analysis', {
          method: 'POST',
          body: input,
          signal: options?.signal,
        }),
    },
  },
)
