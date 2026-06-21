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

describe('Avatar 3D — estado e catálogo', () => {
  test('sem config → default grátis + catálogo (owned/locked/price) + paletas/oclusão + saldo', async () => {
    const { app, gamification } = buildApp()
    await seedCoins(gamification, 100)

    const body = await readJson(await getAvatar(app))
    expect(body.style).toBe('char-v1')
    expect(body.balance).toBe(100)
    // Default: peça+cor por categoria (slot = {asset, color?}).
    expect(body.equipped.hair.asset).toBe('hair-01')
    expect(body.equipped.head.color).toBe('#ecad80')

    const paid = body.parts.find((p: { id: string }) => p.id === 'hair-04')
    expect(paid).toMatchObject({
      category: 'hair',
      tier: 'coins',
      price: 60,
      owned: false,
      locked: true,
    })
    const freePart = body.parts.find((p: { id: string }) => p.id === 'hair-01')
    expect(freePart).toMatchObject({ tier: 'free', owned: true, locked: false })

    // Paletas + oclusão + removíveis viajam no estado (p/ o configurador).
    expect(Array.isArray(body.palettes.hair)).toBe(true)
    expect(body.hideGroups.hat).toContain('hair')
    expect(body.removable.glasses).toBe('glasses-none')
  })
})

describe('Avatar 3D — compra (sink de moedas)', () => {
  test('compra debita, fica owned, e re-compra é no-op (sem cobrar 2×)', async () => {
    const { app, gamification } = buildApp()
    await seedCoins(gamification, 100)

    const buy = await readJson(await buyPart(app, 'hair-04'))
    expect(buy).toEqual({ alreadyOwned: false, balance: 40 }) // 100 - 60

    const after = await readJson(await getAvatar(app))
    expect(after.balance).toBe(40)
    expect(after.parts.find((p: { id: string }) => p.id === 'hair-04').owned).toBe(true)

    const again = await readJson(await buyPart(app, 'hair-04'))
    expect(again).toEqual({ alreadyOwned: true, balance: 40 }) // não cobra de novo
  })

  test('débito sem posse é recuperado no retry da MESMA compra (sem cobrar 2×)', async () => {
    const { app, gamification, avatar } = buildApp()
    await seedCoins(gamification, 100)
    // Estado em que a moeda já foi debitada (coin_event existe + saldo caiu) mas o item NUNCA
    // entrou no inventário — o que um crash entre transações deixaria. A compra atômica
    // (`spendCoins` concede a posse na MESMA transação) torna esse estado impossível em prod;
    // este teste fixa o CONTRATO de recuperação: o retry da mesma compra repõe a posse via
    // ALREADY_SPENT sem novo débito (a atomicidade em si só se prova contra o Postgres real).
    const key = `${USER}:kids`
    const seeded = gamification.profiles.get(key)
    gamification.profiles.set(key, {
      ...(seeded as NonNullable<typeof seeded>),
      coinBalance: 40, // já debitado (100 - 60)
    })
    gamification.coinEvents.push({
      userId: USER,
      audience: 'kids',
      sourceType: 'spend_cosmetic',
      sourceId: `avatar-buy:${USER}:hair-04`,
      amount: -60,
      balanceAfter: 40,
      createdAt: new Date('2026-06-02T12:00:00.000Z'),
    })
    expect(await avatar.listInventory(USER, 'kids')).not.toContain('hair-04') // ainda sem posse

    // Retry da MESMA compra → ALREADY_SPENT recupera a posse SEM cobrar de novo.
    const retry = await readJson(await buyPart(app, 'hair-04'))
    expect(retry).toEqual({ alreadyOwned: false, balance: 40 }) // saldo intocado
    expect(await avatar.listInventory(USER, 'kids')).toContain('hair-04') // posse recuperada
    expect((await readJson(await getAvatar(app))).balance).toBe(40) // sem débito duplo
  })

  test('sem saldo → 402 INSUFFICIENT_COINS', async () => {
    const { app, gamification } = buildApp()
    await seedCoins(gamification, 40)
    const res = await buyPart(app, 'glasses-04') // custa 120
    expect(res.status).toBe(402)
    expect((await readJson(res)).error.code).toBe('INSUFFICIENT_COINS')
  })

  test('comprar peça grátis → 400; peça inexistente → 404', async () => {
    const { app, gamification } = buildApp()
    await seedCoins(gamification, 100)

    const freeBuy = await buyPart(app, 'hair-01')
    expect(freeBuy.status).toBe(400)
    expect((await readJson(freeBuy)).error.code).toBe('AVATAR_PART_FREE')

    const unknown = await buyPart(app, 'peca-fantasma')
    expect(unknown.status).toBe(404)
    expect((await readJson(unknown)).error.code).toBe('AVATAR_PART_NOT_FOUND')
  })
})

describe('Avatar 3D — equipar (escrita estrita)', () => {
  test('equipa peça grátis + comprada com cor; preenche categorias faltantes', async () => {
    const { app, gamification } = buildApp()
    await seedCoins(gamification, 100)
    await buyPart(app, 'hair-04')

    const res = await putAvatar(app, {
      slots: {
        hair: { asset: 'hair-04', color: '#27ae60' },
        head: { asset: 'head-02', color: '#9e5622' },
      },
    })
    expect(res.status).toBe(200)
    const body = await readJson(res)
    expect(body.equipped.hair).toEqual({ asset: 'hair-04', color: '#27ae60' })
    expect(body.equipped.head.asset).toBe('head-02')
    expect(body.equipped.eyes.asset).toBe('eyes-01') // categoria faltante → default
  })

  test('equipar peça paga NÃO possuída → 403 AVATAR_PART_NOT_OWNED', async () => {
    const { app } = buildApp()
    const res = await putAvatar(app, { slots: { hair: { asset: 'hair-07' } } })
    expect(res.status).toBe(403)
    expect((await readJson(res)).error.code).toBe('AVATAR_PART_NOT_OWNED')
  })

  test('peça desconhecida → 400; cor fora da paleta → 400', async () => {
    const { app } = buildApp()
    const ok = await putAvatar(app, { slots: { hair: { asset: 'hair-01' } } })
    expect(ok.status).toBe(200) // sanity: válido passa

    const bad = await putAvatar(app, { slots: { eyes: { asset: 'olhos-roxos-magicos' } } })
    expect(bad.status).toBe(400)
    expect((await readJson(bad)).error.code).toBe('AVATAR_INVALID')

    // Hex válido no FORMATO mas fora da paleta da categoria → 400 (domínio).
    const badColor = await putAvatar(app, {
      slots: { hair: { asset: 'hair-01', color: '#123456' } },
    })
    expect(badColor.status).toBe(400)
    expect((await readJson(badColor)).error.code).toBe('AVATAR_INVALID')
  })
})

describe('Avatar 3D — foto (snapshot)', () => {
  const putPhoto = (app: App, photoUrl: string) =>
    app.handle(
      new Request('http://localhost/members/avatar/photo', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ photoUrl }),
      }),
    )

  test('grava a URL (upsert sem equipar antes); aparece no GET; rejeita não-http', async () => {
    const { app } = buildApp()

    const put = await putPhoto(app, 'https://cdn.sistemazero.com.br/community/avatar3d/x/a.webp')
    expect(put.status).toBe(200)
    expect((await readJson(put)).photoUrl).toBe(
      'https://cdn.sistemazero.com.br/community/avatar3d/x/a.webp',
    )

    const state = await readJson(await getAvatar(app))
    expect(state.photoUrl).toBe('https://cdn.sistemazero.com.br/community/avatar3d/x/a.webp')

    // Formato inválido (javascript:) barrado na borda (DTO `^https?://`).
    const bad = await putPhoto(app, 'javascript:alert(1)')
    expect(bad.status).toBe(400)
  })
})
