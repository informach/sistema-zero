import { describe, expect, it, mock } from 'bun:test'

// `server-only` lança fora do React Server: neutraliza para testar a rota.
mock.module('server-only', () => ({}))
const { createStudioExampleFilesRoute, studioExampleFileUrl } = await import(
  '../src/routes/studio-example-files'
)

/**
 * A rota dos exemplos grandes da galeria do Estúdio (lote 9 da conclusão do plano do Estúdio,
 * 22/11/2026): só um formato de caminho passa, só com o ambiente configurado, e o arquivo chega
 * do mesmo domínio com cache longo.
 */
const SHA = 'a'.repeat(64)
const params = (caminho: string[]) => ({ params: Promise.resolve({ caminho }) })

describe('os arquivos dos exemplos grandes', () => {
  it('só aceita <pasta>/<sha256>.json', () => {
    expect(studioExampleFileUrl('https://r2.exemplo/', ['jogo-e', `${SHA}.json`])).toBe(
      `https://r2.exemplo/estudio-exemplos/jogo-e/${SHA}.json`,
    )
    for (const ruim of [
      ['jogo-e'],
      ['jogo-e', 'x.json'],
      ['..', `${SHA}.json`],
      ['Jogo E', `${SHA}.json`],
      ['jogo-e', `${SHA}.json`, 'mais'],
      ['jogo-e', `${SHA.toUpperCase()}.json`],
    ])
      expect(studioExampleFileUrl('https://r2.exemplo', ruim)).toBeNull()
  })

  it('sem o ambiente configurado responde 404 e não busca nada', async () => {
    let buscou = false
    const rota = createStudioExampleFilesRoute({
      origin: () => undefined,
      fetcher: (async () => {
        buscou = true
        return new Response('{}')
      }) as unknown as typeof fetch,
    })
    const resposta = await rota.GET(new Request('http://app/x'), params(['jogo-e', `${SHA}.json`]))
    expect(resposta.status).toBe(404)
    expect(buscou).toBe(false)
  })

  it('entrega o arquivo do R2 com cache longo; o que falta lá vira 404', async () => {
    const pedidos: string[] = []
    const rota = createStudioExampleFilesRoute({
      origin: () => 'https://r2.exemplo',
      fetcher: (async (url: string) => {
        pedidos.push(url)
        return url.includes('jogo-e')
          ? new Response('{"ir":{}}')
          : new Response('', { status: 404 })
      }) as unknown as typeof fetch,
    })
    const ok = await rota.GET(new Request('http://app/x'), params(['jogo-e', `${SHA}.json`]))
    expect(ok.status).toBe(200)
    expect(await ok.text()).toBe('{"ir":{}}')
    expect(ok.headers.get('cache-control')).toContain('immutable')
    expect(ok.headers.get('content-type')).toBe('application/json')
    expect(pedidos).toEqual([`https://r2.exemplo/estudio-exemplos/jogo-e/${SHA}.json`])
    const falta = await rota.GET(new Request('http://app/x'), params(['outro', `${SHA}.json`]))
    expect(falta.status).toBe(404)
    const ruim = await rota.GET(new Request('http://app/x'), params(['..', 'x']))
    expect(ruim.status).toBe(404)
    expect(pedidos).toHaveLength(2)
  })
})
