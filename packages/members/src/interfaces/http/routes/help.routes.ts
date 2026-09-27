import { Elysia } from 'elysia'
import type { HelpService } from '../../../application/help/help.service'
import { assertInternalCaller, requireAdmin, resolveOptionalUserId, resolveUserId } from '../auth'
import {
  HelpAdminListQuery,
  HelpCollectionBody,
  HelpCollectionOrderBody,
  HelpCollectionPatchBody,
  HelpImportBody,
  HelpRevisionBody,
  HelpSlugParams,
  HelpTutorialCreateBody,
  HelpTutorialPatchBody,
  IdParams,
} from '../dtos'

export interface HelpRoutesDeps {
  help: HelpService
  internalToken?: string
  requireAdminEnabled: boolean
}

/**
 * "Como fazer": a biblioteca de ajuda do Kids.
 *
 * A leitura da criança (`/members/help`) NÃO passa pelo `CheckAccessService`: qualquer conta
 * ativa lê o publicado (o gateway exige JWT + `statuses: ['active']`). Ver tutorial não libera
 * ferramenta nenhuma e não toca em progresso, XP nem matrícula. O admin (`/members/admin/help`)
 * edita o rascunho, publica, despublica, arquiva e transporta por JSON.
 */
export function helpRoutes(deps: HelpRoutesDeps) {
  const guard = ({ headers }: { headers: Record<string, string | undefined> }) =>
    assertInternalCaller(headers['x-internal-token'], deps.internalToken)

  const student = new Elysia({ prefix: '/members/help' })
    .onTransform(guard)
    .get('/collections', ({ headers }) => {
      resolveUserId(headers)
      return deps.help.listCollectionsPublic()
    })
    .get('/tutorials', ({ headers }) => {
      resolveUserId(headers)
      return deps.help.listPublished()
    })
    .get(
      '/tutorials/:slug',
      ({ headers, params }) => {
        resolveUserId(headers)
        return deps.help.getPublished(params.slug)
      },
      { params: HelpSlugParams },
    )

  const admin = new Elysia({ prefix: '/members/admin/help' })
    .onTransform(guard)
    .onBeforeHandle(({ headers }) => requireAdmin(headers, deps.requireAdminEnabled))
    // Coleções
    .get('/collections', () => deps.help.listCollections())
    .post(
      '/collections',
      async ({ body, set }) => {
        set.status = 201
        return deps.help.createCollection(body)
      },
      { body: HelpCollectionBody },
    )
    .put('/collections/order', ({ body }) => deps.help.reorderCollections(body.ids), {
      body: HelpCollectionOrderBody,
    })
    .patch('/collections/:id', ({ params, body }) => deps.help.updateCollection(params.id, body), {
      params: IdParams,
      body: HelpCollectionPatchBody,
    })
    .post('/collections/:id/archive', ({ params }) => deps.help.archiveCollection(params.id), {
      params: IdParams,
    })
    .post('/collections/:id/restore', ({ params }) => deps.help.restoreCollection(params.id), {
      params: IdParams,
    })
    // Tutoriais. `export` e `import` ANTES de `:id`, senão viram ids inválidos (400).
    .get('/tutorials', ({ query }) => deps.help.list(query), { query: HelpAdminListQuery })
    .get('/tutorials/export', () => deps.help.export())
    .post(
      '/tutorials/import',
      ({ body, headers }) => deps.help.import(body, resolveOptionalUserId(headers)),
      { body: HelpImportBody },
    )
    .post(
      '/tutorials',
      async ({ body, headers, set }) => {
        set.status = 201
        return deps.help.create(body, resolveOptionalUserId(headers))
      },
      { body: HelpTutorialCreateBody },
    )
    .get('/tutorials/:id', ({ params }) => deps.help.get(params.id), { params: IdParams })
    .patch(
      '/tutorials/:id',
      ({ params, body, headers }) =>
        deps.help.update(params.id, body, resolveOptionalUserId(headers)),
      { params: IdParams, body: HelpTutorialPatchBody },
    )
    .post(
      '/tutorials/:id/publish',
      ({ params, body, headers }) =>
        deps.help.publish(params.id, body.expectedRevision, resolveOptionalUserId(headers)),
      { params: IdParams, body: HelpRevisionBody },
    )
    .post(
      '/tutorials/:id/unpublish',
      ({ params, body, headers }) =>
        deps.help.unpublish(params.id, body.expectedRevision, resolveOptionalUserId(headers)),
      { params: IdParams, body: HelpRevisionBody },
    )
    .post(
      '/tutorials/:id/archive',
      ({ params, body, headers }) =>
        deps.help.archive(params.id, body.expectedRevision, resolveOptionalUserId(headers)),
      { params: IdParams, body: HelpRevisionBody },
    )

  return new Elysia({ name: 'help' }).use(student).use(admin)
}
