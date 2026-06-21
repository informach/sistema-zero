import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { buildApp } from '../helpers'

const USER = '11111111-1111-1111-1111-111111111111'
const headers = { 'x-auth-user-id': USER, 'content-type': 'application/json' }
type App = ReturnType<typeof buildApp>['app']
const readJson = (r: Response): Promise<any> => r.json()

const getAvatar = (app: App) =>
  app.handle(new Request('http://localhost/members/avatar', { headers }))
const buyPart = (app: App, partId: string) =>
  app.handle(
    new Request(`http://localhost/members/avatar/parts/${partId}/buy`, { method: 'POST', headers }),
  )
const putAvatar = (app: App, body: unknown) =>
  app.handle(
    new Request('http://localhost/members/avatar', {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    }),
  )

/** Concede moedas kids ao USER direto no ledger (atalho de setup; respeita o teto). */
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

describe('Avatar — estado e catálogo', () => {
  test('sem config → default grátis + catálogo com owned/locked/price + saldo', async () => {
    const { app, gamification } = buildApp()
    await seedCoins(gamification, 100)

    const body = await readJson(await getAvatar(app))
    expect(body.style).toBe('adventurer')
    expect(body.balance).toBe(100)
    // Default: pele/cabelo/cor preenchidos com o conjunto grátis.
    expect(body.equipped.hair).toBe('cabelo-curtinho')

    const cacheado = body.parts.find((p: { id: string }) => p.id === 'cabelo-cacheado')
    expect(cacheado).toMatchObject({ tier: 'coins', price: 60, owned: false, locked: true })
    const curtinho = body.parts.find((p: { id: string }) => p.id === 'cabelo-curtinho')
    expect(curtinho).toMatchObject({ tier: 'free', owned: true, locked: false })
  })
})

describe('Avatar — compra (sink de moedas)', () => {
  test('compra debita, fica owned, e re-compra é no-op (sem cobrar 2×)', async () => {
    const { app, gamification } = buildApp()
    await seedCoins(gamification, 100)

    const buy = await readJson(await buyPart(app, 'cabelo-cacheado'))
    expect(buy).toEqual({ alreadyOwned: false, balance: 40 }) // 100 - 60

    const after = await readJson(await getAvatar(app))
    expect(after.balance).toBe(40)
    expect(after.parts.find((p: { id: string }) => p.id === 'cabelo-cacheado').owned).toBe(true)

    const again = await readJson(await buyPart(app, 'cabelo-cacheado'))
    expect(again).toEqual({ alreadyOwned: true, balance: 40 }) // não cobra de novo
  })

  test('sem saldo → 402 INSUFFICIENT_COINS', async () => {
    const { app, gamification } = buildApp()
    await seedCoins(gamification, 40)
    const res = await buyPart(app, 'oculos-estiloso') // custa 120
    expect(res.status).toBe(402)
    expect((await readJson(res)).error.code).toBe('INSUFFICIENT_COINS')
  })

  test('comprar peça grátis → 400; peça inexistente → 404', async () => {
    const { app, gamification } = buildApp()
    await seedCoins(gamification, 100)

    const free = await buyPart(app, 'cabelo-curtinho')
    expect(free.status).toBe(400)
    expect((await readJson(free)).error.code).toBe('AVATAR_PART_FREE')

    const unknown = await buyPart(app, 'peca-fantasma')
    expect(unknown.status).toBe(404)
    expect((await readJson(unknown)).error.code).toBe('AVATAR_PART_NOT_FOUND')
  })
})

describe('Avatar — equipar (escrita estrita)', () => {
  test('equipa peça grátis + comprada; preenche camadas faltantes no retorno', async () => {
    const { app, gamification } = buildApp()
    await seedCoins(gamification, 100)
    await buyPart(app, 'cabelo-cacheado')

    const res = await putAvatar(app, { parts: { hair: 'cabelo-cacheado', skin: 'pele-escura' } })
    expect(res.status).toBe(200)
    const body = await readJson(res)
    expect(body.equipped.hair).toBe('cabelo-cacheado')
    expect(body.equipped.skin).toBe('pele-escura')
    expect(body.equipped.eyes).toBe('olhos-alegres') // camada faltante → default
  })

  test('equipar peça paga NÃO possuída → 403 AVATAR_PART_NOT_OWNED', async () => {
    const { app } = buildApp()
    const res = await putAvatar(app, { parts: { hair: 'cabelo-moicano' } })
    expect(res.status).toBe(403)
    expect((await readJson(res)).error.code).toBe('AVATAR_PART_NOT_OWNED')
  })

  test('equipar peça desconhecida → 400 AVATAR_INVALID', async () => {
    const { app } = buildApp()
    const res = await putAvatar(app, { parts: { hair: 'cabelo-curtinho', skin: 'pele-clara' } })
    expect(res.status).toBe(200) // sanity: válido passa
    const bad = await putAvatar(app, { parts: { eyes: 'olhos-roxos-magicos' } })
    expect(bad.status).toBe(400)
    expect((await readJson(bad)).error.code).toBe('AVATAR_INVALID')
  })
})
