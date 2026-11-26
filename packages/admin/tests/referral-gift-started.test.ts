import { expect, mock, test } from 'bun:test'

mock.module('server-only', () => ({}))

const { withGiftStarted } = await import('../src/server/referrals')

/**
 * "Começaram o curso do presente" (25/11/2026): o BFF pergunta ao members pelas contas do
 * presente, em lotes, e nunca devolve as contas ao navegador.
 */
const detail = (accounts: string[]) =>
  ({
    status: 200,
    body: {
      results: { people: 3, gifts: 3, purchases: 0, subscriptions: 0, revenueCents: '0' },
      byOffer: [],
      people: [],
      peopleTotal: 3,
      giftCourses: [{ courseSlug: 'cade-todo-mundo', people: 3, accountUserIds: accounts }],
    },
  }) as never

test('soma as que começaram, em lotes de 500, e tira as contas do corpo', async () => {
  const accounts = Array.from({ length: 501 }, (_, i) => `conta-${i}`)
  const batches: number[] = []
  const out = await withGiftStarted(detail(accounts), async (_slug, ids) => {
    batches.push(ids.length)
    return { status: 200, body: { started: ids.slice(0, 2) } }
  })
  expect(batches).toEqual([500, 1])
  expect(out.body.giftStarted).toEqual({ people: 3, started: 3 })
  expect('giftCourses' in out.body).toBe(false)
})

test('members fora: o número some (null), sem quebrar o detalhe', async () => {
  const out = await withGiftStarted(detail(['a']), async () => ({ status: 503, body: null }))
  expect(out.body.giftStarted).toBeNull()
  expect(out.body.peopleTotal).toBe(3)
  expect('giftCourses' in out.body).toBe(false)
})

test('sem presente na origem: nada é perguntado', async () => {
  let asked = false
  const out = await withGiftStarted(
    { status: 200, body: { ...(detail([]) as { body: object }).body, giftCourses: [] } } as never,
    async () => {
      asked = true
      return { status: 200, body: { started: [] } }
    },
  )
  expect(asked).toBe(false)
  expect(out.body.giftStarted).toBeUndefined()
})
