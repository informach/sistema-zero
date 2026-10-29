import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import { isLearningManifest, manifestoParaDestino } from '@sistemazero/core/learning'
import { readDraft } from '../draft-authoring-helpers'
import { buildApp, seedSampleCourse } from '../helpers'

for (const audience of ['kids', 'adult'] as const)
  for (const n of [1, 2])
    test(`Moedas ${audience}/${n}: importa e reimporta preservando aula e contratos`, async () => {
      const env = buildApp({ requireAdmin: true })
      const slug = `jornada-faisca-poder-1${audience === 'adult' ? '-adulto' : ''}`
      const course = seedSampleCourse(env.courses, slug, 'published', audience)
      const lessonId = course.lessonIds[0]!,
        lesson = env.courses.lessons.find((l) => l.id === lessonId)!
      lesson.slug = `aula-${n}`
      const authored: unknown = await Bun.file(
        resolve(
          import.meta.dirname,
          `../../../../docs/aulas-interativas/faisca/poder-moedas-no-caminho/moedas-aula-${n}.manifesto.json`,
        ),
      ).json()
      if (!isLearningManifest(authored)) throw Error('Autoria inválida')
      const document = manifestoParaDestino(authored, { courseSlug: slug, lessonSlug: lesson.slug })
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
      let firstIds: string[] = []
      for (let round = 0; round < 2; round++) {
        const preview = await request('import-preview', { document, mode: 'preserve' })
        const proposal = (await preview.json()) as { fingerprint: string }
        expect(preview.status, JSON.stringify(proposal)).toBe(200)
        const applied = await request('import-learning', {
          document,
          mode: 'preserve',
          expectedFingerprint: proposal.fingerprint,
          operationId: randomUUID(),
        })
        expect(applied.status, await applied.text()).toBe(200)
        const draft = await readDraft(env.app, lessonId)
        const ids = draft.document.blocks.map((b) => b.id)
        if (round === 0) firstIds = ids
        else expect(ids).toEqual(firstIds)
        // A coleta pelo evento do grupo, o baú por quantidade e a cena 3D do quiz chegam ao rascunho.
        expect(JSON.stringify(draft)).toContain(n === 1 ? 'onTouchGroup' : 'moedas-volta')
        if (n === 1) expect(JSON.stringify(draft)).toContain('coin-counter')
        expect(JSON.stringify(draft)).toContain('moedasDoCaminho')
        expect(env.courses.lessons.find((l) => l.id === lessonId)?.slug).toBe(`aula-${n}`)
      }
    })
