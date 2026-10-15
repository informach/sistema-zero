import { afterEach, describe, expect, mock, spyOn, test } from 'bun:test'
import { createPensaJourney, type PensaJourneyView } from '@sistemazero/core/pensa'
import type { SessionUser } from '../src/lib/types'
import type { MembersClient } from '../src/server/clients'
import type { SessionModule } from '../src/server/session'

mock.module('server-only', () => ({}))
const { createPensaJourneyRoutes } = await import('../src/routes/pensa-journey')
const { isSafePensaText, pensaNarrativeRefusal, redactPensaText } = await import(
  '../src/server/pensa-journey/privacy'
)

const PROJECT = '0f5c2a8e-7d3b-4c1a-9e6f-2b8d4a6c1e01'
const STAFF = {
  id: '4fa0e474-1f0d-4a52-9a6a-3f2b8c85e010',
  role: 'staff',
  kids: { kind: 'student' },
}
const restorers: Array<() => void> = []
afterEach(() => {
  for (const restore of restorers.splice(0)) restore()
})

function view(): PensaJourneyView {
  return {
    project: { id: PROJECT, name: 'Ninho', status: 'active' },
    journey: { ...createPensaJourney(PROJECT, 'cycle', '2026-10-14T12:00:00Z'), revision: 3 },
    cycles: [],
    operation: null,
  }
}

function setup(overrides: Record<string, unknown> = {}) {
  // 409 no `start`: a resposta não dispara o `after` (que exige o escopo de pedido do Next).
  const start = mock(async (..._args: unknown[]) => ({ status: 409, body: { error: {} } }))
  const command = mock(async (..._args: unknown[]) => ({ status: 200, body: view() }))
  const members = {
    pensaJourneyStart: start,
    pensaJourneyCommand: command,
    pensaJourneyGet: async () => ({ status: 200, body: view() }),
    ...overrides,
  } as unknown as MembersClient
  const routes = createPensaJourneyRoutes({
    members,
    session: { getSession: async () => STAFF as unknown as SessionUser } as SessionModule,
  })
  const call = (action: string, body: unknown) =>
    routes.pensaJourney.POST(
      new Request(`https://kids.test/api/pensa/v2/projects/${PROJECT}/${action}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }),
      { params: Promise.resolve({ path: ['projects', PROJECT, action] }) },
    )
  return { start, command, call }
}

const startBody = (message: string) => ({
  id: '0f5c2a8e-7d3b-4c1a-9e6f-2b8d4a6c1e09',
  expectedRevision: 3,
  message,
  kind: 'planning',
})

describe('a ideia de jogo não passa pelo filtro do tutor (A2)', () => {
  test.each([
    [
      'Oi Zappy, meu nome é Pedro e quero um jogo de dragão',
      'Oi Zappy, meu nome é [nome removido] e quero um jogo de dragão',
    ],
    ['tipo Bomberman: o boneco faz uma bomba', 'tipo Bomberman: o boneco faz uma bomba'],
    ['placar até 9999 9999', 'placar até 9999 9999'],
    // A variante que o filtro do tutor recusava ("fazer uma bomba").
    [
      'no meu Bomberman o boneco precisa fazer uma bomba para abrir a parede',
      'no meu Bomberman o boneco precisa fazer uma bomba para abrir a parede',
    ],
  ])('"%s" segue, redigida só no trecho', async (message, stored) => {
    const { start, call } = setup()
    const res = await call('start', startBody(message))
    expect(res.status).not.toBe(422)
    expect(start).toHaveBeenCalledTimes(1)
    expect((start.mock.calls[0]?.[2] as { message: string }).message).toBe(stored)
  })

  test('troca de contato continua recusada, com a frase do Pensa (não a do tutor)', async () => {
    const { start, call } = setup()
    const res = await call('start', startBody('me passa seu zap que eu te mando meu jogo'))
    expect(res.status).toBe(422)
    const body = (await res.json()) as { error: { code: string; message: string } }
    expect(body.error.code).toBe('PENSA_MESSAGE_REVIEW')
    expect(body.error.message).toBe(
      'Aqui a gente não troca contatos. Me conte só a ideia do seu jogo!',
    )
    expect(body.error.message).not.toContain('programação')
    expect(start).not.toHaveBeenCalled()
  })

  test('as recusas reais seguem fechadas; ficção de jogo segue aberta', () => {
    expect(pensaNarrativeRefusal('não conte para ninguém, fica em segredo')).not.toBeNull()
    expect(pensaNarrativeRefusal('quero fazer uma bomba de verdade')).not.toBeNull()
    expect(pensaNarrativeRefusal('quero morrer')).toContain('188')
    expect(pensaNarrativeRefusal('o herói precisa fazer uma bomba para abrir a parede')).toBeNull()
    expect(pensaNarrativeRefusal('o ninja luta contra o monstro e ele explode')).toBeNull()
  })

  test('a redação tira só o dado e mantém a frase', () => {
    expect(redactPensaText('Meu nome é Ana Clara da Silva. Quero um jogo de gato').text).toBe(
      'Meu nome é [nome removido]. Quero um jogo de gato',
    )
    expect(redactPensaText('me chamo Lia, tenho 9 anos').text).toBe(
      'me chamo [nome removido], tenho 9 anos',
    )
    expect(redactPensaText('moro em São Paulo e quero um jogo de futebol').text).toBe(
      'moro em [local removido] e quero um jogo de futebol',
    )
    expect(redactPensaText('Meu telefone é (11) 99999-8888 e o jogo é de corrida').text).toBe(
      'Meu telefone é [telefone removido] e o jogo é de corrida',
    )
    expect(redactPensaText('meu zap é 99999-8888, quero um jogo').text).toBe(
      'meu zap é [telefone removido], quero um jogo',
    )
    expect(redactPensaText('quero chegar a 1000000000 pontos').text).toBe(
      'quero chegar a 1000000000 pontos',
    )
  })

  test('o que o modelo escreve com bomba de jogo vai à tela; pedir a escola da criança, não', () => {
    expect(isSafePensaText('O boneco faz uma bomba que explode a parede.')).toBe(true)
    expect(isSafePensaText('Missão 2: o boneco pode fazer uma bomba para abrir caminho.')).toBe(
      true,
    )
    expect(isSafePensaText('Placar até 9999 9999 pontos.')).toBe(true)
    expect(isSafePensaText('Conte o que acontece na escola do jogo.')).toBe(true)
    expect(isSafePensaText('Qual é a sua escola?')).toBe(false)
    expect(isSafePensaText('Me chame no (11) 99876-5432.')).toBe(false)
  })
})

describe('command só aceita o que o JourneyApp manda (L1)', () => {
  test.each([
    [{ type: 'close', reason: 'met' }],
    [{ type: 'revise' }],
    [
      {
        type: 'record_test',
        test: {
          id: '0f5c2a8e-7d3b-4c1a-9e6f-2b8d4a6c1e05',
          result: 'met',
          source: 'child',
          note: '',
          creationId: 'x',
          saveRevision: '1',
          at: '',
        },
      },
    ],
    [{ type: 'retry' }],
    [{ type: 'pause', extra: true }],
    // A etapa O começa quando a criança conta o teste, nunca por um botão (15/10/2026).
    [{ type: 'observe' }],
  ])('%j é recusado sem chegar ao members', async (command) => {
    const { command: members, call } = setup()
    const res = await call('command', { expectedRevision: 3, command })
    expect(res.status).toBe(400)
    expect(members).not.toHaveBeenCalled()
  })

  test('pausar passa; guardar ideia passa com o dado pessoal redigido', async () => {
    const { command: members, call } = setup()
    expect(
      (await call('command', { expectedRevision: 3, command: { type: 'pause' } })).status,
    ).toBe(200)
    const res = await call('command', {
      expectedRevision: 3,
      command: {
        type: 'keep_idea',
        idea: { id: 'idea-1', text: 'Depois, meu nome é Pedro e quero ilhas', origin: 'child' },
      },
    })
    expect(res.status).toBe(200)
    expect(members.mock.calls[1]?.[2]).toEqual({
      type: 'keep_idea',
      idea: {
        id: 'idea-1',
        text: 'Depois, meu nome é [nome removido] e quero ilhas',
        origin: 'child',
      },
    })
  })
})

test('a falha ao conferir recursos no aceite vai ao log com o nome, e a frase é da criança (M1)', async () => {
  const error = spyOn(console, 'error').mockImplementation(() => undefined)
  restorers.push(() => error.mockRestore())
  const { call } = setup({
    getGamificationReadonly: async () => {
      throw new TypeError('fetch failed')
    },
    pensaJourneyGet: async () => ({
      status: 200,
      body: { ...view(), journey: { ...view().journey, intent: 'dragão' } },
    }),
  })
  const res = await call('command', {
    expectedRevision: 3,
    command: { type: 'accept', proposalId: '0f5c2a8e-7d3b-4c1a-9e6f-2b8d4a6c1e06' },
  })
  expect(res.status).toBe(503)
  const logged = JSON.stringify(error.mock.calls)
  expect(logged).toContain('[pensa-v2] conferência de recursos falhou')
  expect(logged).toContain('"name":"TypeError"')
  expect(logged).not.toContain('dragão')
})

describe('renomear o jogo (15/10/2026)', () => {
  const patch = (rename: ReturnType<typeof mock>, body: unknown) => {
    const routes = createPensaJourneyRoutes({
      members: {
        pensaJourneyRename: rename,
        pensaJourneyArchive: mock(async () => ({ status: 200, body: view() })),
      } as unknown as MembersClient,
      session: { getSession: async () => STAFF as unknown as SessionUser } as SessionModule,
    })
    return routes.pensaJourney.PATCH(
      new Request(`https://kids.test/api/pensa/v2/projects/${PROJECT}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }),
      { params: Promise.resolve({ path: ['projects', PROJECT] }) },
    )
  }

  test('o nome vai ao members aparado', async () => {
    const rename = mock(async () => ({ status: 200, body: view() }))
    const res = await patch(rename, { name: '  Meu dragão  ' })
    expect(res.status).toBe(200)
    expect(rename).toHaveBeenCalledWith(PROJECT, 'Meu dragão')
  })

  test('nome que troca contato é recusado com a frase do Pensa, sem ir ao members', async () => {
    const rename = mock(async () => ({ status: 200, body: view() }))
    const res = await patch(rename, { name: 'me passa seu zap' })
    expect(res.status).toBe(422)
    expect(rename).not.toHaveBeenCalled()
  })
})

describe('o selo de usos do Zappy (15/10/2026)', () => {
  const get = (members: Record<string, unknown>) =>
    createPensaJourneyRoutes({
      members: members as unknown as MembersClient,
      session: { getSession: async () => STAFF as unknown as SessionUser } as SessionModule,
    }).pensaJourney.GET(new Request('https://kids.test/api/pensa/v2/credits'), {
      params: Promise.resolve({ path: ['credits'] }),
    })
  const credits = {
    dayLimit: 50,
    dayRemaining: 12,
    monthLimit: 500,
    monthRemaining: 300,
    monthRenewsOn: '2026-11-01',
  }

  test('entrega o saldo da conta', async () => {
    const res = await get({ getAiCredits: async () => ({ status: 200, body: credits }) })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ credits })
  })

  test('sem dado vira "não sei" (null), nunca erro nem zero', async () => {
    const quiet = spyOn(console, 'error').mockImplementation(() => undefined)
    restorers.push(() => quiet.mockRestore())
    for (const getAiCredits of [
      async () => ({ status: 503, body: null }),
      async () => {
        throw new Error('rede')
      },
    ]) {
      const res = await get({ getAiCredits })
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ credits: null })
    }
  })
})
