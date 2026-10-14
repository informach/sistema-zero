import { afterEach, expect, mock, spyOn, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import type { Env } from '../src/lib/env'
import type { SessionUser } from '../src/lib/types'
import type { MembersClient } from '../src/server/clients'
import type { SessionModule } from '../src/server/session'

mock.module('server-only', () => ({}))
const env = await import('../src/lib/env')
const r2 = await import('../src/server/r2')
const { createPrivateNarrationRoutes } = await import('../src/routes/private-narration')
const restorers: Array<() => void> = []
afterEach(() => {
  for (const restore of restorers.splice(0)) restore()
})

function setup() {
  const user = { id: randomUUID(), role: 'staff' } as SessionUser
  const ref = {
    origin: 'pensa_message',
    projectId: randomUUID(),
    cycleId: randomUUID(),
    messageId: randomUUID(),
    revision: 1,
  }
  let source = 'Confira o gato. Contato: crianca@example.com'
  const ledger = mock(async (_actor: unknown, input: { type: string }) => ({
    status: 200,
    body: { status: input.type === 'claim' ? 'generate' : 'ready', key: 'private/this-lease.mp3' },
  }))
  const members = {
    checkPensaAccessReadonly: async () => ({ status: 200, body: { access: { pensa: true } } }),
    pensaJourneyGet: async () => ({
      status: 200,
      body: {
        journey: {
          cycleId: ref.cycleId,
          messages: source
            ? [{ id: ref.messageId, revision: 1, role: 'assistant', final: true, text: source }]
            : [],
        },
      },
    }),
    privateNarration: ledger,
  } as unknown as MembersClient
  const fetchMock = spyOn(globalThis, 'fetch').mockResolvedValue(new Response(new Uint8Array(200)))
  const config = spyOn(env, 'getEnv').mockReturnValue({
    ELEVENLABS_API_KEY: 'fake-test-key',
  } as Env)
  const put = spyOn(r2, 'r2PutObjectUgc').mockResolvedValue(undefined)
  const remove = spyOn(r2, 'r2DeleteObjectUgc').mockResolvedValue(undefined)
  const sign = spyOn(r2, 'r2PresignGetUgc').mockResolvedValue('https://private.invalid/short-lived')
  restorers.push(() => {
    fetchMock.mockRestore()
    config.mockRestore()
    put.mockRestore()
    remove.mockRestore()
    sign.mockRestore()
  })
  const route = createPrivateNarrationRoutes({
    members,
    session: { getSession: async () => user } as SessionModule,
  }).privateNarration
  const request = (viewer = user.id) =>
    new Request('https://kids.test/api/voice/narrate', {
      method: 'POST',
      headers: { 'x-sz-viewer': viewer },
      body: JSON.stringify(ref),
    })
  return {
    route,
    request,
    ledger,
    fetchMock,
    remove,
    sign,
    changeSource: () => {
      source = ''
    },
    setSource: (next: string) => {
      source = next
    },
  }
}

test('a síntese não envia dados pessoais de guias ou mensagens antigas à ElevenLabs', async () => {
  const f = setup()
  const response = await f.route.POST(f.request())
  expect(response.status).toBe(200)
  const payload = JSON.parse(String(f.fetchMock.mock.calls[0]?.[1]?.body))
  expect(payload.text).not.toContain('crianca@example.com')
  expect(f.ledger.mock.calls.map((call) => call[1].type)).toEqual(['claim', 'commit'])
})

test('trocar o perfil impede síntese antes de reservar caracteres', async () => {
  const f = setup()
  expect((await f.route.POST(f.request(randomUUID()))).status).toBe(403)
  expect(f.ledger).not.toHaveBeenCalled()
  expect(f.fetchMock).not.toHaveBeenCalled()
})

test('uma origem removida durante a síntese não recebe URL e limpa o arquivo da tentativa', async () => {
  const f = setup()
  f.fetchMock.mockImplementation(
    Object.assign(
      async () => {
        f.changeSource()
        return new Response(new Uint8Array(200))
      },
      { preconnect: globalThis.fetch.preconnect },
    ),
  )
  expect((await f.route.POST(f.request())).status).toBe(503)
  expect(f.sign).not.toHaveBeenCalled()
  expect(f.remove).toHaveBeenCalledWith('private/this-lease.mp3')
})

test('a falha da síntese vai ao log pela origem e pelo nome, sem a fala (M1)', async () => {
  const f = setup()
  const error = spyOn(console, 'error').mockImplementation(() => undefined)
  restorers.push(() => error.mockRestore())
  f.fetchMock.mockResolvedValue(new Response('corpo do provedor', { status: 500 }))
  f.remove.mockRejectedValue(new TypeError('R2 fora'))
  expect((await f.route.POST(f.request())).status).toBe(503)
  const logged = JSON.stringify(error.mock.calls)
  expect(logged).toContain('[pensa-v2] voz privada falhou')
  expect(logged).toContain('"origin":"pensa_message"')
  expect(logged).toContain('"reason":"VOICE_PROVIDER_FAILED"')
  // Apagar o áudio que sobrou também não falha calado.
  expect(logged).toContain('áudio não apagado')
  expect(logged).not.toContain('Confira o gato')
  expect(logged).not.toContain('corpo do provedor')
})

test('a fala do Pensa passa pela régua do Pensa: placar não vira telefone', async () => {
  const f = setup()
  f.setSource('O placar vai até 9999 9999 pontos.')
  expect((await f.route.POST(f.request())).status).toBe(200)
  const payload = JSON.parse(String(f.fetchMock.mock.calls[0]?.[1]?.body))
  expect(payload.text).toContain('9999 9999')
})
