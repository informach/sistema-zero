import { describe, expect, test } from 'bun:test'
import { isRateLimitedGetPath } from '../../src/lib/rate-limit-paths'
import { postAmbassadorInvite, postRedeemScholarship } from '../../src/server/referrals'
import { createFakeGateway } from '../fakes/fake-gateway'

const TOKEN = 't'.repeat(43)

function post(path: string, body: unknown): Request {
  return new Request(`http://funil.local${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const readJson = (res: Response): Promise<any> => res.json()

describe('postRedeemScholarship (/api/bolsa/resgatar)', () => {
  const valid = { code: 'vo-x7k2', nome: 'Paula Prado', email: 'Paula@Example.com' }

  test('feliz: repassa completed 201 e traduz os campos PT → API', async () => {
    const fake = createFakeGateway()
    const res = await postRedeemScholarship(post('/api/bolsa/resgatar', valid), {
      gateway: fake.gateway,
    })
    expect(res.status).toBe(201)
    expect(await readJson(res)).toEqual({ status: 'completed' })
    expect(fake.calls.redemptions[0]?.input).toEqual({
      code: 'vo-x7k2',
      name: 'Paula Prado',
      email: 'paula@example.com', // normalizado na borda
    })
  })

  test('telefone opcional é repassado como phone; ausente não viaja', async () => {
    const fake = createFakeGateway()
    await postRedeemScholarship(
      post('/api/bolsa/resgatar', { ...valid, telefone: '(11) 99999-9999' }),
      { gateway: fake.gateway },
    )
    expect(fake.calls.redemptions[0]?.input.phone).toBe('(11) 99999-9999')
  })

  test('202 processing repassa; 404/409 repassam o envelope do referrals', async () => {
    const fake = createFakeGateway()
    fake.setRedeemResult(202, { status: 'processing' })
    const processing = await postRedeemScholarship(post('/api/bolsa/resgatar', valid), {
      gateway: fake.gateway,
    })
    expect(processing.status).toBe(202)

    fake.setRedeemResult(409, {
      error: { code: 'SCHOLARSHIP_ALREADY_REDEEMED', message: 'Já resgatada' },
    })
    const dup = await postRedeemScholarship(post('/api/bolsa/resgatar', valid), {
      gateway: fake.gateway,
    })
    expect(dup.status).toBe(409)
    expect((await readJson(dup)).error.code).toBe('SCHOLARSHIP_ALREADY_REDEEMED')

    fake.setRedeemResult(404, { error: { code: 'CODE_NOT_FOUND', message: 'Não achei' } })
    const missing = await postRedeemScholarship(post('/api/bolsa/resgatar', valid), {
      gateway: fake.gateway,
    })
    expect(missing.status).toBe(404)
  })

  test('gateway fora (502/504) vira 502 GATEWAY_ERROR legível', async () => {
    const fake = createFakeGateway()
    fake.setRedeemResult(504, { error: { code: 'GATEWAY_TIMEOUT' } })
    const res = await postRedeemScholarship(post('/api/bolsa/resgatar', valid), {
      gateway: fake.gateway,
    })
    expect(res.status).toBe(502)
    expect((await readJson(res)).error.code).toBe('GATEWAY_ERROR')
  })

  test('corpo inválido → 400 sem chamar o gateway', async () => {
    const fake = createFakeGateway()
    const res = await postRedeemScholarship(
      post('/api/bolsa/resgatar', { code: 'x', nome: 'P', email: 'lixo' }),
      { gateway: fake.gateway },
    )
    expect(res.status).toBe(400)
    expect(fake.calls.redemptions).toHaveLength(0)
  })
})

describe('postAmbassadorInvite (/api/embaixador/convites)', () => {
  const valid = { token: TOKEN, nome: 'Paula Prado', email: 'paula@example.com' }

  test('feliz: 202 e o token/dados chegam ao gateway', async () => {
    const fake = createFakeGateway()
    const res = await postAmbassadorInvite(post('/api/embaixador/convites', valid), {
      gateway: fake.gateway,
    })
    expect(res.status).toBe(202)
    expect(fake.calls.invites[0]).toEqual({
      token: TOKEN,
      input: { name: 'Paula Prado', email: 'paula@example.com' },
    })
  })

  test('409/429 repassam o envelope (já convidado / cap diário)', async () => {
    const fake = createFakeGateway()
    fake.setInviteResult(409, { error: { code: 'INVITE_ALREADY_SENT', message: 'Já foi' } })
    const dup = await postAmbassadorInvite(post('/api/embaixador/convites', valid), {
      gateway: fake.gateway,
    })
    expect(dup.status).toBe(409)

    fake.setInviteResult(429, { error: { code: 'INVITE_DAILY_LIMIT', message: 'Limite' } })
    const limit = await postAmbassadorInvite(post('/api/embaixador/convites', valid), {
      gateway: fake.gateway,
    })
    expect(limit.status).toBe(429)
  })

  test('token com formato inválido → 400 sem chamar o gateway', async () => {
    const fake = createFakeGateway()
    const res = await postAmbassadorInvite(
      post('/api/embaixador/convites', { ...valid, token: 'curto' }),
      { gateway: fake.gateway },
    )
    expect(res.status).toBe(400)
    expect(fake.calls.invites).toHaveLength(0)
  })
})

describe('rate limit das landings novas', () => {
  test('GET de /bolsa e /embaixador entram no teto (SSR chama o gateway)', () => {
    expect(isRateLimitedGetPath('/bolsa/vo-x7k2')).toBe(true)
    expect(isRateLimitedGetPath(`/embaixador/${TOKEN}`)).toBe(true)
    expect(isRateLimitedGetPath('/kids/desafio-primeiro-jogo/oferta')).toBe(true) // regressão
    expect(isRateLimitedGetPath('/')).toBe(false)
  })
})
