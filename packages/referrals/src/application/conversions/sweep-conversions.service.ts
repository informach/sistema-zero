import type { Logger } from '@sistemazero/core/logging'
import { ambassadorPageUrl } from '../../domain/links'
import { formatBrl } from '../../domain/money'
import { splitName } from '../../domain/names'
import type { ReferralsGateway } from '../../domain/ports/gateway.port'
import type { ReferralRepository } from '../../domain/ports/referral-repository.port'

export interface SweepOptions {
  funnelPublicUrl: string
  batchSize: number
}

/**
 * Ciclo periódico das conversões, em DUAS etapas independentes e retomáveis:
 * 1) `pending → eligible` quando a garantia venceu (só banco — roda sob o
 *    advisory lock do composition-root);
 * 2) avisa o embaixador por e-mail (`referrals-bonus-eligible`) com
 *    mark-after-send em `notified_at` — roda FORA de transação (S2S nunca
 *    dentro de tx) e é idempotente pela Idempotency-Key do messaging, então um
 *    duplo envio entre réplicas é inócuo.
 */
export class SweepConversionsService {
  constructor(
    private readonly repo: ReferralRepository,
    private readonly gateway: ReferralsGateway,
    private readonly opts: SweepOptions,
    private readonly logger: Logger,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /** Etapa 1 (só banco): promove as maduras. Devolve o nº promovido. */
  async mature(): Promise<number> {
    return this.repo.matureConversions(this.now(), this.opts.batchSize)
  }

  /** Etapa 2 (S2S): avisa elegíveis ainda não notificadas. */
  async notify(): Promise<number> {
    const pending = await this.repo.listConversionsToNotify(this.opts.batchSize)
    let sent = 0
    for (const item of pending) {
      if (!item.ambassadorEmail || !item.ambassadorPageToken) {
        // Sem embaixador (código de conta, fase futura) não há quem avisar —
        // marca notificado p/ não re-varrer para sempre.
        await this.repo.markConversionNotified(item.id, this.now())
        continue
      }
      // O fallback vira NOME no assunto ("Boa notícia, {{nome}}") — nunca uma
      // interjeição solta como "Olá".
      const firstName = splitName(item.ambassadorName ?? '').firstName || 'embaixador(a)'
      const res = await this.gateway.sendEmail(
        {
          templateKey: 'referrals-bonus-eligible',
          recipient: { name: firstName, email: item.ambassadorEmail },
          variables: {
            nome: firstName,
            valor: formatBrl(item.bonusCents),
            link: ambassadorPageUrl(this.opts.funnelPublicUrl, item.ambassadorPageToken),
          },
        },
        `bonus-eligible:${item.id}`,
      )
      if (res.status === 202 || res.status === 200) {
        await this.repo.markConversionNotified(item.id, this.now())
        sent++
      } else {
        this.logger.warn('referrals.bonus_notify_failed', {
          conversionId: item.id,
          status: res.status,
        })
      }
    }
    return sent
  }
}
