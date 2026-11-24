import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import {
  isLearningManifest,
  manifestoParaDestino,
  readManifestStudioProjectExamples,
  remapStudioExampleSections,
} from '@sistemazero/core/learning'
import { importedLearningId } from '../../src/domain/learning/learning-import'
import { changeDraft, readDraft } from '../draft-authoring-helpers'
import { buildApp, seedSampleCourse } from '../helpers'

const construtorLessons = [
  ...[
    'primeira-nave',
    'dia-1',
    'dia-2',
    'chuva-de-asteroides',
    'dia-3',
    'pontos',
    'dia-4',
    'comecar-partida',
    'dia-5',
  ].map((slug) => ({
    course: 'nave-contra-asteroides',
    audience: 'kids' as const,
    folder: 'nave-contra-asteroides',
    prefix: 'nave-contra-asteroides',
    slug,
  })),
  ...['aula-1', 'aula-2', 'aula-3', 'aula-4', 'aula-5'].flatMap((slug) =>
    (['kids', 'adult'] as const).map((audience) => ({
      course: `jornada-construtor-base-3d${audience === 'adult' ? '-adulto' : ''}`,
      audience,
      folder: 'patrulha-espacial',
      prefix: 'patrulha-espacial',
      slug,
    })),
  ),
]

test.each(
  construtorLessons,
)('$course/$slug imports and reimports its current project and per-section examples', async (lesson) => {
  const env = buildApp({ requireAdmin: true })
  const course = seedSampleCourse(env.courses, lesson.course, 'published', lesson.audience)
  const lessonId = course.lessonIds[0]!
  const source: unknown = await Bun.file(
    resolve(
      import.meta.dir,
      `../../../../docs/aulas-interativas/construtor/${lesson.folder}/${lesson.prefix}-${lesson.slug}.manifesto.json`,
    ),
  ).json()
  if (!isLearningManifest(source)) throw new Error('Invalid manifest')
  const sourceBefore = JSON.stringify(source)
  // O Admin projeta a mesma autoria na oferta escolhida antes de chamar o HTTP.
  const document = manifestoParaDestino(source, {
    courseSlug: lesson.course,
    lessonSlug: source.lessonSlug,
  })
  expect(document.courseSlug).toBe(lesson.course)
  expect(document.blocks).toEqual(source.blocks)
  expect(document.sections).toEqual(source.sections)
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
  const authored = document.blocks.find(
    (block) => 'content' in block && block.content.kind === 'studio',
  )
  if (!authored || !('content' in authored) || authored.content.kind !== 'studio')
    throw new Error('Estúdio ausente')
  // Reutiliza um Estúdio existente da mesma cadeia, ainda sem o registro por parte.
  // A importação deve conservar sua identidade e mapear as chaves editoriais para UUIDs.
  const { projectExamples: _examples, ...content } = authored.content
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
  const examples = readManifestStudioProjectExamples(authored.content.projectExamples)
  if (examples.kind !== 'valid') throw new Error('Exemplos do manifesto ausentes')
  expect(first.document.blocks.find((block) => block.id === id)?.content).toEqual({
    ...authored.content,
    projectExamples: remapStudioExampleSections(examples.value, (key) =>
      importedLearningId(lessonId, 'section', key),
    ),
  })
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
  expect(JSON.stringify(source)).toBe(sourceBefore)
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
      '../../../../docs/aulas-interativas/faisca/desafio-primeiro-jogo/desafio-dia-1.manifesto.json',
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
  // Um bloco de materiais por aula (07/10/2026): o PDF anexado no Admin fica à frente do que o
  // manifesto traz para o mesmo bloco (o recado e os seis links do Como Fazer).
  const materiais = first.document.blocks.filter((b) => b.content.kind === 'materials')
  expect(materiais).toHaveLength(1)
  const content = materiais[0]?.content
  expect(content).toMatchObject({ title: 'Passo a passo do projeto: A Chave do Farol' })
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
