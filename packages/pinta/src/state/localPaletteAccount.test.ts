import { beforeEach, expect, test } from 'bun:test'
import {
  emptyPaletteLibrary,
  type PaletteLibrary,
  readAccountPaletteLibrary,
} from '../core/paletteLibrary'
import { clearIdbMock, idbMockDb, setIdbWriteGuard } from '../testing/idbMock'
import { PALETTE_ACCOUNT_KEY, PALETTE_LIBRARY_KEY } from './localPaletteAccount'
import { createPintaPersistence } from './persistence'

beforeEach(clearIdbMock)
const active = () => true
const profile = 'paletas-autoridade'
const open = () => createPintaPersistence({ namespace: profile })
const db = () => idbMockDb('sistema-zero-pinta-' + profile)
const lib = (id: string, updatedAt: number, name = id): PaletteLibrary => ({
  version: 1,
  updatedAt,
  removed: [],
  palettes: [{ id, updatedAt, name, colors: ['', '#112233', ...Array<string>(14).fill('')] }],
})
const removed = (id: string, t: number): PaletteLibrary => ({
  version: 1,
  updatedAt: t,
  palettes: [],
  removed: [{ id, removedAt: t }],
})
const remote = (library: PaletteLibrary, revision: number) => ({
  library,
  revision,
  updatedAt: library.updatedAt,
})

test('aba lenta, lápide compactada e reinício não autorizam reenviar uma cor da base', async () => {
  const a = open(),
    b = open(),
    one = a.paletteAccount!,
    two = b.paletteAccount!
  const first = lib('antiga', 1),
    fresh = lib('outra', 80)
  await one.receive(await one.inspect(), remote(first, 2), active, 1)
  const before = await one.inspect()
  await b.savePaletteLibrary!(lib('autoral', 3))
  await two.receive(await two.inspect(), remote(fresh, 52), active, 100)
  expect(await one.receive(before, remote(first, 2), active, 100)).toBeNull()
  const result = await open().paletteAccount!.inspect()
  expect(result.revision).toBe(52)
  expect(result.candidate?.palettes.map((p) => p.id)).toEqual(['autoral', 'outra'])
  // A stale view making a new palette must submit only its gesture.
  await a.savePaletteLibrary!(
    { ...first, updatedAt: 101, palettes: [...first.palettes, ...lib('nova', 101).palettes] },
    active,
    first,
  )
  expect((await a.loadPaletteLibrary!())?.palettes.map((p) => p.id)).toEqual([
    'autoral',
    'nova',
    'outra',
  ])
})

test('404 estável troca encarnação; ACK antigo e edição após recriação conservam a base exata', async () => {
  const a = open(),
    one = a.paletteAccount!,
    first = lib('antiga', 1)
  await one.receive(await one.inspect(), remote(first, 5), active, 1)
  const ticket = await one.inspect()
  const zero = await one.receive(ticket, null, active, 2)
  expect(zero?.revision).toBe(0)
  expect(zero?.generation).not.toBe(ticket.generation)
  expect(zero?.dirty).toBe(false)
  expect(await one.acknowledge(ticket, first, 6, active)).toBeNull()
  expect(await one.receive(ticket, remote(first, 20), active, 3)).toBeNull()
  await a.savePaletteLibrary!(lib('nova', 7))
  const sent = await one.inspect()
  expect(sent.candidate?.palettes.map((p) => p.id)).toEqual(['nova'])
  const ack = await one.acknowledge(sent, sent.candidate!, 1, active)
  expect(ack?.dirty).toBe(false)
  expect((await open().loadPaletteLibrary!())?.palettes.map((p) => p.id)).toEqual([
    'antiga',
    'nova',
  ])
  await one.receive(await one.inspect(), remote(lib('nova', 7), 1), active, 8)
  expect((await one.inspect()).dirty).toBe(false)
})

test('uma edição depois do produtor não ganha ACK pelo timestamp do envio', async () => {
  const a = open(),
    one = a.paletteAccount!
  await a.savePaletteLibrary!(lib('a', 10))
  const sent = await one.inspect()
  await a.savePaletteLibrary!(lib('b', 10))
  expect((await one.acknowledge(sent, sent.candidate!, 1, active))?.dirty).toBe(true)
  const next = await open().paletteAccount!.inspect()
  expect(next.revision).toBe(1)
  expect(next.candidate?.palettes.map((x) => x.id)).toEqual(['a', 'b'])
  expect(await one.acknowledge(sent, sent.candidate!, 2, active)).toBeNull()
})

test('escritor histórico modifica só a chave antiga; reinício recupera cores sob outros IDs', async () => {
  const auth = open().paletteAccount!,
    base = lib('estrela', 1),
    foreign = lib('estrela', 20, 'Minha edição anterior')
  await auth.receive(await auth.inspect(), remote(base, 5), active, 2)
  db().set(PALETTE_LIBRARY_KEY, foreign)
  const reopened = open(),
    seen = await reopened.loadPaletteLibrary!()
  expect(seen?.palettes.find((p) => p.id === 'estrela')?.name).toBe('estrela')
  const copy = seen?.palettes.find((p) => p.id !== 'estrela')
  expect(copy?.name).toContain('Minha edição anterior')
  expect((await reopened.paletteAccount!.inspect()).dirty).toBe(false)
  db().set(PALETTE_LIBRARY_KEY, foreign)
  expect((await open().loadPaletteLibrary!())?.palettes).toEqual(seen?.palettes)
  db().set(PALETTE_LIBRARY_KEY, removed('estrela', 21))
  expect((await open().loadPaletteLibrary!())?.palettes).toEqual(seen?.palettes)
  expect(db().get(PALETTE_ACCOUNT_KEY)).toMatchObject({
    confirmed: base,
    lastLegacyWrite: removed('estrela', 21),
  })
})

test('primeira adoção offline preserva IDs e lápides; migração com remoto preserva local sem promovê-lo', async () => {
  const initial = lib('local', 4)
  db().set(PALETTE_LIBRARY_KEY, { ...initial, removed: [{ id: 'removida', removedAt: 3 }] })
  let p = open().paletteAccount!
  expect((await p.inspect()).dirty).toBe(false)
  const zero = await p.receive(await p.inspect(), null, active, 5)
  expect(zero?.dirty).toBe(true)
  expect(zero?.candidate?.palettes).toEqual(initial.palettes)
  expect(zero?.candidate?.removed).toEqual([{ id: 'removida', removedAt: 3 }])
  clearIdbMock()
  db().set(PALETTE_LIBRARY_KEY, initial)
  const a = open()
  p = a.paletteAccount!
  await a.loadPaletteLibrary!()
  await a.savePaletteLibrary!(lib('depois', 5))
  await p.receive(await p.inspect(), remote(lib('conta', 6), 4), active, 7)
  expect((await p.inspect()).candidate?.palettes.map((p) => p.id)).toEqual(['conta', 'depois'])
  expect(
    (await a.loadPaletteLibrary!())?.palettes.find((p) => p.name.includes('cópia'))?.colors,
  ).toEqual(initial.palettes[0]?.colors)
})

test('erro no último PUT reverte as duas chaves e o ACK mantém a revisão anterior', async () => {
  const a = open(),
    p = a.paletteAccount!
  await a.savePaletteLibrary!(lib('autoral', 10))
  const before = structuredClone([...db().entries()])
  const token = await p.inspect()
  setIdbWriteGuard((key) => {
    if (key === PALETTE_LIBRARY_KEY) throw Error('quota')
  })
  try {
    await expect(p.receive(token, remote(lib('remota', 20), 3), active, 20)).rejects.toThrow(
      'quota',
    )
  } finally {
    setIdbWriteGuard(null)
  }
  expect([...db().entries()]).toEqual(before)
  expect((await open().paletteAccount!.inspect()).revision).toBe(null)
})

test('campos desconhecidos não podem ser descartados pelo saneamento da conta ou do disco', async () => {
  const a = open(),
    p = a.paletteAccount!
  const doc = lib('futura', 8)
  for (const bad of [
    { ...doc, future: true },
    { ...doc, version: 2 },
    { ...doc, palettes: [{ ...doc.palettes[0], gradient: [] }] },
  ]) {
    expect(readAccountPaletteLibrary(bad)).toBeNull()
    db().set(PALETTE_LIBRARY_KEY, bad)
    await expect(a.savePaletteLibrary!(emptyPaletteLibrary())).rejects.toThrow()
    expect(db().get(PALETTE_LIBRARY_KEY)).toEqual(bad)
  }
  db().delete(PALETTE_LIBRARY_KEY)
  await p.inspect()
  const future = { ...(db().get(PALETTE_ACCOUNT_KEY) as object), extra: true }
  db().set(PALETTE_ACCOUNT_KEY, future)
  await expect(p.inspect()).rejects.toThrow()
  expect(db().get(PALETTE_ACCOUNT_KEY)).toEqual(future)
})

test('registro histórico sem lápides e cores hex abreviadas preserva a paleta', async () => {
  const saved = lib('antiga', 1)
  const row = {
    version: 1,
    updatedAt: 1,
    palettes: saved.palettes.map((p) => ({ ...p, colors: p.colors.map((c) => (c ? '#aBc' : '')) })),
  }
  db().set(PALETTE_LIBRARY_KEY, row)
  expect((await open().loadPaletteLibrary!())?.palettes[0]?.colors[1]).toBe('#aabbcc')
})

test('GET e ACK capturam token e bytes antes de aguardar a fila transacional', async () => {
  const local = open(),
    p = local.paletteAccount!
  async function withBlockedWrite<Output>(start: () => Promise<Output>, mutate: () => void) {
    const gate = Promise.withResolvers<void>(),
      entered = Promise.withResolvers<void>()
    setIdbWriteGuard(async (key) => {
      if (key === PALETTE_LIBRARY_KEY) {
        entered.resolve()
        await gate.promise
      }
    })
    try {
      const busy = local.savePaletteLibrary!(lib(crypto.randomUUID(), 9))
      await entered.promise
      const pending = start()
      mutate()
      gate.resolve()
      await busy
      return await pending
    } finally {
      gate.resolve()
      setIdbWriteGuard(null)
    }
  }
  const getToken = await p.inspect(),
    body = remote(lib('original', 7), 3)
  const result = await withBlockedWrite(
    () => p.receive(getToken, body, active, 9),
    () => {
      getToken.generation = 'outra'
      body.library.palettes[0]!.name = 'depois'
      body.revision = 99
    },
  )
  expect(result?.revision).toBe(3)
  expect(db().get(PALETTE_ACCOUNT_KEY)).toMatchObject({ confirmed: lib('original', 7) })
  const ackToken = await p.inspect(),
    sent = ackToken.candidate!
  const exact = structuredClone(sent)
  const ack = await withBlockedWrite(
    () => p.acknowledge(ackToken, sent, 12, active),
    () => {
      ackToken.generation = 'outra'
      Reflect.set(sent.palettes[0]!.colors, 1, '#ff0000')
    },
  )
  expect(ack?.revision).toBe(12)
  expect(db().get(PALETTE_ACCOUNT_KEY)).toMatchObject({ confirmed: exact })
})

test('entrada de rede inválida preserva bytes e revisão inclusive após reiniciar', async () => {
  const p = open().paletteAccount!,
    initial = lib('base', 1)
  await p.receive(await p.inspect(), remote(initial, 2), active, 3)
  const before = structuredClone([...db().entries()]),
    token = await p.inspect()
  const future = { ...initial, gradient: ['novo'] } as PaletteLibrary
  for (const revision of [-1, 0, 1.5, Number.NaN, Number.MAX_SAFE_INTEGER + 1]) {
    await expect(p.receive(token, remote(initial, revision), active, 3)).rejects.toThrow()
    await expect(p.acknowledge(token, initial, revision, active)).rejects.toThrow()
  }
  await expect(p.receive(token, remote(future, 4), active, 4)).rejects.toThrow()
  await expect(p.acknowledge(token, future, 4, active)).rejects.toThrow()
  expect([...db().entries()]).toEqual(before)
  expect((await open().paletteAccount!.inspect()).revision).toBe(2)
})

const writerProtocol = 'palette-cas-v1' as const
const head = (revision: number, generation: string | null, adopted: boolean) => ({
  protocol: writerProtocol,
  exists: revision > 0,
  revision,
  generation,
  adopted,
})

const issue = (baseGeneration: string | null) => ({
  protocol: writerProtocol,
  nonce: crypto.randomUUID(),
  baseGeneration,
  expiresAt: new Date(60_000).toISOString(),
})

test('migração só qualifica a geração em GET; primeiro ACK adota e preserva o gesto sucessor', async () => {
  const local = open(),
    p = local.paletteAccount!,
    base = lib('base', 10),
    previous = crypto.randomUUID(),
    next = crypto.randomUUID()
  await p.receive(await p.inspect(), remote(base, 5), active, 10)
  expect(db().get(PALETTE_ACCOUNT_KEY)).toMatchObject({ version: 1, confirmed: base })
  await local.savePaletteLibrary!(lib('offline', 11))
  const oldToken = await p.inspect()
  expect(oldToken.head).toBeUndefined()
  const qualified = await p.receive(
    oldToken,
    remote(base, 5),
    active,
    11,
    undefined,
    head(5, previous, false),
  )
  expect(qualified?.head?.generation).toBe(previous)
  expect(qualified?.candidate?.palettes.map((p) => p.id)).toEqual(['base', 'offline'])
  await local.savePaletteLibrary!(lib('posterior', 12))
  const ticket = issue(previous)
  expect(
    await p.prepare(qualified!, { ticket, revision: 7, sent: qualified!.candidate! }, active),
  ).toBe(true)
  const ack = await p.acknowledge(
    qualified!,
    qualified!.candidate!,
    7,
    active,
    head(7, next, true),
    ticket.nonce,
  )
  expect(ack?.head).toEqual(head(7, next, true))
  expect(ack?.dirty).toBe(true)
  expect(ack?.candidate?.palettes.map((p) => p.id)).toEqual(['base', 'offline', 'posterior'])
  expect(await p.receive(oldToken, remote(base, 99), active, 12)).toBeNull()
  await expect(p.receive(ack!, remote(base, 99), active, 12)).rejects.toThrow()
  expect((await open().paletteAccount!.inspect()).head).toEqual(head(7, next, true))
})

test('troca de geração arquiva alterações e lápides sem reenviá-las, inclusive quando a revisão coincide', async () => {
  const local = open(),
    p = local.paletteAccount!,
    g1 = crypto.randomUUID(),
    g2 = crypto.randomUUID()
  await p.receive(
    await p.inspect(),
    remote(lib('antiga', 2), 8),
    active,
    2,
    undefined,
    head(8, g1, true),
  )
  await local.savePaletteLibrary!(lib('em-edicao', 3))
  await local.savePaletteLibrary!(removed('antiga', 4))
  const before = await p.inspect()
  const fresh = lib('nova', 10)
  const changed = await p.receive(
    before,
    remote(fresh, 8),
    active,
    10,
    undefined,
    head(8, g2, true),
  )
  expect(changed?.dirty).toBe(false)
  expect(changed?.candidate?.palettes.map((p) => p.id)).toEqual(['nova'])
  expect(
    (await local.loadPaletteLibrary!())?.palettes.some((p) => p.name === 'em-edicao (cópia)'),
  ).toBe(true)
  expect(db().get(PALETTE_ACCOUNT_KEY)).toMatchObject({
    version: 2,
    priorEdits: { removed: [{ id: 'antiga', removedAt: 4 }] },
  })
  expect(
    await p.receive(
      before,
      remote(lib('antiga', 2), 100),
      active,
      10,
      undefined,
      head(100, g1, true),
    ),
  ).toBeNull()
  expect(await p.acknowledge(before, before.candidate!, 15, active, head(15, g1, true))).toBeNull()
  const ticket = issue(g2)
  await p.prepare(changed!, { ticket, revision: 9, sent: fresh }, active)
  await expect(
    p.acknowledge(changed!, fresh, 9, active, head(9, g1, true), ticket.nonce),
  ).rejects.toThrow()
  expect((await open().paletteAccount!.inspect()).head).toEqual(head(8, g2, true))
})

test('404 autenticado e recriação mantêm a geração da lápide, com 409 invalidando GET anterior', async () => {
  const p = open().paletteAccount!,
    g1 = crypto.randomUUID(),
    g2 = crypto.randomUUID()
  await p.receive(
    await p.inspect(),
    remote(lib('atual', 2), 100),
    active,
    2,
    undefined,
    head(100, g1, true),
  )
  const stale = await p.inspect()
  expect(await p.observeConflict(stale, 0, active)).toBe(true)
  expect(
    await p.receive(stale, remote(lib('atual', 2), 100), active, 2, undefined, head(100, g1, true)),
  ).toBeNull()
  const renewed = await p.inspect()
  expect(renewed.needsHead).toBe(true)
  const absent = await p.receive(renewed, null, active, 3, undefined, head(0, g2, true))
  expect(absent?.head).toEqual(head(0, g2, true))
  expect(absent?.dirty).toBe(false)
  await open().savePaletteLibrary!(lib('recriada', 4))
  const candidate = await p.inspect()
  expect(candidate.candidate?.palettes.map((p) => p.id)).toEqual(['recriada'])
  const ticket = issue(g2)
  await p.prepare(candidate, { ticket, revision: 1, sent: candidate.candidate! }, active)
  expect(
    (
      await p.acknowledge(
        candidate,
        candidate.candidate!,
        1,
        active,
        head(1, g2, true),
        ticket.nonce,
      )
    )?.dirty,
  ).toBe(false)
})

test('a falha definitiva retém o documento exato e permite um gesto novo', async () => {
  const local = open(),
    p = local.paletteAccount!,
    generation = crypto.randomUUID()
  await p.receive(
    await p.inspect(),
    remote(lib('confirmada', 1), 2),
    active,
    2,
    undefined,
    head(2, generation, true),
  )
  await local.savePaletteLibrary!(lib('meu', 3))
  const seen = await p.inspect(),
    ticket = issue(generation)
  await p.prepare(seen, { ticket, revision: 4, sent: seen.candidate! }, active)
  expect(await p.release(seen, ticket.nonce, 4, active, true)).toBe(true)
  expect((await p.inspect()).rejected).toBe(true)
  expect(db().get(PALETTE_ACCOUNT_KEY)).toMatchObject({ priorSubmission: seen.candidate })
  await local.savePaletteLibrary!(lib('meu', 5, 'revisada'))
  expect((await p.inspect()).rejected).toBe(false)
})
