import { expect, mock, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { gzipSync } from 'node:zlib'
import { STUDIO_SEALED_STORAGE_PROTOCOL as protocol } from '@sistemazero/core/creations/studio-sealed-storage'
import { StudioSealedCommitProofSchema } from '@sistemazero/core/creations/studio-sealed-writer'
import type { SessionUser } from '../src/lib/types'
import { studioSealedFixture } from './fixtures/studio-sealed.fixture'

mock.module('server-only', () => ({}))
const { createStudioSealedWrites } = await import('../src/routes/studio-sealed-writes')
type Dependencies = Parameters<typeof createStudioSealedWrites>[0]

async function fixture(
  options: {
    parent?: boolean
    readonly?: boolean
    infrastructure?: boolean
    storageOutage?: boolean
  } = {},
) {
  const bytes = await studioSealedFixture({ regional: true })
  const owner = bytes.ticket.scope
  const sessionId = randomUUID()
  const user: SessionUser = {
    id: owner.userId,
    email: '',
    firstName: '',
    lastName: '',
    role: 'customer',
    status: 'active',
    activeProfile: { accountId: owner.accountId },
    kids: options.parent
      ? { kind: 'parent', sessionId, authenticatedAt: Date.now() }
      : { kind: 'student', sessionId, deviceId: randomUUID(), grantId: randomUUID() },
    ...(options.readonly ? { act: { sub: randomUUID(), mode: 'readonly' as const } } : {}),
  }
  const calls: Array<{ action: string; body: unknown }> = []
  const signatures: Parameters<NonNullable<Dependencies['storage']>['presignPut']>[0][] = []
  const responses = new Map<string, { status: number; body: unknown }>()
  const generation = randomUUID()
  let committed: unknown
  const routes = createStudioSealedWrites({
    enabled: () => options.infrastructure ?? true,
    session: {
      audience: 'kids',
      getAccessToken: async () => 'qa-access',
      getRefreshToken: async () => 'qa-refresh',
      verifyAccessToken: async () => ({ ok: true, user }),
    },
    gateway: {
      refreshSession: async () => ({ state: 'unavailable' }),
      async gatewayFetchHmac(path, init) {
        const action = path.slice(path.lastIndexOf('/') + 1)
        calls.push({ action, body: init?.body })
        const response = responses.get(action)
        if (response) return response
        if (action === 'head')
          return {
            status: 200,
            body: {
              studioHead: {
                protocol,
                generation: null,
                revision: 0,
                exists: false,
                adopted: false,
              },
            },
          }
        if (action === 'reserve') return { status: 200, body: { ticket: bytes.ticket } }
        if (action === 'ticket')
          return { status: 200, body: committed ?? { committed: false, ticket: bytes.ticket } }
        if (action === 'commit') {
          const body = init?.body
          if (!body || typeof body !== 'object' || !('payload' in body))
            throw new Error('A prova precisa existir no envelope interno.')
          const proof = StudioSealedCommitProofSchema.parse(body.payload)
          const result = {
            studioHead: {
              protocol,
              generation,
              revision: proof.ticket.revision,
              exists: true,
              adopted: true,
            },
            item: {
              itemId: owner.itemId,
              revision: proof.ticket.revision,
              kind: 'classic',
              formatVersion: 2,
              itemUpdatedAt: bytes.ticket.itemUpdatedAt,
            },
            studioSealReceipt: proof.receipt,
          }
          committed = { ...result, committed: true }
          return { status: 200, body: result }
        }
        if (action === 'delete')
          return {
            status: 200,
            body: {
              deleted: true,
              revision: 0,
              studioHead: {
                protocol,
                generation: randomUUID(),
                revision: 0,
                exists: false,
                adopted: true,
              },
            },
          }
        throw new Error('Operação de teste desconhecida.')
      },
    },
    storage: {
      ...bytes.storage,
      open: async (key, signal) => {
        if (options.storageOutage) throw new TypeError('Storage temporarily unavailable')
        return bytes.storage.open(key, signal)
      },
      presignPut: async (input) => {
        signatures.push(input)
        return `https://storage.example/${encodeURIComponent(input.key)}`
      },
    },
  })
  const command = {
    protocol,
    itemId: owner.itemId,
    baseGeneration: bytes.ticket.baseGeneration,
    baseRevision: 0,
    name: bytes.ticket.name,
    kind: bytes.ticket.kind,
    bytes: bytes.ticket.bytes,
    requirements: bytes.ticket.requirements,
    itemUpdatedAt: bytes.ticket.itemUpdatedAt,
    thumb: null,
    parts: bytes.ticket.parts.map((part) => ({ hash: part.hash, bytes: part.bytes })),
  }
  const invoke = (
    operation: string,
    body?: unknown,
    headers: Record<string, string> = {},
    itemId = owner.itemId,
  ) =>
    routes.studioSealedWrite.POST(
      new Request(`http://localhost/api/creations/studio/${itemId}/seal/${operation}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-sz-viewer': owner.userId,
          'x-sz-viewer-audience': 'kids',
          'x-sz-session': sessionId,
          ...headers,
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      }),
      { params: Promise.resolve({ itemId, operation }) },
    )
  return { ...bytes, routes, command, invoke, calls, signatures, responses, user }
}

test('deriva ator da sessão, assina apenas staging condicional e confirma os bytes antes do commit', async () => {
  const f = await fixture()
  const head = await f.invoke('head')
  expect(head.status).toBe(200)
  expect(head.headers.get('cache-control')).toBe('private, no-store')
  const reserved = await f.invoke('reserve', f.command)
  expect(reserved.status).toBe(200)
  const envelope = f.calls[1]?.body
  expect(envelope).toEqual({
    userId: f.ticket.scope.userId,
    accountId: f.ticket.scope.accountId,
    audience: 'kids',
    payload: f.command,
  })
  expect(f.signatures).toHaveLength(2)
  expect(
    f.signatures.every(
      (signed) =>
        signed.key.includes('/upload/') &&
        !signed.key.includes('/sealed/') &&
        signed.criarUmaVez === true &&
        (signed.expiresInSeconds ?? 0) <= 600,
    ),
  ).toBe(true)
  const command = { protocol, itemId: f.ticket.scope.itemId, nonce: f.ticket.nonce, revision: 1 }
  const committed = await f.invoke('commit', command)
  expect(committed.status).toBe(200)
  const first = await committed.json()
  expect(first.studioSealReceipt.nonce).toBe(f.ticket.nonce)
  expect(f.created).toHaveLength(2)
  const again = await f.invoke('commit', command)
  expect(again.status).toBe(200)
  expect(await again.json()).toEqual(first)
  expect(f.created).toHaveLength(2)
})

test('recusa perfil, público, sessão infantil, responsável e suporte readonly antes de assinar', async () => {
  const f = await fixture()
  expect((await f.invoke('reserve', f.command, { 'x-sz-viewer': randomUUID() })).status).toBe(409)
  expect((await f.invoke('reserve', f.command, { 'x-sz-viewer-audience': 'adult' })).status).toBe(
    409,
  )
  expect((await f.invoke('reserve', f.command, { 'x-sz-session': randomUUID() })).status).toBe(409)
  expect(f.calls).toHaveLength(0)
  expect(f.signatures).toHaveLength(0)
  for (const flags of [{ parent: true }, { readonly: true }]) {
    const blocked = await fixture(flags)
    expect((await blocked.invoke('reserve', blocked.command)).status).toBe(403)
    expect(blocked.calls).toHaveLength(0)
  }
})

test('mantém identificação e formato estritos, sem aceitar ator ou item alternativo no corpo', async () => {
  const f = await fixture()
  expect((await f.invoke('reserve', { ...f.command, itemId: 'outro-item' })).status).toBe(400)
  expect((await f.invoke('reserve', { ...f.command, userId: randomUUID() })).status).toBe(400)
  expect(
    (
      await f.invoke('reserve', {
        ...f.command,
        requirements: { ...f.command.requirements, envelopeVersion: 3 },
      })
    ).status,
  ).toBe(400)
  expect(f.calls).toHaveLength(0)
  expect(f.signatures).toHaveLength(0)
})

test('base vencida usa o conflito comum e exclusão remota exige reabertura', async () => {
  const f = await fixture()
  const head = { protocol, generation: randomUUID(), revision: 2, exists: true, adopted: true }
  f.responses.set('reserve', {
    status: 409,
    body: {
      error: { code: 'STUDIO_SEALED_WRITE_CONFLICT' },
      reason: 'head-changed',
      studioHead: head,
    },
  })
  const stale = await f.invoke('reserve', f.command)
  expect(stale.status).toBe(409)
  expect(await stale.json()).toMatchObject({
    error: { code: 'CREATION_STALE_BASE' },
    details: { currentRevision: 2 },
  })
  f.responses.set('reserve', {
    status: 409,
    body: {
      error: { code: 'STUDIO_SEALED_WRITE_CONFLICT' },
      reason: 'head-changed',
      studioHead: { ...head, revision: 0, exists: false },
    },
  })
  expect(await (await f.invoke('reserve', f.command)).json()).toMatchObject({
    error: { code: 'CREATION_REOPEN_REQUIRED' },
  })
  expect(f.signatures).toHaveLength(0)
})

test('projeto inválido não chega ao commit interno e falha de armazenamento continua transitória', async () => {
  const f = await fixture()
  f.objects.set(f.staged, gzipSync('{}'))
  const command = { protocol, itemId: f.ticket.scope.itemId, nonce: f.ticket.nonce, revision: 1 }
  const response = await f.invoke('commit', command)
  expect(response.status).toBe(409)
  expect(await response.json()).toMatchObject({ error: { code: 'STUDIO_SEALED_CONTENT_INVALID' } })
  expect(f.calls.some((call) => call.action === 'commit')).toBe(false)
  expect(f.created).toHaveLength(0)
  const outage = await fixture({ storageOutage: true })
  const unavailable = await outage.invoke('commit', {
    protocol,
    itemId: outage.ticket.scope.itemId,
    nonce: outage.ticket.nonce,
    revision: 1,
  })
  expect(unavailable.status).toBe(503)
  expect(await unavailable.json()).toMatchObject({ error: { code: 'STUDIO_SEALED_UNAVAILABLE' } })
  expect(outage.calls.some((call) => call.action === 'commit')).toBe(false)
  expect(outage.created).toHaveLength(0)
})

test('remove pela geração e infraestrutura ausente não expõe o protocolo', async () => {
  const f = await fixture()
  const removed = await f.invoke('delete', {
    protocol,
    itemId: f.ticket.scope.itemId,
    baseGeneration: null,
    baseRevision: 0,
  })
  expect(removed.status).toBe(200)
  expect(await removed.json()).toMatchObject({
    revision: 0,
    studioHead: { exists: false, adopted: true },
  })
  const absent = await fixture({ infrastructure: false })
  expect((await absent.invoke('head')).status).toBe(404)
  expect(absent.calls).toHaveLength(0)
})
