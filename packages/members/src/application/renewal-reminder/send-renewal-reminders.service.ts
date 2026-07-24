import type { Logger } from '@sistemazero/core/logging'
import type { AuthGateway } from '../../domain/ports/auth-gateway.port'
import type { MessagingGateway } from '../../domain/ports/messaging-gateway.port'
import {
  type ExpiringTermEntitlement,
  expiresOnKey,
  type RenewalReminderRepository,
} from '../../domain/ports/renewal-reminder-repository.port'

export interface RenewalReminderOptions {
  /** Janela: lembra quando faltam ≤ N dias p/ o vencimento (default 7). */
  daysBefore: number
  /** Teto de compras processadas por CICLO (o próximo continua o resto). */
  batchLimit?: number
  /** URL pública do FUNIL (base do link `/renovar?oferta=<slug>`). */
  funnelUrl: string
}

const DEFAULT_BATCH_LIMIT = 200

/** `DD/MM/AAAA` a partir do vencimento (data UTC — a carência absorve o fuso). */
function ddmmyyyy(expiresAt: Date): string {
  const key = expiresOnKey(expiresAt)
  return `${key.slice(8, 10)}/${key.slice(5, 7)}/${key.slice(0, 4)}`
}

/**
 * LEMBRETE DE RENOVAÇÃO do plano anual à vista (Pix/boleto): matrícula por
 * período vencendo em ≤ N dias → e-mail com o link `/renovar?oferta=<slug>` do
 * funil (renovar = nova compra = nova matrícula; ver grant do members).
 * Assinaturas recorrentes NÃO recebem (a Efí renova sozinha).
 *
 * Uma compra concede N matrículas (oferta com bônus) com o MESMO vencimento —
 * o ciclo agrupa por (usuário, oferta, vencimento) e envia UM e-mail por grupo,
 * marcando todas. Crash-safety: marca APÓS enviar; o dedupe do messaging
 * (idempotencyKey `renewal-reminder:<entitlementId>:<expiresOn>`) absorve o retry.
 */
export class SendRenewalRemindersService {
  constructor(
    private readonly reminders: RenewalReminderRepository,
    private readonly auth: AuthGateway,
    private readonly messaging: MessagingGateway,
    private readonly clock: () => Date,
    private readonly logger: Logger,
    private readonly opts: RenewalReminderOptions,
  ) {}

  async runCycle(): Promise<{ sent: number; skipped: number; failed: number }> {
    const now = this.clock()
    const to = new Date(now.getTime() + this.opts.daysBefore * 86_400_000)
    const rows = await this.reminders.listExpiringTermEntitlements(
      now,
      to,
      this.opts.batchLimit ?? DEFAULT_BATCH_LIMIT,
    )
    if (rows.length === 0) return { sent: 0, skipped: 0, failed: 0 }

    // Agrupa por (usuário, oferta, vencimento): 1 e-mail por COMPRA, não por item.
    const groups = new Map<string, ExpiringTermEntitlement[]>()
    for (const row of rows) {
      const key = `${row.userId}|${row.offerSlug ?? ''}|${expiresOnKey(row.expiresAt)}`
      const list = groups.get(key)
      if (list) list.push(row)
      else groups.set(key, [row])
    }

    let sent = 0
    let skipped = 0
    let failed = 0

    for (const group of groups.values()) {
      const first = group[0]
      if (!first) continue
      const expiresOn = expiresOnKey(first.expiresAt)
      try {
        const [identity] = await this.auth.getAccountIdentities([first.userId])
        // Conta sem e-mail (excluída/anonimizada) → marca e segue (nunca entrega).
        if (!identity) {
          for (const e of group) await this.reminders.markReminded(e.id, expiresOn, this.clock())
          skipped++
          continue
        }

        const nome = identity.firstName || 'Aluno(a)'
        const produto = first.productName ?? 'seu plano'
        const oferta = first.offerSlug
        const link = oferta
          ? `${this.opts.funnelUrl}/renovar?oferta=${encodeURIComponent(oferta)}`
          : `${this.opts.funnelUrl}/renovar`

        await this.messaging.sendEmail({
          templateKey: 'renewal-reminder',
          recipient: { name: nome, email: identity.email },
          variables: { nome, produto, data: ddmmyyyy(first.expiresAt), link },
          idempotencyKey: `renewal-reminder:${first.id}:${expiresOn}`,
        })
        // Mark-AFTER-send (crash-safety) — todas as matrículas do grupo.
        for (const e of group) await this.reminders.markReminded(e.id, expiresOn, this.clock())
        sent++
      } catch (error) {
        failed++
        this.logger.warn('renewal_reminder.group_failed', {
          entitlementId: first.id,
          expiresOn,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    if (sent > 0 || failed > 0) {
      this.logger.info('renewal_reminder.cycle', { sent, skipped, failed })
    }
    return { sent, skipped, failed }
  }
}
