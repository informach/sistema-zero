export interface TeacherRecipient {
  profileId: string
  accountId: string
  name: string
  accountName: string
  accountEmail: string
}

export type TeacherAudience =
  | { kind: 'student'; profileId: string }
  | { kind: 'course'; courseId: string }
  | { kind: 'kids' }

export interface TeacherRecipientDirectory {
  list(input: { q?: string; offset: number; limit: number }): Promise<{
    items: TeacherRecipient[]
    total: number
  }>
}

export interface TeacherBroadcast {
  id: string
  authorId: string
  authorName: string
  audience: TeacherAudience
  title: string
  body: string
  createdAt: Date
  sentAt: Date | null
  recipients: number
  delivered: number
  failed: number
  read: number
}

export interface TeacherDelivery extends TeacherRecipient {
  status: 'pending' | 'delivered' | 'failed'
  threadId: string
  read: boolean
}

export interface TeacherBroadcastRepository {
  create(
    input: Omit<TeacherBroadcast, 'sentAt' | 'recipients' | 'delivered' | 'failed' | 'read'>,
    recipients: TeacherRecipient[],
  ): Promise<void>
  find(id: string): Promise<TeacherBroadcast | null>
  list(): Promise<TeacherBroadcast[]>
  recipients(id: string, offset: number, limit: number): Promise<TeacherDelivery[]>
  confirm(id: string, authorId: string, now: Date): Promise<boolean>
  retry(id: string): Promise<void>
  /** Cada entrega, mensagem e conversa são gravadas na mesma transação. */
  deliverBatch(now: Date, limit: number): Promise<number>
}
