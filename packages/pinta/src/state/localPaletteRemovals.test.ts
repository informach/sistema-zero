import { beforeEach, expect, test } from 'bun:test'
import {
  emptyPaletteLibrary,
  MAX_REMOVED_MARKS,
  type PaletteLibrary,
  readAccountPaletteLibrary,
} from '../core/paletteLibrary'
import { clearIdbMock, idbMockDb } from '../testing/idbMock'
import { PALETTE_ACCOUNT_KEY } from './localPaletteAccount'
import { createPaletteLibraryStore } from './paletteLibraryStore'
import { createPintaPersistence } from './persistence'

beforeEach(clearIdbMock)
const namespace = 'remocao-paleta'
const open = () => createPintaPersistence({ namespace })
const disk = () => idbMockDb('sistema-zero-pinta-' + namespace)
const active = () => true
const colors = ['', '#112233', ...Array<string>(14).fill('')]
function color(time: number): PaletteLibrary {
  return {
    version: 1,
    updatedAt: time,
    removed: [],
    palettes: [{ id: 'x', name: 'cor ' + time, updatedAt: time, colors }],
  }
}
const remote = (library: PaletteLibrary, revision: number) => ({
  library,
  revision,
  updatedAt: library.updatedAt,
})
async function compact() {
  const local = open()
  let clock = 100
  const author = createPaletteLibraryStore(local, { now: () => clock++ }).getState()
  await author.load()
  expect(await author.removePalette('x')).toBe(true)
  for (let index = 0; index < MAX_REMOVED_MARKS + 2; index++) {
    const temp = await author.savePalette({ name: 'temporária ' + index, colors })
    if (!temp) throw Error('A escrita da paleta falhou.')
    expect(await author.removePalette(temp.id)).toBe(true)
  }
  const saved = await local.loadPaletteLibrary!()
  expect(saved?.removed).toHaveLength(MAX_REMOVED_MARKS)
  expect(saved?.removed.some((p) => p.id === 'x')).toBe(false)
  expect(readAccountPaletteLibrary(saved)).toEqual(saved)
  expect(disk().get(PALETTE_ACCOUNT_KEY)).toMatchObject({
    version: 3,
    removals: [{ id: 'x', removedAt: 100 }],
  })
}

test('a 49ª exclusão pelo editor respeita o gesto exato no reinício e nas duas direções do relógio remoto', async () => {
  const account = open().paletteAccount!
  const first = color(1)
  await account.receive(await account.inspect(), remote(first, 1), active, 1)
  await compact()
  const joined = open().paletteAccount!
  for (const [revision, editAt] of [
    [1, 1],
    [2, 99],
    [3, 100],
    [4, 101],
  ] as const) {
    const seen = await joined.inspect()
    const next = await joined.receive(seen, remote(color(editAt), revision), active, 300)
    expect(next?.candidate?.palettes).toEqual(editAt <= 100 ? [] : color(101).palettes)
    expect(next?.removals).toEqual(editAt <= 100 ? [{ id: 'x', removedAt: 100 }] : undefined)
  }
})

test.each([
  false,
  true,
])('envio em trânsito (%p negociado), ACK perdido e exclusões sucessoras mantêm a ordem ao reabrir', async (negotiated) => {
  const local = open(),
    account = local.paletteAccount!,
    protocol = 'palette-cas-v1' as const
  const generation = crypto.randomUUID()
  const head = (revision: number) => ({
    protocol,
    revision,
    generation,
    adopted: true,
    exists: revision > 0,
  })
  await account.receive(
    await account.inspect(),
    remote(emptyPaletteLibrary(), 1),
    active,
    1,
    undefined,
    negotiated ? head(1) : undefined,
  )
  const original = color(3)
  await local.savePaletteLibrary!(original)
  const sent = await account.inspect(0, active, true)
  const ticket = {
    protocol,
    baseGeneration: generation,
    nonce: crypto.randomUUID(),
    expiresAt: new Date(100).toISOString(),
  }
  if (negotiated)
    expect(await account.prepare(sent, { ticket, revision: 2, sent: original }, active)).toBe(true)
  await compact()
  const reopened = open().paletteAccount!
  const ack = await reopened.acknowledge(
    negotiated ? await reopened.inspect() : sent,
    original,
    2,
    active,
    negotiated ? head(2) : undefined,
    ticket.nonce,
  )
  expect(ack?.dirty).toBe(true)
  expect(ack?.removals).toEqual([{ id: 'x', removedAt: 100 }])
  const read = await reopened.receive(
    ack!,
    remote(original, 2),
    active,
    300,
    undefined,
    negotiated ? head(2) : undefined,
  )
  expect(read?.candidate?.palettes).toEqual([])
  const next = await reopened.inspect()
  const rep = { ...ticket, nonce: crypto.randomUUID() }
  if (negotiated)
    expect(
      await reopened.prepare(next, { ticket: rep, revision: 3, sent: next.candidate! }, active),
    ).toBe(true)
  const accepted = await reopened.acknowledge(
    next,
    next.candidate!,
    3,
    active,
    negotiated ? head(3) : undefined,
    rep.nonce,
  )
  expect(accepted?.removals).toBeUndefined()
  expect(accepted?.dirty).toBe(false)
  expect((await open().paletteAccount!.inspect()).candidate?.removed.length).toBe(48)
})
