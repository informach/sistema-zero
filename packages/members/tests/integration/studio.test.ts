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

  test('atividade com nota de corte NÃO atingida → /complete 409 STUDIO_GATE_NOT_PASSED (não 400)', async () => {
    const { app, courses, entitlements } = buildApp()
    const { slug, lessonIds } = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: slug })
    const blockId = randomUUID()
    courses.blocks.push({
      id: blockId,
      lessonId: lessonIds[0],
      kind: 'studio',
      sortOrder: 20,
      content: {
        kind: 'studio',
        level: 'iniciante',
        allowCategories: ['JavaScript'],
        initialProject: {
          name: 'x',
          files: { 'index.html': '', 'style.css': '', 'script.js': '' },
        },
        activity: {
          instructions: 'use um laço',
          passingScore: 100,
          checks: [{ id: 's', label: 'usa laço', kind: 'structure', rule: { type: 'usesLoop' } }],
        },
      },
    })
    // Projeto SEM laço → o servidor recalcula a estrutura, reprova → não passa.
    const submitRes = await submit(app, lessonIds[0], blockId, {
      name: 'sem laço',
      files: { 'index.html': '', 'style.css': '', 'script.js': 'console.log(1)' },
      ir: { js: [{ type: 'consoleLog' }] },
      blocksState: null,
    })
    expect(submitRes.status).toBe(200)
    expect((await readJson(submitRes)).passed).toBe(false)

    const res = await complete(app, lessonIds[0])
    expect(res.status).toBe(409)
    expect((await readJson(res)).error.code).toBe('STUDIO_GATE_NOT_PASSED')
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

// ── Carryover: continuar o projeto da aula contínua anterior (mesma cadeia) ──────
const USER_B = '33333333-3333-3333-3333-333333333333'

const TEMPLATE = {
  name: 'Template',
  files: { 'index.html': '', 'style.css': '', 'script.js': '' },
}

/** Anexa um bloco de estúdio com (opcional) nome de cadeia `chain` a uma aula. */
function seedChainBlock(
  courses: InMemoryCourseRepository,
  lessonId: string,
  chain?: string,
  sortOrder = 20,
): string {
  const blockId = randomUUID()
  courses.blocks.push({
    id: blockId,
    lessonId,
    kind: 'studio',
    sortOrder,
    content: {
      kind: 'studio',
      level: 'iniciante',
      initialProject: TEMPLATE,
      ...(chain ? { chain } : {}),
    },
  })
  return blockId
}

function addLesson(
  courses: InMemoryCourseRepository,
  courseId: string,
  moduleId: string,
  sortOrder: number,
  published = true,
): string {
  const id = randomUUID()
  courses.lessons.push({
    id,
    moduleId,
    courseId,
    slug: `aula-${sortOrder}-${id.slice(0, 4)}`,
    title: `Aula ${sortOrder}`,
    sortOrder,
    estimatedMinutes: 5,
    isPublished: published,
  })
  return id
}

function addModule(courses: InMemoryCourseRepository, courseId: string, sortOrder: number): string {
  const id = randomUUID()
  courses.modules.push({ id, courseId, title: `Módulo ${sortOrder}`, summary: null, sortOrder })
  return id
}

const carryover = (
  app: App,
  lessonId: string,
  blockId: string,
  headers: Record<string, string> = authHeaders,
) =>
  app.handle(
    new Request(`http://localhost/members/lessons/${lessonId}/blocks/${blockId}/studio-carryover`, {
      headers,
    }),
  )

const submitAs = (
  app: App,
  lessonId: string,
  blockId: string,
  project: unknown,
  headers: Record<string, string>,
) =>
  app.handle(
    new Request(
      `http://localhost/members/lessons/${lessonId}/blocks/${blockId}/studio-submission`,
      { method: 'POST', headers, body: JSON.stringify({ project }) },
    ),
  )

describe('Bloco Estúdio — carryover de projeto contínuo', () => {
  test('carrega o projeto enviado na aula contínua anterior (mesma cadeia)', async () => {
    const { app, courses, entitlements } = buildApp()
    const { slug, lessonIds } = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: slug })
    const blockA = seedChainBlock(courses, lessonIds[0], 'jogo')
    const blockB = seedChainBlock(courses, lessonIds[1], 'jogo')

    await submit(app, lessonIds[0], blockA, STUDENT_PROJECT)
    const res = await carryover(app, lessonIds[1], blockB)
    expect(res.status).toBe(200)
    const body = await readJson(res)
    expect(body.project.name).toBe('Minha entrega')
    expect(body.project.files['script.js']).toBe('console.log(1)')
  })

  test('cadeia com espaço sobrando no nome ainda casa (trim dos dois lados)', async () => {
    const { app, courses, entitlements } = buildApp()
    const { slug, lessonIds } = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: slug })
    // Admin autorou o bloco anterior com espaço sobrando no `chain`.
    const blockA = seedChainBlock(courses, lessonIds[0], 'jogo ')
    const blockB = seedChainBlock(courses, lessonIds[1], 'jogo')

    await submit(app, lessonIds[0], blockA, STUDENT_PROJECT)
    const body = await readJson(await carryover(app, lessonIds[1], blockB))
    expect(body.project?.name).toBe('Minha entrega')
  })

  test('a 1ª aula da cadeia não tem o que carregar (project null)', async () => {
    const { app, courses, entitlements } = buildApp()
    const { slug, lessonIds } = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: slug })
    const blockA = seedChainBlock(courses, lessonIds[0], 'jogo')

    await submit(app, lessonIds[0], blockA, STUDENT_PROJECT)
    const body = await readJson(await carryover(app, lessonIds[0], blockA))
    expect(body.project).toBeNull()
  })

  test('bloco sem nome de cadeia não carrega nada (curto-circuito)', async () => {
    const { app, courses, entitlements } = buildApp()
    const { slug, lessonIds } = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: slug })
    const blockA = seedChainBlock(courses, lessonIds[0], 'jogo')
    const blockB = seedChainBlock(courses, lessonIds[1]) // independente (sem chain)

    await submit(app, lessonIds[0], blockA, STUDENT_PROJECT)
    const body = await readJson(await carryover(app, lessonIds[1], blockB))
    expect(body.project).toBeNull()
  })

  test('sem entrega na aula anterior → project null', async () => {
    const { app, courses, entitlements } = buildApp()
    const { slug, lessonIds } = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: slug })
    seedChainBlock(courses, lessonIds[0], 'jogo') // NÃO enviado
    const blockB = seedChainBlock(courses, lessonIds[1], 'jogo')

    const body = await readJson(await carryover(app, lessonIds[1], blockB))
    expect(body.project).toBeNull()
  })

  test('pula aulas sem studio da cadeia entre duas da mesma cadeia', async () => {
    const { app, courses, entitlements } = buildApp()
    const { slug, courseId, moduleId, lessonIds } = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: slug })
    const blockA = seedChainBlock(courses, lessonIds[0], 'jogo')
    // lessonIds[1] não tem bloco de estúdio (só teoria). Aula 3 retoma a cadeia.
    const lesson3 = addLesson(courses, courseId, moduleId, 2)
    const blockC = seedChainBlock(courses, lesson3, 'jogo')

    await submit(app, lessonIds[0], blockA, STUDENT_PROJECT)
    const body = await readJson(await carryover(app, lesson3, blockC))
    expect(body.project.name).toBe('Minha entrega')
  })

  test('aula anterior despublicada é ignorada → project null', async () => {
    const { app, courses, entitlements } = buildApp()
    const { slug, lessonIds } = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: slug })
    const blockA = seedChainBlock(courses, lessonIds[0], 'jogo')
    const blockB = seedChainBlock(courses, lessonIds[1], 'jogo')

    await submit(app, lessonIds[0], blockA, STUDENT_PROJECT)
    const l1 = courses.lessons.find((l) => l.id === lessonIds[0])
    if (l1) l1.isPublished = false

    const body = await readJson(await carryover(app, lessonIds[1], blockB))
    expect(body.project).toBeNull()
  })

  test('não vaza o projeto de outro aluno (keyado no x-auth-user-id)', async () => {
    const { app, courses, entitlements } = buildApp()
    const { slug, lessonIds } = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: slug })
    grantLifetime(entitlements, { userId: USER_B, courseRef: slug })
    const blockA = seedChainBlock(courses, lessonIds[0], 'jogo')
    const blockB = seedChainBlock(courses, lessonIds[1], 'jogo')

    await submit(app, lessonIds[0], blockA, STUDENT_PROJECT) // entrega do USER
    const bHeaders = { 'x-auth-user-id': USER_B, 'content-type': 'application/json' }
    const body = await readJson(await carryover(app, lessonIds[1], blockB, bHeaders))
    expect(body.project).toBeNull()
  })

  test('sessão de perfil: acesso pela CONTA, projeto pelo PERFIL', async () => {
    const { app, courses, entitlements } = buildApp()
    const { slug, lessonIds } = seedSampleCourse(courses)
    const account = USER
    const p1 = '44444444-4444-4444-4444-444444444444'
    const p2 = '55555555-5555-5555-5555-555555555555'
    // A matrícula é da CONTA (responsável); os perfis herdam o acesso.
    grantLifetime(entitlements, { userId: account, courseRef: slug })
    const blockA = seedChainBlock(courses, lessonIds[0], 'jogo')
    const blockB = seedChainBlock(courses, lessonIds[1], 'jogo')

    const p1Headers = {
      'x-auth-user-id': p1,
      'x-auth-account-id': account,
      'content-type': 'application/json',
    }
    await submitAs(app, lessonIds[0], blockA, STUDENT_PROJECT, p1Headers) // entrega do PERFIL p1
    // p1 carrega o próprio projeto…
    const mine = await readJson(await carryover(app, lessonIds[1], blockB, p1Headers))
    expect(mine.project.name).toBe('Minha entrega')
    // …e o perfil-irmão p2 (mesma conta) não vê nada (entrega é por perfil).
    const p2Headers = { ...p1Headers, 'x-auth-user-id': p2 }
    const sibling = await readJson(await carryover(app, lessonIds[1], blockB, p2Headers))
    expect(sibling.project).toBeNull()
  })

  test('bloco que não é estúdio → 404', async () => {
    const { app, courses, entitlements } = buildApp()
    const { slug, lessonIds } = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: slug })
    const richText = courses.blocks.find(
      (b) => b.lessonId === lessonIds[0] && b.kind === 'rich_text',
    )
    const res = await carryover(app, lessonIds[0], richText?.id ?? randomUUID())
    expect(res.status).toBe(404)
    expect((await readJson(res)).error.code).toBe('STUDIO_BLOCK_NOT_FOUND')
  })

  test('sem matrícula ativa → 403 (antes de qualquer leitura de entrega)', async () => {
    const { app, courses } = buildApp()
    const { lessonIds } = seedSampleCourse(courses)
    const blockB = seedChainBlock(courses, lessonIds[1], 'jogo')
    const res = await carryover(app, lessonIds[1], blockB)
    expect(res.status).toBe(403)
  })

  test('resolve a aula anterior cruzando MÓDULOS (ordem tupla módulo→aula)', async () => {
    const { app, courses, entitlements } = buildApp()
    const { slug, courseId, lessonIds } = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: slug })
    const blockA = seedChainBlock(courses, lessonIds[0], 'jogo') // módulo 0, aula 0
    const mod1 = addModule(courses, courseId, 1)
    const lessonX = addLesson(courses, courseId, mod1, 0) // módulo 1, aula 0
    const blockX = seedChainBlock(courses, lessonX, 'jogo')

    await submit(app, lessonIds[0], blockA, STUDENT_PROJECT)
    const body = await readJson(await carryover(app, lessonX, blockX))
    expect(body.project.name).toBe('Minha entrega')
  })

  test('duas cadeias no mesmo curso não se cruzam', async () => {
    const { app, courses, entitlements } = buildApp()
    const { slug, lessonIds } = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: slug })
    const blockA = seedChainBlock(courses, lessonIds[0], 'jogo')
    const blockB = seedChainBlock(courses, lessonIds[1], 'site') // cadeia diferente

    await submit(app, lessonIds[0], blockA, STUDENT_PROJECT)
    const body = await readJson(await carryover(app, lessonIds[1], blockB))
    expect(body.project).toBeNull()
  })
})

// ── Vitrine: auto-publicação no Mural dos Criadores ─────────────────────────────
interface ShowcaseConfig {
  enabled: boolean
  title?: string
  summary?: string
  defaultCoverUrl?: string
}

/** Bloco de estúdio com config de vitrine (`showcase`) e cadeia opcional. */
function seedShowcaseBlock(
  courses: InMemoryCourseRepository,
  lessonId: string,
  showcase: ShowcaseConfig,
  chain = 'jogo',
): string {
  const blockId = randomUUID()
  courses.blocks.push({
    id: blockId,
    lessonId,
    kind: 'studio',
    sortOrder: 30,
    content: { kind: 'studio', level: 'iniciante', initialProject: TEMPLATE, chain, showcase },
  })
  return blockId
}

const showcasePayload = (app: App, lessonId: string, blockId: string) =>
  app.handle(
    new Request(`http://localhost/members/lessons/${lessonId}/blocks/${blockId}/showcase-payload`, {
      headers: authHeaders,
    }),
  )

describe('Bloco Estúdio — vitrine (Mural dos Criadores)', () => {
  test('o complete devolve a dica de showcase quando a aula é ponto de vitrine', async () => {
    const { app, courses, entitlements } = buildApp()
    const { slug, lessonIds } = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: slug })
    const blockId = seedShowcaseBlock(courses, lessonIds[0], {
      enabled: true,
      title: 'Meu Jogo',
      summary: 'Um jogo bacana',
    })
    await submit(app, lessonIds[0], blockId, STUDENT_PROJECT)
    const res = await complete(app, lessonIds[0])
    expect(res.status).toBe(200)
    const body = await readJson(res)
    expect(body.showcase).not.toBeNull()
    expect(body.showcase.blockId).toBe(blockId)
    expect(body.showcase.title).toBe('Meu Jogo')
  })

  test('payload autoritativo: elegível só APÓS enviar a entrega', async () => {
    const { app, courses, entitlements } = buildApp()
    const { slug, lessonIds } = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: slug })
    const blockId = seedShowcaseBlock(courses, lessonIds[0], {
      enabled: true,
      title: 'Meu Jogo',
      summary: 'Um jogo bacana',
      defaultCoverUrl: 'https://cdn.example.com/capa.png',
    })

    // Antes de enviar → não elegível (não há projeto a mostrar).
    const before = await readJson(await showcasePayload(app, lessonIds[0], blockId))
    expect(before.eligible).toBe(false)

    await submit(app, lessonIds[0], blockId, STUDENT_PROJECT)
    const after = await readJson(await showcasePayload(app, lessonIds[0], blockId))
    expect(after.eligible).toBe(true)
    expect(after.title).toBe('Meu Jogo')
    expect(after.summary).toBe('Um jogo bacana')
    expect(after.defaultCoverUrl).toBe('https://cdn.example.com/capa.png')
  })

  test('bloco de estúdio SEM showcase.enabled → não elegível', async () => {
    const { app, courses, entitlements } = buildApp()
    const { slug, lessonIds } = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: slug })
    const blockId = seedChainBlock(courses, lessonIds[0], 'jogo') // sem showcase
    await submit(app, lessonIds[0], blockId, STUDENT_PROJECT)
    const body = await readJson(await showcasePayload(app, lessonIds[0], blockId))
    expect(body.eligible).toBe(false)
  })
})
