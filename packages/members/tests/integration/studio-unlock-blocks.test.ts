import { describe, expect, test } from 'bun:test'
import { buildApp } from '../helpers'

type App = ReturnType<typeof buildApp>['app']
const readJson = (res: Response): Promise<any> => res.json()

const get = (app: App, path: string) => app.handle(new Request(`http://localhost${path}`))
const send = (app: App, path: string, method: string, body?: unknown) =>
  app.handle(
    new Request(`http://localhost${path}`, {
      method,
      headers: { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  )

const COURSE = {
  slug: 'curso-curriculo',
  title: 'Curso do Currículo',
  subtitle: null,
  description: null,
  coverImageUrl: null,
  status: 'draft',
  audience: 'kids',
}

async function createCourse(app: App, over: Record<string, unknown> = {}) {
  return readJson(await send(app, '/members/admin/courses', 'POST', { ...COURSE, ...over }))
}

/** Simula o editor: lê a versão atual e a ecoa no PATCH (concorrência otimista). */
async function patchCourse(app: App, id: string, body: Record<string, unknown>) {
  const current = await readJson(await get(app, `/members/admin/courses/${id}`))
  return send(app, `/members/admin/courses/${id}`, 'PATCH', { ...body, version: current.version })
}

/**
 * `studioUnlockBlocks` é o currículo do Estúdio: os blocos que o curso libera quando o
 * aluno o conclui E publica no Mural. Ele vive em `metadata` (jsonb, sem migração) e tem
 * uma régua DIFERENTE da do vizinho `salesPageUrl`:
 *
 * ⚠️ **AUSENTE PRESERVA** (como `audience`/`level`), não limpa. É uma decisão deliberada e
 * load-bearing: um PATCH vindo de um build antigo do admin — que nem conhece o campo — não
 * pode apagar em silêncio as ferramentas que a professora liberou. Nada verificava isso, e
 * é justamente o tipo de regra que se perde numa refatoração do form.
 */
describe('Members HTTP — currículo do Estúdio no curso', () => {
  test('vai e volta pela API (create → view)', async () => {
    const { app } = buildApp()
    const created = await createCourse(app, {
      studioUnlockBlocks: ['sz_g2d_create_ship', 'sz_g2d_on_key'],
    })
    expect(created.studioUnlockBlocks).toEqual(['sz_g2d_create_ship', 'sz_g2d_on_key'])
    const listed = await readJson(await get(app, '/members/admin/courses'))
    expect(listed.items[0].studioUnlockBlocks).toEqual(['sz_g2d_create_ship', 'sz_g2d_on_key'])
  })

  test('curso sem o campo nasce com a lista vazia (não libera nada)', async () => {
    const { app } = buildApp()
    expect((await createCourse(app)).studioUnlockBlocks).toEqual([])
  })

  test('PATCH com a lista troca o conteúdo', async () => {
    const { app } = buildApp()
    const created = await createCourse(app, { studioUnlockBlocks: ['sz_g2d_create_ship'] })
    const updated = await readJson(
      await patchCourse(app, created.id, { ...COURSE, studioUnlockBlocks: ['sz_g2d_on_key'] }),
    )
    expect(updated.studioUnlockBlocks).toEqual(['sz_g2d_on_key'])
  })

  test('⭐⭐ PATCH SEM o campo PRESERVA a lista (build antigo do admin não apaga currículo)', async () => {
    const { app } = buildApp()
    const created = await createCourse(app, {
      studioUnlockBlocks: ['sz_g2d_create_ship', 'sz_g2d_on_key'],
    })
    // O corpo NÃO menciona `studioUnlockBlocks` — é o PATCH que um admin desatualizado manda.
    const updated = await readJson(
      await patchCourse(app, created.id, { ...COURSE, title: 'Outro' }),
    )
    expect(updated.title).toBe('Outro')
    expect(updated.studioUnlockBlocks).toEqual(['sz_g2d_create_ship', 'sz_g2d_on_key'])
  })

  test('⭐ `null` e `[]` LIMPAM de propósito (a professora tirando tudo)', async () => {
    const { app } = buildApp()
    const created = await createCourse(app, { studioUnlockBlocks: ['sz_g2d_create_ship'] })
    const comNull = await readJson(
      await patchCourse(app, created.id, { ...COURSE, studioUnlockBlocks: null }),
    )
    expect(comNull.studioUnlockBlocks).toEqual([])

    const outro = await createCourse(app, {
      slug: 'curso-2',
      studioUnlockBlocks: ['sz_g2d_create_ship'],
    })
    const comVazio = await readJson(
      await patchCourse(app, outro.id, { ...COURSE, slug: 'curso-2', studioUnlockBlocks: [] }),
    )
    expect(comVazio.studioUnlockBlocks).toEqual([])
  })

  test('⚠️ mexer no currículo NÃO derruba as outras chaves do metadata', async () => {
    // `salesPageUrl` mora no MESMO jsonb e tem régua oposta (ausente LIMPA) — o patcher
    // precisa tratar as duas sem uma comer a outra.
    const { app } = buildApp()
    const created = await createCourse(app, {
      salesPageUrl: 'https://exemplo.com/curso',
      studioUnlockBlocks: ['sz_g2d_create_ship'],
    })
    expect(created.salesPageUrl).toBe('https://exemplo.com/curso')
    const updated = await readJson(
      await patchCourse(app, created.id, {
        ...COURSE,
        salesPageUrl: 'https://exemplo.com/curso',
        studioUnlockBlocks: ['sz_g2d_on_key'],
      }),
    )
    expect(updated.salesPageUrl).toBe('https://exemplo.com/curso')
    expect(updated.studioUnlockBlocks).toEqual(['sz_g2d_on_key'])
  })

  test('repetido é deduplicado e espaço em branco é aparado', async () => {
    const { app } = buildApp()
    const created = await createCourse(app, {
      studioUnlockBlocks: ['sz_g2d_create_ship', 'sz_g2d_create_ship'],
    })
    expect(created.studioUnlockBlocks).toEqual(['sz_g2d_create_ship'])
  })

  test('id fora do formato de bloco é recusado na BORDA (o members não conhece o catálogo)', async () => {
    const { app } = buildApp()
    const res = await send(app, '/members/admin/courses', 'POST', {
      ...COURSE,
      slug: 'curso-invalido',
      studioUnlockBlocks: ['bloco com espaço'],
    })
    expect(res.status).toBe(400)
  })
})
