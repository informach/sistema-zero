import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import { isLearningManifest, manifestoParaDestino } from '@sistemazero/core/learning'
import { draftRequest, readDraft } from '../draft-authoring-helpers'
import { buildApp, seedSampleCourse } from '../helpers'

// O extra do Faísca "Meu primeiro desenho no Pinta": o desenho do bloco de Pinta preenche a vaga
// `minha-chave`, e o bloco de Estúdio da mesma aula a importa (etapa 8 do design das vagas de arte).
for (const audience of ['kids', 'adult'] as const)
  test(`Meu primeiro desenho ${audience}: importa, reimporta e a vaga liga o Pinta ao Estúdio`, async () => {
    const env = buildApp({ requireAdmin: true })
    const slug = `jornada-faisca-extra-2${audience === 'adult' ? '-adulto' : ''}`
    const course = seedSampleCourse(env.courses, slug, 'published', audience)
    const lessonId = course.lessonIds[0]!,
      lesson = env.courses.lessons.find((l) => l.id === lessonId)!
    lesson.slug = 'aula-1'
    const authored: unknown = await Bun.file(
      resolve(
        import.meta.dirname,
        '../../../../docs/aulas-interativas/faisca/meu-primeiro-desenho-no-pinta/meu-desenho-aula-1.manifesto.json',
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
      const contents = draft.document.blocks.map((b) => b.content as Record<string, unknown>)
      const pinta = contents.find((c) => c.kind === 'pinta')
      const studio = contents.find((c) => c.kind === 'studio')
      expect(pinta?.artSlot).toEqual({ name: 'minha-chave', replaces: 'chave-dourada' })
      expect(studio?.artSlots).toEqual([{ name: 'minha-chave', mode: 'add' }])
    }
    // O "Conferir" pode acusar os vídeos ainda não gravados, mas nunca as vagas de arte.
    const draft = await readDraft(env.app, lessonId)
    const res = await draftRequest(env.app, lessonId, '/validate', 'POST', {
      expectedRevision: draft.revision,
      operationId: randomUUID(),
      readyVideoIds: [],
    })
    expect(res.status).toBe(200)
    const issues = (await res.json()) as { message: string }[]
    expect(
      issues.filter((i) => /vaga|desenho/i.test(i.message)),
      JSON.stringify(issues),
    ).toEqual([])
  })
