import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import { isLearningManifest } from '@sistemazero/core/learning'
import { changeDraft, readDraft } from '../draft-authoring-helpers'
import { buildApp, seedSampleCourse } from '../helpers'

describe('Meu Jeito authored manifests through the HTTP import boundary', () => {
  for (let number = 1; number <= 8; number++)
    test(`lesson ${number}: requires the gallery, preserves it and reimports idempotently`, async () => {
      const env = buildApp({ requireAdmin: true })
      const course = seedSampleCourse(env.courses, 'o-jogo-do-meu-jeito', 'published', 'kids')
      const lessonId = course.lessonIds[0]!
      const slug = `aula-${String(number).padStart(2, '0')}`
      const document: unknown = await Bun.file(
        resolve(
          import.meta.dir,
          `../../../../docs/aulas-interativas/o-jogo-do-meu-jeito-v6/${slug}/manifesto.json`,
        ),
      ).json()
      if (!isLearningManifest(document)) throw new Error('Invalid manifest')
      env.courses.lessons.find((l) => l.id === lessonId)!.slug = slug
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
      expect((await request('import-preview', { document })).status).toBe(400)
      const pinta = number >= 2 && number <= 5
      const count = number === 5 ? 2 : 1
      const id = randomUUID()
      const content = pinta
        ? {
            kind: 'pinta' as const,
            purpose: 'submission' as const,
            initialAsset: null,
            gallery: { minItems: count, maxItems: count },
          }
        : {
            kind: 'studio' as const,
            purpose: 'submission' as const,
            initialProject: { name: 'Entrega da galeria', files: {} },
            gallery: { minItems: 1, maxItems: 1 },
          }
      expect(
        (await changeDraft(env.app, lessonId, { type: 'block', block: { id, content } })).status,
      ).toBe(200)
      const published = await env.courses.findLessonWithContent(lessonId)
      async function apply() {
        const preview = await request('import-preview', { document })
        expect(preview.status).toBe(200)
        const { fingerprint } = (await preview.json()) as { fingerprint: string }
        const response = await request('import-learning', {
          document,
          expectedFingerprint: fingerprint,
          operationId: randomUUID(),
        })
        expect(response.status).toBe(200)
        return readDraft(env.app, lessonId)
      }
      const first = await apply()
      expect(
        first.document.blocks.filter((b) => b.content.kind === (pinta ? 'pinta' : 'studio')),
      ).toEqual([{ id, content }])
      expect(first.document.sections.every((s) => s.workspaceBlockId === null)).toBe(true)
      const delivery = first.document.sections.find((s) => s.intent === 'delivery')!
      expect(delivery.completion?.blockIds).toEqual([id])
      expect(first.document.plannedVideos).toHaveLength(
        document.blocks.filter((b) => 'plannedVideo' in b).length,
      )
      expect(first.document.sections).toHaveLength(document.sections.length)
      const second = await apply()
      expect(second.document).toEqual(first.document)
      expect(await env.courses.findLessonWithContent(lessonId)).toEqual(published)
    })
})
