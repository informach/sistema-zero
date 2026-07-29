import { describe, expect, test } from 'bun:test'
import {
  InvalidJsonBodyError,
  RequestBodyTooLargeError,
  readJsonBodyWithLimit,
} from '../src/server/read-json-body'

function chunkedRequest(chunks: string[]): Request {
  const encoder = new TextEncoder()
  return new Request('http://localhost/build', {
    method: 'POST',
    body: new ReadableStream({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(encoder.encode(chunk))
        controller.close()
      },
    }),
    duplex: 'half',
  } as RequestInit & { duplex: 'half' })
}

describe('readJsonBodyWithLimit', () => {
  test('lê JSON enviado em partes sem Content-Length', async () => {
    const request = chunkedRequest(['{"nome":', '"Projeto"}'])
    expect(await readJsonBodyWithLimit(request, 100)).toEqual({ nome: 'Projeto' })
  })

  test('interrompe stream que excede o limite mesmo sem Content-Length', async () => {
    const request = chunkedRequest(['{"texto":"', 'x'.repeat(50), '"}'])
    await expect(readJsonBodyWithLimit(request, 20)).rejects.toBeInstanceOf(
      RequestBodyTooLargeError,
    )
  })

  test('distingue JSON inválido de corpo grande', async () => {
    await expect(readJsonBodyWithLimit(chunkedRequest(['{']), 100)).rejects.toBeInstanceOf(
      InvalidJsonBodyError,
    )
  })
})
