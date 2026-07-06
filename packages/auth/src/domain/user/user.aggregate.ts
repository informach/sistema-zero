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
  avatarUrl: string | null
  // Quando o usuário DEFINIU a própria senha (cadastro público, reset ou troca). É
  // `null` nas contas criadas por CONVITE (admin) ou COMPRA (funil), cuja senha é
  // aleatória/dummy — elas só ficam utilizáveis quando o dono define a senha pelo
  // link de 1º acesso. Distingue "conta com senha real" de "conta convidada".
  passwordSetAt: Date | null
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
  /** Opcional: URL pública da foto de perfil. */
  avatarUrl?: string | null
  /**
   * A senha do `passwordHash` foi ESCOLHIDA pelo próprio usuário? `true` no cadastro
   * público (senha real); OMITIR (→ `false`) no convite (admin) e na compra (funil),
   * cuja senha é aleatória/dummy. Default seguro `false`: uma criação nova que esqueça
   * de sinalizar nasce "sem senha definida" (travada no login por código), nunca o
   * contrário. `changePassword` marca depois, quando o dono define a senha.
   */
  passwordSet?: boolean
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
  avatarUrl: string | null
  passwordSetAt: Date | null
  version: number
  createdAt: Date
  updatedAt: Date
}

/**
 * Agregado de usuário. Guarda o HASH da senha (nunca o texto puro — o hashing é
 * responsabilidade da infra). Identidade = `id` (uuid).
 */
export class UserAggregate extends AggregateRoot<string> {
  // Marca se houve mutação nesta instância (carregada por edição). Garante que a
  // `version` suba UMA vez por edição, mesmo alterando vários campos.
  private dirty = false

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
      avatarUrl: normalizeOptional(input.avatarUrl),
      // Convite/compra criam com `passwordSet` ausente → `null` (senha ainda não é
      // do dono). Cadastro público passa `true` → carimba `now` (senha real).
      passwordSetAt: input.passwordSet ? now : null,
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
      avatarUrl: snapshot.avatarUrl,
      passwordSetAt: snapshot.passwordSetAt,
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
  get avatarUrl(): string | null {
    return this.props.avatarUrl
  }
  get passwordSetAt(): Date | null {
    return this.props.passwordSetAt
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

  /**
   * O dono já DEFINIU a própria senha? `false` numa conta de convite/compra cuja
   * senha ainda é a aleatória/dummy. O login por CÓDIGO (OTP) recusa essas contas —
   * senão a pessoa entra numa sessão que a área dos pais (que valida a senha real)
   * nunca deixa passar. Ela precisa definir a senha pelo link de 1º acesso.
   */
  isPasswordSet(): boolean {
    return this.props.passwordSetAt !== null
  }

  /**
   * Altera o papel (RBAC). No-op se igual. Bumpa a `version` (concorrência
   * otimista) e o `updatedAt`. A AUTORIZAÇÃO (quem pode promover a quê) é decisão
   * da camada de aplicação — o agregado só aplica a mudança.
   */
  changeRole(newRole: UserRole, now: Date = new Date()): void {
    if (this.props.role === newRole) return
    this.props.role = newRole
    this.touch(now)
  }

  /** Altera o status da conta (moderação). No-op se igual. Bumpa `version`/`updatedAt`. */
  changeStatus(newStatus: UserStatus, now: Date = new Date()): void {
    if (this.props.status === newStatus) return
    this.props.status = newStatus
    this.touch(now)
  }

  /**
   * Atualiza campos de perfil (nome/telefone/foto). Só campos definidos são
   * considerados; nome em branco é ignorado. Bumpa `version`/`updatedAt` apenas se
   * algo de fato mudou.
   */
  updateProfile(
    changes: {
      firstName?: string
      lastName?: string
      phone?: string | null
      avatarUrl?: string | null
    },
    now: Date = new Date(),
  ): void {
    let changed = false
    if (changes.firstName !== undefined) {
      const next = changes.firstName.trim()
      if (next.length > 0 && next !== this.props.firstName) {
        this.props.firstName = next
        changed = true
      }
    }
    if (changes.lastName !== undefined) {
      const next = changes.lastName.trim()
      if (next.length > 0 && next !== this.props.lastName) {
        this.props.lastName = next
        changed = true
      }
    }
    if (changes.phone !== undefined) {
      const next = normalizeOptional(changes.phone)
      if (next !== this.props.phone) {
        this.props.phone = next
        changed = true
      }
    }
    if (changes.avatarUrl !== undefined) {
      const next = normalizeOptional(changes.avatarUrl)
      if (next !== this.props.avatarUrl) {
        this.props.avatarUrl = next
        changed = true
      }
    }
    if (changed) this.touch(now)
  }

  /**
   * Troca a senha (reset por token ou troca logado). `newHash` já vem hasheado
   * pela infra (o agregado nunca vê texto puro). Bumpa `version`/`updatedAt`.
   */
  changePassword(newHash: string, now: Date = new Date()): void {
    this.props.passwordHash = newHash
    // Definir/trocar a senha CARIMBA o marco: a partir daqui a conta tem uma senha
    // do dono (destrava o login por código + a área dos pais). Cobre o link de 1º
    // acesso (convite/compra), o reset por código e a troca logado.
    this.props.passwordSetAt = now
    this.touch(now)
  }

  /**
   * Marca a edição: bumpa a `version` UMA vez (na primeira mutação desta instância)
   * e atualiza `updatedAt`. Alterar papel + status + perfil numa só edição sobe a
   * versão em 1 (semântica convencional de concorrência otimista).
   */
  private touch(now: Date): void {
    if (!this.dirty) {
      this.dirty = true
      this.props.version += 1
    }
    this.props.updatedAt = now
  }
}

function normalizeOptional(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}
