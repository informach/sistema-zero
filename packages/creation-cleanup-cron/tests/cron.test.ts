import { describe, expect, test } from 'bun:test'
import { runAll, runTarget } from '../src/index'

type Call = { url: string; authorization: string | null; method: string | undefined }

function fakeFetch(status: number, body = '{"completed":1,"failed":0}') {
  const calls: Call[] = []
  const impl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers)
    calls.push({
      url: String(input),
      authorization: headers.get('authorization'),
      method: init?.method,
    })
    return new Response(body, { status })
  }) as typeof fetch
  return { impl, calls }
}

describe('creation-cleanup-cron', () => {
  test('bate na rota de limpeza com o bearer do ambiente e POST', async () => {
    const { impl, calls } = fakeFetch(200)
    const r = await runTarget('staging', 'https://kids.example.test/', 'segredo-de-staging', impl)
    expect(r).toEqual({ target: 'staging', status: 200, body: '{"completed":1,"failed":0}' })
    expect(calls).toEqual([
      {
        url: 'https://kids.example.test/api/internal/creation-cleanups',
        authorization: 'Bearer segredo-de-staging',
        method: 'POST',
      },
    ])
  })

  test('sem URL ou sem segredo o alvo é PULADO, sem bater em lugar nenhum', async () => {
    const { impl, calls } = fakeFetch(200)
    expect(await runTarget('production', undefined, 'x', impl)).toEqual({
      target: 'production',
      skipped: 'sem-url',
    })
    expect(await runTarget('production', 'https://a.test', '  ', impl)).toEqual({
      target: 'production',
      skipped: 'sem-segredo',
    })
    expect(calls).toHaveLength(0)
  })

  test('status não-200 e erro de rede viram RESULTADO, nunca exceção', async () => {
    const { impl } = fakeFetch(401, 'nope')
    expect(await runTarget('staging', 'https://a.test', 's', impl)).toMatchObject({
      status: 401,
      body: 'nope',
    })
    const boom = (async () => {
      throw new Error('rede caiu')
    }) as unknown as typeof fetch
    expect(await runTarget('staging', 'https://a.test', 's', boom)).toEqual({
      target: 'staging',
      error: 'rede caiu',
    })
  })

  test('um alvo quebrado não impede o outro (os dois correm e os dois reportam)', async () => {
    const { impl, calls } = fakeFetch(200)
    const results = await runAll(
      { STAGING_URL: 'https://s.test', STAGING_SECRET: 'a', PRODUCTION_URL: 'https://p.test' },
      impl,
    )
    expect(results.map((r) => r.target)).toEqual(['staging', 'production'])
    expect(results[0]).toMatchObject({ status: 200 })
    expect(results[1]).toEqual({ target: 'production', skipped: 'sem-segredo' })
    expect(calls.map((c) => c.url)).toEqual(['https://s.test/api/internal/creation-cleanups'])
  })
})
