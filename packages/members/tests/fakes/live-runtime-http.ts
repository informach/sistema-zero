import { Elysia } from 'elysia'
import type { LiveWorkspaceService } from '../../src/application/live/live-workspace.service'
import type { AuthorizeLiveRuntimeService } from '../../src/application/studio/authorize-live-runtime.service'
import { buildErrorResponse } from '../../src/interfaces/http/error-handler'
import { liveWorkspaceRoutes } from '../../src/interfaces/http/routes/live-workspaces.routes'
import { silentLogger } from './in-memory'

export function liveRuntimeHttpFixture(
  workspace: LiveWorkspaceService,
  runtime: AuthorizeLiveRuntimeService,
  internalToken: string,
) {
  return new Elysia()
    .onError({ as: 'global' }, ({ code, error, set }) => {
      const response = buildErrorResponse({ code, error, logger: silentLogger })
      set.status = response.status
      return response.body
    })
    .use(liveWorkspaceRoutes({ workspace, runtime, internalToken, requireAdminEnabled: true }))
}
