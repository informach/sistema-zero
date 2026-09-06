import type { Logger } from '@sistemazero/core/logging'
import { ambassadorPageUrl } from '../../domain/links'
import { formatBrl } from '../../domain/money'
import { splitName } from '../../domain/names'
import type { ReferralsGateway } from '../../domain/ports/gateway.port'
import type {
  ConversionToNotify,
  ReferralRepository,
} from '../../domain/ports/referral-repository.port'

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
      try {
        if (await this.notifyOne(item)) sent++
      } catch (error) {
        // Um item podre não pode abortar o lote (nem a poda que vem depois).
        this.logger.error('referrals.bonus_notify_item_failed', {
          conversionId: item.id,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }
    return sent
  }

  private async notifyOne(item: ConversionToNotify): Promise<boolean> {
    {
      if (!item.ambassadorId) {
        // Sem embaixador (código de conta, fase futura) não há quem avisar —
        // marca notificado p/ não re-varrer para sempre.
        await this.repo.markConversionNotified(item.id, this.now())
        return false
      }
      // ⚠️ Relê o embaixador AGORA: entre listar e enviar o admin pode ter
      // desativado (ou rotacionado o token) e o mark-after-send tornaria
      // permanente um e-mail com link morto.
      const fresh = await this.repo.findAmbassadorById(item.ambassadorId)
      if (fresh?.status !== 'active') {
        this.logger.info('referrals.bonus_notify_skipped_inactive', { conversionId: item.id })
        return false
      }
      // O fallback vira NOME no assunto ("Boa notícia, {{nome}}") — nunca uma
      // interjeição solta como "Olá".
      const firstName = splitName(fresh.name).firstName || 'embaixador(a)'
      const res = await this.gateway.sendEmail(
        {
          templateKey: 'referrals-bonus-eligible',
          recipient: { name: firstName, email: fresh.email },
          variables: {
            nome: firstName,
            valor: formatBrl(item.bonusCents),
            link: ambassadorPageUrl(this.opts.funnelPublicUrl, fresh.pageToken),
          },
        },
        `bonus-eligible:${item.id}`,
      )
      if (res.status === 202 || res.status === 200) {
        await this.repo.markConversionNotified(item.id, this.now())
        return true
      }
      // ⚠️ 4xx é PERMANENTE (template ausente, destinatário suprimido, variável
      // faltando): re-tentar a cada ciclo nunca resolve e a linha ocuparia
      // vaga fixa no lote, bloqueando os avisos novos (head-of-line). Marca
      // como notificada e ALERTA (ERROR = Sentry) — o humano decide o reenvio.
      const permanent = res.status >= 400 && res.status < 500
      if (permanent) {
        await this.repo.markConversionNotified(item.id, this.now())
        this.logger.error('referrals.bonus_notify_permanent_failure', {
          conversionId: item.id,
          status: res.status,
        })
        return false
      }
      this.logger.warn('referrals.bonus_notify_failed', {
        conversionId: item.id,
        status: res.status,
      })
      return false
    }
  }
}
