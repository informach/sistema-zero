import { ValidationError } from '@sistemazero/core/errors'

export type ProfileStatus = 'active' | 'archived'

/** Estado serializável do perfil (ida/volta ao banco). */
export interface ProfileSnapshot {
  id: string
  accountUserId: string
  name: string
  avatarUrl: string | null
  whatsapp: string | null
  status: ProfileStatus
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}

export interface CreateProfileInput {
  id: string
  accountUserId: string
  name: string
  avatarUrl?: string | null
  whatsapp?: string | null
  now?: Date
}

/**
 * Perfil (estilo Netflix) de uma conta do responsável. Identidade = `id` (uuid) —
 * é ele que vira o `x-auth-user-id` efetivo na sessão de perfil. `sortOrder` é
 * atribuído pelo repositório (max+1 sob lock); o agregado nasce com 0.
 */
export class ProfileAggregate {
  private constructor(private readonly props: ProfileSnapshot) {}

  static create(input: CreateProfileInput): ProfileAggregate {
    const now = input.now ?? new Date()
    const name = input.name.trim()
    if (name.length === 0) throw new ValidationError('Nome do perfil é obrigatório')
    const avatarUrl = normalizeOptional(input.avatarUrl)
    assertAvatarUrl(avatarUrl)
    return new ProfileAggregate({
      id: input.id,
      accountUserId: input.accountUserId,
      name,
      avatarUrl,
      whatsapp: normalizeOptional(input.whatsapp),
      status: 'active',
      sortOrder: 0,
      createdAt: now,
      updatedAt: now,
    })
  }

  static restore(snapshot: ProfileSnapshot): ProfileAggregate {
    return new ProfileAggregate({ ...snapshot })
  }

  toSnapshot(): ProfileSnapshot {
    return { ...this.props }
  }

  get id(): string {
    return this.props.id
  }
  get accountUserId(): string {
    return this.props.accountUserId
  }
  get name(): string {
    return this.props.name
  }
  get avatarUrl(): string | null {
    return this.props.avatarUrl
  }
  get whatsapp(): string | null {
    return this.props.whatsapp
  }
  get status(): ProfileStatus {
    return this.props.status
  }
  get sortOrder(): number {
    return this.props.sortOrder
  }
  get isArchived(): boolean {
    return this.props.status === 'archived'
  }

  /** Pertence a esta conta? Ownership — a aplicação rejeita o que não for do ator. */
  belongsTo(accountUserId: string): boolean {
    return this.props.accountUserId === accountUserId
  }

  /**
   * Edita nome/foto/WhatsApp. Só campos definidos são considerados; nome em branco
   * é ignorado (não apaga o nome). `null` em foto/WhatsApp remove o valor.
   */
  updateDetails(
    changes: { name?: string; avatarUrl?: string | null; whatsapp?: string | null },
    now: Date = new Date(),
  ): void {
    if (changes.name !== undefined) {
      const next = changes.name.trim()
      if (next.length > 0) this.props.name = next
    }
    if (changes.avatarUrl !== undefined) {
      const next = normalizeOptional(changes.avatarUrl)
      assertAvatarUrl(next)
      this.props.avatarUrl = next
    }
    if (changes.whatsapp !== undefined) {
      this.props.whatsapp = normalizeOptional(changes.whatsapp)
    }
    this.props.updatedAt = now
  }

  /** Arquiva (some da grade; o histórico keyado no id sobrevive). Idempotente. */
  archive(now: Date = new Date()): void {
    if (this.props.status === 'archived') return
    this.props.status = 'archived'
    this.props.updatedAt = now
  }
}

function normalizeOptional(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

/** A foto é renderizada como `src` pelos apps — só http(s) (sem `javascript:`/`data:`). */
function assertAvatarUrl(value: string | null): void {
  if (value === null) return
  let ok = false
  try {
    const u = new URL(value)
    ok = u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    ok = false
  }
  if (!ok) throw new ValidationError('Foto do perfil deve ser uma URL http(s)')
}
