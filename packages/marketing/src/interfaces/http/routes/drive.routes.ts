import { Elysia } from 'elysia'
import type { DriveImportService } from '../../../application/media/drive.service'
import { assertInternalCaller, requireStaff, resolveActor } from '../auth'
import { DriveFilesQuery, MediaImportBody } from '../dtos'

export interface DriveRoutesDeps {
  drive: DriveImportService
  internalToken?: string
  requireStaffEnabled: boolean
}

/**
 * Google Drive: picker de arquivos + importação Drive→R2 (o asset nasce
 * `importing` e o media-transfer-worker faz o stream). Sem conta conectada →
 * 409 ACCOUNT_NOT_CONNECTED; OAuth não configurado → 503 OAUTH_NOT_CONFIGURED.
 */
export function driveRoutes(deps: DriveRoutesDeps) {
  return new Elysia()
    .onBeforeHandle(({ headers }) => {
      assertInternalCaller(headers['x-internal-token'], deps.internalToken)
      requireStaff(headers, deps.requireStaffEnabled)
    })
    .get(
      '/marketing/drive/files',
      ({ query }) => deps.drive.listFiles({ q: query.q, pageToken: query.pageToken }),
      { query: DriveFilesQuery },
    )
    .post(
      '/marketing/media/import',
      async ({ headers, body, set }) => {
        set.status = 201
        return deps.drive.import(resolveActor(headers), body)
      },
      { body: MediaImportBody },
    )
}
