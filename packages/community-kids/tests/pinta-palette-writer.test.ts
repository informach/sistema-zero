import '../../pinta/src/testing/idbMock'
import { expect, test } from 'bun:test'
import {
  type PintaPaletteHead,
  PINTA_PALETTE_WRITE_PROTOCOL as protocol,
} from '@sistemazero/core/creations/pinta-palette-writer'
import type { PaletteLibrary } from '../../pinta/src/core/paletteLibrary'
import { createPintaPersistence } from '../../pinta/src/state/persistence'
import {
  type CreationMeta,
  createCreationsCloud,
  type FetchLike,
  gunzipToText,
  gzipText,
} from '../src/lib/creations-cloud'
import { createMemorySyncedMarks } from '../src/lib/creations-sync'
import { createCloudMirroredPintaPersistence } from '../src/lib/pinta-cloud-persistence'

const id = 'sz-pinta-palettes',
  kind = 'palette-library',
  previous = crypto.randomUUID(),
  successor = crypto.randomUUID(),
  nonce = crypto.randomUUID()
const first: PintaPaletteHead = {
  protocol,
  revision: 2,
  adopted: false,
  exists: true,
  generation: previous,
}
const final: PintaPaletteHead = {
  protocol,
  revision: 3,
  adopted: true,
  exists: true,
  generation: successor,
}
const item = {
  itemId: id,
  kind,
  name: 'Minhas paletas',
  revision: 2,
  itemUpdatedAt: new Date(20).toISOString(),
  syncedAt: new Date(20).toISOString(),
  bytes: 100,
}
const doc = JSON.stringify({
  version: 1,
  updatedAt: 20,
  palettes: [],
  removed: [{ id: 'ceu', removedAt: 20 }],
})
const meta: CreationMeta = {
  itemId: id,
  kind,
  name: item.name,
  updatedAt: 20,
  baseRevision: 2,
  paletteHead: first,
}

function setup(change?: (path: string, body: Record<string, unknown>) => void) {
  const calls: string[] = [],
    writes: unknown[] = []
  const fetcher: FetchLike = async (raw, init) => {
    const path = String(raw),
      method = init?.method ?? 'GET'
    calls.push(method + ' ' + path)
    const response = (part: string, body: Record<string, unknown>, status = 200) => {
      change?.(part, body)
      return Response.json(body, { status })
    }
    if (path === 'https://owned.test/blob') return new Response((await gzipText(doc)) as BodyInit)
    if (path === 'https://owned.test/upload') {
      expect(new Headers(init?.headers).get('if-none-match')).toBe('*')
      expect(await gunzipToText((init?.body as Uint8Array).slice().buffer as ArrayBuffer)).toBe(doc)
      return new Response(null, { status: 200 })
    }
    expect(new Headers(init?.headers).get('x-sz-viewer')).toBe('perfil')
    if (path.endsWith('/download?paletteWrite=palette-cas-v1'))
      return response('get', {
        revision: 2,
        item,
        downloadUrl: 'https://owned.test/blob',
        paletteHead: first,
      })
    const body = JSON.parse(String(init?.body))
    writes.push(body)
    if (path.endsWith('/upload'))
      return response('reserve', {
        revision: 3,
        bytes: body.bytes,
        method: 'PUT',
        uploadUrl: 'https://owned.test/upload',
        headers: { 'If-None-Match': '*' },
        paletteWrite: {
          protocol,
          nonce,
          baseGeneration: previous,
          expiresAt: new Date(50_000).toISOString(),
        },
      })
    if (path.endsWith('/commit'))
      return response('commit', {
        item: { ...item, revision: 3 },
        paletteHead: final,
        paletteWrite: { protocol, nonce },
      })
    if (method === 'DELETE')
      return response('delete', {
        deleted: true,
        revision: 0,
        paletteHead: { ...final, exists: false, revision: 0 },
      })
    throw Error('unexpected ' + path)
  }
  return {
    calls,
    writes,
    cloud: createCreationsCloud({
      tool: 'pinta',
      viewerId: 'perfil',
      audience: 'kids',
      pintaPaletteWriteEnabled: true,
      fetch: fetcher,
      now: () => 20,
    }),
  }
}

test('o transporte vincula o download, reserva, PUT e recibo aos bytes, revisão, encarnação e nonce', async () => {
  const { cloud, writes, calls } = setup()
  try {
    const read = await cloud.readPalette!()
    expect(read.head).toEqual(first)
    expect(read.download?.json).toBe(doc)
    const receipt = await cloud.upload(meta, doc)
    expect(receipt).toEqual({ revision: 3, paletteHead: final })
    expect(writes).toMatchObject([
      { baseRevision: 2, paletteWrite: { protocol, baseGeneration: previous } },
      { revision: 3, paletteWrite: { protocol, nonce } },
    ])
    expect(calls.filter((call) => call.startsWith('PUT '))).toHaveLength(1)
    expect(await cloud.remove(id, 2, first)).toMatchObject({
      revision: 0,
      paletteHead: { exists: false, adopted: true },
    })
    expect(writes.at(-1)).toMatchObject({
      baseRevision: 2,
      paletteWrite: { protocol, baseGeneration: previous },
    })
  } finally {
    cloud.dispose({ abort: true })
  }
})

test.each([
  'missing',
  'generation',
  'expired',
  'headers',
  'revision',
  'bytes',
])('reserva incompleta %s encerra antes do primeiro PUT', async (flaw) => {
  const { cloud, calls } = setup((path, ticket) => {
    if (path !== 'reserve') return
    const capability = ticket.paletteWrite as Record<string, unknown>
    if (flaw === 'missing') delete ticket.paletteWrite
    if (flaw === 'generation') capability.baseGeneration = crypto.randomUUID()
    if (flaw === 'expired') capability.expiresAt = new Date(19).toISOString()
    if (flaw === 'headers') ticket.headers = {}
    if (flaw === 'revision') ticket.revision = 2
    if (flaw === 'bytes') ticket.bytes = 99_000
  })
  try {
    await expect(cloud.upload(meta, doc)).rejects.toThrow()
    expect(calls).toHaveLength(1)
  } finally {
    cloud.dispose({ abort: true })
  }
})

test.each([
  'head',
  'nonce',
  'generation',
  'revision',
  'item',
])('recibo divergente %s não confirma a paleta', async (flaw) => {
  const { cloud, calls } = setup((path, receipt) => {
    if (path !== 'commit') return
    if (flaw === 'head') delete receipt.paletteHead
    if (flaw === 'nonce') receipt.paletteWrite = { protocol, nonce: crypto.randomUUID() }
    if (flaw === 'generation') receipt.paletteHead = { ...final, generation: previous }
    if (flaw === 'revision') receipt.paletteHead = { ...final, revision: 4 }
    if (flaw === 'item') receipt.item = { ...item, itemId: 'outro' }
  })
  try {
    await expect(cloud.upload(meta, doc)).rejects.toThrow()
    expect(calls.filter((c) => c.startsWith('PUT '))).toHaveLength(1)
  } finally {
    cloud.dispose({ abort: true })
  }
})

test('somente 404 com cabeçote comprova ausência, e nenhum PUT individual é permitido na porta negociada', async () => {
  for (const [status, body, ok] of [
    [404, { paletteHead: { ...final, revision: 0, exists: false } }, true],
    [404, {}, false],
    [200, { downloadUrl: 'https://owned.test/blob', item }, false],
  ] as const) {
    let calls = 0
    const cloud = createCreationsCloud({
      tool: 'pinta',
      viewerId: 'perfil',
      pintaPaletteWriteEnabled: true,
      fetch: async () => {
        calls++
        return Response.json(body, { status })
      },
    })
    try {
      if (ok) expect((await cloud.readPalette!()).download).toBeNull()
      else await expect(cloud.readPalette!()).rejects.toThrow()
      expect(calls).toBe(1)
      await expect(cloud.upload({ ...meta, paletteHead: undefined }, doc)).rejects.toThrow()
      await expect(cloud.remove(id, 2)).rejects.toThrow()
      expect(calls).toBe(1)
    } finally {
      cloud.dispose({ abort: true })
    }
  }
})

test.each([
  'meu',
  'outra-igual',
  'outra-diferente',
])('reinício após envio de paletas conserva autoria via nonce: %s', async (owner) => {
  const namespace = crypto.randomUUID()
  const make = (name: string, at: number): PaletteLibrary => ({
    version: 1,
    updatedAt: at,
    removed: [],
    palettes: [{ name, id: 'cor', updatedAt: at, colors: ['', '#112233', ...Array(14).fill('')] }],
  })
  const original = make('Primeira', 10),
    later = make('Sucessora', 20)
  const empty: PintaPaletteHead = {
    protocol,
    revision: 0,
    exists: false,
    generation: null,
    adopted: false,
  }
  const after: PintaPaletteHead = {
    protocol,
    revision: 1,
    exists: true,
    generation: crypto.randomUUID(),
    adopted: true,
  }
  let remoteHead = empty,
    bytes = 0,
    remoteDoc = original,
    staged = '',
    liveNonce = '',
    first = true
  let transportCalls = 0
  const commitEntered = Promise.withResolvers<void>(),
    closePage = Promise.withResolvers<void>()
  const fetch: FetchLike = async (raw, init) => {
    const path = String(raw)
    if (path.endsWith('?paletteWrite=palette-cas-v1'))
      return remoteHead.exists
        ? Response.json({
            item: {
              ...item,
              revision: 1,
              itemUpdatedAt: new Date(remoteDoc.updatedAt).toISOString(),
            },
            revision: 1,
            downloadUrl: 'https://owned.test/body',
            paletteHead: remoteHead,
          })
        : Response.json({ paletteHead: empty }, { status: 404 })
    if (path === 'https://owned.test/body')
      return new Response((await gzipText(JSON.stringify(remoteDoc))) as BodyInit)
    if (path === 'https://owned.test/stage') {
      staged = await gunzipToText(init?.body as Uint8Array)
      return new Response()
    }
    const body = JSON.parse(String(init?.body))
    if (path.endsWith('/upload')) {
      expect(body.paletteWrite).toEqual({ protocol, baseGeneration: null })
      bytes = body.bytes
      return Response.json({
        bytes,
        revision: 1,
        method: 'PUT',
        headers: { 'If-None-Match': '*' },
        uploadUrl: 'https://owned.test/stage',
        paletteWrite: {
          protocol,
          nonce,
          baseGeneration: null,
          expiresAt: new Date(50_000).toISOString(),
        },
      })
    }
    if (path.endsWith('/commit')) {
      transportCalls++
      expect(body.paletteWrite.nonce).toBe(nonce)
      if (first) {
        first = false
        expect(JSON.parse(staged)).toEqual(original)
        remoteHead = after
        remoteDoc = owner === 'outra-diferente' ? make('Outra', 30) : original
        liveNonce = owner === 'meu' ? nonce : crypto.randomUUID()
        commitEntered.resolve()
        await closePage.promise
        throw TypeError('quebra antes da resposta')
      }
      if (body.paletteWrite.nonce !== liveNonce)
        return Response.json({ error: { code: 'CREATION_REVISION_MISMATCH' } }, { status: 409 })
      return Response.json({
        item: { ...item, revision: 1 },
        paletteHead: after,
        paletteWrite: { protocol, nonce },
      })
    }
    throw Error('unexpected ' + path)
  }
  function page(now: number) {
    const local = createPintaPersistence({ namespace })
    const cloud = createCreationsCloud({
      tool: 'pinta',
      viewerId: namespace,
      pintaPaletteWriteEnabled: true,
      fetch,
      idleMs: 60_000,
      now: () => now,
    })
    const mirror = createCloudMirroredPintaPersistence({
      local,
      cloud,
      viewerId: namespace,
      marks: createMemorySyncedMarks(),
      now: () => now,
    })
    return { local, cloud, mirror }
  }
  const opened = page(10)
  await opened.mirror.syncPaletteLibrary!()
  await opened.mirror.savePaletteLibrary!(original)
  const flushing = opened.cloud.flush({ timeoutMs: 3000 })
  await commitEntered.promise
  expect((await opened.local.paletteAccount!.inspect()).submission?.sent).toEqual(original)
  await opened.mirror.savePaletteLibrary!(later)
  opened.mirror.dispose!()
  opened.cloud.dispose({ abort: true })
  closePage.resolve()
  await flushing
  const restarted = page(70_000)
  try {
    await restarted.mirror.syncPaletteLibrary!()
    const state = await restarted.local.paletteAccount!.inspect()
    expect(state.submission).toBeUndefined()
    expect(state.head).toEqual(after)
    expect(transportCalls).toBe(2)
    if (owner === 'meu') {
      expect(state.dirty).toBe(true)
      expect(state.candidate?.palettes).toEqual(later.palettes)
    } else {
      expect(state.dirty).toBe(false)
      expect(state.candidate?.palettes).toEqual(remoteDoc.palettes)
      expect((await restarted.mirror.loadPaletteLibrary!())?.palettes).toContainEqual(
        expect.objectContaining({ name: 'Sucessora (cópia)' }),
      )
    }
  } finally {
    restarted.mirror.dispose!()
    restarted.cloud.dispose({ abort: true })
  }
})

test('reabre antes do PUT e troca um ticket ausente apenas pelo mesmo documento', async () => {
  const namespace = crypto.randomUUID(),
    local = createPintaPersistence({ namespace }),
    account = local.paletteAccount!
  const initial: PintaPaletteHead = {
    protocol,
    revision: 0,
    exists: false,
    adopted: false,
    generation: null,
  }
  const firstTicket = {
    protocol,
    nonce: crypto.randomUUID(),
    baseGeneration: null,
    expiresAt: new Date(5000).toISOString(),
  }
  await account.receive(await account.inspect(), null, () => true, 0, undefined, initial)
  const candidate = JSON.parse(doc) as PaletteLibrary
  await local.savePaletteLibrary!(candidate)
  const prepared = await account.inspect()
  await account.prepare(prepared, { ticket: firstTicket, revision: 1, sent: candidate }, () => true)
  const after = { ...candidate, updatedAt: 40, removed: [{ id: 'ceu', removedAt: 40 }] }
  await local.savePaletteLibrary!(after)
  let puts = 0,
    commits = 0
  const renewed = { ...firstTicket, nonce: crypto.randomUUID() }
  const head = {
    protocol,
    adopted: true,
    generation: crypto.randomUUID(),
    revision: 2,
    exists: true,
  }
  const cloud = createCreationsCloud({
    tool: 'pinta',
    viewerId: namespace,
    pintaPaletteWriteEnabled: true,
    now: () => 30,
    idleMs: 60_000,
    fetch: async (raw, init) => {
      const path = String(raw)
      if (path === 'https://owned.test/put') {
        expect((await account.inspect()).submission).toEqual({
          ticket: renewed,
          revision: 2,
          sent: candidate,
        })
        expect(JSON.parse(await gunzipToText(init?.body as Uint8Array))).toEqual(candidate)
        puts++
        return new Response()
      }
      if (path === 'https://owned.test/blob') return new Response((await gzipText(doc)) as BodyInit)
      if (path.includes('/download?'))
        return Response.json({
          item: { ...item, revision: 2 },
          revision: 2,
          paletteHead: head,
          downloadUrl: 'https://owned.test/blob',
        })
      const body = JSON.parse(String(init?.body))
      if (path.endsWith('/upload'))
        return Response.json({
          revision: 2,
          bytes: body.bytes,
          paletteWrite: renewed,
          method: 'PUT',
          uploadUrl: 'https://owned.test/put',
          headers: { 'if-none-match': '*' },
        })
      commits++
      if (body.paletteWrite.nonce === firstTicket.nonce)
        return Response.json({ error: { code: 'PINTA_PALETTE_UPLOAD_MISSING' } }, { status: 409 })
      expect(body.paletteWrite.nonce).toBe(renewed.nonce)
      return Response.json({
        item: { ...item, revision: 2 },
        paletteHead: head,
        paletteWrite: { protocol, nonce: renewed.nonce },
      })
    },
  })
  const host = createCloudMirroredPintaPersistence({
    cloud,
    local,
    viewerId: namespace,
    marks: createMemorySyncedMarks(),
    now: () => 30,
  })
  try {
    await host.syncPaletteLibrary!()
    expect(puts).toBe(1)
    expect(commits).toBe(2)
    const state = await account.inspect()
    expect(state.submission).toBeUndefined()
    expect(state.dirty).toBe(true)
    expect(state.candidate?.removed).toEqual(after.removed)
  } finally {
    host.dispose!()
    cloud.dispose({ abort: true })
  }
})

test('a opção de escrita fica ausente por padrão e não ativa outro tipo de criação', () => {
  for (const options of [
    { tool: 'pinta' as const, viewerId: 'p' },
    { tool: 'studio' as const, viewerId: 'p', pintaPaletteWriteEnabled: true },
    { tool: 'pinta' as const, pintaPaletteWriteEnabled: true },
  ]) {
    const cloud = createCreationsCloud(options)
    try {
      expect(cloud.readPalette).toBeUndefined()
      expect(cloud.confirmPalette).toBeUndefined()
    } finally {
      cloud.dispose({ abort: true })
    }
  }
})

test('falha ao reter o candidato cancela a subida antes do PUT', async () => {
  const { cloud, calls } = setup()
  try {
    await expect(
      cloud.upload(
        {
          ...meta,
          preparePalette: async () => {
            throw Error('disco cheio')
          },
        },
        doc,
      ),
    ).rejects.toThrow('disco cheio')
    expect(calls).toHaveLength(1)
    expect(calls[0]).toEndWith('/upload')
  } finally {
    cloud.dispose({ abort: true })
  }
})
