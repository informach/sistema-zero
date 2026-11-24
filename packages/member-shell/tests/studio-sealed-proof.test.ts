import { expect, mock, test } from 'bun:test'
import { createHash, randomUUID } from 'node:crypto'
import { gunzipSync, gzipSync } from 'node:zlib'
import { studioSealedBlobKey } from '@sistemazero/core/creations/studio-sealed-storage'
import { StudioSealedTicketSchema } from '@sistemazero/core/creations/studio-sealed-writer'
import { regionalSceneMaterial } from '../../studio/src/testing/pintaRegionalMaterialFixture'
import { studioSealedFixture } from './fixtures/studio-sealed.fixture'

mock.module('server-only', () => ({}))
const { proveStudioSealedWrite, StudioSealedContentError, StudioSealedStorageError } = await import(
  '../src/server/studio-sealed-proof'
)
const hash = (text: string) => createHash('sha256').update(text).digest('hex')

test('um título longo com emoji mantém a autoria e cabe no índice sem cortar um caractere', async () => {
  const name = `Minha vila ${'🌎'.repeat(100)}`
  const f = await studioSealedFixture({ name })
  await proveStudioSealedWrite(f.optionsForProof())
  expect(f.ticket.name.length).toBeLessThanOrEqual(120)
  expect(f.ticket.name.endsWith('🌎')).toBe(true)
  const sealed = f.objects.get(studioSealedBlobKey(f.ticket.scope, f.ticket.nonce, 'sealed'))
  if (!sealed) throw new Error('O manifesto deve estar selado.')
  expect(JSON.parse(gunzipSync(sealed).toString()).program.name).toBe(name)
})

test('sela o programa legado pelos bytes realmente capturados, sem mudar o documento', async () => {
  const f = await studioSealedFixture()
  const proof = await proveStudioSealedWrite(f.optionsForProof())
  expect(proof.receipt.jsonSha256).toBe(hash(f.json))
  expect(proof.receipt.gzipSha256).toBe(createHash('sha256').update(f.manifest).digest('hex'))
  const sealed = f.objects.get(studioSealedBlobKey(f.ticket.scope, f.ticket.nonce, 'sealed'))
  if (!sealed) throw new Error('O manifesto precisa ter sido selado.')
  expect(gunzipSync(sealed).toString()).toBe(f.json)
  expect(proof.parts).toEqual([])
})

test('sela PNG regional real e conserva o cenário original depois de repetir a prova', async () => {
  const f = await studioSealedFixture({ regional: true })
  const first = await proveStudioSealedWrite(f.optionsForProof())
  const again = await proveStudioSealedWrite(f.optionsForProof())
  expect(again).toEqual(first)
  const [part] = first.parts
  if (!part) throw new Error('O cenário deve acompanhar o programa.')
  const sealed = f.objects.get(studioSealedBlobKey(f.ticket.scope, part.nonce, 'sealed', part.hash))
  if (!sealed) throw new Error('O cenário precisa ter sido selado.')
  expect(JSON.parse(gunzipSync(sealed).toString())).toEqual(f.project.assets[0])
  expect(f.created).toHaveLength(2)
})

test('a troca do staging após a captura não muda os bytes do selo', async () => {
  const f = await studioSealedFixture({ regional: true })
  const create = f.storage.create
  f.storage.create = async (input, signal) => {
    f.objects.set(f.staged, gzipSync('arquivo trocado depois da captura'))
    return create(input, signal)
  }
  const proof = await proveStudioSealedWrite(f.optionsForProof())
  expect(proof.receipt.jsonSha256).toBe(hash(f.json))
  const sealed = f.objects.get(studioSealedBlobKey(f.ticket.scope, f.ticket.nonce, 'sealed'))
  if (!sealed) throw new Error('O manifesto capturado deve estar selado.')
  expect(gunzipSync(sealed).toString()).toBe(f.json)
})

test('a prova não admite PNG regional sem marcador como material legado', async () => {
  const { regional: _marker, ...unmarked } = await regionalSceneMaterial()
  const f = await studioSealedFixture({ assets: [unmarked] })
  await expect(proveStudioSealedWrite(f.optionsForProof())).rejects.toMatchObject({
    cause: { message: expect.stringContaining('identificação completa') },
  })
  expect(f.created).toHaveLength(0)
})

test('hash ou marcador divergente recusa o lote antes de criar qualquer selo', async () => {
  const asset = await regionalSceneMaterial()
  const f = await studioSealedFixture({
    regional: true,
    assets: [{ ...asset, regional: { ...asset.regional, sha256: '0'.repeat(64) } }],
  })
  await expect(proveStudioSealedWrite(f.optionsForProof())).rejects.toThrow(
    'original foi preservado',
  )
  expect(f.created).toHaveLength(0)
})

test('programa de outro projeto e gzip corrompido permanecem fora da revisão', async () => {
  const wrong = await studioSealedFixture({ documentId: 'outro-projeto' })
  await expect(proveStudioSealedWrite(wrong.optionsForProof())).rejects.toThrow()
  expect(wrong.created).toHaveLength(0)
  const corrupt = await studioSealedFixture()
  const bytes = new Uint8Array(corrupt.manifest)
  bytes[bytes.length - 1] = (bytes[bytes.length - 1] ?? 0) ^ 1
  corrupt.objects.set(corrupt.staged, bytes)
  await expect(proveStudioSealedWrite(corrupt.optionsForProof())).rejects.toThrow()
  expect(corrupt.created).toHaveLength(0)
})

test('falha de rede e stream interrompido não são classificados como projeto estragado', async () => {
  const failed = await studioSealedFixture()
  failed.storage.open = async () => {
    throw new TypeError('fetch failed')
  }
  await expect(proveStudioSealedWrite(failed.optionsForProof())).rejects.toBeInstanceOf(
    StudioSealedStorageError,
  )
  expect(failed.created).toHaveLength(0)
  const stream = await studioSealedFixture()
  const open = stream.storage.open
  stream.storage.open = async (key, signal) => {
    const object = await open(key, signal)
    if (!object) return null
    return {
      ...object,
      body: new ReadableStream<Uint8Array>({
        start(controller) {
          controller.error(new TypeError('fetch failed'))
        },
      }),
    }
  }
  await expect(proveStudioSealedWrite(stream.optionsForProof())).rejects.toBeInstanceOf(
    StudioSealedStorageError,
  )
  expect(stream.created).toHaveLength(0)
  const invalid = await studioSealedFixture({ documentId: 'outro-documento' })
  await expect(proveStudioSealedWrite(invalid.optionsForProof())).rejects.toBeInstanceOf(
    StudioSealedContentError,
  )
})

test('uma parte certificada do mesmo item conserva seu nonce e é conferida novamente', async () => {
  const f = await studioSealedFixture({ regional: true })
  const first = await proveStudioSealedWrite(f.optionsForProof())
  const next = StudioSealedTicketSchema.parse({
    ...f.ticket,
    nonce: randomUUID(),
    revision: 2,
    baseRevision: 1,
    baseGeneration: randomUUID(),
    parts: first.parts.map((part) => ({ ...part, source: 'sealed' })),
  })
  f.objects.set(studioSealedBlobKey(next.scope, next.nonce, 'upload'), f.manifest)
  const proof = await proveStudioSealedWrite({ ...f.optionsForProof(), ticket: next })
  expect(proof.parts).toEqual(first.parts)
  expect(f.created).toHaveLength(3)
  const [part] = first.parts
  if (!part) throw new Error('O cenário certificado precisa existir.')
  const key = studioSealedBlobKey(next.scope, part.nonce, 'sealed', part.hash)
  f.objects.set(key, gzipSync('outra imagem'))
  await expect(proveStudioSealedWrite({ ...f.optionsForProof(), ticket: next })).rejects.toThrow()
  expect(f.created).toHaveLength(3)
})

test('a prova recusa reserva expirada e chaves de outro público', async () => {
  const expired = await studioSealedFixture()
  expired.ticket.expiresAt = new Date(Date.now() - 1000).toISOString()
  await expect(proveStudioSealedWrite(expired.optionsForProof())).rejects.toThrow('expirou')
  expect(expired.created).toHaveLength(0)
  const isolated = await studioSealedFixture()
  const other = {
    ...isolated.ticket,
    scope: { ...isolated.ticket.scope, audience: 'adult' as const },
  }
  await expect(
    proveStudioSealedWrite({ ...isolated.optionsForProof(), ticket: other }),
  ).rejects.toThrow()
  expect(isolated.created).toHaveLength(0)
})
