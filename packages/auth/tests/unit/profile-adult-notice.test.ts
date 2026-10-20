import { describe, expect, test } from 'bun:test'
import type { Logger } from '@sistemazero/core/logging'
import {
  ADULT_AREA_URL,
  adultNoticeJobState,
  NotifyAdultProfilesService,
  PROFILE_TURNED_18_TEMPLATE,
} from '../../src/application/maintenance/notify-adult-profiles.service'
import type {
  AdultNoticeCandidate,
  ProfileAdultNoticeRepository,
} from '../../src/domain/ports/profile-adult-notice-repository.port'
import {
  ADULT_NOTICE_LOOKBACK_DAYS,
  adultBirthday,
  adultNoticeBirthDateRange,
  adultNoticeToday,
  isAdultNoticeDue,
} from '../../src/domain/profile/adult-notice'
import { FakeMessagingClient } from '../fakes/in-memory'

const silentLogger: Logger = { debug() {}, info() {}, warn() {}, error() {} }

function addDays(day: string, days: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10)
}

describe('aviso de 18 anos: conta de datas', () => {
  test('18º aniversário: mesmo dia e mês; 29/02 vira 01/03 (como a régua do agregado)', () => {
    expect(adultBirthday('2008-10-20')).toBe('2026-10-20')
    expect(adultBirthday('2008-02-29')).toBe('2026-03-01')
    expect(adultBirthday('2008-02-28')).toBe('2026-02-28')
    expect(adultBirthday('2008-02-30')).toBeNull()
    expect(adultBirthday('20/10/2008')).toBeNull()
  })

  test('devido no próprio dia; não antes', () => {
    expect(isAdultNoticeDue('2008-10-20', '2026-10-20')).toBe(true)
    expect(isAdultNoticeDue('2008-10-21', '2026-10-20')).toBe(false)
  })

  test('job atrasado ou dia perdido: segue devido até o fim da janela, depois não', () => {
    expect(isAdultNoticeDue('2008-10-17', '2026-10-20')).toBe(true)
    expect(isAdultNoticeDue('2008-10-13', '2026-10-20')).toBe(true) // 7 dias
    expect(isAdultNoticeDue('2008-10-12', '2026-10-20')).toBe(false) // 8 dias
    // Quem fez 18 anos muito antes do recurso existir nunca é avisado.
    expect(isAdultNoticeDue('2000-01-01', '2026-10-20')).toBe(false)
    expect(ADULT_NOTICE_LOOKBACK_DAYS).toBe(7)
  })

  test('sem data de nascimento (ou ilegível) nunca é devido', () => {
    expect(isAdultNoticeDue(null, '2026-10-20')).toBe(false)
    expect(isAdultNoticeDue('2008-13-01', '2026-10-20')).toBe(false)
  })

  test('29/02: não avisa em 28/02, avisa de 01/03 até o fim da janela', () => {
    expect(isAdultNoticeDue('2008-02-29', '2026-02-28')).toBe(false)
    expect(isAdultNoticeDue('2008-02-29', '2026-03-01')).toBe(true)
    expect(isAdultNoticeDue('2008-02-29', '2026-03-08')).toBe(true)
    expect(isAdultNoticeDue('2008-02-29', '2026-03-09')).toBe(false)
  })

  test('faixa de nascimentos do SQL nos limites de 29/02', () => {
    // Janela começando em 01/03 inclui quem nasceu em 29/02.
    expect(adultNoticeBirthDateRange('2026-03-08')).toEqual({
      from: '2008-02-29',
      to: '2008-03-08',
    })
    // Hoje = 28/02: quem nasceu em 29/02 ainda não fez 18.
    expect(adultNoticeBirthDateRange('2026-02-28')).toEqual({
      from: '2008-02-21',
      to: '2008-02-28',
    })
    // Hoje = 29/02 de ano bissexto: não existe 29/02 dezoito anos antes.
    expect(adultNoticeBirthDateRange('2028-02-29')).toEqual({
      from: '2010-02-22',
      to: '2010-02-28',
    })
    // Janela começando em 29/02 (bissexto): 28/02 já ficou para trás.
    expect(adultNoticeBirthDateRange('2028-03-07')).toEqual({
      from: '2010-03-01',
      to: '2010-03-07',
    })
  })

  test('a faixa é EXATAMENTE o conjunto de nascimentos devidos (varredura)', () => {
    for (let today = '2026-01-01'; today <= '2030-12-31'; today = addDays(today, 3)) {
      const range = adultNoticeBirthDateRange(today)
      const start = addDays(range.from, -10)
      const end = addDays(range.to, 10)
      for (let birth = start; birth <= end; birth = addDays(birth, 1)) {
        const inRange = birth >= range.from && birth <= range.to
        expect({ today, birth, due: isAdultNoticeDue(birth, today) }).toEqual({
          today,
          birth,
          due: inRange,
        })
      }
    }
  })

  test('"hoje" é o dia civil de São Paulo, não o dia UTC', () => {
    // 02:59 UTC de 21/10 = 23:59 de 20/10 em São Paulo.
    expect(adultNoticeToday(new Date('2026-10-21T02:59:00Z'))).toBe('2026-10-20')
    expect(adultNoticeToday(new Date('2026-10-21T03:00:00Z'))).toBe('2026-10-21')
  })
})

/** Fake que espelha o SQL: faixa inclusiva, ordem por nascimento e anti-join do dedupe. */
class FakeAdultNoticeRepository implements ProfileAdultNoticeRepository {
  readonly notices = new Map<string, { accountUserId: string; turnedAdultOn: string }>()
  readonly queries: { birthDateFrom: string; birthDateTo: string; limit: number }[] = []

  constructor(private readonly candidates: AdultNoticeCandidate[]) {}

  async listCandidates(input: { birthDateFrom: string; birthDateTo: string; limit: number }) {
    this.queries.push(input)
    return this.candidates
      .filter(
        (c) =>
          c.birthDate >= input.birthDateFrom &&
          c.birthDate <= input.birthDateTo &&
          !this.notices.has(c.profileId),
      )
      .sort((a, b) => a.birthDate.localeCompare(b.birthDate))
      .slice(0, input.limit)
  }

  async markNotified(input: { profileId: string; accountUserId: string; turnedAdultOn: string }) {
    if (!this.notices.has(input.profileId))
      this.notices.set(input.profileId, {
        accountUserId: input.accountUserId,
        turnedAdultOn: input.turnedAdultOn,
      })
  }
}

function candidate(overrides: Partial<AdultNoticeCandidate> = {}): AdultNoticeCandidate {
  return {
    profileId: '11111111-1111-4111-8111-111111111111',
    profileName: 'Lia',
    birthDate: '2008-10-20',
    accountUserId: '22222222-2222-4222-8222-222222222222',
    guardianEmail: 'mae@example.com',
    guardianFirstName: 'Ana',
    ...overrides,
  }
}

describe('NotifyAdultProfilesService', () => {
  const noon = (day: string) => new Date(`${day}T15:00:00Z`)

  test('envia UM e-mail profile-turned-18 ao responsável e registra depois do envio', async () => {
    const repo = new FakeAdultNoticeRepository([candidate()])
    const messaging = new FakeMessagingClient()
    const service = new NotifyAdultProfilesService(
      repo,
      messaging,
      () => noon('2026-10-20'),
      silentLogger,
    )

    expect(await service.runCycle()).toEqual({ sent: 1, failed: 0 })
    expect(messaging.sent).toEqual([
      {
        templateKey: PROFILE_TURNED_18_TEMPLATE,
        recipient: { name: 'Ana', email: 'mae@example.com' },
        variables: { nome: 'Ana', nome_perfil: 'Lia', link: ADULT_AREA_URL },
        idempotencyKey: 'profile-turned-18-11111111-1111-4111-8111-111111111111',
      },
    ])
    expect(ADULT_AREA_URL).toBe(
      'https://sistemazero.com.br/pro/comunidade-dos-criadores/oferta/continuar?utm_source=email&utm_medium=email&utm_campaign=perfil-18',
    )
    expect(repo.notices.get('11111111-1111-4111-8111-111111111111')).toEqual({
      accountUserId: '22222222-2222-4222-8222-222222222222',
      turnedAdultOn: '2026-10-20',
    })
    expect(repo.queries[0]).toMatchObject({
      birthDateFrom: '2008-10-13',
      birthDateTo: '2008-10-20',
    })

    // Próximos ciclos (e dias) não reenviam.
    await service.runCycle()
    expect(messaging.sent).toHaveLength(1)
  })

  test('job atrasado: aniversário há 3 dias ainda envia; registra o dia do aniversário', async () => {
    const repo = new FakeAdultNoticeRepository([candidate({ birthDate: '2008-10-17' })])
    const messaging = new FakeMessagingClient()
    await new NotifyAdultProfilesService(
      repo,
      messaging,
      () => noon('2026-10-20'),
      silentLogger,
    ).runCycle()
    expect(messaging.sent).toHaveLength(1)
    expect(repo.notices.get(candidate().profileId)?.turnedAdultOn).toBe('2026-10-17')
  })

  test('29/02: envia em 01/03 com o aniversário registrado em 01/03', async () => {
    const repo = new FakeAdultNoticeRepository([candidate({ birthDate: '2008-02-29' })])
    const messaging = new FakeMessagingClient()
    const day = { value: '2026-02-28' }
    const service = new NotifyAdultProfilesService(
      repo,
      messaging,
      () => noon(day.value),
      silentLogger,
    )
    await service.runCycle()
    expect(messaging.sent).toHaveLength(0)
    day.value = '2026-03-01'
    await service.runCycle()
    expect(messaging.sent).toHaveLength(1)
    expect(repo.notices.get(candidate().profileId)?.turnedAdultOn).toBe('2026-03-01')
  })

  test('virada do dia em São Paulo: 23:59 locais ainda é a véspera do aniversário', async () => {
    const repo = new FakeAdultNoticeRepository([candidate({ birthDate: '2008-10-21' })])
    const messaging = new FakeMessagingClient()
    const now = { value: new Date('2026-10-21T02:59:00Z') }
    const service = new NotifyAdultProfilesService(repo, messaging, () => now.value, silentLogger)
    await service.runCycle()
    expect(messaging.sent).toHaveLength(0)
    now.value = new Date('2026-10-21T03:00:00Z')
    await service.runCycle()
    expect(messaging.sent).toHaveLength(1)
  })

  test('falha de envio não registra; o próximo ciclo tenta de novo com a mesma chave', async () => {
    const repo = new FakeAdultNoticeRepository([candidate()])
    const messaging = new FakeMessagingClient()
    const errors: string[] = []
    const logger: Logger = { ...silentLogger, error: (event) => void errors.push(event) }
    const service = new NotifyAdultProfilesService(
      repo,
      messaging,
      () => noon('2026-10-20'),
      logger,
    )
    messaging.failNext = true
    expect(await service.runCycle()).toEqual({ sent: 0, failed: 1 })
    expect(repo.notices.size).toBe(0)
    expect(errors).toEqual(['profile.adult_notice.failed'])

    expect(await service.runCycle()).toEqual({ sent: 1, failed: 0 })
    expect(messaging.sent[0]?.idempotencyKey).toBe(`profile-turned-18-${candidate().profileId}`)
  })

  test('responsável sem primeiro nome recebe o fallback "Responsável"', async () => {
    const repo = new FakeAdultNoticeRepository([candidate({ guardianFirstName: '  ' })])
    const messaging = new FakeMessagingClient()
    await new NotifyAdultProfilesService(
      repo,
      messaging,
      () => noon('2026-10-20'),
      silentLogger,
    ).runCycle()
    expect(messaging.sent[0]?.variables.nome).toBe('Responsável')
    expect(messaging.sent[0]?.recipient.name).toBe('Responsável')
  })

  test('shutdown interrompe antes do próximo envio', async () => {
    const repo = new FakeAdultNoticeRepository([
      candidate(),
      candidate({ profileId: '33333333-3333-4333-8333-333333333333' }),
    ])
    const messaging = new FakeMessagingClient()
    const service = new NotifyAdultProfilesService(
      repo,
      messaging,
      () => noon('2026-10-20'),
      silentLogger,
    )
    await service.runCycle(() => messaging.sent.length === 0)
    expect(messaging.sent).toHaveLength(1)
  })
})

describe('aviso de 18 anos: quando o job sobe', () => {
  const base = { nodeEnv: 'production', intervalMs: 6 * 3_600_000, messagingConfigured: true }

  test('sobe com Messaging configurado e intervalo positivo', () => {
    expect(adultNoticeJobState(base)).toBe('enabled')
  })

  test('sem Messaging configurado não sobe (o cliente nulo marcaria o aviso sem enviar)', () => {
    expect(adultNoticeJobState({ ...base, messagingConfigured: false })).toBe(
      'messaging-not-configured',
    )
  })

  test('NODE_ENV=test ou intervalo 0 desligam, com ou sem Messaging', () => {
    expect(adultNoticeJobState({ ...base, nodeEnv: 'test' })).toBe('disabled')
    expect(adultNoticeJobState({ ...base, intervalMs: 0 })).toBe('disabled')
    expect(adultNoticeJobState({ ...base, intervalMs: 0, messagingConfigured: false })).toBe(
      'disabled',
    )
  })
})
