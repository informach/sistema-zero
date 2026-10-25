import { afterEach, describe, expect, test } from 'bun:test'
import { EfiClient } from '../../src/infrastructure/gateways/efi/efi.client'
import { EfiGatewayError } from '../../src/infrastructure/gateways/efi/efi.errors'
import { EfiPaymentGateway } from '../../src/infrastructure/gateways/efi/efi.gateway'
import { EfiCobrancasClient } from '../../src/infrastructure/gateways/efi/efi-cobrancas.client'

const realFetch = globalThis.fetch
afterEach(() => {
  globalThis.fetch = realFetch
})

interface Call {
  url: string
  method: string
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

/** Instala um `fetch` fake. O router recebe (info, counts) e devolve a Response. */
function installFetch(
  router: (
    info: { url: string; method: string; signal?: AbortSignal; body?: string },
    counts: { token: number; endpoint: number },
  ) => Response | Promise<Response>,
): Call[] {
  const calls: Call[] = []
  const counts = { token: 0, endpoint: 0 }
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input)
    const method = init?.method ?? 'GET'
    calls.push({ url, method })
    if (url.includes('/oauth/token') || url.endsWith('/authorize')) counts.token++
    else counts.endpoint++
    return router(
      {
        url,
        method,
        signal: init?.signal ?? undefined,
        body: typeof init?.body === 'string' ? init.body : undefined,
      },
      counts,
    )
  }) as typeof fetch
  return calls
}

const tokenCalls = (calls: Call[]) =>
  calls.filter((c) => c.url.includes('/oauth/token') || c.url.endsWith('/authorize'))
const urlCalls = (calls: Call[], fragment: string) => calls.filter((c) => c.url.includes(fragment))

function pixClient(overrides: Partial<ConstructorParameters<typeof EfiClient>[0]> = {}) {
  return new EfiClient({
    clientId: 'id',
    clientSecret: 'sec',
    cert: 'cert-pem',
    key: 'key-pem',
    sandbox: true,
    maxRetries: 2,
    retryBaseMs: 1,
    requestTimeoutMs: 1000,
    ...overrides,
  })
}

describe('EfiClient (Pix) — resiliência e idempotência', () => {
  test('POST de criação (idempotent:false) NÃO é re-tentado em 503 (não duplica recurso)', async () => {
    const calls = installFetch(({ url }) => {
      if (url.endsWith('/oauth/token')) return jsonResponse(200, { access_token: 'tok' })
      return jsonResponse(503, { mensagem: 'indisponível' })
    })
    await expect(pixClient().createEvp()).rejects.toBeInstanceOf(EfiGatewayError)
    expect(urlCalls(calls, '/v2/gn/evp')).toHaveLength(1) // sem retry
  })

  test('GET é re-tentado em 5xx e então sucede', async () => {
    const calls = installFetch(({ url }, counts) => {
      if (url.endsWith('/oauth/token')) return jsonResponse(200, { access_token: 'tok' })
      if (counts.endpoint === 1) return jsonResponse(503, { mensagem: 'x' })
      return jsonResponse(200, { txid: 'abc' })
    })
    const res = await pixClient().detailCharge('abc')
    expect(res).toEqual({ txid: 'abc' })
    expect(urlCalls(calls, '/v2/cob/')).toHaveLength(2) // 1 falha + 1 sucesso
  })

  test('4xx (ex.: 400) NÃO é re-tentado', async () => {
    const calls = installFetch(({ url }) => {
      if (url.endsWith('/oauth/token')) return jsonResponse(200, { access_token: 'tok' })
      return jsonResponse(400, { mensagem: 'requisição inválida' })
    })
    await expect(pixClient().detailCharge('abc')).rejects.toBeInstanceOf(EfiGatewayError)
    expect(urlCalls(calls, '/v2/cob/')).toHaveLength(1)
  })

  test('401 → reautentica exatamente uma vez e repete a requisição', async () => {
    const calls = installFetch(({ url }, counts) => {
      if (url.endsWith('/oauth/token')) return jsonResponse(200, { access_token: 'tok' })
      if (counts.endpoint === 1) return jsonResponse(401, { mensagem: 'token expirado' })
      return jsonResponse(200, { txid: 'abc' })
    })
    const res = await pixClient().detailCharge('abc')
    expect(res).toEqual({ txid: 'abc' })
    expect(tokenCalls(calls)).toHaveLength(2) // 1 inicial + 1 re-auth
    expect(urlCalls(calls, '/v2/cob/')).toHaveLength(2)
  })

  test('single-flight: requests concorrentes compartilham UMA busca de token', async () => {
    const calls = installFetch(async ({ url }) => {
      if (url.endsWith('/oauth/token')) {
        await Promise.resolve()
        return jsonResponse(200, { access_token: 'tok' })
      }
      return jsonResponse(200, { ok: true })
    })
    const client = pixClient()
    await Promise.all([client.detailCharge('a'), client.detailCharge('b'), client.listEvp()])
    expect(tokenCalls(calls)).toHaveLength(1)
  })

  test('budget total esgotado corta o retry mesmo de chamada idempotente (PUT)', async () => {
    const calls = installFetch(({ url }) => {
      if (url.endsWith('/oauth/token')) return jsonResponse(200, { access_token: 'tok' })
      return jsonResponse(503, { mensagem: 'indisponível' })
    })
    // budget == timeout por tentativa → após a 1ª falha não sobra espaço para a
    // 2ª tentativa inteira (elapsed + backoff + attemptTimeout > budget).
    await expect(
      pixClient({ requestTimeoutMs: 1000, totalBudgetMs: 1000 }).createCharge('txid123', {}),
    ).rejects.toBeInstanceOf(EfiGatewayError)
    expect(urlCalls(calls, '/v2/cob/')).toHaveLength(1) // sem retry: budget esgotado
  })

  test('budget com folga NÃO corta o retry (controle)', async () => {
    const calls = installFetch(({ url }, counts) => {
      if (url.endsWith('/oauth/token')) return jsonResponse(200, { access_token: 'tok' })
      if (counts.endpoint === 1) return jsonResponse(503, { mensagem: 'x' })
      return jsonResponse(200, { txid: 'abc' })
    })
    const res = await pixClient({ requestTimeoutMs: 50, totalBudgetMs: 10_000 }).createCharge(
      'abc',
      {},
    )
    expect(res).toEqual({ txid: 'abc' })
    expect(urlCalls(calls, '/v2/cob/')).toHaveLength(2)
  })

  test('timeout aborta a requisição pendurada e falha', async () => {
    installFetch(({ url, signal }) => {
      if (url.endsWith('/oauth/token')) return jsonResponse(200, { access_token: 'tok' })
      // Endpoint pendura até o AbortController do client disparar.
      return new Promise<Response>((_resolve, reject) => {
        signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
      })
    })
    await expect(
      pixClient({ requestTimeoutMs: 20, maxRetries: 0 }).detailCharge('hang'),
    ).rejects.toBeInstanceOf(EfiGatewayError)
  })
})

describe('EfiCobrancasClient (Boleto) — resiliência e idempotência', () => {
  function cobrancasClient(
    overrides: Partial<ConstructorParameters<typeof EfiCobrancasClient>[0]> = {},
  ) {
    return new EfiCobrancasClient({
      clientId: 'id',
      clientSecret: 'sec',
      sandbox: true,
      maxRetries: 2,
      retryBaseMs: 1,
      requestTimeoutMs: 1000,
      ...overrides,
    })
  }

  test('troca preventiva envia só payment_token e nunca chama retry ou altera preço/plano', async () => {
    let sent: { method: string; body: unknown } | undefined
    const calls = installFetch(({ url, method, body }) => {
      if (url.endsWith('/authorize')) return jsonResponse(200, { access_token: 'tok' })
      sent = { method, body: JSON.parse(body ?? '{}') }
      return jsonResponse(200, { code: 200 })
    })
    await new EfiPaymentGateway(pixClient(), cobrancasClient()).updateSubscriptionCard(
      '123',
      'qa-token',
    )
    expect(sent).toEqual({ method: 'PUT', body: { payment_token: 'qa-token' } })
    expect(urlCalls(calls, '/subscription/123')).toHaveLength(1)
    expect(urlCalls(calls, '/retry')).toHaveLength(0)
  })

  test('retry preserva charge original, não recebe preço e atualiza o cartão futuro', async () => {
    let sent: unknown
    const calls = installFetch(({ url, body }) => {
      if (url.endsWith('/authorize')) return jsonResponse(200, { access_token: 'tok' })
      sent = JSON.parse(body ?? '{}')
      return jsonResponse(200, { code: 200, data: { status: 'waiting' } })
    })
    await new EfiPaymentGateway(pixClient(), cobrancasClient()).retrySubscriptionCharge({
      providerPaymentId: '456',
      paymentToken: 'qa-token',
      customer: {
        name: 'Pessoa QA',
        cpf: '52998224725',
        email: 'qa@example.test',
        phone: '11999998888',
      },
    })
    expect(sent).toEqual({
      payment: {
        credit_card: {
          customer: {
            name: 'Pessoa QA',
            cpf: '52998224725',
            email: 'qa@example.test',
            phone_number: '11999998888',
          },
          payment_token: 'qa-token',
          update_card: true,
        },
      },
    })
    expect(urlCalls(calls, '/charge/456/retry').map((call) => call.method)).toEqual(['POST'])
    expect(urlCalls(calls, 'one-step')).toHaveLength(0)
  })

  test.each([
    'card-only',
    'retry',
  ] as const)('não repete ação com token após 503: %s', async (kind) => {
    const calls = installFetch(({ url }) =>
      url.endsWith('/authorize')
        ? jsonResponse(200, { access_token: 'tok' })
        : jsonResponse(503, { mensagem: 'indisponível' }),
    )
    const client = cobrancasClient()
    const effect =
      kind === 'card-only'
        ? client.updateSubscriptionCard('123', 'qa-token')
        : client.retrySubscriptionCharge('456', {
            payment: { credit_card: { payment_token: 'qa-token', update_card: true } },
          })
    await expect(effect).rejects.toBeInstanceOf(EfiGatewayError)
    expect(calls.filter((call) => !call.url.endsWith('/authorize'))).toHaveLength(1)
  })

  test('POST /charge/one-step (idempotent:false) NÃO é re-tentado em 503 (não emite 2º boleto)', async () => {
    const calls = installFetch(({ url }) => {
      if (url.endsWith('/authorize')) return jsonResponse(200, { access_token: 'tok' })
      return jsonResponse(503, { mensagem: 'indisponível' })
    })
    await expect(cobrancasClient().createOneStepCharge({ foo: 'bar' })).rejects.toBeInstanceOf(
      EfiGatewayError,
    )
    expect(urlCalls(calls, '/charge/one-step')).toHaveLength(1)
  })

  test('GET /charge/:id (idempotente) é re-tentado em 5xx', async () => {
    const calls = installFetch(({ url }, counts) => {
      if (url.endsWith('/authorize')) return jsonResponse(200, { access_token: 'tok' })
      if (counts.endpoint === 1) return jsonResponse(502, { mensagem: 'x' })
      return jsonResponse(200, { data: { charge_id: 1 } })
    })
    const res = await cobrancasClient().detailCharge(1)
    expect(res).toEqual({ data: { charge_id: 1 } })
    expect(urlCalls(calls, '/charge/1')).toHaveLength(2)
  })

  test('budget total esgotado corta o retry do GET idempotente', async () => {
    const calls = installFetch(({ url }) => {
      if (url.endsWith('/authorize')) return jsonResponse(200, { access_token: 'tok' })
      return jsonResponse(502, { mensagem: 'x' })
    })
    await expect(
      cobrancasClient({ requestTimeoutMs: 1000, totalBudgetMs: 1000 }).detailCharge(1),
    ).rejects.toBeInstanceOf(EfiGatewayError)
    expect(urlCalls(calls, '/charge/1')).toHaveLength(1)
  })
})
