/**
 * Porta do lembrete de publicação manual (WhatsApp via messaging, atrás do
 * gateway com HMAC). O worker chama uma vez POR TELEFONE; a idempotência fica
 * na chave determinística `marketing-reminder-<publicationId>-<fone>` — o
 * messaging deduplica por consumer+chave, então retry pós-crash nunca duplica.
 */
export interface PublicationReminder {
  publicationId: string
  /** E.164 com DDI (ex.: 5511999999999). */
  phone: string
  recipientName: string
  /** Variáveis do template `marketing-reminder` (titulo/formato/horario/link). */
  variables: Record<string, string>
}

/** Erro de envio: `permanent` (template inexistente/payload inválido) não vale retry. */
export class ReminderSendError extends Error {
  constructor(
    message: string,
    readonly permanent: boolean,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = 'ReminderSendError'
  }
}

export interface ReminderNotifier {
  send(input: PublicationReminder): Promise<void>
}
