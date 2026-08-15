import { ValidationError } from '@sistemazero/core/errors'
import { saoPauloDayKey } from '@sistemazero/core/time'
import { ProfileAgeRestrictedError } from './profile.errors'

export type ProfileStatus = 'active' | 'archived'

/** Estado serializável do perfil (ida/volta ao banco). */
export interface ProfileSnapshot {
  id: string
  accountUserId: string
  name: string
  avatarUrl: string | null
  whatsapp: string | null
  /** Data de nascimento (`YYYY-MM-DD`) — controle de idade; só os pais editam. */
  birthDate: string | null
  /** Perfil público entre crianças da comunidade (opt-in dos pais; default false). */
  publicProfileEnabled: boolean
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
  birthDate?: string | null
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
    const name = assertProfileName(input.name)
    const avatarUrl = normalizeOptional(input.avatarUrl)
    assertAvatarUrl(avatarUrl)
    const birthDate = normalizeOptional(input.birthDate)
    assertBirthDate(birthDate, now)
    return new ProfileAggregate({
      id: input.id,
      accountUserId: input.accountUserId,
      name,
      avatarUrl,
      whatsapp: normalizeOptional(input.whatsapp),
      birthDate,
      // Novo perfil nasce PRIVADO (opt-in dos pais).
      publicProfileEnabled: false,
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
  get birthDate(): string | null {
    return this.props.birthDate
  }
  get publicProfileEnabled(): boolean {
    return this.props.publicProfileEnabled
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
      // Nome informado precisa ser válido (≥ 3) — não silencia mais um valor curto.
      this.props.name = assertProfileName(changes.name)
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

  /**
   * Define a data de nascimento (`YYYY-MM-DD`; `null` limpa). Separado de
   * `updateDetails` DE PROPÓSITO: a autorização é da rota (SÓ os pais editam — a
   * sessão de perfil da criança é barrada antes de chegar aqui).
   */
  setBirthDate(value: string | null, now: Date = new Date()): void {
    const next = normalizeOptional(value)
    // Um perfil válido não perde acesso ao completar 18 anos. O formulário dos pais
    // reenvia a data atual em toda edição; data idêntica é preservação, não cadastro novo.
    if (next === this.props.birthDate) return
    assertBirthDate(next, now)
    this.props.birthDate = next
    this.props.updatedAt = now
  }

  /**
   * Liga/desliga o perfil PÚBLICO (visível/clicável entre crianças da comunidade).
   * Separado de `updateDetails` DE PROPÓSITO: a autorização é da rota (SÓ os pais —
   * a sessão de perfil da criança é barrada antes de chegar aqui), como o birthDate.
   */
  setPublicProfileEnabled(value: boolean, now: Date = new Date()): void {
    this.props.publicProfileEnabled = value
    this.props.updatedAt = now
  }

  /** Arquiva (some da grade; o histórico keyado no id sobrevive). Idempotente. */
  archive(now: Date = new Date()): void {
    if (this.props.status === 'archived') return
    this.props.status = 'archived'
    this.props.updatedAt = now
  }
}

/** Nome do perfil: trim + mínimo de 3 caracteres (espelha o DTO `PROFILE_NAME`). */
function assertProfileName(value: string): string {
  const name = value.trim()
  if (name.length < 3) {
    throw new ValidationError('Nome do perfil precisa de ao menos 3 caracteres')
  }
  return name
}

function normalizeOptional(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

/**
 * Data de nascimento: `YYYY-MM-DD` real, não-futura e com menos de 18 anos.
 * `null` é permitido (campo opcional). A autorização "só os pais" é da rota;
 * aqui é só a sanidade do valor.
 */
function assertBirthDate(value: string | null, now: Date): void {
  if (value === null) return
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ValidationError('Data de nascimento deve estar no formato AAAA-MM-DD')
  }
  const parsed = new Date(`${value}T00:00:00Z`)
  // Rejeita datas inválidas (ex.: 2020-02-31 normaliza e não bate a string de volta).
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new ValidationError('Data de nascimento inválida')
  }
  const today = saoPauloDayKey(now)
  if (value > today) {
    throw new ValidationError('Data de nascimento não pode estar no futuro')
  }
  const currentYear = Number(today.slice(0, 4))
  const currentMonth = Number(today.slice(5, 7))
  const currentDay = Number(today.slice(8, 10))
  const birthYear = parsed.getUTCFullYear()
  const birthMonth = parsed.getUTCMonth() + 1
  const birthDay = parsed.getUTCDate()
  const hadBirthday =
    currentMonth > birthMonth || (currentMonth === birthMonth && currentDay >= birthDay)
  const age = currentYear - birthYear - (hadBirthday ? 0 : 1)
  // Sem piso: um filho mais novo também pode ter o perfil preparado pelos pais.
  if (age >= 18) throw new ProfileAgeRestrictedError()
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
