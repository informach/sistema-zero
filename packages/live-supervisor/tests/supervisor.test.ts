import { expect, test } from 'bun:test'
import { authorized, LiveConnectionSupervisor, type SupervisorRecord } from '../src/index'

const token = 'a-test-secret-with-at-least-32-characters'
function fixture() {
  const records = new Map<string, unknown>()
  let alarm = 0
  const state = {
    storage: {
      async get<T>(key: string) {
        return structuredClone(records.get(key)) as T | undefined
      },
      async put<T>(key: string, value: T) {
        records.set(key, structuredClone(value))
      },
      async setAlarm(at: number) {
        alarm = at
      },
    },
    async blockConcurrencyWhile<T>(fn: () => Promise<T>) {
      return fn()
    },
  }
  const supervisor = new LiveConnectionSupervisor(state, {
    SUPERVISOR_TOKEN: token,
    SFU_APP_ID: 'app',
    SFU_APP_SECRET: 'secret',
    CONNECTIONS: null as never,
  })
  const send = (patch: Partial<SupervisorRecord> = {}) =>
    supervisor.fetch(
      new Request('https://supervisor.test/connections/id', {
        method: 'PUT',
        headers: { authorization: `Bearer ${token}` },
        body: JSON.stringify({
          connectionId: '11111111-1111-4111-8111-111111111111',
          generation: 1,
          sessionId: null,
          leaseEndsAt: Date.now() + 10_000,
          hardEndsAt: Date.now() + 60_000,
          retired: false,
          mids: [],
          ...patch,
        }),
      }),
    )
  return { supervisor, send, records, alarm: () => alarm }
}

test('supervisor requires a private backend credential', async () => {
  expect(
    await authorized(
      new Request('https://test', { headers: { authorization: `Bearer ${token}` } }),
      token,
    ),
  ).toBe(true)
  expect(
    await authorized(
      new Request('https://test', { headers: { authorization: 'Bearer wrong' } }),
      token,
    ),
  ).toBe(false)
})

test('retirement is sticky despite late renewals; late resources are retained', async () => {
  const f = fixture()
  expect((await f.send()).status).toBe(200)
  expect((await f.send({ retired: true, mids: ['0'] })).status).toBe(200)
  const response = await f.send({ retired: false, sessionId: 'late-sfu-session', mids: ['1'] })
  expect(await response.json()).toMatchObject({ retired: true })
  const record = f.records.get('connection') as SupervisorRecord
  expect(record.mids).toEqual(['0', '1'])
  expect(record.sessionId).toBe('late-sfu-session')
  expect(f.alarm()).toBeLessThanOrEqual(Date.now())
})

test('generation and session identity cannot be overwritten', async () => {
  const f = fixture()
  await f.send({ sessionId: 'first' })
  expect((await f.send({ generation: 2 })).status).toBe(409)
  expect((await f.send({ sessionId: 'second' })).status).toBe(409)
})

test('an expired control lease cannot reactivate the connection', async () => {
  const f = fixture()
  await f.send({ leaseEndsAt: Date.now() - 1 })
  await f.supervisor.alarm()
  expect(await (await f.send()).json()).toMatchObject({ retired: true })
})

test('inspection recloses a late active mid and recognizes an inactive track', async () => {
  const f = fixture()
  await f.send({ sessionId: 'session', retired: true, mids: ['0', '1'] })
  const record = f.records.get('connection') as SupervisorRecord
  record.closedMids = ['0']
  f.records.set('connection', record)
  const original = globalThis.fetch
  let closed: string[] = []
  globalThis.fetch = (async (_input: unknown, init?: RequestInit) => {
    if (init?.method === 'GET')
      return Response.json({
        tracks: [
          { mid: '0', status: 'active' },
          { mid: '1', status: 'inactive' },
        ],
      })
    const body = JSON.parse(String(init?.body)) as { tracks: { mid: string }[] }
    closed = body.tracks.map((track) => track.mid)
    return Response.json({ tracks: body.tracks })
  }) as typeof fetch
  try {
    await f.supervisor.alarm()
    expect(closed).toEqual(['0'])
    expect((f.records.get('connection') as SupervisorRecord).cleanupPending).toBe(false)
  } finally {
    globalThis.fetch = original
  }
})
