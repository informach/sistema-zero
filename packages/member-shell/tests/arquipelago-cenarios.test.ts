import { expect, test } from 'bun:test'
import { criarPortaDeCenariosPublicados } from '../src/lib/arquipelago-cenarios'

test('porta publicada usa somente BFF de leitura, sinal e prova do perfil que montou o jogo', async () => {
  const pedidos: { url: string; init?: RequestInit }[] = [],
    sinal = new AbortController().signal
  const porta = criarPortaDeCenariosPublicados('perfil-da-montagem', async (url, init) => {
    pedidos.push({ url, init })
    return { status: 200, corpo: null }
  })
  await porta.perfil('sua-ilha', sinal)
  await porta.arquivo('publicacao-1', 'a'.repeat(64), sinal)
  expect(pedidos.map((p) => p.url)).toEqual([
    '/api/cenarios/jogo/perfis/sua-ilha',
    `/api/cenarios/jogo/publicacoes/publicacao-1/arquivos/${'a'.repeat(64)}?como=endereco`,
  ])
  for (const p of pedidos) {
    expect(p.init).toMatchObject({
      method: 'GET',
      cache: 'no-store',
      signal: sinal,
      headers: { 'x-sz-viewer': 'perfil-da-montagem' },
    })
    expect(p.init?.body).toBeUndefined()
  }
})
test('referências de arquivo não conseguem construir outro caminho ou consulta', async () => {
  const pedidos: string[] = []
  const porta = criarPortaDeCenariosPublicados('perfil', async (url) => {
    pedidos.push(url)
    return { status: 404, corpo: null }
  })
  await porta.arquivo('a/../espacos?x', 'b#c')
  expect(pedidos[0]).toBe(
    '/api/cenarios/jogo/publicacoes/a%2F..%2Fespacos%3Fx/arquivos/b%23c?como=endereco',
  )
})
