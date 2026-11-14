import { expect, test } from 'bun:test'
import { createMoradaHouse } from '@sistemazero/core/morada'
import { ArquipelagoRoomService } from '../../src/application/arquipelago/arquipelago-room.service'
import { MoradaHouseService } from '../../src/application/room/morada-house.service'
import type {
  MoradaHouseRecord,
  MoradaHouseRepository,
} from '../../src/domain/ports/morada-house-repository.port'
import { buildApp } from '../helpers'

test('casa, quarto, perfil público e leitura de visita sobrevivem à retirada de uma peça', async () => {
  const user = '22222222-2222-4222-8222-222222222222'
  const account = '33333333-3333-4333-8333-333333333333'
  const house = createMoradaHouse()
  const valid = house.instances.find((i) => i.id === 'cadeira-inicial')!
  house.instances = [
    valid,
    { ...valid, id: 'retirado', pieceId: 'moveis/peca-antiga' },
    { ...valid, id: 'orfao', parentId: 'retirado', slotId: 'nicho' },
  ]
  house.pet = 'pets/peca-antiga'
  const repository: MoradaHouseRepository = {
    get: async () => ({ house, revision: 9 }),
    compareAndSwap: async () => null,
  }
  const rooms = {
    getState: async () => null,
    listInventory: async () => [],
    upsertState: async () => {},
    addToInventory: async () => ({ added: true }),
  }
  const service = new MoradaHouseService(repository, rooms, () => new Date())
  const { app, kidsJourneySnapshots } = buildApp({ moradaHouse: service })
  kidsJourneySnapshots.owners.set(user, account)
  const headers = { 'x-auth-user-id': user, 'x-auth-account-id': account }
  for (const path of [
    '/members/house',
    '/members/room',
    `/members/profiles/${user}/public?audience=kids`,
  ]) {
    const response = await app.handle(new Request(`http://localhost${path}`, { headers }))
    expect(response.status).toBe(200)
    const body: unknown = await response.json()
    expect(JSON.stringify(body)).not.toContain('moveis/peca-antiga')
    expect(JSON.stringify(body)).not.toContain('pets/peca-antiga')
    expect(JSON.stringify(body)).toContain('cadeira-inicial')
  }
  const visit = await new ArquipelagoRoomService(rooms, service).quarto(user, 'kids')
  expect(visit.house?.instances.map((i) => i.id)).toEqual(['cadeira-inicial'])
  expect(visit.house?.pet).toBeNull()
  expect(house.instances).toHaveLength(3)
})

test('casa atravessa HTTP com revisão, conflito recuperável, isolamento e recusa do editor antigo', async () => {
  const records = new Map<string, MoradaHouseRecord>()
  const repository: MoradaHouseRepository = {
    get: async (user, audience) => records.get(`${user}:${audience}`) ?? null,
    compareAndSwap: async (user, _account, audience, revision, house) => {
      const key = `${user}:${audience}`
      if ((records.get(key)?.revision ?? 0) !== revision) return null
      const record = { house, revision: revision + 1 }
      records.set(key, record)
      return record
    },
  }
  const service = new MoradaHouseService(
    repository,
    {
      getState: async () => null,
      listInventory: async () => [],
      upsertState: async () => {},
      addToInventory: async () => ({ added: true }),
    },
    () => new Date(),
  )
  const { app } = buildApp({ moradaHouse: service })
  const headers = {
    'content-type': 'application/json',
    'x-auth-user-id': '11111111-1111-4111-8111-111111111111',
  }
  const initial = await app.handle(new Request('http://localhost/members/house', { headers }))
  expect(initial.status).toBe(200)
  const body = (await initial.json()) as MoradaHouseRecord
  expect(body.revision).toBe(0)
  const put = () =>
    app.handle(
      new Request('http://localhost/members/house', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ ...body, scope: 'room' }),
      }),
    )
  expect((await put()).status).toBe(200)
  const conflict = await put()
  expect(conflict.status).toBe(409)
  expect(await conflict.json()).toMatchObject({ code: 'MORADA_CONFLICT', current: { revision: 1 } })
  const largeHouse = structuredClone(body.house)
  largeHouse.instances = Array.from({ length: 400 }, (_, i) => ({
    id: `${i}-${'instancia'.repeat(10)}`,
    pieceId: 'moveis/cadeiras/cadeira_escritorio_rosa_pacote',
    position: [0, 0, 0],
    rotation: 0,
    roomId: 'quarto',
  }))
  const largePayload = JSON.stringify({ house: largeHouse, revision: 1 })
  expect(new TextEncoder().encode(largePayload).byteLength).toBeGreaterThan(64 * 1024)
  const largeResponse = await app.handle(
    new Request('http://localhost/members/house', { method: 'PUT', headers, body: largePayload }),
  )
  expect(largeResponse.status).toBe(200)
  const adult = await app.handle(
    new Request('http://localhost/members/house?audience=adult', { headers }),
  )
  expect(await adult.json()).toMatchObject({ revision: 0 })
  const legacy = await app.handle(
    new Request('http://localhost/members/room', {
      method: 'PUT',
      headers,
      body: JSON.stringify({ theme: 'aconchego', placedItems: [], pet: null }),
    }),
  )
  expect(legacy.status).toBe(409)
  const malformed = await app.handle(
    new Request('http://localhost/members/house', {
      method: 'PUT',
      headers,
      body: JSON.stringify({ house: { ...body.house, version: 2 }, revision: 1 }),
    }),
  )
  expect(malformed.status).toBe(400)
})
