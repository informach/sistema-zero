import { afterEach, describe, expect, spyOn, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import worker, { logResult, runReconciliation } from '../src/index'

const secret = 'local-test-reconciliation-secret-20261022'
const staging = {
  ENVIRONMENT: 'staging',
  KIDS_ORIGIN: 'https://community-kids-staging.up.railway.app',
  STUDIO_AI_RECONCILE_CRON_SECRET: secret,
} as const
const production = {
  ...staging,
  ENVIRONMENT: 'production',
  KIDS_ORIGIN: 'https://kids.sistemazero.com.br',
} as const
const good = { confirmed: 3, pending: 1, expiredBuilderJobs: 7 }
const json = (value: unknown) => Response.json(value)
const spies: ReturnType<typeof spyOn>[] = []
afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore()
})

describe('Studio AI reconciliation scheduler', () => {
  test.each([staging, production])('POST único no ambiente $ENVIRONMENT', async (env) => {
    const calls: { url: string; init: RequestInit }[] = []
    const result = await runReconciliation(env, async (url, init) => {
      calls.push({ url, init })
      return json(good)
    })
    expect(result).toEqual({ environment: env.ENVIRONMENT, state: 'pending', ...good })
    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe(`${env.KIDS_ORIGIN}/api/internal/studio-ai/reconcile`)
    expect(calls[0].init.method).toBe('POST')
    expect(calls[0].init.redirect).toBe('manual')
    expect(calls[0].init.body).toBeUndefined()
    expect(new Headers(calls[0].init.headers).get('authorization')).toBe(`Bearer ${secret}`)
  })

  test.each([
    { ...staging, KIDS_ORIGIN: production.KIDS_ORIGIN },
    { ...production, KIDS_ORIGIN: staging.KIDS_ORIGIN },
    { ...staging, KIDS_ORIGIN: `${staging.KIDS_ORIGIN}/` },
    { ...staging, KIDS_ORIGIN: `${staging.KIDS_ORIGIN}?token=private` },
    { ...staging, KIDS_ORIGIN: 'http://localhost:3008' },
    { ...staging, ENVIRONMENT: 'unknown' },
  ])('configuração divergente não envia o bearer', async (env) => {
    let calls = 0
    const result = await runReconciliation(env, async () => {
      calls++
      return json(good)
    })
    expect(result).toMatchObject({ state: 'skipped', reason: 'configuration' })
    expect(calls).toBe(0)
  })

  test.each([
    undefined,
    '',
    'short',
    ` ${secret}`,
    `${secret}\n`,
  ])('segredo inválido recusa chamada', async (value) => {
    let calls = 0
    expect(
      await runReconciliation({ ...staging, STUDIO_AI_RECONCILE_CRON_SECRET: value }, async () => {
        calls++
        return json(good)
      }),
    ).toEqual({ environment: 'staging', state: 'skipped', reason: 'secret' })
    expect(calls).toBe(0)
  })

  test.each([
    302, 401, 503,
  ])('HTTP%s não lê nem registra resposta privada ou tenta novamente', async (status) => {
    let calls = 0,
      cancelled = false
    const body = new ReadableStream<Uint8Array>({
      cancel() {
        cancelled = true
      },
    })
    const result = await runReconciliation(staging, async () => {
      calls++
      return new Response(body, { status, headers: { Location: 'https://elsewhere.test/private' } })
    })
    expect(result).toEqual({ environment: 'staging', state: 'http-error', status })
    expect(calls).toBe(1)
    expect(cancelled).toBe(true)
  })

  test.each(
    [
      null,
      [],
      { ...good, confirmed: -1 },
      { ...good, confirmed: 3.5 },
      { ...good, pending: 2 },
      { ...good, expiredBuilderJobs: 101 },
      { ...good, expiredBuilderJobs: '7' },
      { ...good, body: secret },
      { confirmed: 0, pending: 0 },
    ].map((body) => ({ body })),
  )('corpo inválido não vira contagem confirmada', async ({ body }) => {
    expect(await runReconciliation(staging, async () => json(body))).toEqual({
      environment: 'staging',
      state: 'invalid-response',
    })
  })

  test('limita corpo recebido e cancela stream acima de4KiB', async () => {
    let cancelled = false
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(4097))
      },
      cancel() {
        cancelled = true
      },
    })
    expect(
      await runReconciliation(
        staging,
        async () => new Response(body, { headers: { 'content-type': 'application/json' } }),
      ),
    ).toMatchObject({ state: 'invalid-response' })
    expect(cancelled).toBe(true)
  })

  test('JSON malformado e conteúdo não JSON não vazam', async () => {
    for (const contentType of ['application/json', 'text/html', 'application/json-untrusted']) {
      const result = await runReconciliation(
        staging,
        async () => new Response(`<html>${secret}`, { headers: { 'content-type': contentType } }),
      )
      expect(result).toMatchObject({ state: 'invalid-response' })
      expect(JSON.stringify(result)).not.toContain(secret)
    }
  })

  test('não aceita um MIME diferente que apenas começa com application/json', async () => {
    const result = await runReconciliation(
      staging,
      async () =>
        new Response(JSON.stringify(good), {
          headers: { 'content-type': 'application/json-untrusted' },
        }),
    )
    expect(result).toEqual({ environment: 'staging', state: 'invalid-response' })
  })

  test('prazo cobre fetch pendente sem retry', async () => {
    let calls = 0,
      aborted = false
    const result = await runReconciliation(
      staging,
      async (_url, init) => {
        calls++
        return new Promise<Response>((_accept, reject) => {
          init.signal?.addEventListener('abort', () => {
            aborted = true
            reject(new Error(secret))
          })
        })
      },
      5,
    )
    expect(result).toEqual({ environment: 'staging', state: 'unconfirmed', reason: 'timeout' })
    expect(calls).toBe(1)
    expect(aborted).toBe(true)
  })

  test('prazo cobre corpo pendente e cancela o leitor', async () => {
    let cancelled = false
    const body = new ReadableStream<Uint8Array>({
      cancel() {
        cancelled = true
      },
    })
    const result = await runReconciliation(
      staging,
      async () => new Response(body, { headers: { 'content-type': 'application/json' } }),
      5,
    )
    expect(result).toEqual({ environment: 'staging', state: 'unconfirmed', reason: 'timeout' })
    expect(cancelled).toBe(true)
  })

  test('logs só contêm estado e contagens validadas; falha de limpeza permanece pendente', async () => {
    const info = spyOn(console, 'info').mockImplementation(() => {})
    const warn = spyOn(console, 'warn').mockImplementation(() => {})
    spies.push(info, warn)
    for (const expiredBuilderJobs of [0, null]) {
      logResult(
        await runReconciliation(production, async () =>
          json({ confirmed: 0, pending: 0, expiredBuilderJobs }),
        ),
      )
    }
    logResult(
      await runReconciliation(production, async () => {
        throw new Error(`Authorization: Bearer ${secret}`)
      }),
    )
    expect(info).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalledTimes(2)
    expect(JSON.parse(String(warn.mock.calls[0][0]))).toEqual({
      event: 'studio-ai-reconcile',
      environment: 'production',
      state: 'pending',
      confirmed: 0,
      pending: 0,
      expiredBuilderJobs: null,
    })
    const logs = JSON.stringify([...info.mock.calls, ...warn.mock.calls])
    expect(logs).not.toContain(secret)
    expect(logs).not.toContain('Authorization')
    expect(logs).not.toContain('https://')
  })

  test('handler scheduled mantém a promessa no waitUntil; HTTP nunca dispara trabalho', async () => {
    const fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(
      json({ confirmed: 0, pending: 0, expiredBuilderJobs: 0 }),
    )
    const info = spyOn(console, 'info').mockImplementation(() => {})
    spies.push(fetchSpy, info)
    const pending: Promise<unknown>[] = []
    worker.scheduled({ cron: '* * * * *', scheduledTime: 1, noRetry() {} }, staging, {
      waitUntil(promise) {
        pending.push(promise)
      },
    })
    expect(pending).toHaveLength(1)
    await Promise.all(pending)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(info).toHaveBeenCalledTimes(1)
    const response = await worker.fetch()
    expect(response.status).toBe(404)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  test('manifesto separa ambientes e o cron de criação existente permanece5min', () => {
    const config = JSON.parse(readFileSync(new URL('../wrangler.jsonc', import.meta.url), 'utf8'))
    expect(config.triggers.crons).toEqual([])
    expect(config.workers_dev).toBe(false)
    for (const name of ['staging', 'production']) {
      expect(config.env[name].name).toBe(`sistemazero-studio-ai-reconcile-${name}`)
      expect(config.env[name].triggers.crons).toEqual(['* * * * *'])
      expect(config.env[name].secrets.required).toEqual(['STUDIO_AI_RECONCILE_CRON_SECRET'])
    }
    const cleanup = readFileSync(
      new URL('../../creation-cleanup-cron/wrangler.jsonc', import.meta.url),
      'utf8',
    )
    expect(cleanup).toContain('*/5 * * * *')
    expect(cleanup).not.toContain('studio-ai')
  })
})
