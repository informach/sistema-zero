import { describe, expect, test } from 'bun:test'
import { canonicalHmacMessage, verifyHmacSignature } from '@sistemazero/core/security'
import { createHubHttpGateway } from '../../src/infrastructure/gateways/hub-http.gateway'

const SECRET = 'hub-gateway-secret-0123456789ab'

describe('createHubHttpGateway', () => {
  test('assina o POST /hub/webhooks/grant com HMAC que o hub ACEITA', async () => {
    let capturedUrl = ''
    let capturedHeaders: Record<string, string> = {}
    let capturedBody = ''

    const now = new Date('2026-06-18T12:00:00.000Z')
    const hub = createHubHttpGateway({
      baseUrl: 'http://hub.internal:3010/',
      hmacSecret: SECRET,
      now: () => now,
      fetchImpl: async (input, init) => {
        capturedUrl = String(input)
        capturedHeaders = (init?.headers ?? {}) as Record<string, string>
        capturedBody = String(init?.body ?? '')
        return new Response('{"ok":true}', { status: 200 })
      },
    })
    await hub.notifyAccessChanged('user-1', 'grant')

    // Path exato (a barra final da base some) + corpo + delivery-id.
    expect(capturedUrl).toBe('http://hub.internal:3010/hub/webhooks/grant')
    expect(JSON.parse(capturedBody)).toEqual({ userId: 'user-1', event: 'grant' })
    expect(typeof capturedHeaders['x-delivery-id']).toBe('string')

    // A assinatura PRECISA ser aceita pela MESMA verificação que o hub roda.
    // O delivery id também faz parte da mensagem canônica: ele é a chave de
    // dedupe e não pode ser alterado sem invalidar o HMAC.
    const result = verifyHmacSignature({
      secret: SECRET,
      body: canonicalHmacMessage({
        method: 'POST',
        path: '/hub/webhooks/grant',
        deliveryId: capturedHeaders['x-delivery-id'],
        body: capturedBody,
      }),
      signatureHeader: capturedHeaders['x-signature'],
      nowSeconds: Math.floor(now.getTime() / 1000),
      toleranceSeconds: 300,
    })
    expect(result.valid).toBe(true)
  })

  test('best-effort: erro de rede NÃO propaga (a concessão não pode falhar)', async () => {
    const hub = createHubHttpGateway({
      baseUrl: 'http://hub.internal:3010',
      hmacSecret: SECRET,
      fetchImpl: async () => {
        throw new Error('hub fora do ar')
      },
    })
    // Não deve lançar — apenas logar e seguir.
    await hub.notifyAccessChanged('user-1', 'grant')
    expect(true).toBe(true)
  })

  test('best-effort: resposta não-OK do hub NÃO propaga', async () => {
    const hub = createHubHttpGateway({
      baseUrl: 'http://hub.internal:3010',
      hmacSecret: SECRET,
      fetchImpl: async () => new Response('nope', { status: 401 }),
    })
    await hub.notifyAccessChanged('user-1', 'grant')
    expect(true).toBe(true)
  })

  test('listShowcaseByAuthor mapeia o nome de WIRE coverImageUrl para coverUrl', async () => {
    // O hub chama o campo de `coverImageUrl`; o contrato do members (PublicGameItem)
    // chama de `coverUrl`. Este teste PINA o nome do wire: se o hub renomear o campo,
    // a falha aparece AQUI (e não como capa null silenciosa no perfil público).
    const hub = createHubHttpGateway({
      baseUrl: 'http://hub.internal:3010',
      hmacSecret: SECRET,
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            items: [
              {
                title: 'Meu jogo',
                playId: 'play-1',
                coverImageUrl: 'https://cdn.example/capa.png',
                createdAt: '2026-07-01T00:00:00.000Z',
              },
              // Sem capa: o campo ausente degrada para null (nunca undefined).
              { title: 'Sem capa', playId: 'play-2', createdAt: '2026-07-02T00:00:00.000Z' },
            ],
          }),
          { status: 200 },
        ),
    })
    const games = await hub.listShowcaseByAuthor('profile-1', 24)
    expect(games).toEqual([
      {
        title: 'Meu jogo',
        playId: 'play-1',
        coverUrl: 'https://cdn.example/capa.png',
        publishedAt: '2026-07-01T00:00:00.000Z',
      },
      {
        title: 'Sem capa',
        playId: 'play-2',
        coverUrl: null,
        publishedAt: '2026-07-02T00:00:00.000Z',
      },
    ])
  })
})
