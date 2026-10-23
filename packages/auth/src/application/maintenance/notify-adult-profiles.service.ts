import type { Logger } from '@sistemazero/core/logging'
import type { MessagingClient } from '../../domain/ports/messaging-client.port'
import type { ProfileAdultNoticeRepository } from '../../domain/ports/profile-adult-notice-repository.port'
import {
  ADULT_NOTICE_LOOKBACK_DAYS,
  adultBirthday,
  adultNoticeBirthDateRange,
  adultNoticeToday,
  isAdultNoticeDue,
} from '../../domain/profile/adult-notice'

export const PROFILE_TURNED_18_TEMPLATE = 'profile-turned-18'

/**
 * Oferta de continuidade da área adulta (página pública do funil). O auth não tem env do funil;
 * segue o padrão de constante do `links.ts` do app Kids.
 */
export const ADULT_AREA_URL =
  'https://sistemazero.com.br/pro/comunidade-dos-criadores/oferta/continuar?utm_source=email&utm_medium=email&utm_campaign=perfil-18'

/** Mesmo fallback dos avisos do Members para o responsável sem primeiro nome. */
const GUARDIAN_NAME_FALLBACK = 'Responsável'

const DEFAULT_BATCH_LIMIT = 200

export type AdultNoticeJobState = 'enabled' | 'disabled' | 'messaging-not-configured'

/**
 * O job só roda com o Messaging configurado de verdade. Com o cliente nulo (sem `GATEWAY_URL` +
 * `AUTH_HMAC_SECRET`) o `sendEmail` resolve sem enviar e o ciclo registraria o aviso como dado,
 * e o responsável nunca receberia o e-mail. `disabled`: NODE_ENV=test ou intervalo 0.
 */
export function adultNoticeJobState(input: {
  nodeEnv: string
  intervalMs: number
  messagingConfigured: boolean
}): AdultNoticeJobState {
  if (input.nodeEnv === 'test' || input.intervalMs <= 0) return 'disabled'
  return input.messagingConfigured ? 'enabled' : 'messaging-not-configured'
}

export interface NotifyAdultProfilesOptions {
  lookbackDays?: number
  batchLimit?: number
}

/**
 * Um ciclo do aviso de 18 anos (quem chama segura o advisory lock entre réplicas). Para cada
 * perfil ativo cujo 18º aniversário (dia civil de São Paulo) caiu nos últimos
 * `ADULT_NOTICE_LOOKBACK_DAYS` dias e ainda sem registro: envia `profile-turned-18` ao e-mail
 * da conta dona e registra DEPOIS do envio. Crash entre os dois: o retry reenvia com a MESMA
 * idempotencyKey e o Messaging deduplica. Falha de envio não registra; o próximo ciclo tenta
 * de novo enquanto o aniversário estiver na janela. O perfil NUNCA é alterado.
 */
export class NotifyAdultProfilesService {
  constructor(
    private readonly notices: ProfileAdultNoticeRepository,
    private readonly messaging: MessagingClient,
    private readonly clock: () => Date,
    private readonly logger: Logger,
    private readonly opts: NotifyAdultProfilesOptions = {},
  ) {}

  /** `shouldContinue` falso (shutdown) interrompe antes do próximo envio. */
  async runCycle(
    shouldContinue: () => boolean = () => true,
  ): Promise<{ sent: number; failed: number }> {
    const lookbackDays = this.opts.lookbackDays ?? ADULT_NOTICE_LOOKBACK_DAYS
    const today = adultNoticeToday(this.clock())
    const range = adultNoticeBirthDateRange(today, lookbackDays)
    const candidates = await this.notices.listCandidates({
      birthDateFrom: range.from,
      birthDateTo: range.to,
      limit: this.opts.batchLimit ?? DEFAULT_BATCH_LIMIT,
    })

    let sent = 0
    let failed = 0
    for (const candidate of candidates) {
      if (!shouldContinue()) break
      // Defesa em profundidade: a faixa do SQL já é exata.
      if (!isAdultNoticeDue(candidate.birthDate, today, lookbackDays)) continue
      const turnedAdultOn = adultBirthday(candidate.birthDate)
      if (!turnedAdultOn) continue
      const nome = candidate.guardianFirstName.trim() || GUARDIAN_NAME_FALLBACK
      try {
        await this.messaging.sendEmail({
          templateKey: PROFILE_TURNED_18_TEMPLATE,
          recipient: { name: nome, email: candidate.guardianEmail },
          variables: { nome, nome_perfil: candidate.profileName, link: ADULT_AREA_URL },
          idempotencyKey: `${PROFILE_TURNED_18_TEMPLATE}-${candidate.profileId}`,
        })
        await this.notices.markNotified({
          profileId: candidate.profileId,
          accountUserId: candidate.accountUserId,
          turnedAdultOn,
          notifiedAt: this.clock(),
        })
        sent++
      } catch (error) {
        failed++
        this.logger.error('profile.adult_notice.failed', {
          profileId: candidate.profileId,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }
    if (sent > 0 || failed > 0) this.logger.info('profile.adult_notice.cycle', { sent, failed })
    return { sent, failed }
  }
}
