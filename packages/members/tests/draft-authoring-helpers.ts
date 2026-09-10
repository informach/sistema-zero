import { randomUUID } from 'node:crypto'
import type { LessonDraft, LessonDraftChange } from '@sistemazero/core/learning'
import type { buildApp } from './helpers'

type App = ReturnType<typeof buildApp>['app']
const authorHeaders = {
  'x-auth-user-id': '11111111-1111-1111-1111-111111111111',
  'x-auth-user-role': 'admin',
  'x-auth-user-status': 'active',
}
export function draftRequest(
  app: App,
  lessonId: string,
  action: string,
  method = 'GET',
  body?: unknown,
  headers: Record<string, string> = {},
) {
  return app.handle(
    new Request(`http://localhost/members/admin/lessons/${lessonId}/draft${action}`, {
      method,
      headers: { 'content-type': 'application/json', ...authorHeaders, ...headers },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }),
  )
}
export async function readDraft(app: App, lessonId: string): Promise<LessonDraft> {
  const response = await draftRequest(app, lessonId, '')
  if (response.status !== 200) throw new Error(await response.text())
  return response.json() as Promise<LessonDraft>
}
export async function changeDraft(
  app: App,
  lessonId: string,
  change: LessonDraftChange,
  headers: Record<string, string> = {},
) {
  const draft = await readDraft(app, lessonId)
  return draftRequest(
    app,
    lessonId,
    '',
    'PATCH',
    { expectedRevision: draft.revision, operationId: randomUUID(), change },
    headers,
  )
}
export async function publishDraft(app: App, lessonId: string, isPublished = true) {
  const draft = await readDraft(app, lessonId)
  return draftRequest(app, lessonId, isPublished ? '/publish' : '/unpublish', 'POST', {
    expectedRevision: draft.revision,
    operationId: randomUUID(),
    readyVideoIds: [],
  })
}
/** Real draft HTTP flow. Failed candidate cleanup isolates successive validation cases in a test. */
export async function publishBlock(
  app: App,
  lessonId: string,
  body: { content: { kind: string; [key: string]: unknown } },
  headers: Record<string, string> = {},
  blockId: string = randomUUID(),
) {
  const before = await readDraft(app, lessonId)
  const saved = await changeDraft(
    app,
    lessonId,
    {
      type: 'block',
      block: { id: blockId, content: body.content },
      sectionId: before.document.sections[0]?.id,
    },
    headers,
  )
  if (saved.status !== 200) return saved
  const result = await publishDraft(app, lessonId)
  if (result.status !== 200) {
    const previous = before.document.blocks.find((b) => b.id === blockId)
    const cleanup = await changeDraft(
      app,
      lessonId,
      previous ? { type: 'block', block: previous } : { type: 'remove-block', blockId },
    )
    if (cleanup.status !== 200) throw new Error(await cleanup.text())
  }
  return result
}
