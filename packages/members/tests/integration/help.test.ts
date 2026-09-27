import { describe, expect, test } from 'bun:test'
import type { HelpTutorialDocument } from '@sistemazero/core/help'
import { buildApp } from '../helpers'

const USER = '99999999-9999-4999-8999-999999999999'
const studentHeaders = { 'x-auth-user-id': USER }
const adminHeaders = {
  'x-auth-user-id': '11111111-1111-4111-8111-111111111111',
  'x-auth-user-role': 'admin',
  'x-auth-user-status': 'active',
}
const staffHeaders = { 'x-auth-user-role': 'staff', 'x-auth-user-status': 'active' }

type App = ReturnType<typeof buildApp>['app']
const readJson = (res: Response): Promise<any> => res.json()

const get = (app: App, path: string, headers: Record<string, string> = {}) =>
  app.handle(new Request(`http://localhost${path}`, { headers }))
const send = (
  app: App,
  path: string,
  method: string,
  body: unknown | null,
  headers: Record<string, string> = {},
) =>
  app.handle(
    new Request(`http://localhost${path}`, {
      method,
      headers: { 'content-type': 'application/json', ...headers },
      body: body === null ? undefined : JSON.stringify(body),
    }),
  )

const documento: HelpTutorialDocument = {
  title: 'Como ver meu jogo na Pré-visualização',
  summary: 'Onde o jogo aparece enquanto você monta os blocos, em tela larga e no celular.',
  keywords: ['prévia', 'ver o jogo', 'olhinho'],
  toolRef: 'estudio-completo',
  video: {
    provider: 'vimeo',
    src: 'https://vimeo.com/123456789',
    posterUrl: 'https://cdn.x/capa.webp',
  },
  steps: [
    {
      id: 'abas',
      title: 'Em tela estreita, abra a aba Pré-visualização',
      body: 'Toque em **Pré-visualização** no alto da área de trabalho.',
      imageUrl: 'https://cdn.x/aba.webp',
      imageAlt: 'A aba Pré-visualização em destaque',
    },
    {
      id: 'olho',
      title: 'Em tela larga, use o olhinho',
      body: 'O botão **Mostrar pré-visualização**.',
    },
  ],
  related: ['estudio-criar-projeto'],
}

async function criarColecao(app: App, slug = 'estudio') {
  const res = await send(
    app,
    '/members/admin/help/collections',
    'POST',
    { slug, title: 'Estúdio', description: 'Blocos e jogos', icon: 'blocks', tone: 'estudio' },
    adminHeaders,
  )
  expect(res.status).toBe(201)
  return readJson(res)
}

async function criarTutorial(app: App, collectionId: string, slug = 'estudio-pre-visualizacao') {
  const res = await send(
    app,
    '/members/admin/help/tutorials',
    'POST',
    { slug, collectionId, draft: documento },
    adminHeaders,
  )
  expect(res.status).toBe(201)
  return readJson(res)
}

describe('Como fazer: leitura da criança', () => {
  test('sem identidade → 401; com qualquer conta ativa lê só o publicado', async () => {
    const { app } = buildApp()
    expect((await get(app, '/members/help/tutorials')).status).toBe(401)
    const colecao = await criarColecao(app)
    const tutorial = await criarTutorial(app, colecao.id)

    let lista = await readJson(await get(app, '/members/help/tutorials', studentHeaders))
    expect(lista.tutorials).toEqual([])
    expect(
      (await get(app, '/members/help/tutorials/estudio-pre-visualizacao', studentHeaders)).status,
    ).toBe(404)
    let colecoes = await readJson(await get(app, '/members/help/collections', studentHeaders))
    expect(colecoes.collections).toMatchObject([{ slug: 'estudio', publishedCount: 0 }])

    const pub = await send(
      app,
      `/members/admin/help/tutorials/${tutorial.id}/publish`,
      'POST',
      { expectedRevision: tutorial.revision },
      adminHeaders,
    )
    expect(pub.status).toBe(200)

    lista = await readJson(await get(app, '/members/help/tutorials', studentHeaders))
    expect(lista.tutorials).toHaveLength(1)
    expect(lista.tutorials[0]).toMatchObject({
      slug: 'estudio-pre-visualizacao',
      collectionSlug: 'estudio',
      title: documento.title,
      keywords: documento.keywords,
      toolRef: 'estudio-completo',
      position: 0,
    })
    expect(lista.tutorials[0].searchText).toContain('olhinho')
    // A lista NÃO carrega os passos: só o texto achatado para a busca.
    expect(lista.tutorials[0].steps).toBeUndefined()

    const detalhe = await readJson(
      await get(app, '/members/help/tutorials/estudio-pre-visualizacao', studentHeaders),
    )
    // Round-trip do documento INTEIRO (o `normalize` do Elysia apagaria campo não declarado).
    expect(detalhe).toMatchObject({
      ...documento,
      slug: 'estudio-pre-visualizacao',
      collectionSlug: 'estudio',
      collectionTitle: 'Estúdio',
      collectionTone: 'estudio',
    })
    expect(detalhe.steps[0].imageAlt).toBe('A aba Pré-visualização em destaque')
    expect(detalhe.video.posterUrl).toBe('https://cdn.x/capa.webp')
    expect(detalhe.related).toEqual(['estudio-criar-projeto'])

    colecoes = await readJson(await get(app, '/members/help/collections', studentHeaders))
    expect(colecoes.collections[0].publishedCount).toBe(1)
  })

  test('x-internal-token errado → 401 (defesa em profundidade)', async () => {
    const { app } = buildApp({ internalToken: 'segredo' })
    expect((await get(app, '/members/help/tutorials', studentHeaders)).status).toBe(401)
    expect(
      (
        await get(app, '/members/help/tutorials', {
          ...studentHeaders,
          'x-internal-token': 'segredo',
        })
      ).status,
    ).toBe(200)
  })

  test('o tutorial não toca em matrícula nem progresso', async () => {
    const { app, entitlements } = buildApp()
    const colecao = await criarColecao(app)
    const tutorial = await criarTutorial(app, colecao.id)
    await send(
      app,
      `/members/admin/help/tutorials/${tutorial.id}/publish`,
      'POST',
      { expectedRevision: tutorial.revision },
      adminHeaders,
    )
    // Conta sem NENHUMA matrícula lê o tutorial de uma ferramenta que não tem...
    expect(
      (await get(app, '/members/help/tutorials/estudio-pre-visualizacao', studentHeaders)).status,
    ).toBe(200)
    // ...e continua sem acesso ao produto.
    const acesso = await readJson(
      await get(app, '/members/access?refs=estudio-completo', studentHeaders),
    )
    expect(acesso.access['estudio-completo']).toBe(false)
    expect(await entitlements.listActiveByUser(USER, new Date())).toEqual([])
  })
})

describe('Como fazer: autoria', () => {
  test('papel comum → 403; staff lê; admin escreve', async () => {
    const { app } = buildApp({ requireAdmin: true })
    expect(
      (
        await get(app, '/members/admin/help/tutorials', {
          'x-auth-user-role': 'customer',
          'x-auth-user-status': 'active',
        })
      ).status,
    ).toBe(403)
    expect((await get(app, '/members/admin/help/tutorials', staffHeaders)).status).toBe(200)
    expect((await get(app, '/members/admin/help/collections', adminHeaders)).status).toBe(200)
  })

  test('validação de forma na borda: slug, coleção, ícone e campos extras', async () => {
    const { app } = buildApp()
    const ruim = await send(
      app,
      '/members/admin/help/collections',
      'POST',
      { slug: 'Estúdio!', title: 'X', description: '', icon: 'foguete', tone: 'roxo' },
      adminHeaders,
    )
    expect(ruim.status).toBe(400)
    const colecao = await criarColecao(app)
    const extra = await send(
      app,
      '/members/admin/help/tutorials',
      'POST',
      { slug: 'x', collectionId: colecao.id, draft: { ...documento, hacker: true } },
      adminHeaders,
    )
    // O `normalize` do Elysia DESCARTA campo não declarado (não é 400): o que importa é que
    // o campo estranho não chega ao banco.
    expect(extra.status).toBe(201)
    expect((await readJson(extra)).draft.hacker).toBeUndefined()
    const reservado = await send(
      app,
      '/members/admin/help/tutorials',
      'POST',
      { slug: 'colecao', collectionId: colecao.id, draft: documento },
      adminHeaders,
    )
    // A forma passa; o bloqueio do slug reservado aparece ao PUBLICAR.
    expect(reservado.status).toBe(201)
    const criado = await readJson(reservado)
    const pub = await send(
      app,
      `/members/admin/help/tutorials/${criado.id}/publish`,
      'POST',
      { expectedRevision: criado.revision },
      adminHeaders,
    )
    expect(pub.status).toBe(400)
    const body = await readJson(pub)
    expect(body.error.code).toBe('HELP_TUTORIAL_INVALID')
    expect(body.details.issues.map((i: { field: string }) => i.field)).toContain('slug')
  })

  test('slug duplicado → 409; PATCH com revisão velha → 409 com currentRevision', async () => {
    const { app } = buildApp()
    const colecao = await criarColecao(app)
    const tutorial = await criarTutorial(app, colecao.id)
    const dup = await send(
      app,
      '/members/admin/help/tutorials',
      'POST',
      { slug: 'estudio-pre-visualizacao', collectionId: colecao.id },
      adminHeaders,
    )
    expect(dup.status).toBe(409)

    const patch = await send(
      app,
      `/members/admin/help/tutorials/${tutorial.id}`,
      'PATCH',
      { expectedRevision: tutorial.revision, draft: { ...documento, title: 'Editado' } },
      adminHeaders,
    )
    expect(patch.status).toBe(200)
    const salvo = await readJson(patch)
    expect(salvo.revision).toBe(tutorial.revision + 1)
    expect(salvo.draft.title).toBe('Editado')

    const velho = await send(
      app,
      `/members/admin/help/tutorials/${tutorial.id}`,
      'PATCH',
      { expectedRevision: tutorial.revision, draft: documento },
      adminHeaders,
    )
    expect(velho.status).toBe(409)
    const body = await readJson(velho)
    expect(body.error.code).toBe('HELP_TUTORIAL_CONFLICT')
    expect(body.details.currentRevision).toBe(salvo.revision)
  })

  test('ciclo completo: publicar → despublicar → arquivar; arquivado não edita', async () => {
    const { app } = buildApp()
    const colecao = await criarColecao(app)
    const t = await criarTutorial(app, colecao.id)
    const pub = await readJson(
      await send(
        app,
        `/members/admin/help/tutorials/${t.id}/publish`,
        'POST',
        { expectedRevision: t.revision },
        adminHeaders,
      ),
    )
    expect(pub.status).toBe('published')
    expect(pub.hasUnpublishedChanges).toBe(false)

    // Arquivar coleção com publicado → 409.
    expect(
      (
        await send(
          app,
          `/members/admin/help/collections/${colecao.id}/archive`,
          'POST',
          null,
          adminHeaders,
        )
      ).status,
    ).toBe(409)

    const unpub = await readJson(
      await send(
        app,
        `/members/admin/help/tutorials/${t.id}/unpublish`,
        'POST',
        { expectedRevision: pub.revision },
        adminHeaders,
      ),
    )
    expect(unpub.status).toBe('draft')
    expect(unpub.published).toBeNull()
    expect(
      (await get(app, '/members/help/tutorials/estudio-pre-visualizacao', studentHeaders)).status,
    ).toBe(404)

    const arch = await readJson(
      await send(
        app,
        `/members/admin/help/tutorials/${t.id}/archive`,
        'POST',
        { expectedRevision: unpub.revision },
        adminHeaders,
      ),
    )
    expect(arch.status).toBe('archived')
    const edit = await send(
      app,
      `/members/admin/help/tutorials/${t.id}`,
      'PATCH',
      { expectedRevision: arch.revision, draft: documento },
      adminHeaders,
    )
    expect(edit.status).toBe(409)
    expect((await readJson(edit)).error.code).toBe('HELP_TUTORIAL_ARCHIVED')

    const lista = await readJson(
      await get(app, '/members/admin/help/tutorials?status=archived', adminHeaders),
    )
    expect(lista.tutorials.map((x: { slug: string }) => x.slug)).toEqual([
      'estudio-pre-visualizacao',
    ])
  })

  test('export devolve rascunho + publicado; import faz upsert por slug só no rascunho', async () => {
    const { app } = buildApp()
    const imp = await send(
      app,
      '/members/admin/help/tutorials/import',
      'POST',
      {
        collections: [
          {
            slug: 'pinta',
            title: 'Pinta',
            description: 'Desenhos',
            icon: 'palette',
            tone: 'pinta',
          },
        ],
        tutorials: [{ slug: 'pinta-camada', collection: 'pinta', draft: documento }],
      },
      adminHeaders,
    )
    expect(imp.status).toBe(200)
    expect(await readJson(imp)).toMatchObject({
      collections: { created: 1, updated: 0 },
      tutorials: { created: 1, updated: 0 },
      rejected: [],
    })
    const exp = await readJson(await get(app, '/members/admin/help/tutorials/export', adminHeaders))
    expect(exp.collections).toHaveLength(1)
    expect(exp.tutorials[0]).toMatchObject({ slug: 'pinta-camada', status: 'draft' })
    expect(exp.tutorials[0].draft).toEqual(documento)

    const outra = await send(
      app,
      '/members/admin/help/tutorials/import',
      'POST',
      { tutorials: [{ slug: 'pinta-camada', collection: 'nao-existe', draft: documento }] },
      adminHeaders,
    )
    expect((await readJson(outra)).rejected).toEqual([
      { slug: 'pinta-camada', reason: 'coleção "nao-existe" não existe ou está arquivada' },
    ])
  })

  test('full review 26/09: slug publicado é contrato de URL; import recusa repetido e arquivado; export não leva arquivado', async () => {
    const { app } = buildApp()
    await send(
      app,
      '/members/admin/help/tutorials/import',
      'POST',
      {
        collections: [
          { slug: 'pensa', title: 'Pensa', description: '', icon: 'lightbulb', tone: 'pensa' },
        ],
        tutorials: [
          { slug: 'pensa-plano', collection: 'pensa', draft: documento },
          { slug: 'pensa-plano', collection: 'pensa', draft: documento },
          { slug: 'pensa-apagar', collection: 'pensa', draft: documento },
        ],
      },
      adminHeaders,
    )
    const lista = await readJson(await get(app, '/members/admin/help/tutorials', adminHeaders))
    const plano = lista.tutorials.find((t: { slug: string }) => t.slug === 'pensa-plano')
    const apagar = lista.tutorials.find((t: { slug: string }) => t.slug === 'pensa-apagar')
    expect(plano && apagar).toBeTruthy()

    // Slug reservado não entra pelo PATCH (a mesma régua do create).
    const reservado = await send(
      app,
      `/members/admin/help/tutorials/${plano.id}`,
      'PATCH',
      { expectedRevision: plano.revision, slug: 'colecao' },
      adminHeaders,
    )
    expect(reservado.status).toBe(400)

    // Publicado: o endereço trava (as aulas e o Zappy apontam para ele).
    const pub = await send(
      app,
      `/members/admin/help/tutorials/${plano.id}/publish`,
      'POST',
      { expectedRevision: plano.revision },
      adminHeaders,
    )
    expect(pub.status).toBe(200)
    const publicado = await readJson(pub)
    const troca = await send(
      app,
      `/members/admin/help/tutorials/${plano.id}`,
      'PATCH',
      { expectedRevision: publicado.revision, slug: 'pensa-plano-novo' },
      adminHeaders,
    )
    expect(troca.status).toBe(409)
    expect((await readJson(troca)).error.code).toBe('HELP_SLUG_LOCKED')

    // Arquivado: o import não ressuscita, e o export não leva.
    await send(
      app,
      `/members/admin/help/tutorials/${apagar.id}/archive`,
      'POST',
      { expectedRevision: apagar.revision },
      adminHeaders,
    )
    const imp = await readJson(
      await send(
        app,
        '/members/admin/help/tutorials/import',
        'POST',
        {
          tutorials: [
            { slug: 'pensa-apagar', collection: 'pensa', draft: documento },
            { slug: 'pensa-x', collection: 'pensa', draft: documento },
            { slug: 'pensa-x', collection: 'pensa', draft: documento },
          ],
        },
        adminHeaders,
      ),
    )
    expect(imp.rejected).toEqual([
      { slug: 'pensa-apagar', reason: 'tutorial arquivado (o endereço fica reservado)' },
      { slug: 'pensa-x', reason: 'endereço repetido no lote' },
    ])
    expect(imp.tutorials).toEqual({ created: 1, updated: 0 })
    const exp = await readJson(await get(app, '/members/admin/help/tutorials/export', adminHeaders))
    expect(exp.tutorials.map((t: { slug: string }) => t.slug).sort()).toEqual([
      'pensa-plano',
      'pensa-x',
    ])
  })

  test('coleções: criar, editar, reordenar, arquivar e restaurar', async () => {
    const { app } = buildApp()
    const a = await criarColecao(app, 'plataforma')
    const b = await criarColecao(app, 'pinta')
    const patch = await send(
      app,
      `/members/admin/help/collections/${a.id}`,
      'PATCH',
      { title: 'Plataforma', icon: 'compass', tone: 'marca' },
      adminHeaders,
    )
    expect(patch.status).toBe(200)
    expect(await readJson(patch)).toMatchObject({ title: 'Plataforma', icon: 'compass' })

    const order = await send(
      app,
      '/members/admin/help/collections/order',
      'PUT',
      { ids: [b.id, a.id] },
      adminHeaders,
    )
    expect(order.status).toBe(200)
    expect(
      (await readJson(order)).collections.map((c: { slug: string; position: number }) => [
        c.slug,
        c.position,
      ]),
    ).toEqual([
      ['pinta', 0],
      ['plataforma', 1],
    ])

    const arch = await send(
      app,
      `/members/admin/help/collections/${a.id}/archive`,
      'POST',
      null,
      adminHeaders,
    )
    expect(arch.status).toBe(200)
    const publica = await readJson(await get(app, '/members/help/collections', studentHeaders))
    expect(publica.collections.map((c: { slug: string }) => c.slug)).toEqual(['pinta'])
    const rest = await send(
      app,
      `/members/admin/help/collections/${a.id}/restore`,
      'POST',
      null,
      adminHeaders,
    )
    expect((await readJson(rest)).status).toBe('active')
  })
})

describe('Como fazer: o Zappy enxerga o publicado', () => {
  test('o serviço do Zappy devolve o tutorial mesmo sem curso liberado', async () => {
    const { app, help } = buildApp()
    const colecao = await criarColecao(app)
    const t = await criarTutorial(app, colecao.id)
    expect(await help.searchForZappy('olhinho')).toEqual([])
    await send(
      app,
      `/members/admin/help/tutorials/${t.id}/publish`,
      'POST',
      { expectedRevision: t.revision },
      adminHeaders,
    )
    const hits = await help.searchForZappy('como vejo meu jogo olhinho')
    expect(hits).toHaveLength(1)
    expect(hits[0]).toMatchObject({ kind: 'help-tutorial', slug: 'estudio-pre-visualizacao' })
    expect(hits[0]?.content).toContain('1. Em tela estreita')
  })
})
