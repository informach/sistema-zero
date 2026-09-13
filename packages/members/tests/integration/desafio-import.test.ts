import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import { isLearningManifest } from '@sistemazero/core/learning'
import { studioSettings } from '../../../../docs/aulas-interativas/qa/desafio-configuracao'
import { changeDraft, readDraft } from '../draft-authoring-helpers'
import { buildApp, seedSampleCourse } from '../helpers'

test.each([
  0, 1, 2, 3, 4, 5,
])('Desafio day %i imports and reimports while preserving the continuous project', async (day) => {
  const env = buildApp({ requireAdmin: true })
  const course = seedSampleCourse(env.courses, 'desafio-primeiro-jogo', 'published', 'kids')
  const lessonId = course.lessonIds[0]!,
    slug = day ? `dia-${day}` : 'introducao'
  env.courses.lessons.find((l) => l.id === lessonId)!.slug = slug
  const document: unknown = await Bun.file(
    resolve(
      import.meta.dir,
      `../../../../docs/aulas-interativas/desafio-primeiro-jogo-v6/${slug}/manifesto.json`,
    ),
  ).json()
  if (!isLearningManifest(document)) throw new Error('Invalid manifest')
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
    initialProject: {
      name: 'Nave contra Asteroides',
      files: {},
      installedExtensions: [{ id: 'game-2d', version: '1.0.0', installedAt: 0 }],
    },
  }
  if (day) {
    expect((await request('import-preview', { document })).status).toBe(400)
    expect(
      (await changeDraft(env.app, lessonId, { type: 'block', block: { id, content } })).status,
    ).toBe(200)
  }
  const published = await env.courses.findLessonWithContent(lessonId)
  async function apply() {
    const preview = await request('import-preview', { document })
    expect(preview.status).toBe(200)
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
    expect(first.document.blocks.find((b) => b.id === id)?.content).toEqual(content)
    expect(
      new Set(
        first.document.sections.filter((s) => s.workspaceBlockId).map((s) => s.workspaceBlockId),
      ),
    ).toEqual(new Set([id]))
    const delivery = first.document.sections.find((s) => s.intent === 'delivery')!
    expect(delivery.completion?.blockIds).toEqual([id])
    expect(delivery.completion?.projectChecks?.length).toBeGreaterThan(0)
  } else expect(first.document.sections.every((s) => s.workspaceBlockId === null)).toBe(true)
  expect((await apply()).document).toEqual(first.document)
  expect(await env.courses.findLessonWithContent(lessonId)).toEqual(published)
})
