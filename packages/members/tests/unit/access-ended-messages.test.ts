import { describe, expect, test } from 'bun:test'
import {
  ACCESS_ENDED_WINDOW_MS,
  accessEndedLink,
  SendAccessEndedMessagesService,
} from '../../src/application/renewal-reminder/send-access-ended-messages.service'
import type { AccountIdentity, AuthGateway } from '../../src/domain/ports/auth-gateway.port'
import type { SendEmailInput } from '../../src/domain/ports/messaging-gateway.port'
import {
  type AccessEndedMessagesRepository,
  type EndedSubscriptionEntitlement,
  expiresOnKey,
  type GiftLifecycleEntitlement,
} from '../../src/domain/ports/renewal-reminder-repository.port'

const NOW = new Date('2026-10-20T15:00:00Z')
const FUNNEL = 'https://sistemazero.com.br'
const silentLogger = { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} }

function fakeRepo(gifts: GiftLifecycleEntitlement[], ended: EndedSubscriptionEntitlement[]) {
  const sent = new Set<string>()
  const windows: number[] = []
  const repo: AccessEndedMessagesRepository = {
    async listGiftLifecycleEntitlements(_now, windowMs) {
      windows.push(windowMs)
      return gifts.filter(
        (row) => !sent.has(`${row.id}|${expiresOnKey(row.expiresAt)}|${row.messageKind}`),
      )
    },
    async listEndedCommunitySubscriptions(_now, windowMs) {
      windows.push(windowMs)
      return ended.filter(
        (row) => !sent.has(`${row.id}|${expiresOnKey(row.endedAt)}|subscription_ended`),
      )
    },
    async markAccessEndedMessageSent(id, expiresOn, kind) {
      sent.add(`${id}|${expiresOn}|${kind}`)
    },
  }
  return { repo, sent, windows }
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
          failures--
          throw new Error('gateway fora')
        }
        sent.push(input)
      },
    },
  }
}

const identity = (id: string, firstName = 'Ana'): AccountIdentity => ({
  id,
  email: `${id}@exemplo.com`,
  firstName,
  activated: true,
})

function service(
  repo: AccessEndedMessagesRepository,
  auth: AuthGateway,
  messaging: ReturnType<typeof fakeMessaging>,
) {
  return new SendAccessEndedMessagesService(
    repo,
    auth,
    messaging.gateway,
    () => NOW,
    silentLogger,
    { funnelUrl: FUNNEL },
  )
}

describe('links da continuidade com UTM', () => {
  test('Kids e adulto, campanha e conteúdo', () => {
    expect(accessEndedLink(`${FUNNEL}/`, 'kids', 'fim-do-presente', '2-dias')).toBe(
      'https://sistemazero.com.br/kids/comunidade-dos-criadores/oferta/continuar?utm_source=email&utm_medium=email&utm_campaign=fim-do-presente&utm_content=2-dias',
    )
    expect(accessEndedLink(FUNNEL, 'kids', 'fim-do-presente', 'no-dia')).toContain(
      'utm_campaign=fim-do-presente&utm_content=no-dia',
    )
    expect(accessEndedLink(FUNNEL, 'adult', 'assinatura-encerrada')).toBe(
      'https://sistemazero.com.br/pro/comunidade-dos-criadores/oferta/continuar?utm_source=email&utm_medium=email&utm_campaign=assinatura-encerrada',
    )
  })
})

describe('SendAccessEndedMessagesService', () => {
  const expiresAt = new Date('2026-10-22T14:00:00Z')
  const gift = (
    id: string,
    kind: GiftLifecycleEntitlement['messageKind'],
    userId = 'u1',
    audience: GiftLifecycleEntitlement['audience'] = 'kids',
  ): GiftLifecycleEntitlement => ({
    id,
    userId,
    sourceId: audience === 'adult' ? 'scholarship:a1' : 'scholarship:r1',
    expiresAt,
    messageKind: kind,
    audience,
  })

  test('presente: um e-mail por resgate (curso + Mural), com data de São Paulo, e dedupe', async () => {
    const { repo, sent } = fakeRepo(
      [gift('e-course', 'gift_expiry_2d'), gift('e-mural', 'gift_expiry_2d')],
      [],
    )
    const messaging = fakeMessaging()
    const run = service(repo, fakeAuth({ u1: identity('u1') }), messaging)
    expect(await run.runCycle()).toEqual({ sent: 1, skipped: 0, failed: 0 })
    expect(messaging.sent).toHaveLength(1)
    const [email] = messaging.sent
    expect(email?.templateKey).toBe('gift-expiry-2d')
    expect(email?.recipient).toEqual({ name: 'Ana', email: 'u1@exemplo.com' })
    expect(email?.variables).toEqual({
      nome: 'Ana',
      data: '22/10/2026',
      link: accessEndedLink(FUNNEL, 'kids', 'fim-do-presente', '2-dias'),
    })
    expect(email?.idempotencyKey).toMatch(/^gift-expiry-2d:[a-f0-9]{32}$/)
    expect(sent).toEqual(
      new Set(['e-course|2026-10-22|gift_expiry_2d', 'e-mural|2026-10-22|gift_expiry_2d']),
    )
    expect(await run.runCycle()).toEqual({ sent: 0, skipped: 0, failed: 0 })
  })

  test('presente no dia: template próprio, só nome e link', async () => {
    const { repo } = fakeRepo([gift('e1', 'gift_expired')], [])
    const messaging = fakeMessaging()
    await service(repo, fakeAuth({ u1: identity('u1', '') }), messaging).runCycle()
    expect(messaging.sent[0]?.templateKey).toBe('gift-expired')
    expect(messaging.sent[0]?.variables).toEqual({
      nome: 'Responsável',
      link: accessEndedLink(FUNNEL, 'kids', 'fim-do-presente', 'no-dia'),
    })
  })

  test('presente adulto: templates -adult com as mesmas variáveis e a continuidade adulta', async () => {
    const { repo, sent } = fakeRepo(
      [
        gift('a-course', 'gift_expiry_2d', 'u2', 'adult'),
        gift('a-mural', 'gift_expiry_2d', 'u2', 'adult'),
        gift('a-done', 'gift_expired', 'u3', 'adult'),
        gift('k-course', 'gift_expiry_2d', 'u1'),
      ],
      [],
    )
    const messaging = fakeMessaging()
    const run = service(
      repo,
      fakeAuth({ u1: identity('u1'), u2: identity('u2', 'Bia'), u3: identity('u3', '') }),
      messaging,
    )
    expect(await run.runCycle()).toEqual({ sent: 3, skipped: 0, failed: 0 })
    const byKey = new Map(messaging.sent.map((email) => [email.templateKey, email]))
    expect([...byKey.keys()].sort()).toEqual([
      'gift-expired-adult',
      'gift-expiry-2d',
      'gift-expiry-2d-adult',
    ])
    expect(byKey.get('gift-expiry-2d-adult')?.variables).toEqual({
      nome: 'Bia',
      data: '22/10/2026',
      link: accessEndedLink(FUNNEL, 'adult', 'fim-do-presente', '2-dias'),
    })
    expect(byKey.get('gift-expiry-2d-adult')?.variables.link).toBe(
      'https://sistemazero.com.br/pro/comunidade-dos-criadores/oferta/continuar?utm_source=email&utm_medium=email&utm_campaign=fim-do-presente&utm_content=2-dias',
    )
    expect(byKey.get('gift-expiry-2d-adult')?.idempotencyKey).toMatch(
      /^gift-expiry-2d-adult:[a-f0-9]{32}$/,
    )
    expect(byKey.get('gift-expired-adult')?.variables).toEqual({
      nome: 'Aluno(a)',
      link: accessEndedLink(FUNNEL, 'adult', 'fim-do-presente', 'no-dia'),
    })
    // O Kids do mesmo ciclo segue igual.
    expect(byKey.get('gift-expiry-2d')?.variables).toEqual({
      nome: 'Ana',
      data: '22/10/2026',
      link: accessEndedLink(FUNNEL, 'kids', 'fim-do-presente', '2-dias'),
    })
    expect(sent.size).toBe(4)
  })

  test('assinatura: agrupa o combo por conta + assinatura e escolhe o template pela audiência', async () => {
    const endedAt = new Date('2026-10-20T03:00:00Z')
    const rows: EndedSubscriptionEntitlement[] = [
      { id: 'k1', userId: 'u1', subscriptionId: 's-kids', audience: 'kids', endedAt },
      { id: 'k2', userId: 'u1', subscriptionId: 's-kids', audience: 'kids', endedAt },
      { id: 'k3', userId: 'u1', subscriptionId: 's-kids', audience: 'kids', endedAt },
      { id: 'a1', userId: 'u2', subscriptionId: 's-adult', audience: 'adult', endedAt },
      { id: 'a2', userId: 'u2', subscriptionId: 's-adult', audience: 'adult', endedAt },
    ]
    const { repo, sent } = fakeRepo([], rows)
    const messaging = fakeMessaging()
    const run = service(repo, fakeAuth({ u1: identity('u1'), u2: identity('u2', '') }), messaging)
    expect(await run.runCycle()).toEqual({ sent: 2, skipped: 0, failed: 0 })
    expect(messaging.sent.map((email) => email.templateKey)).toEqual([
      'subscription-ended-kids',
      'subscription-ended-adult',
    ])
    expect(messaging.sent[0]?.variables).toEqual({
      nome: 'Ana',
      link: accessEndedLink(FUNNEL, 'kids', 'assinatura-encerrada'),
    })
    expect(messaging.sent[1]?.variables).toEqual({
      nome: 'Aluno(a)',
      link: accessEndedLink(FUNNEL, 'adult', 'assinatura-encerrada'),
    })
    expect(sent.size).toBe(5)
    expect(await run.runCycle()).toEqual({ sent: 0, skipped: 0, failed: 0 })
  })

  test('falha no envio não marca (o próximo ciclo tenta) e conta sem e-mail é marcada sem envio', async () => {
    const { repo, sent } = fakeRepo(
      [gift('e1', 'gift_expired'), gift('e2', 'gift_expired', 'ghost')],
      [],
    )
    const messaging = fakeMessaging(1)
    const run = service(repo, fakeAuth({ u1: identity('u1') }), messaging)
    expect(await run.runCycle()).toEqual({ sent: 0, skipped: 1, failed: 1 })
    expect(sent).toEqual(new Set(['e2|2026-10-22|gift_expired']))
    expect(await run.runCycle()).toEqual({ sent: 1, skipped: 0, failed: 0 })
    // A mesma chave nos dois ciclos: o dedupe do Messaging absorve um envio repetido.
    expect(messaging.sent).toHaveLength(1)
  })

  test('janela padrão de 72 h nas duas consultas (ciclos perdidos ainda avisam, nada antigo)', async () => {
    expect(ACCESS_ENDED_WINDOW_MS).toBe(72 * 3_600_000)
    const { repo, windows } = fakeRepo([], [])
    await service(repo, fakeAuth({}), fakeMessaging()).runCycle()
    expect(windows).toEqual([ACCESS_ENDED_WINDOW_MS, ACCESS_ENDED_WINDOW_MS])
  })
})
