import { describe, expect, test } from 'bun:test'
import { buildApp } from '../helpers'

type App = ReturnType<typeof buildApp>['app']
const readJson = (res: Response): Promise<any> => res.json()
const adminHeaders = { 'x-auth-user-role': 'admin', 'x-auth-user-status': 'active' }

const get = (app: App, path: string, headers: Record<string, string> = {}) =>
  app.handle(new Request(`http://localhost${path}`, { headers }))
const send = (
  app: App,
  path: string,
  method: string,
  body?: unknown,
  headers: Record<string, string> = {},
) =>
  app.handle(
    new Request(`http://localhost${path}`, {
      method,
      headers: { 'content-type': 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  )

const COURSE = {
  slug: 'curso-novo',
  title: 'Curso Novo',
  subtitle: null,
  description: null,
  coverImageUrl: null,
  status: 'draft',
}

async function createCourse(app: App, over: Record<string, unknown> = {}) {
  const res = await send(app, '/members/admin/courses', 'POST', { ...COURSE, ...over })
  return readJson(res)
}

describe('Members HTTP — autoria: cursos', () => {
  test('ciclo de vida: criar → listar → árvore → editar → excluir', async () => {
    const { app } = buildApp()
    const created = await createCourse(app)
    expect(created.id).toBeTruthy()
    expect(created.status).toBe('draft')

    const list = await readJson(await get(app, '/members/admin/courses'))
    expect(list.total).toBe(1)
    expect(list.items[0].slug).toBe('curso-novo')

    const tree = await readJson(await get(app, `/members/admin/courses/${created.id}`))
    expect(tree.modules).toEqual([])

    const patched = await send(app, `/members/admin/courses/${created.id}`, 'PATCH', {
      ...COURSE,
      title: 'Curso Editado',
      status: 'published',
    })
    expect(patched.status).toBe(200)
    expect((await readJson(patched)).title).toBe('Curso Editado')

    expect((await send(app, `/members/admin/courses/${created.id}`, 'DELETE')).status).toBe(200)
    expect((await get(app, `/members/admin/courses/${created.id}`)).status).toBe(404)
  })

  test('slug de curso duplicado → 409 DUPLICATE_SLUG', async () => {
    const { app } = buildApp()
    await createCourse(app)
    const dup = await send(app, '/members/admin/courses', 'POST', COURSE)
    expect(dup.status).toBe(409)
    expect((await readJson(dup)).error.code).toBe('DUPLICATE_SLUG')
  })

  test('slug inválido (maiúsculas/espaços) → 400', async () => {
    const { app } = buildApp()
    const bad = await send(app, '/members/admin/courses', 'POST', {
      ...COURSE,
      slug: 'Slug Inválido',
    })
    expect(bad.status).toBe(400)
  })
})

describe('Members HTTP — autoria: árvore de conteúdo', () => {
  async function seedTree(app: App) {
    const course = await createCourse(app)
    const mod = await readJson(
      await send(app, `/members/admin/courses/${course.id}/modules`, 'POST', {
        title: 'Módulo 1',
        summary: null,
      }),
    )
    const lesson = await readJson(
      await send(app, `/members/admin/modules/${mod.id}/lessons`, 'POST', {
        slug: 'aula-1',
        title: 'Aula 1',
        estimatedMinutes: 5,
      }),
    )
    return { course, mod, lesson }
  }

  test('curso → módulo → aula → blocos; árvore e conteúdo refletem', async () => {
    const { app } = buildApp()
    const { course, lesson } = await seedTree(app)

    const b1 = await send(app, `/members/admin/lessons/${lesson.id}/blocks`, 'POST', {
      content: { kind: 'rich_text', markdown: '# Olá' },
    })
    expect(b1.status).toBe(201)
    await send(app, `/members/admin/lessons/${lesson.id}/blocks`, 'POST', {
      content: { kind: 'video', provider: 'youtube', src: 'https://y/1' },
    })

    const tree = await readJson(await get(app, `/members/admin/courses/${course.id}`))
    expect(tree.modules).toHaveLength(1)
    expect(tree.modules[0].lessons).toHaveLength(1)

    const content = await readJson(await get(app, `/members/admin/lessons/${lesson.id}/content`))
    expect(content.blocks.map((b: { kind: string }) => b.kind)).toEqual(['rich_text', 'video'])
  })

  test('slug de aula duplicado no mesmo curso → 409', async () => {
    const { app } = buildApp()
    const { mod } = await seedTree(app)
    const dup = await send(app, `/members/admin/modules/${mod.id}/lessons`, 'POST', {
      slug: 'aula-1',
      title: 'Outra',
      estimatedMinutes: null,
    })
    expect(dup.status).toBe(409)
  })

  test('bloco de vídeo sem src → 400 (validação da união)', async () => {
    const { app } = buildApp()
    const { lesson } = await seedTree(app)
    const bad = await send(app, `/members/admin/lessons/${lesson.id}/blocks`, 'POST', {
      content: { kind: 'video', provider: 'youtube' },
    })
    expect(bad.status).toBe(400)
  })

  test('excluir módulo remove as aulas em cascata', async () => {
    const { app } = buildApp()
    const { course, mod, lesson } = await seedTree(app)
    expect((await send(app, `/members/admin/modules/${mod.id}`, 'DELETE')).status).toBe(200)

    const tree = await readJson(await get(app, `/members/admin/courses/${course.id}`))
    expect(tree.modules).toHaveLength(0)
    expect((await get(app, `/members/admin/lessons/${lesson.id}/content`)).status).toBe(404)
  })
})

describe('Members HTTP — autoria: reordenação', () => {
  test('reordenar módulos troca a ordem; ids errados → 400', async () => {
    const { app } = buildApp()
    const course = await createCourse(app)
    const m1 = await readJson(
      await send(app, `/members/admin/courses/${course.id}/modules`, 'POST', {
        title: 'A',
        summary: null,
      }),
    )
    const m2 = await readJson(
      await send(app, `/members/admin/courses/${course.id}/modules`, 'POST', {
        title: 'B',
        summary: null,
      }),
    )

    const ok = await send(app, `/members/admin/courses/${course.id}/modules/reorder`, 'POST', {
      orderedIds: [m2.id, m1.id],
    })
    expect(ok.status).toBe(200)
    const tree = await readJson(await get(app, `/members/admin/courses/${course.id}`))
    expect(tree.modules.map((m: { title: string }) => m.title)).toEqual(['B', 'A'])

    const bad = await send(app, `/members/admin/courses/${course.id}/modules/reorder`, 'POST', {
      orderedIds: [m1.id],
    })
    expect(bad.status).toBe(400)
  })
})

describe('Members HTTP — autoria: not found + RBAC', () => {
  test('editar/excluir inexistente → 404', async () => {
    const { app } = buildApp()
    const rid = '00000000-0000-0000-0000-000000000000'
    expect((await send(app, `/members/admin/courses/${rid}`, 'PATCH', COURSE)).status).toBe(404)
    expect(
      (await send(app, `/members/admin/modules/${rid}`, 'PATCH', { title: 'x', summary: null }))
        .status,
    ).toBe(404)
    expect((await send(app, `/members/admin/blocks/${rid}`, 'DELETE')).status).toBe(404)
  })

  test('com requireAdmin: sem role → 401; customer → 403; admin → 201', async () => {
    const { app } = buildApp({ requireAdmin: true })
    expect((await send(app, '/members/admin/courses', 'POST', COURSE)).status).toBe(401)
    expect(
      (
        await send(app, '/members/admin/courses', 'POST', COURSE, {
          'x-auth-user-role': 'customer',
        })
      ).status,
    ).toBe(403)
    expect((await send(app, '/members/admin/courses', 'POST', COURSE, adminHeaders)).status).toBe(
      201,
    )
  })
})
