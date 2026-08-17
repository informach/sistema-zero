/**
 * Bloco de aula do PINTA — ponta a ponta pelo HTTP.
 *
 * O bloco REUSA a rota, o service e a tabela do Estúdio; o que estes testes protegem é
 * justamente o que NÃO é compartilhado: o kind exigido, o código do erro, o gate próprio e o
 * campo `pintaState` da projeção. Um bloco que aceitasse entrega pelo caminho do Estúdio (ou
 * vice-versa) passaria batido em toda a suíte existente.
 */
import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { createLessonAsset, pintaAssetFromWire, pintaAssetToWire } from '@sistemazero/pinta/assets'
import type { InMemoryCourseRepository } from '../fakes/in-memory'
import { buildApp, grantLifetime, seedSampleCourse } from '../helpers'

const USER = '33333333-3333-3333-3333-333333333333'
const authHeaders = { 'x-auth-user-id': USER, 'content-type': 'application/json' }

type App = ReturnType<typeof buildApp>['app']
const readJson = (res: Response): Promise<any> => res.json()

/** O desenho que a professora configurou: um personagem 32x32 de pixel art. */
const INITIAL_ASSET = pintaAssetToWire({
  ...createLessonAsset('pixel-sprite', 32, 'heroi'),
  id: 'asset-aula',
}) as Record<string, unknown>

const DESENHO_DA_CRIANCA = (() => {
  const asset = pintaAssetFromWire(INITIAL_ASSET)
  if (asset?.kind !== 'pixel-sprite') throw new Error('fixture Pinta inválida')
  const firstCel = asset.animations[0]?.frames[0]?.[0]
  if (firstCel) firstCel.data[0] = 7
  return pintaAssetToWire({ ...asset, name: 'heroi', updatedAt: 123 }) as Record<string, unknown>
})()

const VECTOR_BACKGROUND_ASSET = pintaAssetToWire({
  ...createLessonAsset('vector-background', 240, 'cenario'),
  id: 'asset-cenario',
}) as Record<string, unknown>

function seedPintaBlock(
  courses: InMemoryCourseRepository,
  lessonId: string,
  content: Record<string, unknown> = {},
): string {
  const blockId = randomUUID()
  courses.blocks.push({
    id: blockId,
    lessonId,
    kind: 'pinta',
    sortOrder: 30,
    content: { kind: 'pinta', initialAsset: INITIAL_ASSET, ...content },
  })
  return blockId
}

function seedStudioBlock(
  courses: InMemoryCourseRepository,
  lessonId: string,
  content: Record<string, unknown> = {},
): string {
  const blockId = randomUUID()
  courses.blocks.push({
    id: blockId,
    lessonId,
    kind: 'studio',
    sortOrder: 20,
    content: {
      kind: 'studio',
      initialProject: { name: 'p', files: { 'index.html': '' } },
      ...content,
    },
  })
  return blockId
}

const enviar = (app: App, lessonId: string, blockId: string, body: unknown) =>
  app.handle(
    new Request(`http://localhost/members/lessons/${lessonId}/blocks/${blockId}/pinta-submission`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(body),
    }),
  )

const carregar = (app: App, lessonId: string, blockId: string) =>
  app.handle(
    new Request(`http://localhost/members/lessons/${lessonId}/blocks/${blockId}/pinta-submission`, {
      headers: authHeaders,
    }),
  )

const concluir = (app: App, lessonId: string) =>
  app.handle(
    new Request(`http://localhost/members/lessons/${lessonId}/complete`, {
      method: 'POST',
      headers: authHeaders,
    }),
  )

const abrirAula = (app: App, slug: string, lessonId: string) =>
  app.handle(
    new Request(`http://localhost/members/courses/${slug}/lessons/${lessonId}`, {
      headers: authHeaders,
    }),
  )

const carryover = (app: App, lessonId: string, blockId: string) =>
  app.handle(
    new Request(`http://localhost/members/lessons/${lessonId}/blocks/${blockId}/pinta-carryover`, {
      headers: authHeaders,
    }),
  )

function cenario() {
  const { app, courses, entitlements } = buildApp()
  const { slug, lessonIds } = seedSampleCourse(courses)
  grantLifetime(entitlements, { userId: USER, courseRef: slug })
  const [lessonId, lessonId2] = lessonIds
  if (!lessonId || !lessonId2) throw new Error('fixture sem aula')
  return { app, courses, slug, lessonId, lessonId2 }
}

describe('bloco Pinta — entrega', () => {
  test('a criança envia o desenho e o recupera depois (retomar num navegador novo)', async () => {
    const { app, courses, lessonId } = cenario()
    const blockId = seedPintaBlock(courses, lessonId)

    const enviado = await enviar(app, lessonId, blockId, {
      asset: DESENHO_DA_CRIANCA,
      message: 'terminei!',
    })
    expect(enviado.status).toBe(200)
    expect((await readJson(enviado)).submittedAt).toBeString()

    const voltou = await carregar(app, lessonId, blockId)
    expect(voltou.status).toBe(200)
    // ⚠️ O campo é `asset`, não `project`: quem consome é o bloco de desenho.
    const returnedAsset = (await readJson(voltou)).asset
    expect(returnedAsset).toMatchObject({ id: 'asset-aula', name: 'heroi' })
    const restored = pintaAssetFromWire(returnedAsset)
    expect(restored?.kind).toBe('pixel-sprite')
    if (restored?.kind !== 'pixel-sprite') throw new Error('asset retornado inválido')
    expect(restored.animations[0]?.frames[0]?.[0]?.data[0]).toBe(7)
  })

  test('sem nunca ter enviado, o GET devolve null em vez de erro', async () => {
    const { app, courses, lessonId } = cenario()
    const blockId = seedPintaBlock(courses, lessonId)

    const res = await carregar(app, lessonId, blockId)
    expect(res.status).toBe(200)
    expect((await readJson(res)).asset).toBeNull()
  })

  test('🚨 a rota do Pinta NÃO aceita um bloco de Estúdio', async () => {
    // Sem esta separação, um bloco entregaria pelo caminho do outro e o gate da aula (que olha
    // o kind) nunca destravaria — a criança enviaria e continuaria presa.
    const { app, courses, lessonId } = cenario()
    const studioId = seedStudioBlock(courses, lessonId)

    const res = await enviar(app, lessonId, studioId, { asset: DESENHO_DA_CRIANCA })
    expect(res.status).toBe(404)
    expect((await readJson(res)).error.code).toBe('PINTA_BLOCK_NOT_FOUND')
  })

  test('desenho sem um kind conhecido é recusado na BORDA', async () => {
    const { app, courses, lessonId } = cenario()
    const blockId = seedPintaBlock(courses, lessonId)

    const res = await enviar(app, lessonId, blockId, {
      asset: { id: 'x', name: 'y', kind: 'inventado' },
    })
    // 400 é a convenção do serviço para entrada inválida (o error-handler normaliza).
    expect(res.status).toBe(400)
  })

  test('kind conhecido com estrutura incompleta é recusado e não abre o gate', async () => {
    const { app, courses, lessonId } = cenario()
    const blockId = seedPintaBlock(courses, lessonId)

    const res = await enviar(app, lessonId, blockId, {
      asset: { id: 'x', name: 'y', kind: 'pixel-sprite' },
    })
    expect(res.status).toBe(400)

    const completion = await concluir(app, lessonId)
    expect(completion.status).toBe(409)
    expect((await readJson(completion)).error.code).toBe('PINTA_GATE_NOT_SUBMITTED')
  })
})

describe('bloco Pinta — gate da conclusão', () => {
  test('🚨 a aula NÃO conclui enquanto o desenho não for enviado (409)', async () => {
    const { app, courses, lessonId } = cenario()
    seedPintaBlock(courses, lessonId)

    const res = await concluir(app, lessonId)
    expect(res.status).toBe(409)
    expect((await readJson(res)).error.code).toBe('PINTA_GATE_NOT_SUBMITTED')
  })

  test('depois de enviar, conclui', async () => {
    const { app, courses, lessonId } = cenario()
    const blockId = seedPintaBlock(courses, lessonId)

    await enviar(app, lessonId, blockId, { asset: DESENHO_DA_CRIANCA })
    const res = await concluir(app, lessonId)
    expect(res.status).toBe(200)
  })

  test('editar o bloco invalida a entrega antiga e fecha o gate novamente', async () => {
    const { app, courses, lessonId } = cenario()
    const blockId = seedPintaBlock(courses, lessonId)

    expect((await enviar(app, lessonId, blockId, { asset: DESENHO_DA_CRIANCA })).status).toBe(200)

    const edited = await app.handle(
      new Request(`http://localhost/members/admin/blocks/${blockId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          content: {
            kind: 'pinta',
            initialAsset: INITIAL_ASSET,
            allowTools: ['pencil'],
          },
        }),
      }),
    )
    expect(edited.status).toBe(200)

    expect((await readJson(await carregar(app, lessonId, blockId))).asset).toBeNull()
    const blocked = await concluir(app, lessonId)
    expect(blocked.status).toBe(409)
    expect((await readJson(blocked)).error.code).toBe('PINTA_GATE_NOT_SUBMITTED')
  })

  test('o gate do Pinta e o do Estúdio coexistem na MESMA aula', async () => {
    // Uma aula pode pedir as duas coisas; enviar uma não pode destravar a outra.
    const { app, courses, lessonId } = cenario()
    const pintaId = seedPintaBlock(courses, lessonId)
    seedStudioBlock(courses, lessonId)

    await enviar(app, lessonId, pintaId, { asset: DESENHO_DA_CRIANCA })
    const res = await concluir(app, lessonId)
    expect(res.status).toBe(409)
    expect((await readJson(res)).error.code).toBe('STUDIO_GATE_NOT_SUBMITTED')
  })
})

describe('bloco Pinta — cadeia entre aulas (carryover)', () => {
  test('a 2ª aula da cadeia abre com o desenho entregue na 1ª', async () => {
    const { app, courses, lessonId, lessonId2 } = cenario()
    const bloco1 = seedPintaBlock(courses, lessonId, { chain: 'heroi' })
    const bloco2 = seedPintaBlock(courses, lessonId2, { chain: 'heroi' })

    await enviar(app, lessonId, bloco1, { asset: { ...DESENHO_DA_CRIANCA, name: 'heroi-v2' } })

    const res = await carryover(app, lessonId2, bloco2)
    expect(res.status).toBe(200)
    expect((await readJson(res)).asset).toMatchObject({ name: 'heroi-v2' })
  })

  test('sem cadeia, ou sem entrega na anterior, devolve null (cai no desenho do professor)', async () => {
    const { app, courses, lessonId, lessonId2 } = cenario()
    const avulso = seedPintaBlock(courses, lessonId2)
    seedPintaBlock(courses, lessonId, { chain: 'heroi' })
    const naCadeia = seedPintaBlock(courses, lessonId2, { chain: 'heroi' })

    expect((await readJson(await carryover(app, lessonId2, avulso))).asset).toBeNull()
    // Cadeia existe, mas a criança nunca entregou na aula 1.
    expect((await readJson(await carryover(app, lessonId2, naCadeia))).asset).toBeNull()
  })

  test('🚨 a cadeia do Pinta NÃO puxa a entrega de um bloco de Estúdio com o mesmo nome', async () => {
    // Cadeias de kinds diferentes são independentes: semear o editor de desenho com um PROJETO
    // de código quebraria o bloco em silêncio.
    const { app, courses, lessonId, lessonId2 } = cenario()
    const studioId = seedStudioBlock(courses, lessonId, { chain: 'heroi' })
    const bloco2 = seedPintaBlock(courses, lessonId2, { chain: 'heroi' })

    const entregou = await app.handle(
      new Request(
        `http://localhost/members/lessons/${lessonId}/blocks/${studioId}/studio-submission`,
        {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ project: { name: 'p', files: { 'index.html': '<p>oi</p>' } } }),
        },
      ),
    )
    // ⚠️ Anti-vácuo: sem entrega gravada, o `null` abaixo não provaria nada.
    expect(entregou.status).toBe(200)

    expect((await readJson(await carryover(app, lessonId2, bloco2))).asset).toBeNull()
  })

  test('a rota do carryover do Pinta recusa um bloco de Estúdio', async () => {
    const { app, courses, lessonId } = cenario()
    const studioId = seedStudioBlock(courses, lessonId)

    const res = await carryover(app, lessonId, studioId)
    expect(res.status).toBe(404)
    expect((await readJson(res)).error.code).toBe('PINTA_BLOCK_NOT_FOUND')
  })
})

describe('bloco Pinta — autoria da cadeia (o tipo é load-bearing)', () => {
  const enviarAdmin = (app: App, path: string, method: string, body: unknown) =>
    app.handle(
      new Request(`http://localhost${path}`, {
        method,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }),
    )

  /** Curso com DUAS aulas, criadas pela autoria (o guard consulta o ContentAdminRepository). */
  async function arvore(app: App) {
    const curso = await readJson(
      await enviarAdmin(app, '/members/admin/courses', 'POST', {
        slug: 'curso-pinta',
        title: 'Curso Pinta',
        subtitle: null,
        description: null,
        coverImageUrl: null,
        status: 'draft',
      }),
    )
    const mod = await readJson(
      await enviarAdmin(app, `/members/admin/courses/${curso.id}/modules`, 'POST', {
        title: 'Módulo 1',
        summary: null,
      }),
    )
    const aulas = []
    for (const [i, slug] of ['aula-1', 'aula-2'].entries()) {
      aulas.push(
        await readJson(
          await enviarAdmin(app, `/members/admin/modules/${mod.id}/lessons`, 'POST', {
            slug,
            title: `Aula ${i + 1}`,
            estimatedMinutes: 5,
          }),
        ),
      )
    }
    return { curso, aulas }
  }

  const blocoPinta = (app: App, lessonId: string, content: Record<string, unknown>) =>
    enviarAdmin(app, `/members/admin/lessons/${lessonId}/blocks`, 'POST', {
      content: { kind: 'pinta', initialAsset: INITIAL_ASSET, ...content },
    })

  test('autoria recusa snapshot com kind conhecido mas estrutura incompleta', async () => {
    const { app } = buildApp()
    const { aulas } = await arvore(app)
    const res = await blocoPinta(app, aulas[0].id, {
      initialAsset: { id: 'x', name: 'y', kind: 'pixel-sprite' },
    })

    expect(res.status).toBe(400)
  })

  test('🚨 dois tipos diferentes na MESMA cadeia → 409 nomeando a aula que já a usa', async () => {
    const { app } = buildApp()
    const { aulas } = await arvore(app)

    expect((await blocoPinta(app, aulas[0].id, { chain: 'heroi' })).status).toBe(201)

    const conflito = await blocoPinta(app, aulas[1].id, {
      chain: 'heroi',
      initialAsset: VECTOR_BACKGROUND_ASSET,
    })
    expect(conflito.status).toBe(409)
    const { error } = await readJson(conflito)
    expect(error.code).toBe('PINTA_CHAIN_TYPE_MISMATCH')
    // A mensagem precisa ser ACIONÁVEL: nomeia a aula culpada e o tipo dela.
    expect(error.message).toContain('Aula 1')
    expect(error.message).toContain('Personagem (pixel art)')
  })

  test('mesmo tipo na cadeia passa; cadeia com nome diferente também', async () => {
    const { app } = buildApp()
    const { aulas } = await arvore(app)

    await blocoPinta(app, aulas[0].id, { chain: 'heroi' })
    expect((await blocoPinta(app, aulas[1].id, { chain: 'heroi' })).status).toBe(201)
    expect(
      (
        await blocoPinta(app, aulas[1].id, {
          chain: 'cenario',
          initialAsset: VECTOR_BACKGROUND_ASSET,
        })
      ).status,
    ).toBe(201)
  })

  test('reeditar o PRÓPRIO bloco não conflita consigo mesmo', async () => {
    // Sem a exclusão do próprio id, trocar o tipo de um bloco que já está na cadeia (sozinho)
    // seria impossível — ele brigaria com a versão anterior de si.
    const { app } = buildApp()
    const { aulas } = await arvore(app)
    const bloco = await readJson(await blocoPinta(app, aulas[0].id, { chain: 'heroi' }))

    const res = await enviarAdmin(app, `/members/admin/blocks/${bloco.id}`, 'PATCH', {
      content: {
        kind: 'pinta',
        initialAsset: VECTOR_BACKGROUND_ASSET,
        chain: 'heroi',
      },
    })
    expect(res.status).toBe(200)
  })

  test('bloco de Estúdio com o mesmo nome de cadeia não conflita', async () => {
    const { app } = buildApp()
    const { aulas } = await arvore(app)
    await enviarAdmin(app, `/members/admin/lessons/${aulas[0].id}/blocks`, 'POST', {
      content: {
        kind: 'studio',
        initialProject: { name: 'p', files: { 'index.html': '' } },
        chain: 'heroi',
      },
    })

    expect((await blocoPinta(app, aulas[1].id, { chain: 'heroi' })).status).toBe(201)
  })
})

describe('bloco Pinta — projeção da aula', () => {
  test('o bloco chega ao aluno com a config e o `pintaState`', async () => {
    const { app, courses, slug, lessonId } = cenario()
    const blockId = seedPintaBlock(courses, lessonId, {
      allowTools: ['pencil', 'eraser'],
    })

    const antes = await readJson(await abrirAula(app, slug, lessonId))
    const bloco = antes.blocks.find((b: { id: string }) => b.id === blockId)
    // A config vai INTEIRA: é o que monta o editor da criança.
    expect(bloco.content.allowTools).toEqual(['pencil', 'eraser'])
    expect(bloco.content.initialAsset.kind).toBe('pixel-sprite')
    expect(bloco.pintaState).toMatchObject({ submitted: false })
    // ⚠️ O estado do Pinta NÃO vaza para o campo do Estúdio (o front escolhe pelo kind).
    expect(bloco.studioState).toBeUndefined()

    await enviar(app, lessonId, blockId, { asset: DESENHO_DA_CRIANCA })

    const depois = await readJson(await abrirAula(app, slug, lessonId))
    const atualizado = depois.blocks.find((b: { id: string }) => b.id === blockId)
    expect(atualizado.pintaState.submitted).toBe(true)
  })
})
