import { expect, test } from 'bun:test'
import { type BuscarArquivoCompilado, lerBytesDoCenario } from '../src/compilar/leitura-http'

const url = new URL('https://armazenamento.exemplo/modelo.glb?assinatura=ensaio')
test('leitura compilada mantém limite e não envia sessão ao armazenamento', async () => {
  const chamadas: RequestInit[] = []
  const bytes = await lerBytesDoCenario(url, 3, new AbortController().signal, (async (_url, o) => {
    chamadas.push(o!)
    return new Response(new Uint8Array([1, 2, 3]), { headers: { 'content-length': '3' } })
  }) satisfies BuscarArquivoCompilado)
  expect([...bytes]).toEqual([1, 2, 3])
  expect(chamadas[0]).toMatchObject({ credentials: 'omit', redirect: 'error' })
})
test('limite inválido ou endereço com credenciais é recusado antes de acessar a rede', async () => {
  let chamadas = 0
  const buscar = (async () => {
    chamadas++
    return new Response('')
  }) satisfies BuscarArquivoCompilado
  for (const limite of [0, NaN, Infinity, 256 * 1024 * 1024 + 1])
    await expect(
      lerBytesDoCenario(url, limite, new AbortController().signal, buscar),
    ).rejects.toThrow()
  await expect(
    lerBytesDoCenario(
      new URL('https://usuario:senha@armazenamento.exemplo/a'),
      3,
      new AbortController().signal,
      buscar,
    ),
  ).rejects.toThrow()
  expect(chamadas).toBe(0)
})
test('stream excedente é cancelado antes de produzir o pacote', async () => {
  let cancelados = 0
  const buscar = (async () =>
    new Response(
      new ReadableStream({
        start(c) {
          c.enqueue(new Uint8Array([1, 2, 3, 4]))
        },
        cancel() {
          cancelados++
        },
      }),
    )) satisfies BuscarArquivoCompilado
  await expect(lerBytesDoCenario(url, 3, new AbortController().signal, buscar)).rejects.toThrow(
    /tamanho/,
  )
  expect(cancelados).toBe(1)
})
test('cancelamento enquanto a resposta chega encerra o corpo sem o ler', async () => {
  const controle = new AbortController()
  let cancelados = 0
  const buscar = (async () => {
    controle.abort()
    return new Response(
      new ReadableStream({
        cancel() {
          cancelados++
        },
      }),
    )
  }) satisfies BuscarArquivoCompilado
  await expect(lerBytesDoCenario(url, 3, controle.signal, buscar)).rejects.toHaveProperty(
    'name',
    'AbortError',
  )
  expect(cancelados).toBe(1)
})
test('cancelamento fecha leitura pendente mesmo quando o transporte não escuta o sinal', async () => {
  const controle = new AbortController()
  let cancelados = 0
  const buscar = (async () =>
    new Response(
      new ReadableStream({
        start() {
          setTimeout(() => controle.abort(), 10)
        },
        cancel() {
          cancelados++
        },
      }),
    )) satisfies BuscarArquivoCompilado
  await expect(lerBytesDoCenario(url, 3, controle.signal, buscar)).rejects.toHaveProperty(
    'name',
    'AbortError',
  )
  expect(cancelados).toBe(1)
})
