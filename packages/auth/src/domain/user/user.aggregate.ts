import { AggregateRoot } from '../shared/aggregate-root'
import type { Email } from '../value-objects/email'
import { UserRegisteredEvent } from './user.events'
import { DEFAULT_ROLE, type UserRole } from './user.role'
import { DEFAULT_STATUS, type UserStatus } from './user.status'

/** Estado serializável do usuário (ida/volta ao banco). */
export interface UserSnapshot {
  id: string
  email: string
  passwordHash: string
  firstName: string
  lastName: string
  role: UserRole
  status: UserStatus
  phone: string | null
  signupSource: string | null
  version: number
  createdAt: Date
  updatedAt: Date
}

export interface RegisterUserInput {
  id: string
  email: Email
  passwordHash: string
  firstName: string
  lastName: string
  role?: UserRole
  status?: UserStatus
  /** Opcional: telefone do usuário. */
  phone?: string | null
  /** Opcional: origem do cadastro (app/canal: `funnel`/`web`/`mobile`/`admin`). */
  signupSource?: string | null
  now?: Date
}

interface UserProps {
  email: string
  passwordHash: string
  firstName: string
  lastName: string
  role: UserRole
  status: UserStatus
  phone: string | null
  signupSource: string | null
  version: number
  createdAt: Date
  updatedAt: Date
}

/**
 * Agregado de usuário. Guarda o HASH da senha (nunca o texto puro — o hashing é
 * responsabilidade da infra). Identidade = `id` (uuid).
 */
export class UserAggregate extends AggregateRoot<string> {
  private constructor(
    id: string,
    private readonly props: UserProps,
  ) {
    super(id)
  }

  /** Cria um novo usuário (cadastro). `passwordHash` já vem hasheado pela infra. */
  static register(input: RegisterUserInput): UserAggregate {
    const now = input.now ?? new Date()
    const user = new UserAggregate(input.id, {
      email: input.email.value,
      passwordHash: input.passwordHash,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      role: input.role ?? DEFAULT_ROLE,
      status: input.status ?? DEFAULT_STATUS,
      phone: normalizeOptional(input.phone),
      signupSource: normalizeOptional(input.signupSource),
      version: 0,
      createdAt: now,
      updatedAt: now,
    })
    user.addEvent(
      new UserRegisteredEvent(user.id, user.props.email, user.props.role, user.props.signupSource),
    )
    return user
  }

  /** Reidrata um usuário a partir do estado persistido. */
  static restore(snapshot: UserSnapshot): UserAggregate {
    return new UserAggregate(snapshot.id, {
      email: snapshot.email,
      passwordHash: snapshot.passwordHash,
      firstName: snapshot.firstName,
      lastName: snapshot.lastName,
      role: snapshot.role,
      status: snapshot.status,
      phone: snapshot.phone,
      signupSource: snapshot.signupSource,
      version: snapshot.version,
      createdAt: snapshot.createdAt,
      updatedAt: snapshot.updatedAt,
    })
  }

  toSnapshot(): UserSnapshot {
    return { id: this.id, ...this.props }
  }

  get email(): string {
    return this.props.email
  }
  get passwordHash(): string {
    return this.props.passwordHash
  }
  get firstName(): string {
    return this.props.firstName
  }
  get lastName(): string {
    return this.props.lastName
  }
  get fullName(): string {
    return `${this.props.firstName} ${this.props.lastName}`.trim()
  }
  get role(): UserRole {
    return this.props.role
  }
  get status(): UserStatus {
    return this.props.status
  }
  get phone(): string | null {
    return this.props.phone
  }
  get signupSource(): string | null {
    return this.props.signupSource
  }
  get version(): number {
    return this.props.version
  }
  get createdAt(): Date {
    return this.props.createdAt
  }
  get updatedAt(): Date {
    return this.props.updatedAt
  }

  /** Só contas ativas podem obter/renovar tokens. */
  isActive(): boolean {
    return this.props.status === 'active'
  }
}

function normalizeOptional(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}
