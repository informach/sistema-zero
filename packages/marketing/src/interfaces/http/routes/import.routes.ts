import { Elysia } from 'elysia'
import type { ImportService } from '../../../application/workspace/import.service'
import { assertInternalCaller, requireStaff, resolveActor } from '../auth'
export interface ImportRoutesDeps {
  imports: ImportService
  internalToken: string
}
export function importRoutes(deps: ImportRoutesDeps) {
  return new Elysia({ prefix: '/marketing/workspace' })
    .onBeforeHandle(({ headers }) => {
      assertInternalCaller(headers['x-internal-token'], deps.internalToken)
      requireStaff(headers, true)
    })
    .get('/projects/:projectId/imports/:runId/coverage', ({ headers, params, query }) =>
      deps.imports.coverage(resolveActor(headers), params.projectId, params.runId, query),
    )
    .get('/projects/:projectId/import-sources/:sourceId/office-text', ({ headers, params }) =>
      deps.imports.officeText(resolveActor(headers), params.projectId, params.sourceId),
    )
    .post(
      '/projects/:projectId/import-sources/:sourceId/office-text',
      ({ headers, params, body }) =>
        deps.imports.extractOfficeText(
          resolveActor(headers),
          params.projectId,
          params.sourceId,
          body,
        ),
    )
    .put('/projects/:projectId/imports/:runId/decisions', ({ headers, params, body }) =>
      deps.imports.decideSource(resolveActor(headers), params.projectId, params.runId, body),
    )
    .get('/projects/:projectId/imports/:runId/compare', ({ headers, params, query }) =>
      deps.imports.delta(resolveActor(headers), params.projectId, params.runId, query),
    )
    .post('/projects/:projectId/imports/:runId/reconcile', ({ headers, params, body }) =>
      deps.imports.reconcile(resolveActor(headers), params.projectId, params.runId, body),
    )
    .get('/projects/:projectId/imports/:runId/release', ({ headers, params }) =>
      deps.imports.previewRelease(resolveActor(headers), params.projectId, params.runId),
    )
    .post('/projects/:projectId/imports/:runId/release', ({ headers, params, body }) =>
      deps.imports.release(resolveActor(headers), params.projectId, params.runId, body),
    )
    .get('/projects/:projectId/import-sources/:sourceId/calendar', ({ headers, params }) =>
      deps.imports.previewCalendar(resolveActor(headers), params.projectId, params.sourceId),
    )
    .get('/projects/:projectId/import-products', ({ headers, params }) =>
      deps.imports.productBindings(resolveActor(headers), params.projectId),
    )
    .get('/projects/:projectId/production-reports/:reportId/link', ({ headers, params }) =>
      deps.imports.previewProductionLink(resolveActor(headers), params.projectId, params.reportId),
    )
    .post('/projects/:projectId/production-reports/:reportId/link', ({ headers, params, body }) =>
      deps.imports.applyProductionLink(
        resolveActor(headers),
        params.projectId,
        params.reportId,
        body,
      ),
    )
    .put('/projects/:projectId/import-products', ({ headers, params, body }) =>
      deps.imports.bindProduct(resolveActor(headers), params.projectId, body),
    )
    .post('/projects/:projectId/import-calendars', ({ headers, params, body }) =>
      deps.imports.applyCalendar(resolveActor(headers), params.projectId, body),
    )
    .get('/projects/:projectId/import-sources/:sourceId/structure', ({ headers, params }) =>
      deps.imports.previewStructure(resolveActor(headers), params.projectId, params.sourceId),
    )
    .post('/projects/:projectId/import-structures', ({ headers, params, body }) =>
      deps.imports.applyStructure(resolveActor(headers), params.projectId, body),
    )
    .get('/projects/:projectId/imports', ({ headers, params, query }) =>
      deps.imports.list(resolveActor(headers), params.projectId, query.before),
    )
    .post('/projects/:projectId/imports', ({ headers, params, body }) =>
      deps.imports.start(resolveActor(headers), params.projectId, body),
    )
    .post('/projects/:projectId/imports/:runId/load-source', ({ headers, params, body }) =>
      deps.imports.loadSource(resolveActor(headers), params.projectId, params.runId, body),
    )
    .post('/projects/:projectId/imports/:runId/production-reports', ({ headers, params, body }) =>
      deps.imports.shareProduction(resolveActor(headers), params.projectId, params.runId, body),
    )
    .get('/projects/:projectId/imports/:runId/production-reports', ({ headers, params, query }) =>
      deps.imports.productionReports(
        resolveActor(headers),
        params.projectId,
        params.runId,
        query.after,
      ),
    )
    .get('/projects/:projectId/imports/:runId', ({ headers, params, query }) =>
      deps.imports.page(resolveActor(headers), params.projectId, params.runId, query.cursor),
    )
    .post('/projects/:projectId/imports/:runId/chunk', ({ headers, params, body }) =>
      deps.imports.chunk(resolveActor(headers), params.projectId, params.runId, body),
    )
    .post('/projects/:projectId/imports/:runId/finish', ({ headers, params }) =>
      deps.imports.finish(resolveActor(headers), params.projectId, params.runId),
    )
    .post('/projects/:projectId/imports/:runId/retire', ({ headers, params }) =>
      deps.imports.retire(resolveActor(headers), params.projectId, params.runId),
    )
}
