import type { EmailGateway } from '../../domain/ports/email-gateway.port'
import type { InstanceAlerter } from '../../domain/ports/instance-alert.port'
import type { SenderRepository } from '../../domain/ports/sender-repository.port'
import type { Logger } from '../logging/logger'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Alerta por E-MAIL (via SendGrid, o mesmo gateway do envio) quando uma lane de
 * WhatsApp CAI. Direto pelo gateway (não pela outbox) — é aviso operacional, quer
 * chegar JÁ, não passa pelo ritmo/token-bucket. Usa o remetente DEFAULT como `from`.
 * Tudo é best-effort: sem `alertEmail`, sem remetente, ou erro do provedor →
 * apenas loga (o `SetInstanceConnectionService` já registrou o ERROR → Sentry).
 */
export class EmailInstanceAlerter implements InstanceAlerter {
  constructor(
    private readonly emailGateway: EmailGateway,
    private readonly senders: SenderRepository,
    private readonly logger: Logger,
    private readonly config: { alertEmail?: string },
  ) {}

  async laneDisconnected(input: {
    instanceName: string
    phoneNumber: string
    detail?: string
  }): Promise<void> {
    const to = this.config.alertEmail
    if (!to) return
    try {
      const sender = await this.senders.findDefault()
      if (!sender?.enabled) {
        this.logger.warn('alert.email_skipped_no_sender', { instanceName: input.instanceName })
        return
      }
      const name = escapeHtml(input.instanceName)
      const phone = escapeHtml(input.phoneNumber)
      const detail = input.detail ? ` (${escapeHtml(input.detail)})` : ''
      await this.emailGateway.sendEmail({
        to,
        toName: 'Admin',
        subject: `⚠️ WhatsApp desconectou — instância "${input.instanceName}"`,
        html: [
          `<p>A instância de WhatsApp <strong>${name}</strong> (${phone}) <strong>DESCONECTOU</strong>${detail}.</p>`,
          '<p>Enquanto ela estiver fora, <strong>nenhuma mensagem de WhatsApp é enviada</strong> — elas ficam na fila. Reconecte re-escaneando o QR no Manager da Evolution com o celular do chip.</p>',
          '<p style="color:#888;font-size:12px;">Alerta automático do serviço de mensageria.</p>',
        ].join('\n'),
        from: sender.state.fromEmail,
        fromName: sender.state.fromName,
        replyTo: sender.state.replyTo,
      })
      this.logger.info('alert.email_sent', { instanceName: input.instanceName, to })
    } catch (error) {
      this.logger.error('alert.email_failed', {
        instanceName: input.instanceName,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }
}
