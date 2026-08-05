import { afterAll, afterEach, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test'
import type { SessionUser } from '../src/lib/types'

let session: SessionUser | null = null
const getSession = mock(async () => session)
mock.module('@/server/session', () => ({ getSession }))

const { POST } = await import('../src/app/api/onboarding/events/route')

const accountSession: SessionUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'responsavel@example.com',
  firstName: 'Responsável',
  lastName: 'Teste',
  role: 'customer',
  status: 'active',
}

const childSession: SessionUser = {
  ...accountSession,
  id: '22222222-2222-4222-8222-222222222222',
  activeProfile: { accountId: accountSession.id, name: 'Criança' },
}

const info = spyOn(console, 'info').mockImplementation(() => {})

function eventRequest(body: unknown) {
  return new Request('http://localhost/api/onboarding/events', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  session = accountSession
  getSession.mockClear()
  info.mockClear()
})

afterEach(() => {
  session = null
})

afterAll(() => {
  info.mockRestore()
})

describe('POST /api/onboarding/events', () => {
  it('registra evento válido sem identificadores ou nome da criança', async () => {
    const response = await POST(
      eventRequest({
        version: 'v2',
        audience: 'parent',
        action: 'welcome_opened',
        step: 'welcome',
      }),
    )

    expect(response.status).toBe(204)
    expect(info).toHaveBeenCalledTimes(1)
    const log = info.mock.calls.flat().join(' ')
    expect(log).not.toContain(accountSession.id)
    expect(log).not.toContain(accountSession.firstName)
  })

  it('recusa audiência incompatível com a sessão', async () => {
    await POST(
      eventRequest({
        version: 'v2',
        audience: 'child',
        action: 'welcome_opened',
        step: 'welcome',
      }),
    )
    expect(info).not.toHaveBeenCalled()

    session = childSession
    await POST(
      eventRequest({
        version: 'v2',
        audience: 'child',
        action: 'welcome_completed',
        step: 'welcome',
      }),
    )
    expect(info).toHaveBeenCalledTimes(1)
  })

  it('descarta versão, campo ou evento desconhecido', async () => {
    await POST(
      eventRequest({
        version: 'v1',
        audience: 'parent',
        action: 'evento_inventado',
        childName: 'não pode entrar',
      }),
    )
    expect(info).not.toHaveBeenCalled()
  })

  it('descarta corpo malformado sem expor erro ao cliente', async () => {
    const response = await POST(
      new Request('http://localhost/api/onboarding/events', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{',
      }),
    )

    expect(response.status).toBe(204)
    expect(info).not.toHaveBeenCalled()
  })
})
