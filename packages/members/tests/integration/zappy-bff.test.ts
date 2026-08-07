import { describe, expect, test } from 'bun:test'
import type { ZappyHistoryService } from '../../src/application/zappy/zappy-history.service'
import { buildApp } from '../helpers'

const TOKEN = 'members-internal-token-test'
const USER_ID = '4fa0e474-1f0d-4a52-9a6a-3f2b8c85e010'
const ACCOUNT_ID = '4fa0e474-1f0d-4a52-9a6a-3f2b8c85e011'
const MESSAGE_ID = '4fa0e474-1f0d-4a52-9a6a-3f2b8c85e001'
const QUESTION_ID = '4fa0e474-1f0d-4a52-9a6a-3f2b8c85e002'

function put(
  app: ReturnType<typeof buildApp>['app'],
  path: string,
  body: unknown,
  consumer: string,
) {
  return app.handle(
    new Request(`http://localhost${path}`, {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
        'x-internal-token': TOKEN,
        'x-consumer-id': consumer,
        'x-auth-user-id': USER_ID,
        'x-auth-user-role': 'staff',
        'x-auth-user-status': 'active',
      },
      body: JSON.stringify(body),
    }),
  )
}

function post(
  app: ReturnType<typeof buildApp>['app'],
  path: string,
  body: unknown,
  consumer: string,
) {
  return app.handle(
    new Request(`http://localhost${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-internal-token': TOKEN,
        'x-consumer-id': consumer,
        'x-auth-user-id': USER_ID,
        'x-auth-user-role': 'staff',
        'x-auth-user-status': 'active',
      },
      body: JSON.stringify(body),
    }),
  )
}

describe('persistência privada do Zappy', () => {
  test('remove o endpoint JWT antigo e aceita a identidade somente no corpo do consumer HMAC', async () => {
    let reserved: Record<string, unknown> | null = null
    const zappy = {
      reserve: async (input: Record<string, unknown>) => {
        reserved = input
        return { created: true, questionId: QUESTION_ID }
      },
    } as unknown as ZappyHistoryService
    const { app } = buildApp({ internalToken: TOKEN, zappy })
    const question = {
      projectId: 'projeto-1',
      clientMessageId: MESSAGE_ID,
      question: 'Como faço o pulo?',
    }

    const legacy = await post(app, '/members/zappy/questions', question, 'member-shell')
    expect(legacy.status).toBe(404)

    const body = {
      actor: { userId: USER_ID, accountId: ACCOUNT_ID, privileged: true },
      ...question,
    }
    const wrongConsumer = await post(app, '/members/internal/zappy/questions', body, 'funnel')
    expect(wrongConsumer.status).toBe(401)

    const accepted = await post(app, '/members/internal/zappy/questions', body, 'member-shell')
    expect(accepted.status).toBe(200)
    expect(reserved).toMatchObject({ userId: USER_ID, accountId: ACCOUNT_ID, ...question })
  })
  test('a trilha da paleta ATRAVESSA a borda em vez de ser apagada em silêncio', async () => {
    // ⚠️ Campo não declarado no DTO é REMOVIDO pelo `normalize` default do
    // Elysia — sem 422, sem log. Foi assim que o `palettePath` sumiu desde que
    // nasceu: o BFF mandava, a borda apagava, e o chip do Zappy caía para
    // sempre no fallback "categoria › subcategoria" (o "Programação ›
    // Programação" que o commit do palettePath existia para consertar).
    let saved: Record<string, unknown> | null = null
    const zappy = {
      complete: async (input: Record<string, unknown>) => {
        saved = input
        return { id: QUESTION_ID }
      },
    } as unknown as ZappyHistoryService
    const { app } = buildApp({ internalToken: TOKEN, zappy })

    const response = await put(
      app,
      `/members/internal/zappy/questions/${QUESTION_ID}/response`,
      {
        actor: { userId: USER_ID, accountId: ACCOUNT_ID, privileged: true },
        projectId: 'projeto-1',
        latencyMs: 120,
        response: {
          id: MESSAGE_ID,
          text: 'Use o bloco de pulo.',
          scope: 'block',
          blockReferences: [
            {
              blockType: 'sz_g2d_jump_on_ground',
              name: 'Pular quando estiver no chão',
              category: 'Jogo 2D',
              subcategory: '🕹️ Movimento',
              palettePath: ['Jogo 2D', '🕹️ Movimento'],
              area: 'loops',
            },
          ],
          createdAt: new Date().toISOString(),
        },
      },
      'member-shell',
    )

    expect(response.status).toBe(200)
    const persisted = saved as { response?: { blockReferences?: Array<{ palettePath?: string[] }> } } | null
    expect(persisted?.response?.blockReferences?.[0]?.palettePath).toEqual([
      'Jogo 2D',
      '🕹️ Movimento',
    ])
  })
})
