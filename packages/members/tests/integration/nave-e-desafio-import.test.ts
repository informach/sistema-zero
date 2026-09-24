import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import { isLearningManifest } from '@sistemazero/core/learning'
import { studioSettings } from '../../../../docs/aulas-interativas/qa/nave-contra-asteroides-configuracao'
import { changeDraft, readDraft } from '../draft-authoring-helpers'
import { buildApp, seedSampleCourse } from '../helpers'

test.each([
  0, 1, 2, 3, 4, 5,
])('Day %i imports and reimports in its course while preserving the continuous project', async (day) => {
  const env = buildApp({ requireAdmin: true })
  const course = seedSampleCourse(
    env.courses,
    day === 0 ? 'desafio-primeiro-jogo' : 'nave-contra-asteroides',
    'published',
    'kids',
  )
  const lessonId = course.lessonIds[0]!,
    path = day ? `dia-${day}` : 'introducao'
  const document: unknown = await Bun.file(
    resolve(
      import.meta.dir,
      `../../../../docs/aulas-interativas/aulas/${day ? 'nave-contra-asteroides' : 'desafio'}-${path}.manifesto.json`,
    ),
  ).json()
  if (!isLearningManifest(document)) throw new Error('Invalid manifest')
  // A pasta editorial pode ter outro nome que o slug da aula publicada.
  env.courses.lessons.find((l) => l.id === lessonId)!.slug = document.lessonSlug
  const request = (action: string, body: unknown) =>
    env.app.handle(
      new Request(`http://localhost/members/admin/lessons/${lessonId}/${action}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-auth-user-id': '11111111-1111-1111-1111-111111111111',
          'x-auth-user-role': 'admin',
          'x-auth-user-status': 'active',
        },
        body: JSON.stringify(body),
      }),
    )
  const id = randomUUID()
  const content = {
    ...studioSettings(day),
    purpose: day ? ('submission' as const) : ('experiment' as const),
    initialProject: {
      formatVersion: 2,
      name: 'Nave contra Asteroides',
      files: {},
      installedExtensions: [{ id: 'game-2d', version: '1.0.0', installedAt: 0 }],
    },
  }
  expect((await request('import-preview', { document })).status).toBe(200)
  if (day)
    expect(
      (await changeDraft(env.app, lessonId, { type: 'block', block: { id, content } })).status,
    ).toBe(200)
  const notebook = {
    id: 'caderno',
    kind: 'file' as const,
    attachmentId: randomUUID(),
    label: 'Caderno',
  }
  if (day === 0)
    expect(
      (
        await changeDraft(env.app, lessonId, {
          type: 'block',
          block: {
            id: randomUUID(),
            content: { kind: 'materials', title: 'Materiais do curso', items: [notebook] },
          },
        })
      ).status,
    ).toBe(200)
  const published = await env.courses.findLessonWithContent(lessonId)
  async function apply() {
    const preview = await request('import-preview', { document })
    expect(preview.status, JSON.stringify(await preview.clone().json())).toBe(200)
    const { fingerprint } = (await preview.json()) as { fingerprint: string }
    expect(
      (
        await request('import-learning', {
          document,
          expectedFingerprint: fingerprint,
          operationId: randomUUID(),
        })
      ).status,
    ).toBe(200)
    return readDraft(env.app, lessonId)
  }
  const first = await apply()
  expect(first.document.sections).toHaveLength(document.sections.length)
  expect(first.document.plannedVideos).toHaveLength(
    document.blocks.filter((b) => 'plannedVideo' in b).length,
  )
  if (day) {
    const authored = document.blocks.find((b) => 'content' in b && b.content.kind === 'studio')
    if (!authored || !('content' in authored)) throw new Error('Estúdio ausente')
    expect(first.document.blocks.find((b) => b.id === id)?.content).toEqual({
      ...authored.content,
      initialProject: content.initialProject,
    })
  } else {
    expect(first.document.blocks.some((b) => b.content.kind === 'studio')).toBe(false)
  }
  if (day === 0)
    expect(
      first.document.blocks.find((b) => b.content.kind === 'materials')?.content,
    ).toMatchObject({
      title: 'Caderno e mapa da aventura',
      items: [notebook],
    })
  expect(
    new Set(
      first.document.sections.filter((s) => s.workspaceBlockId).map((s) => s.workspaceBlockId),
    ),
  ).toEqual(new Set(day ? [id] : []))
  if (day) {
    const delivery = first.document.sections.find((s) => s.intent === 'delivery')!
    expect(delivery.completion?.blockIds).toContain(id)
    expect(delivery.completion?.blockIds).toHaveLength(
      document.sections.find((s) => s.intent === 'delivery')?.completion?.blockIds?.length ?? 0,
    )
    expect(delivery.completion?.projectChecks?.length).toBeGreaterThan(0)
  }
  expect((await apply()).document).toEqual(first.document)
  expect(await env.courses.findLessonWithContent(lessonId)).toEqual(published)
})
