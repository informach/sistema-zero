import { afterEach, expect, mock, spyOn, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { reservationFixture } from './fixtures/studio-reservation'

mock.module('server-only', () => ({}))
const storage = await import('../src/server/r2')
const runtime = await import('../src/server/studio-publication')
const ownership = await import('../src/server/studio-publication-ownership')
const { studioReservationFingerprint } = await import('../src/server/studio-reservation-binding')
const { retireStudioReservation, drainStudioReservationCleanup } = await import(
  '../src/server/studio-reservation-cleanup'
)
afterEach(() => mock.restore())
const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')

function fixture() {
  const records = new Map<string, Buffer>()
  const put = (key: string, bytes: Uint8Array) => records.set(key, Buffer.from(bytes))
  spyOn(storage, 'r2HeadObjectPrivate').mockImplementation(async (key) => {
    const bytes = records.get(key)
    return bytes
      ? { contentType: 'application/json', contentLength: bytes.length, etag: hash(bytes) }
      : null
  })
  spyOn(storage, 'r2GetObjectPrivate').mockImplementation(async (key) => {
    const bytes = records.get(key)!
    return {
      body: new Blob([new Uint8Array(bytes)]).stream(),
      contentType: 'application/json',
      contentLength: bytes.length,
    }
  })
  spyOn(storage, 'r2CreateObjectPrivate').mockImplementation(async (input) => {
    if (records.has(input.key)) return false
    put(input.key, input.body)
    return true
  })
  const replace = spyOn(storage, 'r2ReplaceObjectPrivate').mockImplementation(
    async (input, etag) => {
      const previous = records.get(input.key)
      if (!previous || hash(previous) !== etag) return false
      put(input.key, input.body)
      return true
    },
  )
  spyOn(storage, 'r2PutObjectPrivate').mockImplementation(async (input) => {
    put(input.key, input.body)
  })
  spyOn(storage, 'r2DeleteObjectPrivate').mockImplementation(async (key) => {
    records.delete(key)
  })
  spyOn(storage, 'r2ListPrivatePage').mockImplementation(async (prefix, limit = 4, cursor) => {
    const keys = [...records.keys()]
      .filter((key) => key.startsWith(prefix) && (!cursor || key > cursor))
      .sort()
    const page = keys.slice(0, limit)
    return { keys: page, cursor: keys.length > limit ? page.at(-1) : undefined }
  })
  const retire = spyOn(runtime, 'callStudioPublication').mockResolvedValue({ deleted: true })
  const source = Buffer.from(JSON.stringify({ programmingLanguage: 'python', source: 'print(42)' }))
  const value = reservationFixture({ snapshotHash: hash(source) })
  const ownerKey = `studio/publication-owners/${value.audience}/${value.playId}.json`
  const playKey = `studio/play/${value.playId}.json`
  const intentKey = `studio/reservation-cleanup/${value.audience}/${value.reservationId}.json`
  const completionKey = `studio/reservation-cleanup-completed/${value.audience}/${value.reservationId}.json`
  const seed = async () => {
    await ownership.recordStudioPublicationOwner(
      value.audience,
      value.playId,
      value.authorId,
      value,
    )
    put(playKey, source)
  }
  return {
    records,
    replace,
    retire,
    value,
    source,
    ownerKey,
    playKey,
    intentKey,
    completionKey,
    seed,
  }
}

test('retirement before artifact creation prevents a late writer from claiming the reserved ID', async () => {
  const f = fixture()
  await retireStudioReservation(f.value)
  expect(f.records.has(f.intentKey)).toBe(false)
  expect(f.records.has(f.completionKey)).toBe(true)
  await expect(
    ownership.recordStudioPublicationOwner(
      f.value.audience,
      f.value.playId,
      f.value.authorId,
      f.value,
    ),
  ).rejects.toThrow()
  expect(JSON.parse(f.records.get(f.ownerKey)!.toString())).toMatchObject({
    retired: true,
    hadOwner: false,
  })
  expect(f.retire).toHaveBeenCalledWith(
    expect.objectContaining({
      operation: 'retire-reservation',
      snapshotHash: f.value.snapshotHash,
    }),
    undefined,
  )
})

test('runtime outage retains the intent; retry removes source and owner identity before acknowledging once', async () => {
  const f = fixture()
  await f.seed()
  f.retire.mockRejectedValueOnce(new Error('Offline'))
  await expect(retireStudioReservation(f.value)).rejects.toThrow('Offline')
  expect(f.records.has(f.intentKey)).toBe(true)
  expect(f.records.has(f.completionKey)).toBe(false)
  expect(f.records.get(f.ownerKey)!.toString()).not.toContain(f.value.authorId)
  expect(f.records.get(f.playKey)!.toString()).not.toContain('print(42)')
  expect(await drainStudioReservationCleanup()).toEqual({ completed: 1, pending: 0 })
  await retireStudioReservation(f.value)
  expect(f.retire).toHaveBeenCalledTimes(2)
  expect(f.records.has(f.intentKey)).toBe(false)
})

test('unknown source and legacy ownership cannot be deleted merely because a reservation was retired', async () => {
  const f = fixture()
  f.records.set(f.playKey, f.source)
  await expect(retireStudioReservation(f.value)).rejects.toThrow('proveniência')
  expect(f.records.get(f.playKey)).toEqual(f.source)
  expect(f.retire).not.toHaveBeenCalled()
  const legacy = Buffer.from(
    JSON.stringify({
      playId: f.value.playId,
      authorId: f.value.authorId,
      audience: f.value.audience,
    }),
  )
  f.records.set(f.ownerKey, legacy)
  await expect(retireStudioReservation(f.value)).rejects.toThrow('Propriedade')
  expect(f.records.get(f.ownerKey)).toEqual(legacy)
  expect(f.records.has(f.completionKey)).toBe(false)
})

test('a conflicting source or payload remains durable and cannot be acknowledged', async () => {
  const f = fixture()
  await f.seed()
  const unrelated = Buffer.from('{"source":"different"}')
  f.records.set(f.playKey, unrelated)
  await expect(retireStudioReservation(f.value)).rejects.toThrow('proveniência')
  await expect(
    retireStudioReservation({ ...f.value, snapshotHash: 'b'.repeat(64) }),
  ).rejects.toThrow('outra reserva')
  expect(f.records.get(f.playKey)).toEqual(unrelated)
  expect(f.records.has(f.intentKey)).toBe(true)
  expect(f.retire).not.toHaveBeenCalled()
})

test('a concurrent owner replacement wins over cleanup checked against an older receipt', async () => {
  const f = fixture()
  await f.seed()
  const newer = Buffer.from('{"owner":"newer receipt"}')
  f.replace.mockImplementationOnce(async (input) => {
    f.records.set(input.key, newer)
    return false
  })
  await expect(retireStudioReservation(f.value)).rejects.toThrow('propriedade mudou')
  expect(f.records.get(f.ownerKey)).toEqual(newer)
  expect(f.records.get(f.playKey)).toEqual(f.source)
  expect(f.retire).not.toHaveBeenCalled()
})

test('retired-looking malformed records cannot conceal retained source or identity', async () => {
  const f = fixture()
  const bindingHash = studioReservationFingerprint(f.value)
  const malformedOwner = Buffer.from(
    JSON.stringify({
      playId: f.value.playId,
      audience: f.value.audience,
      bindingHash,
      retired: true,
      hadOwner: true,
      authorId: f.value.authorId,
    }),
  )
  f.records.set(f.ownerKey, malformedOwner)
  await expect(retireStudioReservation(f.value)).rejects.toThrow('terminal inválido')
  expect(f.records.has(f.completionKey)).toBe(false)
  f.records.delete(f.ownerKey)
  f.records.set(
    f.playKey,
    Buffer.from(
      JSON.stringify({
        playId: f.value.playId,
        studioPublicationState: 'retired',
        source: 'private source',
      }),
    ),
  )
  await expect(retireStudioReservation(f.value)).rejects.toThrow('terminal inválido')
  expect(f.retire).not.toHaveBeenCalled()
})

test('bounded draining advances past failing reservations instead of starving later work', async () => {
  const f = fixture()
  const values = Array.from({ length: 6 }, () => reservationFixture()).sort((a, b) =>
    a.reservationId.localeCompare(b.reservationId),
  )
  f.retire.mockRejectedValue(new Error('Offline'))
  for (const value of values)
    await expect(retireStudioReservation(value)).rejects.toThrow('Offline')
  const failed = new Set(values.slice(0, 4).map((value) => value.playId))
  f.retire.mockImplementation(async (input) => {
    if (failed.has(String(input.playId))) throw new Error('Offline')
    return { deleted: true }
  })
  expect(await drainStudioReservationCleanup()).toEqual({ completed: 0, pending: 4 })
  expect(await drainStudioReservationCleanup()).toEqual({ completed: 2, pending: 0 })
  expect(await drainStudioReservationCleanup()).toEqual({ completed: 0, pending: 4 })
})
