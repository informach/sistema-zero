import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import { isLearningManifest } from '@sistemazero/core/learning'
import { importedLearningId } from '../../src/domain/learning/learning-import'
import { readDraft } from '../draft-authoring-helpers'
import { buildApp, seedSampleCourse } from '../helpers'

test('o Dia 3 importa todas as escolhas de farol e a experiência da posição no mesmo projeto', async () => {
  const env = buildApp({ requireAdmin: true })
  const course = seedSampleCourse(env.courses, 'desafio-primeiro-jogo', 'published', 'kids')
  const lessonId = course.lessonIds[0]!
  const document: unknown = await Bun.file(
    resolve(
      import.meta.dir,
      '../../../../docs/aulas-interativas/aulas/desafio-dia-3.manifesto.json',
    ),
  ).json()
  if (!isLearningManifest(document)) throw new Error('Manifesto inválido')
  env.courses.lessons.find((lesson) => lesson.id === lessonId)!.slug = document.lessonSlug
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
  const preview = await request('import-preview', { document })
  expect(preview.status, await preview.clone().text()).toBe(200)
  const { fingerprint } = (await preview.json()) as { fingerprint: string }
  const imported = await request('import-learning', {
    document,
    expectedFingerprint: fingerprint,
    operationId: randomUUID(),
  })
  expect(imported.status, await imported.clone().text()).toBe(200)
  const { document: draft } = await readDraft(env.app, lessonId)
  expect(draft.sections).toHaveLength(8)
  expect(new Set(draft.sections.flatMap((section) => section.workspaceBlockId ?? [])).size).toBe(1)
  expect(
    draft.sections.find((section) => section.intent === 'delivery')?.completion?.projectChecks,
  ).toEqual(
    document.sections.find((section) => section.intent === 'delivery')?.completion?.projectChecks,
  )
  // A troca do farol mora em `personalizar` (06/10/2026), com a mesma regra `acender` da entrega.
  const personalizar = draft.sections.find(
    (section) => section.id === importedLearningId(lessonId, 'section', 'personalizar'),
  )
  const autorado = document.sections.find((section) => section.key === 'personalizar')
  expect(autorado?.completion?.projectChecks?.map((check) => check.id)).toEqual(['acender'])
  expect(personalizar?.completion?.projectChecks).toEqual(autorado?.completion?.projectChecks)
  const experience = draft.blocks.find(
    (block) => block.id === importedLearningId(lessonId, 'block', 'experiencia-posicao'),
  )
  expect(experience?.content).toMatchObject({
    kind: 'interactive',
    activity: {
      scene: 'lighthouse-position',
      setup: { goals: ['mover-horizontal', 'mover-vertical'] },
    },
  })
})
