import { describe, expect, test } from 'bun:test'
import {
  desiredKind,
  SendChallengeLifecycleService,
} from '../../src/application/challenge-lifecycle/send-challenge-lifecycle.service'
import type { AccountIdentity, AuthGateway } from '../../src/domain/ports/auth-gateway.port'
import type {
  ChallengeAnalyticsEvent,
  ChallengeAnalyticsGateway,
} from '../../src/domain/ports/challenge-analytics-gateway.port'
import type {
  ChallengeBehaviorMessageKind,
  ChallengeLifecycleCandidate,
  ChallengeLifecycleRepository,
} from '../../src/domain/ports/challenge-lifecycle-repository.port'
import type { SendEmailInput } from '../../src/domain/ports/messaging-gateway.port'

const NOW = new Date('2026-09-20T12:00:00Z')
const EXPIRES = new Date('2026-10-16T15:30:00Z')
const silentLogger = { info() {}, warn() {}, error() {}, debug() {} }

function candidate(over: Partial<ChallengeLifecycleCandidate> = {}): ChallengeLifecycleCandidate {
  return {
    entitlementId: 'ent-1',
    accountId: 'account-1',
    grantedAt: new Date('2026-09-16T12:00:00Z'),
    expiresAt: EXPIRES,
    courseRef: 'desafio-primeiro-jogo',
    audience: 'kids',
    started: false,
    dayOneComplete: false,
    completed: false,
    sentKinds: [],
    ...over,
  }
}

function fakeRepo(initial: ChallengeLifecycleCandidate[]) {
  const rows = initial.map((row) => ({ ...row, sentKinds: [...row.sentKinds] }))
  const marks: Array<{ entitlementId: string; kind: ChallengeBehaviorMessageKind }> = []
  const repo: ChallengeLifecycleRepository = {
    async listCandidates() {
      return rows
    },
    async markMessageSent(entitlementId, _expiresOn, messageKind) {
      marks.push({ entitlementId, kind: messageKind })
      const row = rows.find((candidate) => candidate.entitlementId === entitlementId)
      if (row && !row.sentKinds.includes(messageKind)) row.sentKinds.push(messageKind)
    },
  }
  return { repo, marks }
}

function fakeAuth(identities: AccountIdentity[]): AuthGateway {
  return {
    async getAccountIdentities(ids) {
      return identities.filter((identity) => ids.includes(identity.id))
    },
    async getProfileNames() {
      return new Map()
    },
    async getProfileIdentities() {
      return new Map()
    },
  }
}

function identity(activated: boolean): AccountIdentity {
  return {
    id: 'account-1',
    email: 'pai@example.com',
    firstName: 'Marcos',
    activated,
  }
}

function fakeMessaging(failFirst = false) {
  const sent: SendEmailInput[] = []
  let shouldFail = failFirst
  return {
    sent,
    gateway: {
      async sendEmail(input: SendEmailInput) {
        if (shouldFail) {
          shouldFail = false
          throw new Error('mensageria fora')
        }
        sent.push(input)
      },
    },
  }
}

function service(
  repo: ChallengeLifecycleRepository,
  auth: AuthGateway,
  messaging: { sendEmail(input: SendEmailInput): Promise<void> },
  analytics?: ChallengeAnalyticsGateway,
  adultUrl: string | null = 'https://comunidade.sistemazero.com.br',
) {
  return new SendChallengeLifecycleService(
    repo,
    auth,
    messaging,
    () => NOW,
    silentLogger,
    {
      kidsUrl: 'https://kids.sistemazero.com.br',
      funnelUrl: 'https://sistemazero.com.br',
      adultUrl: adultUrl ?? undefined,
    },
    analytics,
  )
}

function adulto(over: Partial<ChallengeLifecycleCandidate> = {}): ChallengeLifecycleCandidate {
  return candidate({ courseRef: 'desafio-primeiro-jogo-adulto', audience: 'adult', ...over })
}

describe('SendChallengeLifecycleService', () => {
  test('24h sem senha envia o lembrete de ativação uma única vez', async () => {
    const { repo, marks } = fakeRepo([candidate()])
    const messaging = fakeMessaging()
    const lifecycle = service(repo, fakeAuth([identity(false)]), messaging.gateway)

    expect(await lifecycle.runCycle()).toEqual({ sent: 1, skipped: 0, failed: 0 })
    expect(messaging.sent[0]).toMatchObject({
      templateKey: 'challenge-not-activated',
      variables: {
        nome: 'Marcos',
        link: 'https://kids.sistemazero.com.br/esqueci-senha',
      },
      idempotencyKey: 'challenge-not-activated:ent-1:2026-10-16',
    })
    expect(marks).toEqual([{ entitlementId: 'ent-1', kind: 'not_activated' }])
    expect(await lifecycle.runCycle()).toEqual({ sent: 0, skipped: 1, failed: 0 })
  })

  test('48h com conta ativa, mas sem início, leva o responsável à Área dos pais', async () => {
    const { repo } = fakeRepo([candidate()])
    const messaging = fakeMessaging()
    await service(repo, fakeAuth([identity(true)]), messaging.gateway).runCycle()

    expect(messaging.sent[0]?.templateKey).toBe('challenge-not-started')
    // A criança entra pelo computador autorizado; o e-mail é do responsável.
    expect(messaging.sent[0]?.variables?.link).toBe('https://kids.sistemazero.com.br/pais')
  })

  test('Dia 1 e conclusão têm prioridade sobre lembretes de inatividade', async () => {
    const { repo } = fakeRepo([
      candidate({ entitlementId: 'day-1', started: true, dayOneComplete: true }),
      candidate({ entitlementId: 'done', started: true, dayOneComplete: true, completed: true }),
    ])
    const messaging = fakeMessaging()
    await service(repo, fakeAuth([identity(true)]), messaging.gateway).runCycle()

    expect(messaging.sent.map((message) => message.templateKey)).toEqual([
      'challenge-day-one-complete',
      'challenge-completed',
    ])
    expect(messaging.sent[0]?.variables?.link).toBe(
      'https://kids.sistemazero.com.br/cursos/desafio-primeiro-jogo',
    )
    expect(messaging.sent[1]?.variables?.link).toBe(
      'https://sistemazero.com.br/kids/comunidade-dos-criadores/oferta/continuar',
    )
  })

  test('falha antes da marca permite retry com a mesma chave idempotente', async () => {
    const { repo, marks } = fakeRepo([candidate({ started: true, dayOneComplete: true })])
    const messaging = fakeMessaging(true)
    const lifecycle = service(repo, fakeAuth([identity(true)]), messaging.gateway)

    expect((await lifecycle.runCycle()).failed).toBe(1)
    expect(marks).toHaveLength(0)
    expect((await lifecycle.runCycle()).sent).toBe(1)
    expect(messaging.sent[0]?.idempotencyKey).toBe('challenge-day-one-complete:ent-1:2026-10-16')
  })

  test('conta ausente e compra com menos de 24h não enviam', async () => {
    const recent = candidate({ grantedAt: new Date('2026-09-20T00:00:00Z') })
    const first = fakeRepo([recent])
    const second = fakeRepo([candidate()])
    const messaging = fakeMessaging()

    expect(
      await service(first.repo, fakeAuth([identity(false)]), messaging.gateway).runCycle(),
    ).toEqual({
      sent: 0,
      skipped: 1,
      failed: 0,
    })
    expect(await service(second.repo, fakeAuth([]), messaging.gateway).runCycle()).toEqual({
      sent: 0,
      skipped: 1,
      failed: 0,
    })
  })

  test('publica marcos cumulativos sem PII e deduplica duas matrículas da conta', async () => {
    const { repo } = fakeRepo([
      candidate({ started: true, dayOneComplete: true, completed: true }),
      candidate({ entitlementId: 'ent-2', started: true, dayOneComplete: true, completed: true }),
    ])
    const published: ChallengeAnalyticsEvent[] = []
    const analytics: ChallengeAnalyticsGateway = {
      async publish(events) {
        published.push(...events)
      },
    }
    await service(repo, fakeAuth([identity(true)]), fakeMessaging().gateway, analytics).runCycle()

    expect(published.map((event) => event.eventName)).toEqual([
      'account_activated',
      'challenge_started',
      'challenge_day_completed',
      'challenge_completed',
    ])
    expect(published.every((event) => event.buyerUserId === 'account-1')).toBe(true)
  })

  test('falha da telemetria não impede o e-mail comportamental', async () => {
    const { repo } = fakeRepo([candidate({ started: true, dayOneComplete: true })])
    const messaging = fakeMessaging()
    const analytics: ChallengeAnalyticsGateway = {
      async publish() {
        throw new Error('funil fora')
      },
    }
    expect(
      await service(repo, fakeAuth([identity(true)]), messaging.gateway, analytics).runCycle(),
    ).toEqual({ sent: 1, skipped: 0, failed: 0 })
  })
})

describe('SendChallengeLifecycleService no Desafio adulto', () => {
  test('usa os templates -adult e leva ao app adulto', async () => {
    const { repo } = fakeRepo([
      adulto({ entitlementId: 'sem-senha' }),
      adulto({ entitlementId: 'dia-1', started: true, dayOneComplete: true }),
    ])
    const messaging = fakeMessaging()
    const auth: AuthGateway = {
      ...fakeAuth([]),
      async getAccountIdentities() {
        return [{ ...identity(false), firstName: '' }]
      },
    }
    await service(repo, auth, messaging.gateway).runCycle()

    expect(messaging.sent).toEqual([
      expect.objectContaining({
        templateKey: 'challenge-not-activated-adult',
        variables: {
          nome: 'Aluno(a)',
          link: 'https://comunidade.sistemazero.com.br/esqueci-senha',
        },
        idempotencyKey: 'challenge-not-activated-adult:sem-senha:2026-10-16',
      }),
      expect.objectContaining({
        templateKey: 'challenge-day-one-complete-adult',
        variables: {
          nome: 'Aluno(a)',
          link: 'https://comunidade.sistemazero.com.br/cursos/desafio-primeiro-jogo-adulto',
        },
      }),
    ])
  })

  test('sem início leva ao curso adulto, e não à Área dos pais', async () => {
    const { repo } = fakeRepo([adulto()])
    const messaging = fakeMessaging()
    await service(repo, fakeAuth([identity(true)]), messaging.gateway).runCycle()

    expect(messaging.sent[0]).toMatchObject({
      templateKey: 'challenge-not-started-adult',
      variables: {
        nome: 'Marcos',
        link: 'https://comunidade.sistemazero.com.br/cursos/desafio-primeiro-jogo-adulto',
      },
    })
  })

  test('a conclusão leva à continuidade adulta do funil, com UTM', async () => {
    const { repo } = fakeRepo([adulto({ started: true, dayOneComplete: true, completed: true })])
    const messaging = fakeMessaging()
    await service(repo, fakeAuth([identity(true)]), messaging.gateway).runCycle()

    expect(messaging.sent[0]).toMatchObject({
      templateKey: 'challenge-completed-adult',
      variables: {
        link: 'https://sistemazero.com.br/pro/comunidade-dos-criadores/oferta/continuar?utm_source=email&utm_medium=email&utm_campaign=desafio-concluido',
      },
    })
  })

  test('sem a URL do app adulto, o aviso espera e não marca', async () => {
    const { repo, marks } = fakeRepo([adulto()])
    const messaging = fakeMessaging()
    const lifecycle = service(repo, fakeAuth([identity(true)]), messaging.gateway, undefined, null)

    expect(await lifecycle.runCycle()).toEqual({ sent: 0, skipped: 1, failed: 0 })
    expect(messaging.sent).toHaveLength(0)
    expect(marks).toHaveLength(0)
  })
})

describe('desiredKind', () => {
  test('não envia cobrança de começo depois que existe atividade', () => {
    expect(desiredKind(candidate({ started: true }), true, NOW)).toBeNull()
  })
})
