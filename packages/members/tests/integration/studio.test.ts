import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import type { InMemoryCourseRepository } from '../fakes/in-memory'
import { buildApp, grantLifetime, seedSampleCourse } from '../helpers'

const USER = '22222222-2222-2222-2222-222222222222'
const authHeaders = { 'x-auth-user-id': USER, 'content-type': 'application/json' }

type App = ReturnType<typeof buildApp>['app']
const readJson = (res: Response): Promise<any> => res.json()

/** Anexa um bloco de estúdio (config mínima) a uma aula existente. */
function seedStudioBlock(courses: InMemoryCourseRepository, lessonId: string): string {
  const blockId = randomUUID()
  courses.blocks.push({
    id: blockId,
    lessonId,
    kind: 'studio',
    sortOrder: 20,
    content: {
      kind: 'studio',
      level: 'iniciante',
      allowCategories: ['HTML', 'JavaScript'],
      initialProject: {
        name: 'Atividade da aula',
        files: { 'index.html': '<h1>Oi</h1>', 'style.css': '', 'script.js': '' },
      },
    },
  })
  return blockId
}

const submit = (app: App, lessonId: string, blockId: string, project: unknown) =>
  app.handle(
    new Request(
      `http://localhost/members/lessons/${lessonId}/blocks/${blockId}/studio-submission`,
      { method: 'POST', headers: authHeaders, body: JSON.stringify({ project }) },
    ),
  )

const complete = (app: App, lessonId: string) =>
  app.handle(
    new Request(`http://localhost/members/lessons/${lessonId}/complete`, {
      method: 'POST',
      headers: authHeaders,
    }),
  )

const getLesson = (app: App, slug: string, lessonId: string) =>
  app.handle(
    new Request(`http://localhost/members/courses/${slug}/lessons/${lessonId}`, {
      headers: authHeaders,
    }),
  )

const STUDENT_PROJECT = {
  name: 'Minha entrega',
  files: { 'index.html': '<h1>Feito</h1>', 'style.css': '', 'script.js': 'console.log(1)' },
}

describe('Bloco Estúdio — gate de conclusão + entrega', () => {
  test('a aula NÃO conclui enquanto o projeto não for enviado (409)', async () => {
    const { app, courses, entitlements } = buildApp()
    const { slug, lessonIds } = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: slug })
    seedStudioBlock(courses, lessonIds[0])

    const res = await complete(app, lessonIds[0])
    expect(res.status).toBe(409)
    expect((await readJson(res)).error.code).toBe('STUDIO_GATE_NOT_SUBMITTED')
  })

  test('enviar o projeto destrava a conclusão da aula', async () => {
    const { app, courses, entitlements } = buildApp()
    const { slug, lessonIds } = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: slug })
    const blockId = seedStudioBlock(courses, lessonIds[0])

    const submitRes = await submit(app, lessonIds[0], blockId, STUDENT_PROJECT)
    expect(submitRes.status).toBe(200)
    expect(typeof (await readJson(submitRes)).submittedAt).toBe('string')

    const completeRes = await complete(app, lessonIds[0])
    expect(completeRes.status).toBe(200)
  })

  test('GET da aula expõe a config do bloco + studioState', async () => {
    const { app, courses, entitlements } = buildApp()
    const { slug, lessonIds } = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: slug })
    const blockId = seedStudioBlock(courses, lessonIds[0])

    const before = await readJson(await getLesson(app, slug, lessonIds[0]))
    const blockBefore = before.blocks.find((b: { id: string }) => b.id === blockId)
    expect(blockBefore.kind).toBe('studio')
    expect(blockBefore.content.level).toBe('iniciante')
    expect(blockBefore.content.initialProject.name).toBe('Atividade da aula')
    expect(blockBefore.studioState.submitted).toBe(false)

    await submit(app, lessonIds[0], blockId, STUDENT_PROJECT)
    const after = await readJson(await getLesson(app, slug, lessonIds[0]))
    const blockAfter = after.blocks.find((b: { id: string }) => b.id === blockId)
    expect(blockAfter.studioState.submitted).toBe(true)
  })

  test('o reenvio sobrescreve a entrega (último vence)', async () => {
    const { app, courses, entitlements, studioSubmissions } = buildApp()
    const { slug, lessonIds } = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: slug })
    const blockId = seedStudioBlock(courses, lessonIds[0])

    await submit(app, lessonIds[0], blockId, STUDENT_PROJECT)
    await submit(app, lessonIds[0], blockId, { ...STUDENT_PROJECT, name: 'Revisada' })

    const mine = await studioSubmissions.getOne(USER, blockId)
    expect((mine?.project as { name: string }).name).toBe('Revisada')
    // Continua sendo UMA entrega (upsert, não acumula).
    expect(studioSubmissions.submissions.filter((s) => s.blockId === blockId)).toHaveLength(1)
  })

  test('submeter num bloco que não é estúdio → 404', async () => {
    const { app, courses, entitlements } = buildApp()
    const { slug, lessonIds } = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: slug })
    // Bloco rich_text da aula composta (ver seedSampleCourse).
    const richText = courses.blocks.find(
      (b) => b.lessonId === lessonIds[0] && b.kind === 'rich_text',
    )
    const res = await submit(app, lessonIds[0], richText?.id ?? randomUUID(), STUDENT_PROJECT)
    expect(res.status).toBe(404)
    expect((await readJson(res)).error.code).toBe('STUDIO_BLOCK_NOT_FOUND')
  })

  test('aceita entrega grande do Estúdio (acima do teto padrão de 64 KB)', async () => {
    const { app, courses, entitlements } = buildApp()
    const { slug, lessonIds } = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: slug })
    const blockId = seedStudioBlock(courses, lessonIds[0])

    // ~300 KB: passa do teto pequeno (64 KB) mas cabe no teto do Estúdio (2 MB).
    const big = { name: 'Grande', files: { 'app.js': 'x'.repeat(300_000) } }
    const res = await submit(app, lessonIds[0], blockId, big)
    expect(res.status).toBe(200)
  })

  test('corpo acima do teto numa rota normal → 413 (não 422)', async () => {
    const { app, courses, entitlements } = buildApp()
    const { slug, lessonIds } = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: slug })

    const res = await app.handle(
      new Request(`http://localhost/members/courses/${slug}/lessons/${lessonIds[0]}/position`, {
        method: 'PUT',
        headers: authHeaders,
        // Corpo válido no shape, mas > 64 KB → barrado ANTES da validação do corpo.
        body: JSON.stringify({ positionSeconds: 10, pad: 'x'.repeat(70_000) }),
      }),
    )
    expect(res.status).toBe(413)
    expect((await readJson(res)).error.code).toBe('PAYLOAD_TOO_LARGE')
  })

  test('admin lista e abre a entrega do aluno', async () => {
    const { app, courses, entitlements } = buildApp()
    const { slug, lessonIds } = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: slug })
    const blockId = seedStudioBlock(courses, lessonIds[0])
    await submit(app, lessonIds[0], blockId, STUDENT_PROJECT)

    const listRes = await app.handle(
      new Request(`http://localhost/members/admin/blocks/${blockId}/studio-submissions`),
    )
    expect(listRes.status).toBe(200)
    const list = await readJson(listRes)
    expect(list.submissions).toHaveLength(1)
    expect(list.submissions[0].userId).toBe(USER)

    const oneRes = await app.handle(
      new Request(`http://localhost/members/admin/blocks/${blockId}/studio-submissions/${USER}`),
    )
    expect(oneRes.status).toBe(200)
    expect((await readJson(oneRes)).project.name).toBe('Minha entrega')
  })
})
