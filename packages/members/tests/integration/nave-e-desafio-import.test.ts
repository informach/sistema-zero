import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import { isLearningManifest } from '@sistemazero/core/learning'
import { studioSettings } from '../../../../docs/aulas-interativas/qa/nave-contra-asteroides-configuracao'
import { importedLearningId } from '../../src/domain/learning/learning-import'
import { changeDraft, readDraft } from '../draft-authoring-helpers'
import { buildApp, seedSampleCourse } from '../helpers'

test.each([
  1, 2, 3, 4, 5,
])('Day %i imports and reimports in its course with the manifest project', async (day) => {
  const env = buildApp({ requireAdmin: true })
  const course = seedSampleCourse(env.courses, 'nave-contra-asteroides', 'published', 'kids')
  const lessonId = course.lessonIds[0]!
  const document: unknown = await Bun.file(
    resolve(
      import.meta.dir,
      `../../../../docs/aulas-interativas/aulas/nave-contra-asteroides-dia-${day}.manifesto.json`,
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
    purpose: 'submission' as const,
    initialProject: {
      formatVersion: 2,
      name: 'Nave contra Asteroides',
      files: {},
      installedExtensions: [{ id: 'game-2d', version: '1.0.0', installedAt: 0 }],
    },
  }
  expect((await request('import-preview', { document })).status).toBe(200)
  expect(
    (await changeDraft(env.app, lessonId, { type: 'block', block: { id, content } })).status,
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
  const authored = document.blocks.find((b) => 'content' in b && b.content.kind === 'studio')
  if (!authored || !('content' in authored) || authored.content.kind !== 'studio')
    throw new Error('Estúdio ausente')
  expect(first.document.blocks.find((b) => b.id === id)?.content).toEqual(authored.content)
  expect(
    new Set(
      first.document.sections.filter((s) => s.workspaceBlockId).map((s) => s.workspaceBlockId),
    ),
  ).toEqual(new Set([id]))
  const delivery = first.document.sections.find((s) => s.intent === 'delivery')!
  expect(delivery.completion?.blockIds).toContain(id)
  expect(delivery.completion?.blockIds).toHaveLength(
    document.sections.find((s) => s.intent === 'delivery')?.completion?.blockIds?.length ?? 0,
  )
  expect(delivery.completion?.projectChecks?.length).toBeGreaterThan(0)
  expect((await apply()).document).toEqual(first.document)
  expect(await env.courses.findLessonWithContent(lessonId)).toEqual(published)
})

// A aula de introdução do Desafio saiu em 05/10/2026: o jogo pronto e o caderno abrem o Dia 1.
// O caderno que a autora já anexou ao bloco `materiais-farol` sobrevive à importação.
test('Desafio Dia 1 imports and reimports keeping the notebook in the Farol materials', async () => {
  const env = buildApp({ requireAdmin: true })
  const course = seedSampleCourse(env.courses, 'desafio-primeiro-jogo', 'published', 'kids')
  const lessonId = course.lessonIds[0]!
  const document: unknown = await Bun.file(
    resolve(
      import.meta.dir,
      '../../../../docs/aulas-interativas/aulas/desafio-dia-1.manifesto.json',
    ),
  ).json()
  if (!isLearningManifest(document)) throw new Error('Invalid manifest')
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
  expect((await request('import-preview', { document })).status).toBe(200)
  const notebook = {
    id: 'caderno',
    kind: 'file' as const,
    attachmentId: randomUUID(),
    label: 'Caderno',
  }
  expect(
    (
      await changeDraft(env.app, lessonId, {
        type: 'block',
        block: {
          id: importedLearningId(lessonId, 'block', 'materiais-farol'),
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
  // Um bloco de materiais por fase (07/10/2026): o PDF anexado no Admin fica à frente do que o
  // manifesto traz para o mesmo bloco (o recado e os seis links do Como Fazer).
  const materiais = first.document.blocks.filter((b) => b.content.kind === 'materials')
  expect(materiais).toHaveLength(1)
  const content = materiais[0]?.content
  expect(content).toMatchObject({ title: 'Mapa da Aventura: A Chave do Farol' })
  if (content?.kind !== 'materials' || !Array.isArray(content.items)) throw new Error('sem itens')
  expect(content.items[0]).toEqual(notebook)
  expect(content.items.slice(1).map((item) => (item as { kind: string }).kind)).toEqual([
    'text',
    'link',
    'link',
    'link',
    'link',
    'link',
    'link',
  ])
  expect((await apply()).document).toEqual(first.document)
  expect(await env.courses.findLessonWithContent(lessonId)).toEqual(published)
})
