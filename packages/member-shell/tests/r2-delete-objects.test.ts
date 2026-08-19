import { describe, expect, mock, test } from 'bun:test'
import type { S3Client } from '@aws-sdk/client-s3'

mock.module('server-only', () => ({}))

const { createR2UgcObjectStore } = await import('../src/server/r2')

/** Um S3Client de mentira: registra os comandos e deixa o teste decidir a resposta do lote. */
function fakeClient(opts: { batch: 'ok' | 'throw' | 'partial'; pages?: string[][] }) {
  const sent: Array<{ name: string; keys: string[] }> = []
  const client = {
    send: async (command: { constructor: { name: string }; input: Record<string, unknown> }) => {
      const name = command.constructor.name
      if (name === 'ListObjectsV2Command') {
        return { Contents: (opts.pages?.shift() ?? []).map((Key) => ({ Key })) }
      }
      if (name === 'DeleteObjectsCommand') {
        const objects = (command.input.Delete as { Objects: Array<{ Key: string }> }).Objects
        sent.push({ name, keys: objects.map((o) => o.Key) })
        if (opts.batch === 'throw') throw new Error('x-amz-checksum-crc32 not implemented')
        if (opts.batch === 'partial') {
          return { Errors: [{ Key: objects[0]?.Key, Code: 'InternalError' }] }
        }
        return { Errors: [] }
      }
      if (name === 'DeleteObjectCommand') {
        sent.push({ name, keys: [command.input.Key as string] })
        return {}
      }
      if (name === 'HeadObjectCommand') {
        sent.push({ name, keys: [command.input.Key as string] })
        if (String(command.input.Key).includes('sumida')) {
          throw Object.assign(new Error('nao existe'), { name: 'NotFound' })
        }
        if (String(command.input.Key).includes('erro')) throw new Error('rede')
        return {}
      }
      throw new Error(`comando inesperado: ${name}`)
    },
  }
  return { client: client as unknown as S3Client, sent }
}

describe('R2 UGC — apagar em lote (partes soltas) e HEAD', () => {
  test('lote ok: um `DeleteObjects` por até 1000 chaves; uma chave só vai por `DeleteObject`', async () => {
    const { client, sent } = fakeClient({ batch: 'ok' })
    const store = createR2UgcObjectStore(client, 'ugc')
    await store.deleteObjects(['a', 'b', '/b', 'c'])
    expect(sent).toEqual([{ name: 'DeleteObjectsCommand', keys: ['a', 'b', 'c'] }])
    sent.length = 0
    await store.deleteObjects(['solo'])
    expect(sent).toEqual([{ name: 'DeleteObjectCommand', keys: ['solo'] }])
  })

  test('lote que FALHA (checksum/R2 discordando do SDK): cai para um `DeleteObject` por chave — o lixo não fica no bucket', async () => {
    const { client, sent } = fakeClient({ batch: 'throw' })
    await createR2UgcObjectStore(client, 'ugc').deleteObjects(['a', 'b'])
    expect(sent.map((s) => s.name)).toEqual([
      'DeleteObjectsCommand',
      'DeleteObjectCommand',
      'DeleteObjectCommand',
    ])
    expect(sent.slice(1).flatMap((s) => s.keys)).toEqual(['a', 'b'])
  })

  test('falha PARCIAL no lote: as chaves que o R2 recusou vão uma a uma', async () => {
    const { client, sent } = fakeClient({ batch: 'partial' })
    await createR2UgcObjectStore(client, 'ugc').deleteObjects(['a', 'b'])
    expect(sent).toEqual([
      { name: 'DeleteObjectsCommand', keys: ['a', 'b'] },
      { name: 'DeleteObjectCommand', keys: ['a'] },
    ])
  })

  test('HEAD: existe → true; 404 definitivo → false; outro erro → null (o commit segue)', async () => {
    const { client } = fakeClient({ batch: 'ok' })
    const store = createR2UgcObjectStore(client, 'ugc')
    expect(await store.head('creations/u/studio/j/parts/ok.1.gz')).toBe(true)
    expect(await store.head('creations/u/studio/j/parts/sumida.1.gz')).toBe(false)
    expect(await store.head('creations/u/studio/j/parts/erro.1.gz')).toBeNull()
  })

  test('limpeza por prefixo também cai para DeleteObject quando o lote falha', async () => {
    const { client, sent } = fakeClient({ batch: 'throw', pages: [['a', 'b'], []] })

    await createR2UgcObjectStore(client, 'ugc').deletePrefixes(['creations/u/'])

    expect(sent.map((entry) => entry.name)).toEqual([
      'DeleteObjectsCommand',
      'DeleteObjectCommand',
      'DeleteObjectCommand',
    ])
  })
})
