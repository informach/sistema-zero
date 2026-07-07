import { Elysia } from 'elysia'
import type { ContentService } from '../../../application/contents/content.service'
import { assertInternalCaller, requireStaff, resolveActor } from '../auth'
import { parseIsoDate } from '../dates'
import {
  ChecklistAddBody,
  ChecklistPatchBody,
  CommentBody,
  ContentBody,
  ContentPatchBody,
  ContentsQuery,
  IdParams,
  StageBody,
} from '../dtos'

export interface ContentsRoutesDeps {
  contents: ContentService
  internalToken?: string
  requireStaffEnabled: boolean
}

/** Pipeline de produção: conteúdos, etapas, checklist e comentários. */
export function contentsRoutes(deps: ContentsRoutesDeps) {
  return (
    new Elysia()
      .onBeforeHandle(({ headers }) => {
        assertInternalCaller(headers['x-internal-token'], deps.internalToken)
        requireStaff(headers, deps.requireStaffEnabled)
      })
      .get(
        '/marketing/contents',
        async ({ query }) => {
          const offset = query.offset ?? 0
          const page = await deps.contents.list({
            stage: query.stage,
            ownerUserId: query.ownerUserId,
            q: query.q,
            limit: query.limit ?? 100,
            offset,
          })
          return { ...page, hasMore: offset + page.items.length < page.total }
        },
        { query: ContentsQuery },
      )
      .post(
        '/marketing/contents',
        async ({ headers, body, set }) => {
          set.status = 201
          return deps.contents.create(resolveActor(headers), {
            title: body.title,
            contentType: body.contentType,
            brief: body.brief ?? null,
            ownerUserId: body.ownerUserId ?? null,
            ownerName: body.ownerName ?? null,
            dueDate: parseIsoDate(body.dueDate),
            ideaId: body.ideaId ?? null,
          })
        },
        { body: ContentBody },
      )
      // Estática ANTES da dinâmica `/:id` (que exige uuid e daria 400).
      .get('/marketing/contents/stage-counts', async () => ({
        counts: await deps.contents.stageCounts(),
      }))
      .get('/marketing/contents/:id', ({ params }) => deps.contents.get(params.id), {
        params: IdParams,
      })
      .patch(
        '/marketing/contents/:id',
        ({ params, body }) =>
          deps.contents.update(params.id, {
            title: body.title,
            brief: body.brief,
            script: body.script,
            ownerUserId: body.ownerUserId,
            ownerName: body.ownerName,
            dueDate: body.dueDate === undefined ? undefined : parseIsoDate(body.dueDate),
            version: body.version,
          }),
        { params: IdParams, body: ContentPatchBody },
      )
      .post(
        '/marketing/contents/:id/stage',
        ({ headers, params, body }) =>
          deps.contents.changeStage(resolveActor(headers), params.id, body.to),
        { params: IdParams, body: StageBody },
      )
      .post(
        '/marketing/contents/:id/cancel',
        ({ headers, params }) => deps.contents.cancel(resolveActor(headers), params.id),
        { params: IdParams },
      )
      .post(
        '/marketing/contents/:id/checklist',
        async ({ params, body, set }) => {
          set.status = 201
          return deps.contents.addChecklistItem(params.id, body.label)
        },
        { params: IdParams, body: ChecklistAddBody },
      )
      .patch(
        '/marketing/checklist/:id',
        ({ headers, params, body }) =>
          deps.contents.setChecklistItem(resolveActor(headers), params.id, body),
        { params: IdParams, body: ChecklistPatchBody },
      )
      .delete(
        '/marketing/checklist/:id',
        async ({ params, set }) => {
          await deps.contents.deleteChecklistItem(params.id)
          set.status = 204
        },
        { params: IdParams },
      )
      .post(
        '/marketing/contents/:id/comments',
        async ({ headers, params, body, set }) => {
          set.status = 201
          return deps.contents.addComment(resolveActor(headers), params.id, body.body)
        },
        { params: IdParams, body: CommentBody },
      )
  )
}
