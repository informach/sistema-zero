import { describe, expect, mock, test } from 'bun:test'

// `server-only` lança fora do React Server — neutraliza p/ importar o helper puro.
mock.module('server-only', () => ({}))

const { bufferFromStream } = await import('../src/server/r2')

function streamFrom(chunks: Uint8Array[]): ReadableStream<Uint8Array> {
  let i = 0
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (i < chunks.length) controller.enqueue(chunks[i++])
      else controller.close()
    },
  })
}

describe('bufferFromStream', () => {
  test('sem teto: materializa o stream inteiro', async () => {
    const buf = await bufferFromStream(streamFrom([new Uint8Array([1, 2]), new Uint8Array([3])]))
    expect([...buf]).toEqual([1, 2, 3])
  })

  test('com teto: aceita conteúdo dentro do limite', async () => {
    const buf = await bufferFromStream(streamFrom([new Uint8Array(10), new Uint8Array(10)]), 32)
    expect(buf.byteLength).toBe(20)
  })

  test('com teto: ABORTA quando excede o limite (não bufferiza sem fim)', async () => {
    const big = streamFrom([new Uint8Array(30), new Uint8Array(30)])
    await expect(bufferFromStream(big, 40)).rejects.toThrow(/teto/)
  })
})
