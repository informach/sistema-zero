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
  test('language metadata and portable IDs cross both internal HTTP schemas without changing legacy JavaScript IDs', async () => {
    const requests: unknown[] = []
    let answer: unknown
    const zappy = {
      reserve: async (input: unknown) => {
        requests.push(input)
        return { created: true, questionId: QUESTION_ID }
      },
      complete: async (input: unknown) => {
        answer = input
        return { id: MESSAGE_ID }
      },
    } as unknown as ZappyHistoryService
    const { app } = buildApp({ internalToken: TOKEN, zappy })
    const actor = { userId: USER_ID, accountId: ACCOUNT_ID, privileged: true }
    for (const projectId of ['_game', '-game', 'old.game', 'old:game']) {
      const programmingLanguage =
        projectId.startsWith('_') || projectId.startsWith('-') ? 'python' : 'javascript'
      expect(
        (
          await post(
            app,
            '/members/internal/zappy/questions',
            {
              actor,
              projectId,
              clientMessageId: crypto.randomUUID(),
              question: 'Como funciona?',
              programmingLanguage,
            },
            'member-shell',
          )
        ).status,
      ).toBe(200)
      expect(requests.at(-1)).toMatchObject({ projectId, programmingLanguage })
    }
    expect(
      (
        await post(
          app,
          '/members/internal/zappy/questions',
          {
            actor,
            projectId: '_game',
            clientMessageId: crypto.randomUUID(),
            question: 'Como funciona?',
            programmingLanguage: 'ruby',
          },
          'member-shell',
        )
      ).status,
    ).toBe(400)
    expect(requests).toHaveLength(4)
    expect(
      (
        await put(
          app,
          `/members/internal/zappy/questions/${QUESTION_ID}/response`,
          {
            actor,
            projectId: '_game',
            latencyMs: 1,
            response: {
              id: MESSAGE_ID,
              programmingLanguage: 'python',
              kind: 'pro',
              text: 'Observe o arquivo.',
              scope: 'concept',
              blockReferences: [],
              createdAt: new Date().toISOString(),
            },
          },
          'member-shell',
        )
      ).status,
    ).toBe(200)
    expect(answer).toMatchObject({ response: { programmingLanguage: 'python', kind: 'pro' } })
  })
  test('modo, referências Pro e revisão atravessam a validação HTTP', async () => {
    let saved: unknown
    const zappy = {
      complete: async (input: unknown) => {
        saved = input
        return { id: QUESTION_ID }
      },
    } as unknown as ZappyHistoryService
    const { app } = buildApp({ internalToken: TOKEN, zappy })
    const answer = {
      id: MESSAGE_ID,
      kind: 'pro',
      intent: 'investigate',
      text: 'Confira o arquivo.',
      scope: 'error',
      blockReferences: [],
      fileReferences: [
        { path: 'src/main.ts', startLine: 2, endLine: 4 },
        {
          path: 'src/player.ts',
          startLine: 301,
          endLine: 301,
          sourceHash: `sha256-${'a'.repeat(43)}=`,
          contextDigest: `sha256-${'b'.repeat(43)}=`,
          excerptId: 'excerpt-selected',
        },
        {
          path: 'src/config.ts',
          sourceHash: `sha256-${'c'.repeat(43)}=`,
          contextDigest: `sha256-${'d'.repeat(43)}=`,
          excerptId: 'excerpt-file-only',
        },
      ],
      sourceRevision: 123,
      createdAt: new Date().toISOString(),
    }
    const response = await put(
      app,
      `/members/internal/zappy/questions/${QUESTION_ID}/response`,
      {
        actor: { userId: USER_ID, accountId: ACCOUNT_ID, privileged: true },
        projectId: 'projeto-1',
        latencyMs: 120,
        response: answer,
      },
      'member-shell',
    )
    expect(response.status).toBe(200)
    expect(saved).toMatchObject({
      response: {
        kind: 'pro',
        intent: 'investigate',
        fileReferences: answer.fileReferences,
        sourceRevision: 123,
      },
    })
  })
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
    const persisted = saved as {
      response?: { blockReferences?: Array<{ palettePath?: string[] }> }
    } | null
    expect(persisted?.response?.blockReferences?.[0]?.palettePath).toEqual([
      'Jogo 2D',
      '🕹️ Movimento',
    ])
  })
})
