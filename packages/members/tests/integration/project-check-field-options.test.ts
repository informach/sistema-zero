import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import { isLearningManifest, type SectionProjectCheck } from '@sistemazero/core/learning'
import { changeDraft, readDraft } from '../draft-authoring-helpers'
import { buildApp, seedSampleCourse } from '../helpers'

/**
 * `fieldOptions` (a lista de valores aceitos num campo, 06/10/2026) atravessa o salvamento da
 * estrutura no Admin, no topo da regra e dentro de `inputBlocks`.
 *
 * O `normalize` do Elysia apaga em silêncio o campo que o schema não declara. Sem a declaração, a
 * regra de topo `{ usesBlock set_image, fieldOptions: { IMAGE: [...] } }` voltava só com
 * `fields: { SPRITE: 'farol' }` e passava a aceitar qualquer imagem, inclusive o farol apagado.
 */
const DIA_3 = resolve(
  import.meta.dir,
  '../../../../docs/aulas-interativas/aulas/desafio-dia-3.manifesto.json',
)
const ACESOS = ['farol-de-pedra-aceso', 'farol-aceso']

test('a lista de valores aceitos sobrevive ao salvar a estrutura, no topo e aninhada', async () => {
  const env = buildApp({ requireAdmin: true })
  const course = seedSampleCourse(env.courses, 'desafio-primeiro-jogo', 'published', 'kids')
  const lessonId = course.lessonIds[0]!
  const document: unknown = await Bun.file(DIA_3).json()
  if (!isLearningManifest(document)) throw new Error('Manifesto do Dia 3 inválido')
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
  const { fingerprint } = (await preview.json()) as { fingerprint: string }
  const imported = await request('import-learning', {
    document,
    expectedFingerprint: fingerprint,
    operationId: randomUUID(),
  })
  expect(imported.status).toBe(200)

  const before = await readDraft(env.app, lessonId)
  const checks = (sections: typeof before.document.sections) =>
    sections.flatMap((section) => section.completion?.projectChecks ?? [])
  const acender = checks(before.document.sections).find((check) => check.id === 'acender')
  expect(JSON.stringify(acender?.rule)).toContain('"fieldOptions"')

  const topo: SectionProjectCheck = {
    id: 'topo',
    label: 'Troque a imagem do farol por uma acesa.',
    rule: {
      type: 'usesBlock',
      blockType: 'sz_g2d_set_image',
      area: 'events',
      fields: { SPRITE: 'farol' },
      fieldOptions: { IMAGE: ACESOS },
    },
  }
  const sections = before.document.sections.map((section) =>
    section.intent === 'delivery' && section.completion
      ? {
          ...section,
          completion: {
            ...section.completion,
            projectChecks: [...(section.completion.projectChecks ?? []), topo],
          },
        }
      : section,
  )
  const saved = await changeDraft(env.app, lessonId, { type: 'structure', sections })
  expect(saved.status, await saved.clone().text()).toBe(200)

  const after = checks((await readDraft(env.app, lessonId)).document.sections)
  expect(after.find((check) => check.id === 'topo')?.rule).toEqual(topo.rule)
  expect(after.find((check) => check.id === 'acender')?.rule).toEqual(acender?.rule)
})
