import { expect, test } from 'bun:test'
import { createHash, randomUUID } from 'node:crypto'
import { gunzipSync } from 'node:zlib'
import { STUDIO_SEALED_STORAGE_PROTOCOL as protocol } from '@sistemazero/core/creations/studio-sealed-storage'
import {
  type StudioSealedHead,
  StudioSealedReserveSchema,
  StudioSealedTicketSchema,
} from '@sistemazero/core/creations/studio-sealed-writer'
import { gzipText } from '../src/lib/creations-cloud'
import { buildStudioCloudSnapshot } from '../src/lib/studio-cloud'
import { createStudioSealedCloud } from '../src/lib/studio-sealed-cloud'
import { studioSealedFixture } from './fixtures/studio-sealed.fixture'

const hash = (data: string | Uint8Array) => createHash('sha256').update(data).digest('hex')
async function fixture() {
  const fixture = await studioSealedFixture({ regional: true })
  const { project } = fixture
  const head: StudioSealedHead = {
    protocol,
    generation: null,
    revision: 0,
    exists: false,
    adopted: false,
  }
  const requests: string[] = [],
    nonces: string[] = []
  const staged = new Map<string, Uint8Array>()
  let ticket = fixture.ticket,
    ack: unknown,
    lostAck = false,
    expire = false,
    corruptAck = false
  const cloud = createStudioSealedCloud({
    viewerId: ticket.scope.userId,
    gzip: gzipText,
    async put(url, method, headers, bytes) {
      expect(method).toBe('PUT')
      expect(new Headers(headers).get('if-none-match')).toBe('*')
      if (staged.has(url))
        throw Object.assign(new Error('precondition'), { status: 412, code: 'STORAGE_PUT_FAILED' })
      staged.set(url, new Uint8Array(bytes))
    },
    async api(path, init) {
      const action = path.slice(path.lastIndexOf('/') + 1)
      requests.push(action)
      if (action === 'head') return { studioHead: { ...head } }
      const raw = JSON.parse(String(init.body))
      if (action === 'reserve') {
        const command = StudioSealedReserveSchema.parse(raw)
        const missing = command.parts.filter((part) => part.bytes === undefined)
        if (missing.length)
          throw Object.assign(new Error('need bytes'), {
            status: 409,
            code: 'CREATION_PARTS_NEED_BYTES',
            details: { hashes: missing.map((part) => part.hash) },
          })
        const { itemId: _itemId, thumb: _thumb, ...reservation } = command
        ticket = StudioSealedTicketSchema.parse({
          ...reservation,
          scope: fixture.ticket.scope,
          nonce: randomUUID(),
          expiresAt: new Date(Date.now() + 600_000).toISOString(),
          revision: head.revision + 1,
          parts: command.parts.map((part) => ({ ...part, source: 'upload' })),
        })
        nonces.push(ticket.nonce)
        ack = undefined
        return {
          ticket,
          uploadUrl: `https://storage.test/${ticket.nonce}/project`,
          method: 'PUT',
          headers: { 'content-type': 'application/gzip', 'if-none-match': '*' },
          parts: ticket.parts.map((part) => ({
            hash: part.hash,
            bytes: part.bytes,
            uploadUrl: `https://storage.test/${ticket.nonce}/${part.hash}`,
          })),
        }
      }
      if (action === 'commit') {
        expect(raw.nonce).toBe(ticket.nonce)
        if (expire) {
          expire = false
          throw Object.assign(new Error('expired'), {
            status: 409,
            code: 'STUDIO_SEALED_TICKET_INVALID',
          })
        }
        if (ack) return ack
        const bytes = staged.get(`https://storage.test/${ticket.nonce}/project`)
        if (!bytes) throw new Error('missing manifest')
        const json = gunzipSync(bytes).toString()
        for (const part of ticket.parts) {
          const bytes = staged.get(`https://storage.test/${ticket.nonce}/${part.hash}`)
          if (!bytes || hash(gunzipSync(bytes)) !== part.hash)
            throw new Error('missing or corrupt asset')
        }
        Object.assign(head, {
          exists: true,
          adopted: true,
          revision: ticket.revision,
          generation: head.generation ?? randomUUID(),
        })
        ack = {
          studioHead: { ...head },
          item: {
            itemId: project.id,
            revision: ticket.revision,
            kind: ticket.kind,
            formatVersion: ticket.requirements.projectFormat,
            itemUpdatedAt: ticket.itemUpdatedAt,
          },
          studioSealReceipt: {
            protocol,
            nonce: ticket.nonce,
            requirements: ticket.requirements,
            jsonSha256: corruptAck ? 'e'.repeat(64) : hash(json),
            gzipSha256: hash(bytes),
            manifestBytes: bytes.length,
          },
        }
        if (lostAck) {
          lostAck = false
          throw new TypeError('Failed to fetch')
        }
        return ack
      }
      if (action === 'delete') {
        expect(raw.baseGeneration).toBe(head.generation)
        expect(raw.baseRevision).toBe(head.revision)
        Object.assign(head, { exists: false, adopted: true, revision: 0, generation: randomUUID() })
        return { studioHead: { ...head }, deleted: true, revision: 0 }
      }
      throw new Error(`Unexpected ${action}`)
    },
  })
  async function upload(value = project, baseRevision = 0) {
    const snapshot = await buildStudioCloudSnapshot(value)
    return cloud.upload(
      {
        itemId: value.id,
        name: value.name,
        kind: value.kind,
        updatedAt: value.updatedAt,
        formatVersion: value.formatVersion,
        baseRevision,
      },
      snapshot.json,
      snapshot.parts ?? [],
    )
  }
  return {
    project,
    cloud,
    upload,
    head,
    requests,
    nonces,
    staged,
    loseAck: () => {
      lostAck = true
    },
    expire: () => {
      expire = true
    },
    corruptAck: () => {
      corruptAck = true
    },
  }
}

test('envia PNG real e confirma os bytes do manifesto e das partes', async () => {
  const f = await fixture()
  expect(await f.upload()).toEqual({ revision: 1 })
  expect(f.requests).toEqual(['head', 'reserve', 'reserve', 'commit'])
  expect(f.staged.size).toBe(2)
})
test('ACK perdido repete o mesmo nonce e PUT condicional sem criar revisão extra', async () => {
  const f = await fixture()
  f.loseAck()
  await expect(f.upload()).rejects.toThrow('Failed to fetch')
  expect(await f.upload()).toEqual({ revision: 1 })
  expect(f.nonces).toHaveLength(1)
  expect(f.head.revision).toBe(1)
  expect(f.requests.filter((action) => action === 'commit')).toHaveLength(2)
})
test('edição nova durante ACK perdido confirma a anterior e envia a nova revisão', async () => {
  const f = await fixture()
  f.loseAck()
  await expect(f.upload()).rejects.toThrow()
  const newer = { ...f.project, name: 'Outra vila', updatedAt: f.project.updatedAt + 1 }
  expect(await f.upload(newer)).toEqual({ revision: 2 })
  expect(f.nonces).toHaveLength(2)
  expect(await f.cloud.remove(newer.id, 2)).toEqual({ revision: 0 })
  expect(f.head.exists).toBe(false)
})
test('base vencida e lápide recusam antes de reservar ou enviar bytes', async () => {
  const f = await fixture()
  await f.upload()
  await expect(f.upload()).rejects.toMatchObject({
    code: 'CREATION_STALE_BASE',
    details: { currentRevision: 1 },
  })
  await f.cloud.remove(f.project.id, 1)
  await expect(f.upload()).rejects.toMatchObject({ code: 'CREATION_REOPEN_REQUIRED' })
  expect(f.nonces).toHaveLength(1)
})
test('tíquete expirado só reserva de novo após conferir a mesma geração e base', async () => {
  const f = await fixture()
  f.expire()
  expect(await f.upload()).toEqual({ revision: 1 })
  expect(f.nonces).toHaveLength(2)
})

test('uma revisão superada durante a perda de ACK libera o tíquete antigo para a resolução de conflito', async () => {
  const f = await fixture()
  f.loseAck()
  await expect(f.upload()).rejects.toThrow('Failed to fetch')
  f.head.revision = 2
  f.expire()
  await expect(f.upload()).rejects.toMatchObject({ code: 'CREATION_STALE_BASE' })
  expect(await f.upload({ ...f.project, updatedAt: f.project.updatedAt + 1 }, 2)).toEqual({
    revision: 3,
  })
  expect(f.nonces).toHaveLength(2)
})
test('recibo divergente nunca confirma que o jogo foi salvo', async () => {
  const f = await fixture()
  f.corruptAck()
  await expect(f.upload()).rejects.toMatchObject({ code: 'STUDIO_SEALED_CONTENT_INVALID' })
})
test('remover o último regional mantém o protocolo selado', async () => {
  const f = await fixture()
  await f.upload()
  expect(
    await f.upload({ ...f.project, assets: [], updatedAt: f.project.updatedAt + 1 }, 1),
  ).toEqual({ revision: 2 })
  expect(f.nonces).toHaveLength(2)
})

test('um item ainda sem revisão confirmada envia exclusão para cancelar reservas de outra aba', async () => {
  const f = await fixture()
  expect(await f.cloud.remove(f.project.id, 0)).toEqual({ revision: 0 })
  expect(f.requests).toEqual(['head', 'delete'])
  expect(f.head).toMatchObject({ exists: false, adopted: true })
  await expect(f.upload()).rejects.toMatchObject({ code: 'CREATION_REOPEN_REQUIRED' })
})
