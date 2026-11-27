import { beforeEach, describe, expect, test } from 'bun:test'
import { RedeemScholarshipService } from '../../src/application/redeem-scholarship/redeem-scholarship.service'
import type {
  GrantManualCourseInput,
  GrantManualOfferInput,
  SendEmailInput,
} from '../../src/domain/ports/gateway.port'
import {
  FakeGiftOfferCatalog,
  FakeReferralsGateway,
  InMemoryReferralRepository,
  KIDS_GIFT_OFFER,
  silentLogger,
} from '../fakes/in-memory'

const BASE_OPTS = {
  kidsCommunityUrl: 'https://kids.sistemazero.com.br',
  leaseMs: 90_000,
}
const DAY_MS = 24 * 60 * 60 * 1000

async function seedAmbassadorCode(repo: InMemoryReferralRepository) {
  const created = await repo.createAmbassadorWithCode({
    name: 'Vó Cida',
    email: 'cida@example.com',
    pageToken: 't'.repeat(43),
    code: 'cida-x7k2',
  })
  if (created.kind !== 'created') throw new Error('seed falhou')
  return created
}

describe('RedeemScholarshipService', () => {
  let repo: InMemoryReferralRepository
  let gateway: FakeReferralsGateway
  let catalog: FakeGiftOfferCatalog
  let OPTS: typeof BASE_OPTS & { giftOffers: FakeGiftOfferCatalog }
  let service: RedeemScholarshipService

  beforeEach(async () => {
    repo = new InMemoryReferralRepository()
    gateway = new FakeReferralsGateway()
    catalog = new FakeGiftOfferCatalog()
    OPTS = { ...BASE_OPTS, giftOffers: catalog }
    service = new RedeemScholarshipService(repo, gateway, OPTS, silentLogger)
    await seedAmbassadorCode(repo)
  })

  const input = { code: 'cida-x7k2', name: 'Paula Prado', email: 'Paula@Example.com ' }

  test('resgate autenticado concede para a conta confirmada sem registrar comprador', async () => {
    const result = await service.execute(input, {
      userId: '00000000-0000-4000-8000-000000000123',
      audience: 'kids',
    })
    expect(result.kind).toBe('completed')
    expect(repo.redemptions[0]?.userId).toBe('00000000-0000-4000-8000-000000000123')
    expect(gateway.calls.some((c) => c.kind === 'ensureBuyer')).toBe(false)
    const again = await service.execute(input, {
      userId: '00000000-0000-4000-8000-000000000123',
      audience: 'kids',
    })
    expect(again.kind).toBe('already_redeemed')
    const changedEmail = await service.execute(
      { ...input, email: 'novo@example.com' },
      { userId: '00000000-0000-4000-8000-000000000123', audience: 'kids' },
    )
    expect(changedEmail.kind).toBe('already_redeemed')
    expect(repo.redemptions).toHaveLength(1)
  })

  /** Resgate ANTIGO em andamento (política `trial` de sete dias, antes do presente por oferta). */
  async function seedLegacyTrial() {
    const { redemption } = await repo.insertRedemption({
      audience: 'kids',
      codeId: repo.codes[0]!.id,
      email: 'paula@example.com',
      name: 'Paula Prado',
      phone: null,
      courseSlug: 'cade-todo-mundo',
    })
    return redemption
  }

  test('resgate captura comissão por plano e retomada preserva o acordo anterior', async () => {
    const original = new RedeemScholarshipService(
      repo,
      gateway,
      {
        ...OPTS,
        bonusAmounts: { monthly: 3000, annual: 8000 },
      },
      silentLogger,
    )
    gateway.grantResult = { status: 502, body: {} }
    await original.execute(input)
    expect(repo.redemptions[0]?.bonusAmounts).toEqual({ monthly: 3000, annual: 8000 })
    gateway.grantResult = { status: 200, body: {} }
    const changed = new RedeemScholarshipService(
      repo,
      gateway,
      {
        ...OPTS,
        bonusAmounts: { monthly: 4000, annual: 9000 },
      },
      silentLogger,
    )
    expect((await changed.execute(input)).kind).toBe('completed')
    expect(repo.redemptions[0]?.bonusAmounts).toEqual({ monthly: 3000, annual: 8000 })
    expect((await changed.execute({ ...input, email: 'nova@example.com' })).kind).toBe('completed')
    expect(repo.redemptions[1]?.bonusAmounts).toEqual({ monthly: 4000, annual: 9000 })
  })

  test('fluxo feliz (conta NOVA): conta → oferta do presente → welcome com token', async () => {
    const result = await service.execute(input)
    expect(result.kind).toBe('completed')

    const r = repo.redemptions[0]!
    expect(r.email).toBe('paula@example.com') // normalizado ANTES do UNIQUE
    expect(r.userId).not.toBeNull()
    expect(r.buyerCreated).toBe(true)
    expect(r.grantedAt).not.toBeNull()
    expect(r.status).toBe('completed')
    expect(r.welcomeSentAt).not.toBeNull()
    // O resgate novo grava a oferta padrão do público, o prazo dela e o curso principal.
    expect(r.muralVisitorPolicy).toBe('offer')
    expect(r.giftOfferId).toBe(KIDS_GIFT_OFFER.offerId)
    expect(r.accessDurationDays).toBe(7)
    expect(r.courseSlug).toBe('cade-todo-mundo')
    expect(catalog.calls).toContain('cade-todo-mundo-7-dias')

    // Um grant só: a OFERTA inteira, com delivery-id/sourceId ESTÁVEIS e o prazo da oferta
    // contado do resgate (`anchorAt`).
    if (!r.userId) throw new Error('resgate concluído sem conta')
    expect(gateway.callsOf('grantManualOffer').map((c) => c.input)).toEqual([
      {
        userId: r.userId,
        offerRef: KIDS_GIFT_OFFER.offerId,
        sourceId: `scholarship:${r.id}`,
        anchorAt: r.createdAt.toISOString(),
        audience: 'kids',
        deliveryId: `scholarship:offer:${KIDS_GIFT_OFFER.offerId}:${r.id}`,
      } satisfies GrantManualOfferInput,
    ])
    expect(gateway.callsOf('grantManualCourse')).toHaveLength(0)
    expect(gateway.callsOf('grantMuralTrial')).toHaveLength(0)
    expect(result).toMatchObject({
      muralAccess: 'trial',
      expiresAt: new Date(r.createdAt.getTime() + 7 * DAY_MS).toISOString(),
    })

    // Welcome do comprador NOVO: token + template do presente com curso, prazo e Mural prontos.
    expect(gateway.callsOf('createPasswordToken')).toHaveLength(1)
    const send = gateway.callsOf('sendEmail')[0]!
    const email = send.input as SendEmailInput
    expect(email.templateKey).toBe('referrals-scholarship-welcome-mural-trial')
    expect(email.variables.indicador).toBe('Vó')
    expect(email.variables.curso).toBe('Cadê Todo Mundo?')
    expect(email.variables.prazo).toStartWith('por 7 dias, até ')
    expect(email.variables.prazo).toEndWith('(horário de Brasília)')
    expect(email.variables.mural).toContain('Mural dos Criadores')
    // Curso da criança, conta nova: o próximo passo é o perfil e o aparelho do filho.
    expect(email.variables.orientacao).toStartWith(
      'Depois de entrar como responsável, clique em “Adicionar criança”.',
    )
    expect(email.variables.orientacao).not.toContain('já autorizou')
    expect(email.variables.link).toContain('/redefinir-senha?token=tok-abc')
    expect(send.idempotencyKey).toBe(`scholarship-welcome:${r.id}`)
  })

  test('oferta vitalícia sem Mural: sem prazo e sem participação no Mural', async () => {
    catalog.offers = [
      {
        ...KIDS_GIFT_OFFER,
        offerId: '7a0f6a52-3c1e-4c55-9d1b-6f1c0a1e7d09',
        accessMode: 'lifetime',
        accessDurationValue: null,
        accessDurationUnit: null,
        includesMural: false,
      },
    ]
    const result = await service.execute(input)
    expect(result).toMatchObject({ kind: 'completed', expiresAt: null, muralAccess: 'none' })
    const r = repo.redemptions[0]!
    expect(r.accessDurationDays).toBeNull()
    expect(r.giftOfferId).toBe('7a0f6a52-3c1e-4c55-9d1b-6f1c0a1e7d09')
    const email = gateway.callsOf('sendEmail')[0]!.input as SendEmailInput
    expect(email.variables.prazo).toBe('sem prazo para terminar')
    expect(email.variables.mural).toBe('')
  })

  test('oferta arquivada: presente indisponível, sem conta', async () => {
    catalog.offers = [{ ...KIDS_GIFT_OFFER, status: 'archived' as const }]
    expect((await service.execute(input)).kind).toBe('gift_unavailable')
    expect((await service.publicGift(null, 'kids')).availability).toBe('unavailable')
    expect(repo.redemptions).toHaveLength(0)
    expect(gateway.callsOf('ensureBuyer')).toHaveLength(0)
  })

  test('oferta de 6 meses (27/11/2026) vira presente: grava os dias do calendário e diz "6 meses"', async () => {
    catalog.offers = [
      {
        ...KIDS_GIFT_OFFER,
        accessDurationValue: 6,
        accessDurationUnit: 'months' as const,
        advertisedAccessDays: null,
      },
    ]
    const publico = await service.publicGift(null, 'kids')
    expect(publico.availability).toBe('available')
    expect(publico.gift?.accessMonths).toBe(6)
    const result = await service.execute(input)
    expect(result.kind).toBe('completed')
    const r = repo.redemptions[0]!
    const fim = new Date(r.createdAt)
    fim.setUTCMonth(fim.getUTCMonth() + 6)
    const dias = Math.round((fim.getTime() - r.createdAt.getTime()) / DAY_MS)
    expect(Math.abs((r.accessDurationDays ?? 0) - dias)).toBeLessThanOrEqual(1)
    expect(r.advertisedDays).toBeNull()
    const email = gateway.callsOf('sendEmail')[0]!.input as SendEmailInput
    expect(email.variables.prazo).toStartWith('por 6 meses, até ')
  })

  test('oferta pausada continua servindo de presente', async () => {
    catalog.offers = [{ ...KIDS_GIFT_OFFER, status: 'paused' }]
    expect((await service.execute(input)).kind).toBe('completed')
  })

  test('conta existente, código de embaixador e oferta sem prazo: o e-mail nomeia quem deu', async () => {
    catalog.offers = [
      {
        ...KIDS_GIFT_OFFER,
        accessMode: 'lifetime',
        accessDurationValue: null,
        accessDurationUnit: null,
      },
    ]
    gateway.ensureBuyerResult = { status: 200, body: { userId: 'u-1', created: false } }
    expect(await service.execute(input)).toMatchObject({ kind: 'completed', expiresAt: null })
    const email = gateway.callsOf('sendEmail')[0]!.input as SendEmailInput
    expect(email.templateKey).toBe('referrals-scholarship-existing-mural-trial')
    expect(email.variables.indicador).toBe('Vó')
    expect(email.variables.prazo).toBe('sem prazo para terminar')
  })

  test('Catálogo fora do ar ou oferta padrão ausente bloqueia antes da conta', async () => {
    catalog.fail = true
    expect((await service.execute(input)).kind).toBe('upstream_error')
    catalog.fail = false
    catalog.offers = []
    expect((await service.execute(input)).kind).toBe('gift_unavailable')
    expect(repo.redemptions).toHaveLength(0)
    expect(gateway.callsOf('ensureBuyer')).toHaveLength(0)
  })

  test('curso para pais: conta existente vai direto à página do curso na área dos pais', async () => {
    gateway.availabilityResult = {
      status: 200,
      body: { available: true, title: 'Transformando o vilão em aliado', learner: 'parents' },
    }
    gateway.ensureBuyerResult = { status: 200, body: { userId: 'u-1', created: false } }
    expect((await service.execute(input)).kind).toBe('completed')
    const email = gateway.callsOf('sendEmail')[0]!.input as SendEmailInput
    expect(email.variables.curso).toBe('Transformando o vilão em aliado')
    expect(email.variables.link).toBe('https://kids.sistemazero.com.br/pais/cursos/cade-todo-mundo')
    // Curso para pais: nada de perfil nem aparelho da criança.
    expect(email.variables.orientacao).toBe(
      'Entre na área dos pais e abra o curso em Cursos para pais. O curso é para você assistir na sua conta, sem perfil de criança.',
    )
  })

  test('curso para pais não ocupa a vaga do presente: o mesmo e-mail resgata os dois', async () => {
    const padrao = gateway.availabilityResult
    gateway.availabilityResult = {
      status: 200,
      body: { available: true, title: 'Transformando o vilão em aliado', learner: 'parents' },
    }
    expect((await service.execute(input)).kind).toBe('completed')
    expect(repo.redemptions.map((r) => r.giftSlot)).toEqual(['parents:cade-todo-mundo'])
    // O mesmo curso para pais de novo: já resgatado.
    expect((await service.execute(input)).kind).toBe('already_redeemed')

    // O presente da criança, com o mesmo e-mail, entra na vaga do público.
    gateway.availabilityResult = padrao
    expect((await service.execute(input)).kind).toBe('completed')
    expect(repo.redemptions.map((r) => r.giftSlot)).toEqual(['parents:cade-todo-mundo', 'main'])
    expect((await service.execute(input)).kind).toBe('already_redeemed')
    expect(repo.redemptions).toHaveLength(2)

    // Catálogo fora: o presente do público concluído continua reconhecido, sem resgate novo.
    catalog.fail = true
    expect((await service.execute(input)).kind).toBe('already_redeemed')
    expect(repo.redemptions).toHaveLength(2)
  })

  test('presente da criança primeiro, curso para pais depois, com o mesmo e-mail', async () => {
    expect((await service.execute(input)).kind).toBe('completed')
    gateway.availabilityResult = {
      status: 200,
      body: { available: true, title: 'Transformando o vilão em aliado', learner: 'parents' },
    }
    expect((await service.execute(input)).kind).toBe('completed')
    expect(repo.redemptions.map((r) => r.giftSlot)).toEqual(['main', 'parents:cade-todo-mundo'])
    // O convite do embaixador olha só a vaga do presente do público.
    expect((await repo.findRedemptionByEmail('paula@example.com', 'kids'))?.giftSlot).toBe('main')
  })

  test('resgate ANTIGO (trial) em andamento segue o caminho antigo: curso + Mural', async () => {
    const redemption = await seedLegacyTrial()
    expect(await service.execute(input)).toMatchObject({ kind: 'completed', muralAccess: 'trial' })
    expect(gateway.callsOf('grantManualOffer')).toHaveLength(0)
    const grant = gateway.callsOf('grantManualCourse')[0]!.input as GrantManualCourseInput
    expect(grant.courseRef).toBe('cade-todo-mundo')
    expect(grant.expiresAt).toBe(
      new Date(redemption.createdAt.getTime() + 7 * DAY_MS).toISOString(),
    )
    expect(grant.deliveryId).toBe(`scholarship:course:cade-todo-mundo:${redemption.id}`)
    expect(gateway.callsOf('grantMuralTrial')[0]?.input).toEqual({
      userId: redemption.userId,
      sourceId: `scholarship:${redemption.id}`,
      deliveryId: `scholarship:mural-trial:${redemption.id}`,
      courseRef: 'cade-todo-mundo',
      expiresAt: grant.expiresAt,
    })
    const email = gateway.callsOf('sendEmail')[0]!.input as SendEmailInput
    expect(email.templateKey).toBe('referrals-scholarship-welcome-mural-trial')
    expect(email.variables.curso).toBe('Cadê Todo Mundo?')
    expect(email.variables.prazo).toStartWith('por 7 dias, até ')
  })

  test('conta PRÉ-EXISTENTE: sem token, aviso da política do resgate', async () => {
    gateway.ensureBuyerResult = { status: 200, body: { userId: 'u-1', created: false } }
    const result = await service.execute(input)
    expect(result.kind).toBe('completed')
    expect(gateway.callsOf('createPasswordToken')).toHaveLength(0)
    const email = gateway.callsOf('sendEmail')[0]!.input as SendEmailInput
    expect(email.templateKey).toBe('referrals-scholarship-existing-mural-trial')
    expect(email.variables.link).toContain('/login/responsavel')
    // Conta que já existia: o aparelho autorizado antes continua valendo.
    expect(email.variables.orientacao).toContain('“Autorizar aparelho”')
    expect(email.variables.orientacao).toEndWith(
      'Se você já autorizou o computador do seu filho, não precisa refazer: ele continua entrando pelo próprio perfil até o prazo que você escolheu terminar.',
    )
  })

  test('resgate da política visitante conserva sua entrega e seu e-mail', async () => {
    const { redemption } = await repo.insertRedemption({
      audience: 'kids',
      codeId: repo.codes[0]!.id,
      email: 'paula@example.com',
      name: 'Paula Prado',
      phone: null,
    })
    redemption.muralVisitorPolicy = 'visitor'
    expect(await service.execute(input)).toMatchObject({
      kind: 'completed',
      muralAccess: 'visitor',
    })
    expect(gateway.callsOf('grantMuralVisitor')).toHaveLength(1)
    expect(gateway.callsOf('grantMuralTrial')).toHaveLength(0)
    expect((gateway.callsOf('sendEmail')[0]!.input as SendEmailInput).templateKey).toBe(
      'referrals-scholarship-welcome-7d-mural',
    )
  })

  test('resgate histórico conserva concessão sem vencimento', async () => {
    const { redemption } = await repo.insertRedemption({
      audience: 'kids',
      codeId: repo.codes[0]!.id,
      email: 'paula@example.com',
      name: 'Paula Prado',
      phone: null,
    })
    redemption.accessDurationDays = null
    redemption.muralVisitorPolicy = null

    expect(await service.execute(input)).toMatchObject({ kind: 'completed', muralAccess: 'none' })
    const grant = gateway.callsOf('grantManualCourse')[0]!.input as GrantManualCourseInput
    expect(grant.expiresAt).toBeNull()
    expect(gateway.callsOf('grantMuralTrial')).toHaveLength(0)
    const email = gateway.callsOf('sendEmail')[0]!.input as SendEmailInput
    expect(email.templateKey).toBe('referrals-scholarship-welcome')
  })

  test('conta histórica pré-existente recebe orientação de acesso infantil', async () => {
    const { redemption } = await repo.insertRedemption({
      audience: 'kids',
      codeId: repo.codes[0]!.id,
      email: 'paula@example.com',
      name: 'Paula Prado',
      phone: null,
    })
    redemption.accessDurationDays = null
    redemption.muralVisitorPolicy = null
    gateway.ensureBuyerResult = { status: 200, body: { userId: 'u-1', created: false } }

    expect((await service.execute(input)).kind).toBe('completed')
    const email = gateway.callsOf('sendEmail')[0]!.input as SendEmailInput
    expect(email.templateKey).toBe('kids-new-access')
    expect(email.variables.link).toBe('https://kids.sistemazero.com.br/login/responsavel')
    expect(gateway.callsOf('grantMuralTrial')).toHaveLength(0)
  })

  describe('Messaging ainda sem kids-new-access (publicação fora de ordem)', () => {
    async function historicExistingAccount() {
      const { redemption } = await repo.insertRedemption({
        audience: 'kids',
        codeId: repo.codes[0]!.id,
        email: 'paula@example.com',
        name: 'Paula Prado',
        phone: null,
      })
      redemption.accessDurationDays = null
      redemption.muralVisitorPolicy = null
      gateway.ensureBuyerResult = { status: 200, body: { userId: 'u-1', created: false } }
    }

    /** O Messaging responde `code` para as chaves `kids-*` e aceita as demais. */
    function messagingWithout(code: string) {
      const record = gateway.sendEmail.bind(gateway)
      gateway.sendEmail = async (email, idempotencyKey) => {
        const accepted = await record(email, idempotencyKey)
        if (!email.templateKey.startsWith('kids-')) return accepted
        return { status: 404, body: { error: { code, message: 'não encontrado' } } }
      }
    }

    test('cai em new-access com o mesmo link e a mesma Idempotency-Key', async () => {
      await historicExistingAccount()
      messagingWithout('TEMPLATE_NOT_FOUND')

      const result = await service.execute(input)
      expect(result.kind).toBe('completed')
      if (result.kind === 'completed') expect(result.emailStatus).toBe('accepted')
      const sends = gateway.callsOf('sendEmail')
      expect(sends.map((call) => (call.input as SendEmailInput).templateKey)).toEqual([
        'kids-new-access',
        'new-access',
      ])
      expect((sends[1]!.input as SendEmailInput).variables).toEqual(
        (sends[0]!.input as SendEmailInput).variables,
      )
      expect(sends[1]!.idempotencyKey).toBe(sends[0]!.idempotencyKey)
      expect(repo.redemptions[0]!.welcomeAcceptedAt).not.toBeNull()
    })

    test('404 que não é TEMPLATE_NOT_FOUND não troca a chave e libera a retomada', async () => {
      await historicExistingAccount()
      messagingWithout('NOT_FOUND')

      const result = await service.execute(input)
      if (result.kind === 'completed') expect(result.emailStatus).toBe('failed')
      expect(gateway.callsOf('sendEmail')).toHaveLength(1)
      expect(repo.redemptions[0]!.welcomeSentAt).toBeNull()
    })
  })

  test('resgate anterior à visita não recebe Mural mesmo com curso de sete dias', async () => {
    const { redemption } = await repo.insertRedemption({
      audience: 'kids',
      codeId: repo.codes[0]!.id,
      email: 'paula@example.com',
      name: 'Paula Prado',
      phone: null,
    })
    redemption.muralVisitorPolicy = null

    expect((await service.execute(input)).kind).toBe('completed')
    expect(gateway.callsOf('grantMuralTrial')).toHaveLength(0)
    expect(gateway.callsOf('grantManualCourse')).toHaveLength(1)
    const email = gateway.callsOf('sendEmail')[0]!.input as SendEmailInput
    expect(email.templateKey).toBe('referrals-scholarship-welcome-7d')
  })

  test('retomada do grant não reinicia o prazo: o members conta do resgate', async () => {
    gateway.grantResult = { status: 502, body: {} }
    expect((await service.execute(input)).kind).toBe('upstream_error')
    const redemption = repo.redemptions[0]!
    redemption.createdAt = new Date(Date.now() - 24 * 60 * 60 * 1000)
    gateway.grantResult = { status: 200, body: { ok: true } }

    const result = await service.execute(input)
    expect(result).toMatchObject({
      kind: 'completed',
      expiresAt: new Date(redemption.createdAt.getTime() + 7 * DAY_MS).toISOString(),
    })
    const grant = gateway.callsOf('grantManualOffer')[1]!.input as GrantManualOfferInput
    expect(grant.anchorAt).toBe(redemption.createdAt.toISOString())
  })

  test.each([
    { status: 202, body: { ok: true } },
    { status: 204, body: null },
    { status: 200, body: { ok: true, granted: 1 } },
  ])('resposta incompleta do Mural não confirma o resgate: %j', async (result) => {
    await seedLegacyTrial()
    gateway.muralTrialResult = result
    expect((await service.execute(input)).kind).toBe('upstream_error')
    expect(repo.redemptions[0]?.muralVisitorGrantedAt).toBeNull()
    expect(gateway.callsOf('sendEmail')).toHaveLength(0)
  })

  test('falha no Mural não confirma o presente; retry concede só a etapa faltante', async () => {
    await seedLegacyTrial()
    gateway.muralTrialResult = { status: 502, body: {} }
    expect((await service.execute(input)).kind).toBe('upstream_error')
    const redemption = repo.redemptions[0]!
    expect(redemption.grantedAt).not.toBeNull()
    expect(redemption.muralVisitorGrantedAt).toBeNull()
    expect(redemption.status).toBe('pending')
    expect(gateway.callsOf('sendEmail')).toHaveLength(0)

    gateway.muralTrialResult = { status: 200, body: { ok: true, granted: 2 } }
    expect((await service.execute(input)).kind).toBe('completed')
    expect(gateway.callsOf('grantManualCourse')).toHaveLength(1)
    expect(gateway.callsOf('grantMuralTrial')).toHaveLength(2)
    expect(gateway.callsOf('grantMuralTrial')[1]?.input).toEqual(
      gateway.callsOf('grantMuralTrial')[0]?.input,
    )
    expect(redemption.muralVisitorGrantedAt).not.toBeNull()
  })

  test('reentrega já confirmada do Mural conclui o resgate', async () => {
    await seedLegacyTrial()
    gateway.muralTrialResult = { status: 200, body: { ok: true, deduped: true } }
    expect(await service.execute(input)).toMatchObject({ kind: 'completed', muralAccess: 'trial' })
    expect(repo.redemptions[0]?.muralVisitorGrantedAt).not.toBeNull()
    expect(gateway.callsOf('sendEmail')).toHaveLength(1)
  })

  test('conflito no grant do Mural temporário fica diagnosticável e não envia e-mail', async () => {
    await seedLegacyTrial()
    gateway.muralTrialResult = { status: 409, body: {} }
    expect(await service.execute(input)).toEqual({
      kind: 'failed',
      reason: 'mural_grant_conflict',
    })
    expect(repo.redemptions[0]?.grantedAt).not.toBeNull()
    expect(repo.redemptions[0]?.failedReason).toBe('mural_grant_conflict')
    expect(gateway.callsOf('sendEmail')).toHaveLength(0)
  })

  test('retomada depois do vencimento não concede curso nem envia boas-vindas', async () => {
    gateway.grantResult = { status: 502, body: {} }
    expect((await service.execute(input)).kind).toBe('upstream_error')
    repo.redemptions[0]!.createdAt = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)
    gateway.grantResult = { status: 200, body: { ok: true } }

    const result = await service.execute(input)
    expect(result).toEqual({ kind: 'failed', reason: 'gift_window_elapsed' })
    expect(repo.redemptions[0]!.failedReason).toBe('gift_window_elapsed')
    expect(gateway.callsOf('grantManualOffer')).toHaveLength(1)
    expect(gateway.callsOf('sendEmail')).toHaveLength(0)
  })

  test('grant que responde no instante do vencimento não anuncia acesso utilizável', async () => {
    const { redemption } = await repo.insertRedemption({
      audience: 'kids',
      codeId: repo.codes[0]!.id,
      email: 'paula@example.com',
      name: 'Paula Prado',
      phone: null,
    })
    redemption.createdAt = new Date('2026-01-01T00:00:00.000Z')
    const expiration = new Date(redemption.createdAt.getTime() + 7 * 24 * 60 * 60 * 1000)
    let now = new Date(expiration.getTime() - 1)
    service = new RedeemScholarshipService(repo, gateway, OPTS, silentLogger, () => now)
    const grant = gateway.grantManualCourse.bind(gateway)
    gateway.grantManualCourse = async (request) => {
      const result = await grant(request)
      now = expiration
      return result
    }

    expect(await service.execute(input)).toEqual({ kind: 'failed', reason: 'gift_window_elapsed' })
    expect(gateway.callsOf('sendEmail')).toHaveLength(0)
  })

  test('mesmo e-mail de novo → already_redeemed (1 bolsa global)', async () => {
    await service.execute(input)
    const again = await service.execute({ ...input, code: 'cida-x7k2', name: 'Outro Nome' })
    expect(again.kind).toBe('already_redeemed')
    expect(repo.redemptions).toHaveLength(1)
  })

  test('código inexistente ou desativado → code_not_found (uniforme)', async () => {
    expect((await service.execute({ ...input, code: 'nao-existe' })).kind).toBe('code_not_found')
    await repo.setAmbassadorCodeStatus(repo.ambassadors[0]!.id, 'disabled')
    expect((await service.execute(input)).kind).toBe('code_not_found')
  })

  test('grant 5xx → upstream_error; RETOMADA não repete o ensure-buyer', async () => {
    gateway.grantResult = { status: 502, body: {} }
    const first = await service.execute(input)
    expect(first.kind).toBe('upstream_error')
    const r = repo.redemptions[0]!
    expect(r.userId).not.toBeNull() // etapa 1 concluída
    expect(r.grantedAt).toBeNull()
    expect(r.status).toBe('pending')

    gateway.grantResult = { status: 200, body: { ok: true } }
    const second = await service.execute(input)
    expect(second.kind).toBe('completed')
    expect(gateway.callsOf('ensureBuyer')).toHaveLength(1) // não repetiu
    expect(gateway.callsOf('grantManualOffer')).toHaveLength(2)
  })

  test('grant 409 → failed grant_conflict (terminal, sem e-mail)', async () => {
    gateway.grantResult = { status: 409, body: {} }
    const result = await service.execute(input)
    expect(result.kind).toBe('failed')
    const r = repo.redemptions[0]!
    expect(r.status).toBe('failed')
    expect(r.failedReason).toBe('grant_conflict')
    expect(gateway.callsOf('sendEmail')).toHaveLength(0)
  })

  test('falha na emissão do token → claim do welcome LIBERADO (retomável)', async () => {
    gateway.passwordTokenResult = { status: 503, body: {} }
    const result = await service.execute(input)
    expect(result.kind).toBe('completed') // acesso é o produto; e-mail é best-effort
    const r = repo.redemptions[0]!
    expect(r.welcomeSentAt).toBeNull() // liberado — nada foi emitido
    expect(gateway.callsOf('sendEmail')).toHaveLength(0)
  })

  test('falha SÓ no envio pós-token → claim FICA (nunca reemitir o token)', async () => {
    gateway.sendEmailResult = { status: 502, body: {} }
    const result = await service.execute(input)
    expect(result.kind).toBe('completed')
    expect(repo.redemptions[0]!.welcomeSentAt).not.toBeNull()
  })

  test('Messaging RECUSA o envio (4xx) → claim liberado e a re-submissão manda o link', async () => {
    // Nada foi enfileirado: o token emitido nunca chegou à família.
    gateway.sendEmailResult = {
      status: 404,
      body: { error: { code: 'TEMPLATE_NOT_FOUND', message: 'não encontrado' } },
    }
    const first = await service.execute(input)
    expect(first.kind).toBe('completed')
    if (first.kind === 'completed') expect(first.emailStatus).toBe('failed')
    expect(repo.redemptions[0]!.welcomeSentAt).toBeNull()

    gateway.sendEmailResult = { status: 202, body: {} }
    gateway.passwordTokenResult = {
      status: 201,
      body: { token: 'tok-novo', expiresAt: new Date(Date.now() + 86_400_000).toISOString() },
    }
    expect((await service.execute(input)).kind).toBe('already_redeemed')
    const sends = gateway.callsOf('sendEmail')
    expect(sends).toHaveLength(2)
    expect((sends[1]!.input as SendEmailInput).variables.link).toContain('token=tok-novo')
    expect(sends[1]!.idempotencyKey).toBe(sends[0]!.idempotencyKey)
    expect(repo.redemptions[0]!.welcomeSentAt).not.toBeNull()
    expect(repo.redemptions[0]!.welcomeAcceptedAt).not.toBeNull()
  })

  test('completed SEM welcome → re-submissão RETOMA só o e-mail (409 + envio)', async () => {
    // Crash entre o grant e o welcome: token falhou → claim liberado, completed.
    gateway.passwordTokenResult = { status: 503, body: {} }
    await service.execute(input)
    expect(repo.redemptions[0]!.welcomeSentAt).toBeNull()

    gateway.passwordTokenResult = {
      status: 201,
      body: { token: 'tok-novo', expiresAt: new Date(Date.now() + 86_400_000).toISOString() },
    }
    const again = await service.execute(input)
    expect(again.kind).toBe('already_redeemed') // UX: a bolsa JÁ é dela
    const r = repo.redemptions[0]!
    expect(r.welcomeSentAt).not.toBeNull() // ...mas o welcome saiu agora
    expect(gateway.callsOf('sendEmail')).toHaveLength(1)
    expect(gateway.callsOf('grantManualOffer')).toHaveLength(1) // grant NÃO repetiu
  })

  test('welcome atrasado não anuncia acesso depois de vencido', async () => {
    gateway.passwordTokenResult = { status: 503, body: {} }
    expect((await service.execute(input)).kind).toBe('completed')
    const redemption = repo.redemptions[0]!
    expect(redemption.welcomeSentAt).toBeNull()
    redemption.createdAt = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)
    gateway.passwordTokenResult = { status: 201, body: { token: 'tok-novo' } }

    expect((await service.execute(input)).kind).toBe('already_redeemed')
    expect(gateway.callsOf('sendEmail')).toHaveLength(0)
  })

  test('curso despublicado entre consulta e grant → sem e-mail, lastError gravado', async () => {
    gateway.grantResult = { status: 503, body: { ok: false, error: 'COURSE_UNAVAILABLE' } }
    const result = await service.execute(input)
    expect(result.kind).toBe('gift_unavailable')
    const r = repo.redemptions[0]!
    expect(r.status).toBe('pending') // segue retryável
    expect(r.lastError).toBe('grant:503:COURSE_UNAVAILABLE')
    expect(gateway.callsOf('sendEmail')).toHaveLength(0)
  })

  test('curso não publicado bloqueia antes de criar conta ou claim', async () => {
    gateway.availabilityResult = { status: 200, body: { available: false } }
    expect((await service.execute(input)).kind).toBe('gift_unavailable')
    expect(repo.redemptions).toHaveLength(0)
    expect(gateway.callsOf('ensureBuyer')).toHaveLength(0)
    expect(gateway.callsOf('grantManualOffer')).toHaveLength(0)
  })

  test('falha ao consultar disponibilidade também bloqueia sem criar conta', async () => {
    gateway.availabilityResult = { status: 502, body: { error: 'UPSTREAM' } }
    expect((await service.execute(input)).kind).toBe('upstream_error')
    expect(repo.redemptions).toHaveLength(0)
    expect(gateway.callsOf('ensureBuyer')).toHaveLength(0)
  })

  test('resgate concluído continua reconhecido mesmo se o curso for despublicado depois', async () => {
    expect((await service.execute(input)).kind).toBe('completed')
    gateway.availabilityResult = { status: 200, body: { available: false } }
    expect((await service.execute(input)).kind).toBe('already_redeemed')
    expect(repo.redemptions).toHaveLength(1)
  })

  test('lease em posse de outra execução → processing (202)', async () => {
    await repo.insertRedemption({
      audience: 'kids',
      codeId: repo.codes[0]!.id,
      email: 'paula@example.com',
      name: 'Paula Prado',
      phone: null,
    })
    const now = new Date()
    await repo.acquireRedemptionLease(
      repo.redemptions[0]!.id,
      new Date(now.getTime() + 60_000),
      now,
    )
    const result = await service.execute(input)
    expect(result.kind).toBe('processing')
  })

  test('ensure-buyer indisponível → upstream_error e nada persiste de etapa', async () => {
    gateway.ensureBuyerResult = { status: 502, body: {} }
    const result = await service.execute(input)
    expect(result.kind).toBe('upstream_error')
    expect(repo.redemptions[0]!.userId).toBeNull()
  })
})
