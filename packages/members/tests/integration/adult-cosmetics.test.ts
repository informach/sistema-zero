import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { AVATAR_CATALOG } from '@sistemazero/core/avatar'
import { z } from 'zod'
import { buildApp } from '../helpers'

const AvatarView = z.object({ balance: z.number(), owned: z.array(z.string()) })
/** Uma peça paga de 60 moedas do pack. */
const PECA =
  Object.entries(AVATAR_CATALOG.parts).find(
    ([, p]) => p.tier === 'coins' && p.price === 60 && !p.hidden,
  )?.[0] ?? ''
const RoomView = z.object({ placedItems: z.array(z.unknown()) })

test('adulto compra e salva avatar/espaço com seu saldo, sem alterar inventário Kids da mesma conta', async () => {
  const { app, gamification } = buildApp()
  const userId = randomUUID()
  const headers = { 'x-auth-user-id': userId, 'content-type': 'application/json' }
  for (const audience of ['adult', 'kids'] as const)
    await gamification.award({
      userId,
      accountId: userId,
      audience,
      events: [{ sourceType: 'lesson_complete', sourceId: randomUUID(), amount: 10, coins: 100 }],
      today: '2026-10-18',
      now: new Date('2026-10-18T12:00:00Z'),
      privileged: false,
    })
  async function request(path: string, audience: 'adult' | 'kids', method = 'GET', body?: unknown) {
    return app.handle(
      new Request(`http://localhost/members/${path}?audience=${audience}`, {
        headers,
        method,
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      }),
    )
  }
  const buy = await request(`avatar/parts/${PECA}/buy`, 'adult', 'POST')
  expect(buy.status).toBe(200)
  expect(await buy.json()).toEqual({ alreadyOwned: false, balance: 40 })
  expect(await (await request(`avatar/parts/${PECA}/buy`, 'adult', 'POST')).json()).toEqual({
    alreadyOwned: true,
    balance: 40,
  })
  const adultAvatar = AvatarView.parse(await (await request('avatar', 'adult')).json())
  const kidsAvatar = AvatarView.parse(await (await request('avatar', 'kids')).json())
  expect(adultAvatar.owned).toContain(PECA)
  expect(kidsAvatar.owned).not.toContain(PECA)
  expect(kidsAvatar.balance).toBe(100)
  expect((await request('room/items/sofa/buy', 'adult', 'POST')).status).toBe(402)
  expect((await request('room/items/sofa/buy', 'kids', 'POST')).status).toBe(200)
  const state = { theme: 'aconchego', placedItems: [{ itemId: 'sofa', x: 2, y: 2 }], pet: null }
  const adultRoom = RoomView.parse(await (await request('room', 'adult', 'PUT', state)).json())
  const kidsRoom = RoomView.parse(await (await request('room', 'kids', 'PUT', state)).json())
  expect(adultRoom.placedItems).toEqual([])
  expect(kidsRoom.placedItems).toEqual(state.placedItems)
})
