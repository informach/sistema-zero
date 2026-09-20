import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import { changeDraft, readDraft } from '../draft-authoring-helpers'
import { buildApp, seedSampleCourse } from '../helpers'

test('importar a aula final preserva a arte e as assinaturas do certificado existente', async () => {
  const env = buildApp({ requireAdmin: true })
  const course = seedSampleCourse(env.courses, 'desafio-primeiro-jogo', 'published', 'kids')
  const lessonId = course.lessonIds[1]!
  env.courses.lessons.find((lesson) => lesson.id === lessonId)!.slug = 'certificado'
  const certificateId = randomUUID()
  const original = {
    kind: 'certificate' as const,
    baseImageUrl: 'https://example.com/certificado.png',
    signatures: [{ name: 'Equipe Sistema Zero', imageUrl: 'https://example.com/assinatura.png' }],
    accentColor: '#123456',
    introLine: 'Texto anterior',
  }
  const added = await changeDraft(env.app, lessonId, {
    type: 'block',
    block: { id: certificateId, content: original },
  })
  expect(added.status, await added.clone().text()).toBe(200)
  const manifest = await Bun.file(
    resolve(
      import.meta.dir,
      '../../../../docs/aulas-interativas/aulas/desafio-certificado.manifesto.json',
    ),
  ).json()
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
  const preview = await request('import-preview', { document: manifest })
  expect(preview.status, await preview.clone().text()).toBe(200)
  const { fingerprint } = (await preview.json()) as { fingerprint: string }
  const applied = await request('import-learning', {
    document: manifest,
    expectedFingerprint: fingerprint,
    operationId: randomUUID(),
  })
  expect(applied.status, await applied.clone().text()).toBe(200)
  const draft = await readDraft(env.app, lessonId)
  const certificate = draft.document.blocks.find((block) => block.content.kind === 'certificate')
  expect(certificate?.id).toBe(certificateId)
  expect(certificate?.content).toMatchObject({
    baseImageUrl: original.baseImageUrl,
    signatures: original.signatures,
    accentColor: original.accentColor,
    introLine: 'Certificamos que',
  })
  const video = draft.document.blocks.find((block) => block.content.kind === 'video')
  expect(video).toBeDefined()
  if (!video) throw new Error('O vídeo de pitch não foi importado')
  expect(draft.document.sections.map((section) => section.completion?.blockIds)).toEqual([
    [certificateId],
    [video.id],
  ])
})
