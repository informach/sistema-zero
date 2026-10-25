export type RecoveryMessageStatus =
  | 'QUEUED'
  | 'SCHEDULED'
  | 'SENDING'
  | 'SENT'
  | 'DELIVERED'
  | 'READ'
  | 'FAILED'
  | 'SUPPRESSED'
export interface RecoveryMessageReceipt {
  id: string
  status: RecoveryMessageStatus
  acceptedAt: Date
  deliveredAt: Date | null
}
export interface RecoveryMessageRequest {
  idempotencyKey: string
  channel: 'email' | 'whatsapp'
  templateKey: string
  recipient: { name: string; email?: string; phone?: string }
  variables: Record<string, string>
}
export interface RecoveryMessagingGateway {
  send(request: RecoveryMessageRequest): Promise<RecoveryMessageReceipt>
  get(id: string): Promise<RecoveryMessageReceipt>
  suppress(id: string): Promise<{ suppressed: boolean; receipt: RecoveryMessageReceipt }>
  /** Closes the original idempotent intent even if enqueue's response was lost. */
  suppressIntent(
    request: RecoveryMessageRequest,
  ): Promise<{ suppressed: boolean; receipt: RecoveryMessageReceipt }>
}
