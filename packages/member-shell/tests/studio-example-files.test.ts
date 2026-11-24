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
/** A sessão da equipe (a galeria é só dela nos dois apps). */
const equipe = async () => ({ role: 'staff' })

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
      requireSession: equipe,
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
      requireSession: equipe,
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
    expect(ok.headers.get('cache-control')).toContain('private')
    expect(ok.headers.get('content-type')).toBe('application/json')
    expect(pedidos).toEqual([`https://r2.exemplo/estudio-exemplos/jogo-e/${SHA}.json`])
    const falta = await rota.GET(new Request('http://app/x'), params(['outro', `${SHA}.json`]))
    expect(falta.status).toBe(404)
    const ruim = await rota.GET(new Request('http://app/x'), params(['..', 'x']))
    expect(ruim.status).toBe(404)
    expect(pedidos).toHaveLength(2)
  })

  // Full review final (22/11/2026): a galeria é só da equipe nos dois apps, e a rota servia o
  // arquivo de 20 MB a qualquer pessoa (até sem sessão), e seguia buscando depois de o pedido cair.
  it('só a equipe recebe o arquivo; sem sessão vale a recusa da sessão, e o sinal do pedido vai junto', async () => {
    const sinais: (AbortSignal | undefined)[] = []
    const pedidos: string[] = []
    const fetcher = (async (url: string, init?: RequestInit) => {
      pedidos.push(url)
      sinais.push(init?.signal ?? undefined)
      return new Response('{"ir":{}}')
    }) as unknown as typeof fetch
    const caminho = params(['jogo-e', `${SHA}.json`])
    const crianca = createStudioExampleFilesRoute({
      origin: () => 'https://r2.exemplo',
      requireSession: async () => ({ role: 'member' }),
      fetcher,
    })
    expect((await crianca.GET(new Request('http://app/x'), caminho)).status).toBe(404)
    const semSessao = createStudioExampleFilesRoute({
      origin: () => 'https://r2.exemplo',
      requireSession: async () => new Response('', { status: 401 }),
      fetcher,
    })
    expect((await semSessao.GET(new Request('http://app/x'), caminho)).status).toBe(401)
    expect(pedidos).toEqual([])
    const controle = new AbortController()
    const daEquipe = createStudioExampleFilesRoute({
      origin: () => 'https://r2.exemplo',
      requireSession: equipe,
      fetcher,
    })
    const ok = await daEquipe.GET(
      new Request('http://app/x', { signal: controle.signal }),
      params(['jogo-e', `${SHA}.json`]),
    )
    expect(ok.status).toBe(200)
    expect(pedidos).toHaveLength(1)
    controle.abort()
    expect(sinais[0]?.aborted).toBe(true)
  })
})
