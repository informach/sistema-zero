import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import { isLearningManifest } from '@sistemazero/core/learning'
import { changeDraft, readDraft } from '../draft-authoring-helpers'
import { buildApp, seedSampleCourse } from '../helpers'

const actor = '11111111-1111-1111-1111-111111111111'
async function setup(number: 1 | 2) {
  const env = buildApp({ requireAdmin: true })
  const course = seedSampleCourse(env.courses, 'corre-dino', 'published', 'kids')
  const lessonId = course.lessonIds[number - 1]
  if (!lessonId) throw new Error('Aula ausente na fixture')
  const document: unknown = await Bun.file(
    resolve(
      import.meta.dir,
      `../../../../docs/aulas-interativas/corre-dino/aula-0${number}/manifesto.json`,
    ),
  ).json()
  if (!isLearningManifest(document)) throw new Error('Manifesto inválido na fixture')
  const lesson = env.courses.lessons.find((item) => item.id === lessonId)
  if (!lesson) throw new Error('Aula ausente na fixture')
  lesson.slug = document.lessonSlug
  const request = (action: string, body: unknown) =>
    env.app.handle(
      new Request(`http://localhost/members/admin/lessons/${lessonId}/${action}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-auth-user-id': actor,
          'x-auth-user-role': 'admin',
          'x-auth-user-status': 'active',
        },
        body: JSON.stringify(body),
      }),
    )
  const preview = () => request('import-preview', { document })
  const apply = (expectedFingerprint: string) =>
    request('import-learning', { document, expectedFingerprint, operationId: randomUUID() })
  return { ...env, lessonId, document, preview, apply }
}

async function revision(response: Response) {
  const body: unknown = await response.json()
  if (
    !body ||
    typeof body !== 'object' ||
    !('fingerprint' in body) ||
    typeof body.fingerprint !== 'string'
  )
    throw new Error('A prévia não retornou sua revisão')
  return body.fingerprint
}

describe('manifest import through the authoring HTTP boundary', () => {
  test('Corre Dino 1 accepts the revision returned by preview and preserves the existing Studio', async () => {
    const f = await setup(1)
    const id = randomUUID()
    const content = {
      kind: 'studio' as const,
      chain: 'corre-dino',
      initialProject: { name: 'Projeto original', files: { 'index.html': '<p>Dino</p>' } },
    }
    f.courses.blocks.push({ id, lessonId: f.lessonId, kind: 'studio', content, sortOrder: 20 })
    const published = await f.courses.findLessonWithContent(f.lessonId)
    const before = await f.preview()
    expect(before.status).toBe(200)
    const expectedRevision = await revision(before)
    const response = await f.apply(expectedRevision)
    expect(response.status).toBe(200)
    const draft = await readDraft(f.app, f.lessonId)
    expect(draft.document.blocks.filter((b) => b.content.kind === 'studio')).toEqual([
      { id, content },
    ])
    expect(draft.document.sections.filter((s) => s.workspaceBlockId)).toHaveLength(5)
    expect(
      draft.document.sections
        .filter((s) => s.workspaceBlockId)
        .every((s) => s.workspaceBlockId === id),
    ).toBe(true)
    expect(draft.document.plannedVideos).toHaveLength(4)
    expect(await f.courses.findLessonWithContent(f.lessonId)).toEqual(published)
    expect((await f.apply(expectedRevision)).status).toBe(409)
    const next = await revision(await f.preview())
    expect((await f.apply(next)).status).toBe(200)
    expect((await readDraft(f.app, f.lessonId)).document).toEqual(draft.document)
    expect((await f.apply('not-a-revision')).status).toBe(400)
  })

  test('an empty lesson explains which Studio to prepare and imports after it is configured in the draft', async () => {
    const f = await setup(2)
    const before = await readDraft(f.app, f.lessonId)
    const missing = await f.preview()
    expect(missing.status).toBe(400)
    const error = (await missing.json()) as { error: { code: string; message: string } }
    expect(error.error.code).toBe('VALIDATION_ERROR')
    expect(error.error.message).toContain('Estúdio')
    expect(error.error.message).toContain('Adicionar conteúdo aqui')
    expect((await readDraft(f.app, f.lessonId)).document).toEqual(before.document)
    const id = randomUUID()
    expect(
      (
        await changeDraft(f.app, f.lessonId, {
          type: 'block',
          block: {
            id,
            content: {
              kind: 'studio',
              chain: 'corre-dino',
              initialProject: { name: 'Dino', files: {} },
            },
          },
        })
      ).status,
    ).toBe(200)
    const preview = await f.preview()
    expect(preview.status).toBe(200)
    expect((await f.apply(await revision(preview))).status).toBe(200)
    const draft = await readDraft(f.app, f.lessonId)
    expect(draft.document.blocks.filter((b) => b.content.kind === 'studio')).toHaveLength(1)
    expect(draft.document.sections.filter((s) => s.workspaceBlockId)).toHaveLength(4)
    expect(
      draft.document.sections
        .filter((s) => s.workspaceBlockId)
        .every((s) => s.workspaceBlockId === id),
    ).toBe(true)
    expect((await f.courses.findLessonWithContent(f.lessonId))?.blocks).toHaveLength(0)
  })
})
