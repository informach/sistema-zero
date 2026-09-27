import { describe, expect, test } from 'bun:test'
import { SendRenewalRemindersService } from '../../src/application/renewal-reminder/send-renewal-reminders.service'
import type { AccountIdentity, AuthGateway } from '../../src/domain/ports/auth-gateway.port'
import type { ChallengeAnalyticsGateway } from '../../src/domain/ports/challenge-analytics-gateway.port'
import type { SendEmailInput } from '../../src/domain/ports/messaging-gateway.port'
import {
  type ExpiringTermEntitlement,
  expiresOnKey,
  type FixedAccessLifecycleEntitlement,
  type RenewalReminderRepository,
} from '../../src/domain/ports/renewal-reminder-repository.port'

const NOW = new Date('2027-05-25T12:00:00Z')
const silentLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
}

/** Fake do repo: janela + dedupe em memória (espelha a semântica do SQL). */
function fakeRepo(
  rows: ExpiringTermEntitlement[],
  fixedRows: FixedAccessLifecycleEntitlement[] = [],
) {
  const reminded = new Set<string>()
  const lifecycleSent = new Set<string>()
  const repo: RenewalReminderRepository = {
    async listExpiringTermEntitlements(from, to, limit) {
      const eligible = rows
        .filter((r) => r.expiresAt >= from && r.expiresAt <= to)
        .filter((r) => !reminded.has(`${r.id}|${expiresOnKey(r.expiresAt)}`))
      const selectedGroups = new Set<string>()
      for (const entitlement of eligible) {
        const group = `${entitlement.userId}|${entitlement.offerSlug ?? ''}|${expiresOnKey(entitlement.expiresAt)}`
        if (selectedGroups.has(group) || selectedGroups.size === limit) continue
        selectedGroups.add(group)
      }
      return eligible.filter((entitlement) =>
        selectedGroups.has(
          `${entitlement.userId}|${entitlement.offerSlug ?? ''}|${expiresOnKey(entitlement.expiresAt)}`,
        ),
      )
    },
    async markReminded(entitlementId, expiresOn) {
      reminded.add(`${entitlementId}|${expiresOn}`)
    },
    async listFixedAccessLifecycleEntitlements(_now, limit) {
      return fixedRows
        .filter(
          (row) =>
            !lifecycleSent.has(`${row.id}|${expiresOnKey(row.expiresAt)}|${row.messageKind}`),
        )
        .slice(0, limit)
    },
    async markLifecycleMessageSent(entitlementId, expiresOn, messageKind) {
      lifecycleSent.add(`${entitlementId}|${expiresOn}|${messageKind}`)
    },
  }
  return { repo, reminded, lifecycleSent }
}

function fakeAuth(identities: Record<string, AccountIdentity>): AuthGateway {
  return {
    async getAccountIdentities(ids) {
      return ids.map((id) => identities[id]).filter((i): i is AccountIdentity => Boolean(i))
    },
    async getProfileNames() {
      return new Map()
    },
    async getProfileIdentities() {
      return new Map()
    },
  }
}

function fakeMessaging(failFirst = 0) {
  const sent: SendEmailInput[] = []
  let failures = failFirst
  return {
    sent,
    gateway: {
      async sendEmail(input: SendEmailInput) {
        if (failures > 0) {
          failures -= 1
          throw new Error('messaging fora')
        }
        sent.push(input)
      },
    },
  }
}

function row(over: Partial<ExpiringTermEntitlement> & { id: string }): ExpiringTermEntitlement {
  return {
    userId: 'user-1',
    expiresAt: new Date('2027-05-30T00:00:00Z'),
    offerSlug: 'clube-anual',
    productName: 'Clube dos Criadores',
    ...over,
  }
}

function service(
  repo: RenewalReminderRepository,
  auth: AuthGateway,
  messaging: { sendEmail(input: SendEmailInput): Promise<void> },
  batchLimit?: number,
  analytics?: ChallengeAnalyticsGateway,
) {
  return new SendRenewalRemindersService(
    repo,
    auth,
    messaging,
    () => NOW,
    silentLogger,
    {
      daysBefore: 7,
      batchLimit,
      funnelUrl: 'https://sistemazero.com.br',
      kidsUrl: 'https://kids.sistemazero.com.br',
    },
    analytics,
  )
}

describe('SendRenewalRemindersService', () => {
  test('envia 1 e-mail por compra (grupo user+oferta+vencimento) e marca TODAS as matrículas', async () => {
    // Oferta com bônus: 2 matrículas do MESMO pagamento/vencimento.
    const { repo, reminded } = fakeRepo([row({ id: 'e1' }), row({ id: 'e2' })])
    const auth = fakeAuth({
      'user-1': { id: 'user-1', email: 'ana@example.com', firstName: 'Ana', activated: true },
    })
    const msg = fakeMessaging()

    const result = await service(repo, auth, msg.gateway).runCycle()
    expect(result).toEqual({ sent: 1, skipped: 0, failed: 0 })
    expect(msg.sent).toHaveLength(1)

    const email = msg.sent[0]!
    expect(email.templateKey).toBe('renewal-reminder')
    expect(email.recipient.email).toBe('ana@example.com')
    expect(email.variables?.nome).toBe('Ana')
    expect(email.variables?.produto).toBe('Clube dos Criadores')
    expect(email.variables?.data).toBe('30/05/2027')
    expect(email.variables?.link).toBe('https://sistemazero.com.br/renovar?oferta=clube-anual')
    expect(email.idempotencyKey).toMatch(/^renewal-reminder:[a-f0-9]{32}$/)

    expect(reminded.has('e1|2027-05-30')).toBe(true)
    expect(reminded.has('e2|2027-05-30')).toBe(true)

    // 2º ciclo: nada pendente (dedupe).
    const again = await service(repo, auth, msg.gateway).runCycle()
    expect(again).toEqual({ sent: 0, skipped: 0, failed: 0 })
    expect(msg.sent).toHaveLength(1)
  })

  test('fora da janela de 7 dias → nada; dentro → envia', async () => {
    const { repo } = fakeRepo([row({ id: 'e-longe', expiresAt: new Date('2027-07-01T00:00:00Z') })])
    const auth = fakeAuth({
      'user-1': { id: 'user-1', email: 'ana@example.com', firstName: 'Ana', activated: true },
    })
    const msg = fakeMessaging()
    expect(await service(repo, auth, msg.gateway).runCycle()).toEqual({
      sent: 0,
      skipped: 0,
      failed: 0,
    })
  })

  test('conta sem e-mail (excluída) → marca e pula, sem tentar de novo p/ sempre', async () => {
    const { repo, reminded } = fakeRepo([row({ id: 'e1' })])
    const auth = fakeAuth({}) // identidade não encontrada
    const msg = fakeMessaging()

    const result = await service(repo, auth, msg.gateway).runCycle()
    expect(result).toEqual({ sent: 0, skipped: 1, failed: 0 })
    expect(msg.sent).toHaveLength(0)
    expect(reminded.has('e1|2027-05-30')).toBe(true)
  })

  test('falha no envio → NÃO marca (retry no próximo ciclo) e não derruba o ciclo', async () => {
    const { repo, reminded } = fakeRepo([
      row({ id: 'e1' }),
      row({ id: 'e9', userId: 'user-2', offerSlug: 'outro-anual' }),
    ])
    const auth = fakeAuth({
      'user-1': { id: 'user-1', email: 'ana@example.com', firstName: 'Ana', activated: true },
      'user-2': { id: 'user-2', email: 'bia@example.com', firstName: 'Bia', activated: true },
    })
    const msg = fakeMessaging(1) // 1ª chamada falha

    const result = await service(repo, auth, msg.gateway).runCycle()
    expect(result.failed).toBe(1)
    expect(result.sent).toBe(1)
    expect(reminded.has('e1|2027-05-30')).toBe(false)

    // Próximo ciclo re-tenta só o pendente.
    const retry = await service(repo, auth, msg.gateway).runCycle()
    expect(retry).toEqual({ sent: 1, skipped: 0, failed: 0 })
    expect(reminded.has('e1|2027-05-30')).toBe(true)
  })

  test('retry parcial mantém a mesma chave mesmo quando muda a primeira matrícula do grupo', async () => {
    const auth = fakeAuth({
      'user-1': { id: 'user-1', email: 'ana@example.com', firstName: 'Ana', activated: true },
    })
    const firstAttempt = fakeMessaging()
    const retryAttempt = fakeMessaging()

    await service(
      fakeRepo([row({ id: 'e1' }), row({ id: 'e2' })]).repo,
      auth,
      firstAttempt.gateway,
    ).runCycle()
    await service(fakeRepo([row({ id: 'e2' })]).repo, auth, retryAttempt.gateway).runCycle()

    expect(firstAttempt.sent[0]?.idempotencyKey).toBe(retryAttempt.sent[0]?.idempotencyKey)
  })

  test('vencimentos DIFERENTES do mesmo usuário são compras distintas → 2 e-mails', async () => {
    const { repo } = fakeRepo([
      row({ id: 'e1', expiresAt: new Date('2027-05-28T00:00:00Z') }),
      row({ id: 'e2', offerSlug: 'outro-anual', expiresAt: new Date('2027-05-30T00:00:00Z') }),
    ])
    const auth = fakeAuth({
      'user-1': { id: 'user-1', email: 'ana@example.com', firstName: 'Ana', activated: true },
    })
    const msg = fakeMessaging()
    const result = await service(repo, auth, msg.gateway).runCycle()
    expect(result.sent).toBe(2)
  })

  test('não divide uma compra com mais matrículas que o limite do ciclo', async () => {
    const { repo, reminded } = fakeRepo([
      row({ id: 'e1' }),
      row({ id: 'e2' }),
      row({ id: 'e3' }),
      row({ id: 'e4', userId: 'user-2', offerSlug: 'outro-anual' }),
    ])
    const auth = fakeAuth({
      'user-1': { id: 'user-1', email: 'ana@example.com', firstName: 'Ana', activated: true },
      'user-2': { id: 'user-2', email: 'bia@example.com', firstName: 'Bia', activated: true },
    })
    const msg = fakeMessaging()
    const reminderService = service(repo, auth, msg.gateway, 1)

    expect(await reminderService.runCycle()).toEqual({ sent: 1, skipped: 0, failed: 0 })
    expect(msg.sent).toHaveLength(1)
    expect(msg.sent[0]?.idempotencyKey).toMatch(/^renewal-reminder:[a-f0-9]{32}$/)
    expect(reminded.has('e1|2027-05-30')).toBe(true)
    expect(reminded.has('e2|2027-05-30')).toBe(true)
    expect(reminded.has('e3|2027-05-30')).toBe(true)

    // O ciclo seguinte avança para a próxima compra; não reenvia a anterior.
    expect(await reminderService.runCycle()).toEqual({ sent: 1, skipped: 0, failed: 0 })
    expect(msg.sent).toHaveLength(2)
    expect(msg.sent[1]?.idempotencyKey).toMatch(/^renewal-reminder:[a-f0-9]{32}$/)
  })

  test('envia os marcos de 7 dias, 3 dias e expiração uma vez por vencimento', async () => {
    const fixed = (messageKind: FixedAccessLifecycleEntitlement['messageKind']) => ({
      ...row({
        id: `fixed-${messageKind}`,
        offerSlug: 'desafio-primeiro-jogo-30-dias',
        expiresAt: new Date('2027-05-30T12:00:00Z'),
      }),
      courseRef: 'desafio-primeiro-jogo',
      messageKind,
    })
    const { repo, lifecycleSent } = fakeRepo(
      [],
      [fixed('expiry_7d'), fixed('expiry_3d'), fixed('expired')],
    )
    const auth = fakeAuth({
      'user-1': { id: 'user-1', email: 'ana@example.com', firstName: 'Ana', activated: true },
    })
    const msg = fakeMessaging()
    const analyticsEvents: string[] = []
    const analytics: ChallengeAnalyticsGateway = {
      async publish(events) {
        analyticsEvents.push(...events.map((event) => event.eventName))
      },
    }

    expect(await service(repo, auth, msg.gateway, undefined, analytics).runCycle()).toEqual({
      sent: 3,
      skipped: 0,
      failed: 0,
    })
    expect(msg.sent.map((email) => email.templateKey)).toEqual([
      'challenge-expiry-7d',
      'challenge-expiry-3d',
      'challenge-expired',
    ])
    expect(msg.sent[0]?.variables).toEqual({
      nome: 'Ana',
      data: '30/05/2027',
      link: 'https://kids.sistemazero.com.br/cursos/desafio-primeiro-jogo',
    })
    expect(msg.sent[2]?.variables?.link).toBe(
      'https://sistemazero.com.br/kids/comunidade-do-criador/oferta',
    )
    expect(lifecycleSent.size).toBe(3)
    expect(analyticsEvents).toEqual([
      'expiry_reminder_sent',
      'expiry_reminder_sent',
      'challenge_expired',
    ])

    expect(await service(repo, auth, msg.gateway).runCycle()).toEqual({
      sent: 0,
      skipped: 0,
      failed: 0,
    })
  })

  test('falha no aviso fixo não marca e permite retry; dedupe do messaging mantém a chave', async () => {
    const fixed: FixedAccessLifecycleEntitlement = {
      ...row({
        id: 'fixed-retry',
        offerSlug: 'desafio-primeiro-jogo-30-dias',
        expiresAt: new Date('2027-05-30T12:00:00Z'),
      }),
      courseRef: 'desafio-primeiro-jogo',
      messageKind: 'expiry_3d',
    }
    const { repo, lifecycleSent } = fakeRepo([], [fixed])
    const auth = fakeAuth({
      'user-1': { id: 'user-1', email: 'ana@example.com', firstName: 'Ana', activated: true },
    })
    const msg = fakeMessaging(1)

    expect((await service(repo, auth, msg.gateway).runCycle()).failed).toBe(1)
    expect(lifecycleSent.size).toBe(0)
    expect((await service(repo, auth, msg.gateway).runCycle()).sent).toBe(1)
    expect(msg.sent[0]?.idempotencyKey).toMatch(/^challenge-expiry-3d:[a-f0-9]{32}$/)
  })
})
