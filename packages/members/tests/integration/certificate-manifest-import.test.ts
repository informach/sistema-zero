import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import { changeDraft, publishDraft, readDraft } from '../draft-authoring-helpers'
import { buildApp, seedSampleCourse } from '../helpers'

test.each([
  ['desafio', 'desafio-primeiro-jogo'],
  ['cade-todo-mundo', 'cade-todo-mundo'],
])('%s: importa e publica quiz antes do certificado preservando arte e assinaturas', async (prefix, courseSlug) => {
  const env = buildApp({ requireAdmin: true })
  const course = seedSampleCourse(env.courses, courseSlug!, 'published', 'kids')
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
      `../../../../docs/aulas-interativas/aulas/${prefix}-certificado.manifesto.json`,
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
  if (!video) throw new Error('O vídeo do certificado não foi importado')
  // A revisão sem vídeo antecede a celebração; identidade e arte do certificado permanecem.
  const quiz = draft.document.blocks.find((block) => block.content.kind === 'quiz')
  expect(quiz).toBeDefined()
  expect(draft.document.sections.map((section) => section.completion?.blockIds)).toEqual([
    [quiz!.id],
    [video.id, certificateId],
  ])
  // Simula mídia pronta no ambiente de teste; nenhum vídeo remoto é alterado.
  expect(
    (
      await changeDraft(env.app, lessonId, {
        type: 'block',
        block: {
          id: video.id,
          content: { kind: 'video', provider: 'vimeo', src: 'https://vimeo.com/123456789' },
        },
      })
    ).status,
  ).toBe(200)
  expect(
    (await changeDraft(env.app, lessonId, { type: 'planned-videos', plannedVideos: [] })).status,
  ).toBe(200)
  const published = await publishDraft(env.app, lessonId)
  expect(published.status, await published.clone().text()).toBe(200)
  // Uma reordenação que deixa a revisão para depois do certificado é recusada.
  const current = await readDraft(env.app, lessonId)
  expect(
    (
      await changeDraft(env.app, lessonId, {
        type: 'structure',
        sections: [...current.document.sections].reverse(),
      })
    ).status,
  ).toBe(200)
  const invalid = await publishDraft(env.app, lessonId)
  expect(invalid.status).toBe(400)
  expect(await invalid.text()).toContain('seção anterior')
})
