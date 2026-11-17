import { expect, mock, test } from 'bun:test'
import { createHash } from 'node:crypto'

mock.module('server-only', () => ({}))
const { conferirUploadDeCenario, conferirImagemDeCenario, ConteudoDeCenarioInvalido } =
  await import('../src/server/cenarios-conteudo')

const sha = (b: Uint8Array) => createHash('sha256').update(b).digest('hex')
function glb(extra: object = {}, bin = 0) {
  const json = Buffer.from(JSON.stringify({ asset: { version: '2.0' }, meshes: [{}], ...extra })),
    n = Math.ceil(json.length / 4) * 4
  const bytes = Buffer.alloc(20 + n + (bin ? bin + 8 : 0))
  bytes.writeUInt32LE(0x46546c67, 0)
  bytes.writeUInt32LE(2, 4)
  bytes.writeUInt32LE(bytes.length, 8)
  bytes.writeUInt32LE(n, 12)
  bytes.writeUInt32LE(0x4e4f534a, 16)
  bytes.fill(32, 20, 20 + n)
  bytes.set(json, 20)
  if (bin) {
    bytes.writeUInt32LE(bin, 20 + n)
    bytes.writeUInt32LE(0x004e4942, 24 + n)
  }
  return bytes
}
function fonte(bytes: Uint8Array, tipo = 'model/gltf-binary', passo = 17) {
  let posicao = 0,
    cancelada = false
  return {
    objeto: {
      contentType: tipo,
      contentLength: bytes.length,
      body: new ReadableStream<Uint8Array>(
        {
          pull(c) {
            if (posicao >= bytes.length) return c.close()
            c.enqueue(bytes.subarray(posicao, posicao + passo))
            posicao += passo
          },
          cancel() {
            cancelada = true
          },
        },
        { highWaterMark: 0 },
      ),
    },
    cancelada: () => cancelada,
  }
}
const imagens = [
  [
    'image/png',
    'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAEUlEQVQImWPQ2BLwH4QZYAwASdwIre2QMR4AAAAASUVORK5CYII=',
  ],
  [
    'image/webp',
    'UklGRjgAAABXRUJQVlA4ICwAAACwAQCdASoCAAIAAUAmJaACdLoABKoAAP4TH/AXT3Ri3/69H/56P/z0f5wAAA==',
  ],
  ['image/webp', 'UklGRh4AAABXRUJQVlA4TBEAAAAvAUAAAAdQ2qIUqv+BiOh/AAA='],
] as const

test('a prova de textura inclui as dimensões dos bytes, sem confiar nos metadados do navegador', async () => {
  for (const [mime, base64] of imagens) {
    const bytes = Buffer.from(base64, 'base64')
    const medido = conferirImagemDeCenario(bytes, mime)
    expect(medido).toEqual({ largura: 2, altura: 2 })
    expect(await conferirUploadDeCenario(fonte(bytes, mime).objeto, sha(bytes), 'textura')).toEqual(
      { digest: sha(bytes), bytes: bytes.length, tipoDoConteudo: mime, largura: 2, altura: 2 },
    )
  }
  const bytes = glb()
  await expect(
    conferirUploadDeCenario(fonte(bytes).objeto, sha(bytes), 'textura'),
  ).rejects.toBeInstanceOf(ConteudoDeCenarioInvalido)
})
test('conferência incremental preserva o hash e valida prefixos partidos em qualquer limite', async () => {
  const bytes = glb({}, 4 * 1024 * 1024)
  for (const passo of [1, 3, 19, 65536]) {
    // Chunks minúsculos só no cabeçalho; o corpo grande passa em blocos de rede normais.
    const tamanho = passo < 100 ? glb({}, 128) : bytes
    const f = fonte(tamanho, 'model/gltf-binary', passo)
    expect(await conferirUploadDeCenario(f.objeto, sha(tamanho), 'modelo')).toEqual({
      digest: sha(tamanho),
      bytes: tamanho.length,
      tipoDoConteudo: 'model/gltf-binary',
    })
  }
})
test('recusa hash trocado, BIN truncado, referência externa e conteúdo de outro tipo', async () => {
  await expect(
    conferirUploadDeCenario(fonte(glb()).objeto, 'a'.repeat(64), 'modelo'),
  ).rejects.toBeInstanceOf(ConteudoDeCenarioInvalido)
  const externo = glb({ buffers: [{ uri: 'https://fora.invalid/arquivo.bin' }] })
  await expect(
    conferirUploadDeCenario(fonte(externo).objeto, sha(externo), 'modelo'),
  ).rejects.toThrow('fora')
  const errado = Buffer.from('não é um modelo 3D, mesmo com o hash correto')
  await expect(
    conferirUploadDeCenario(fonte(errado).objeto, sha(errado), 'modelo'),
  ).rejects.toBeInstanceOf(ConteudoDeCenarioInvalido)
  const bin = glb({}, 4)
  bin.writeUInt32LE(8, bin.length - 12)
  await expect(conferirUploadDeCenario(fonte(bin).objeto, sha(bin), 'modelo')).rejects.toThrow(
    'binário',
  )
})
test('limites e MIME são conferidos antes de puxar qualquer byte; stream excedente é cancelado', async () => {
  let leituras = 0,
    cancelada = false
  const body = new ReadableStream<Uint8Array>(
    {
      pull() {
        leituras++
      },
      cancel() {
        cancelada = true
      },
    },
    { highWaterMark: 0 },
  )
  await expect(
    conferirUploadDeCenario(
      { body, contentType: 'model/gltf-binary', contentLength: 65 * 1024 ** 2 },
      'a'.repeat(64),
      'modelo',
    ),
  ).rejects.toThrow('limite')
  expect(leituras).toBe(0)
  expect(cancelada).toBe(true)
  const excesso = fonte(glb())
  excesso.objeto.contentLength = 10
  await expect(conferirUploadDeCenario(excesso.objeto, 'a'.repeat(64), 'modelo')).rejects.toThrow(
    'ultrapassa',
  )
  expect(excesso.cancelada()).toBe(true)
  const falso = fonte(glb(), 'text/html')
  await expect(conferirUploadDeCenario(falso.objeto, 'a'.repeat(64), 'modelo')).rejects.toThrow(
    'tipo',
  )
  expect(falso.cancelada()).toBe(true)
})
test('PNG, WebP com perdas e sem perdas mantêm seu MIME real e um tamanho conferido', async () => {
  for (const [mime, dados] of imagens) {
    const bytes = Buffer.from(dados, 'base64')
    expect(
      await conferirUploadDeCenario(fonte(bytes, mime).objeto, sha(bytes), 'miniatura'),
    ).toEqual({ digest: sha(bytes), bytes: bytes.length, tipoDoConteudo: mime })
  }
  expect(() => conferirImagemDeCenario(Buffer.from(imagens[0][1], 'base64'), 'image/webp')).toThrow(
    'WebP',
  )
  const grande = Buffer.from(imagens[0][1], 'base64')
  grande.writeUInt32BE(50000, 16)
  expect(() => conferirImagemDeCenario(grande, 'image/png')).toThrow('dimensões')
})
test('cancelamento do pedido encerra a leitura sem confirmar conteúdo parcial', async () => {
  const controle = new AbortController()
  const f = fonte(glb())
  controle.abort()
  await expect(
    conferirUploadDeCenario(f.objeto, 'a'.repeat(64), 'modelo', controle.signal),
  ).rejects.toThrow()
  expect(f.cancelada()).toBe(true)
})
