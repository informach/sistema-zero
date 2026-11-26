import { expect, test } from 'bun:test'
import { buildApp } from '../helpers'

/**
 * "Começaram o curso do presente" (Admin › campanha, 25/11/2026): a rota pergunta ao leitor só
 * pelas contas pedidas (sem repetir) e recusa curso inexistente, papel de fora e lote grande.
 */
const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'
const staff = { 'x-auth-user-role': 'staff', 'x-auth-user-status': 'active' }

function post(app: ReturnType<typeof buildApp>['app'], body: unknown, headers = staff) {
  return app.handle(
    new Request('http://members/members/admin/course-starts', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
    }),
  )
}

test('as contas que começaram, só entre as pedidas', async () => {
  const asked: { slug: string; ids: string[] }[] = []
  const { app } = buildApp({
    requireAdmin: true,
    courseStarts: {
      async startedAccounts(slug, ids) {
        asked.push({ slug, ids })
        return slug === 'cade-todo-mundo' ? ids.filter((id) => id === A) : null
      },
    },
  })
  const res = await post(app, { courseSlug: 'cade-todo-mundo', userIds: [A, B, A] })
  expect(res.status).toBe(200)
  expect(await res.json()).toEqual({ started: [A] })
  expect(asked[0]?.ids).toEqual([A, B])
  expect((await post(app, { courseSlug: 'nao-existe', userIds: [A] })).status).toBe(404)
  const tooMany = Array.from({ length: 501 }, () => A)
  expect((await post(app, { courseSlug: 'cade-todo-mundo', userIds: tooMany })).status).toBe(400)
  const member = { 'x-auth-user-role': 'member', 'x-auth-user-status': 'active' }
  expect((await post(app, { courseSlug: 'cade-todo-mundo', userIds: [A] }, member)).status).toBe(
    403,
  )
})
