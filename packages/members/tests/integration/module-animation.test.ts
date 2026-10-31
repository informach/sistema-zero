import { expect, test } from 'bun:test'
import { buildApp } from '../helpers'

test('real module HTTP preserves, replaces and clears the complete animation reference', async () => {
  const { app } = buildApp()
  const send = (path: string, method: string, body?: unknown) =>
    app.handle(
      new Request(`http://localhost${path}`, {
        method,
        headers: { 'content-type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
    )
  const courseResponse = await send('/members/admin/courses', 'POST', {
    slug: 'arte',
    title: 'Arte',
    status: 'draft',
  })
  const course = (await courseResponse.json()) as { id: string }
  expect(course.id).toBeString()
  const animation = {
    format: 'edi-animation',
    version: 1,
    url: 'https://cdn.example/arte.edi-animation.json',
    title: 'Arte do módulo',
    bytes: 1234,
    sha256: 'a'.repeat(64),
    poster: {
      url: 'https://cdn.example/arte.png',
      width: 512,
      height: 512,
      sha256: 'b'.repeat(64),
    },
  }
  const created = await send(`/members/admin/courses/${course.id}/modules`, 'POST', {
    title: 'Unidade',
    animation,
  })
  expect(created.ok).toBe(true)
  const module = (await created.json()) as { id: string; animation: unknown }
  expect(module.animation).toEqual(animation)
  const renamed = await send(`/members/admin/modules/${module.id}`, 'PATCH', {
    title: 'Outro nome',
  })
  expect(renamed.ok).toBe(true)
  expect((await renamed.json()).animation).toEqual(animation)
  const tree = await app.handle(new Request(`http://localhost/members/admin/courses/${course.id}`))
  expect((await tree.json()).modules[0].animation).toEqual(animation)
  for (const changed of [
    { ...animation, version: 2 },
    { ...animation, url: 'javascript:alert(1)' },
    { ...animation, extra: 'discarded silently' },
    { ...animation, poster: { ...animation.poster, width: 999999 } },
  ]) {
    const refused = await send(`/members/admin/modules/${module.id}`, 'PATCH', {
      title: 'Não deve salvar',
      animation: changed,
    })
    expect(refused.status).toBe(400)
    const unchanged = await app.handle(
      new Request(`http://localhost/members/admin/courses/${course.id}`),
    )
    const view = await unchanged.json()
    expect(view.modules[0].title).toBe('Outro nome')
    expect(view.modules[0].animation).toEqual(animation)
  }
  const cleared = await send(`/members/admin/modules/${module.id}`, 'PATCH', {
    title: 'Sem arte',
    animation: null,
  })
  expect(cleared.ok).toBe(true)
  expect((await cleared.json()).animation).toBeNull()
})
