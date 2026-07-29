import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { buildApp } from '../helpers'

const USER = '11111111-1111-1111-1111-111111111111'
const headers = { 'x-auth-user-id': USER, 'content-type': 'application/json' }
type App = ReturnType<typeof buildApp>['app']
const readJson = (r: Response): Promise<any> => r.json()

const getRoom = (app: App) => app.handle(new Request('http://localhost/members/room', { headers }))
const buyItem = (app: App, id: string) =>
  app.handle(
    new Request(`http://localhost/members/room/items/${id}/buy`, { method: 'POST', headers }),
  )
const saveRoom = (app: App, state: unknown) =>
  app.handle(
    new Request('http://localhost/members/room', {
      method: 'PUT',
      headers,
      body: JSON.stringify(state),
    }),
  )

function seedCoins(gamification: ReturnType<typeof buildApp>['gamification'], coins: number) {
  return gamification.award({
    userId: USER,
    accountId: USER,
    audience: 'kids',
    events: [{ sourceType: 'lesson_complete', sourceId: randomUUID(), amount: 10, coins }],
    today: '2026-06-02',
    now: new Date('2026-06-02T12:00:00.000Z'),
    privileged: false,
  })
}

describe('Quarto — estado e catálogo', () => {
  test('sem quarto → vazio + tema default + catálogo owned/locked + saldo', async () => {
    const { app, gamification } = buildApp()
    await seedCoins(gamification, 100)
    const body = await readJson(await getRoom(app))
    expect(body.state).toEqual({ theme: 'aconchego', placedItems: [], pet: null })
    expect(body.balance).toBe(100)
    const sofa = body.items.find((i: { id: string }) => i.id === 'sofa')
    expect(sofa).toMatchObject({ tier: 'coins', price: 80, owned: false, locked: true })
    const cama = body.items.find((i: { id: string }) => i.id === 'cama')
    expect(cama).toMatchObject({ tier: 'free', owned: true })
  })
})

describe('Quarto — compra e montagem', () => {
  test('compra item; monta o quarto com ele; só itens possuídos sobrevivem ao save', async () => {
    const { app, gamification } = buildApp()
    await seedCoins(gamification, 100)

    const buy = await readJson(await buyItem(app, 'sofa'))
    expect(buy).toEqual({ alreadyOwned: false, balance: 20 }) // 100 - 80

    // Salva com o sofá (possuído) + uma estante NÃO comprada → estante cai.
    const saved = await readJson(
      await saveRoom(app, {
        theme: 'aconchego',
        placedItems: [
          { itemId: 'sofa', x: 2, y: 2 },
          { itemId: 'estante', x: 5, y: 0 },
        ],
        pet: null,
      }),
    )
    expect(saved.placedItems).toEqual([{ itemId: 'sofa', x: 2, y: 2 }])

    // O GET reflete o estado salvo.
    const after = await readJson(await getRoom(app))
    expect(after.state.placedItems).toEqual([{ itemId: 'sofa', x: 2, y: 2 }])
    expect(after.items.find((i: { id: string }) => i.id === 'sofa').owned).toBe(true)
  })

  test('comprar tema pago; aplicar no save', async () => {
    const { app, gamification } = buildApp()
    await seedCoins(gamification, 100)
    await buyItem(app, 'floresta') // tema 200? não — floresta custa 200 > 100
    // Sem saldo p/ floresta → 402.
    const res = await buyItem(app, 'floresta')
    expect(res.status).toBe(402)
  })

  test('comprar item grátis → 400; inexistente → 404; sem saldo → 402', async () => {
    const { app, gamification } = buildApp()
    await seedCoins(gamification, 50)
    expect((await buyItem(app, 'cama')).status).toBe(400) // grátis
    expect((await buyItem(app, 'item-fantasma')).status).toBe(404)
    expect((await buyItem(app, 'sofa')).status).toBe(402) // custa 80 > 50
  })

  test('save com tema NÃO possuído → cai no default (canonicalize)', async () => {
    const { app, gamification } = buildApp()
    await seedCoins(gamification, 10)
    const saved = await readJson(
      await saveRoom(app, { theme: 'espaco', placedItems: [], pet: null }),
    )
    expect(saved.theme).toBe('aconchego')
  })

  test('superfícies (24/07): `on`/`slot` SOBREVIVEM à borda HTTP (round-trip completo)', async () => {
    // Regressão do normalize do Elysia: campo fora do DTO é REMOVIDO — sem `on`/`slot`
    // no RoomStateBody o filho virava item de chão em (0,0) e a colocação se perdia.
    const { app } = buildApp()
    const saved = await readJson(
      await saveRoom(app, {
        theme: 'aconchego',
        placedItems: [
          { itemId: 'mesa', x: 4, y: 4 },
          { itemId: 'bola', x: 0, y: 0, on: 'mesa', slot: 1 },
        ],
        pet: null,
      }),
    )
    expect(saved.placedItems).toEqual([
      { itemId: 'mesa', x: 4, y: 4 },
      { itemId: 'bola', x: 0, y: 0, on: 'mesa', slot: 1 },
    ])
    const after = await readJson(await getRoom(app))
    expect(after.state.placedItems).toContainEqual({
      itemId: 'bola',
      x: 0,
      y: 0,
      on: 'mesa',
      slot: 1,
    })
  })
})
