import { ValidationError } from '@sistemazero/core/errors'
import { saoPauloDayKey } from '@sistemazero/core/time'
import { ProfileAgeRestrictedError, VoiceInputSupportCannotEnableError } from './profile.errors'

export type ProfileStatus = 'active' | 'archived'
export type ProfileAdmissionState = 'pending' | 'ready'

/**
 * Quem mudou a fala da criança: os responsáveis (sessão da conta) ou a equipe de suporte
 * "entrando como" eles (`impersonatorId` = o ator REAL, claim `act.sub`).
 */
export type VoiceInputActor = { kind: 'parent' } | { kind: 'support'; impersonatorId: string }

/**
 * Uma MUDANÇA efetiva da fala (desligada→ligada ou ligada→desligada) ainda não gravada: vira
 * uma linha da trilha append-only do consentimento, na mesma transação que salva o perfil.
 */
export interface VoiceInputConsentChange {
  enabled: boolean
  actor: VoiceInputActor['kind']
  /** O ator real numa sessão de suporte; `null` quando foram os responsáveis. */
  impersonatorId: string | null
  at: Date
}

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
  /**
   * Fala da criança (voz → texto nas mensagens para a equipe). Consentimento dos pais POR
   * CRIANÇA; nasce DESLIGADA (default false). Só os pais ligam (regras na rota/serviço).
   */
  voiceInputEnabled: boolean
  /**
   * Quando foi dado o consentimento EM VIGOR (a última vez que os pais ligaram); `null`
   * enquanto desligada. O histórico completo (a prova) é a trilha de mudanças, não esta data.
   */
  voiceInputEnabledAt: Date | null
  status: ProfileStatus
  /** Durable Members admission, independent of archival and parental consent. */
  admissionState: ProfileAdmissionState
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
  /**
   * Data de nascimento (`YYYY-MM-DD`). OBRIGATÓRIA desde 23/10/2026 (decisão da dona): todo perfil
   * novo nasce com ela. Perfis antigos sem data seguem válidos (o `restore` não valida) e a área
   * dos pais pede a data.
   */
  birthDate?: string | null
  /**
   * SÓ o backfill legado do perfil-padrão (`scripts/backfill-default-profiles.ts`) cria sem data:
   * ele não tem como saber o nascimento. Nenhuma rota HTTP passa isto (o DTO exige a data).
   */
  allowMissingBirthDate?: boolean
  now?: Date
}

/**
 * Perfil (estilo Netflix) de uma conta do responsável. Identidade = `id` (uuid) —
 * é ele que vira o `x-auth-user-id` efetivo na sessão de perfil. `sortOrder` é
 * atribuído pelo repositório (max+1 sob lock); o agregado nasce com 0.
 */
export class ProfileAggregate {
  /**
   * Mudança da fala ainda não gravada. Fica FORA do snapshot (não é coluna do perfil): o
   * repositório a grava na trilha junto com o perfil e então a dá por salva.
   */
  private pendingVoiceInputChange: VoiceInputConsentChange | null = null

  private constructor(private readonly props: ProfileSnapshot) {}

  static create(input: CreateProfileInput): ProfileAggregate {
    const now = input.now ?? new Date()
    const name = assertProfileName(input.name)
    const avatarUrl = normalizeOptional(input.avatarUrl)
    assertAvatarUrl(avatarUrl)
    const birthDate = normalizeOptional(input.birthDate)
    if (birthDate === null && !input.allowMissingBirthDate) {
      throw new ValidationError(BIRTH_DATE_REQUIRED_MESSAGE)
    }
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
      // Fala nasce DESLIGADA: a opção mais protetiva por padrão (a Política promete isso).
      voiceInputEnabled: false,
      voiceInputEnabledAt: null,
      status: 'active',
      admissionState: 'pending',
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
  get voiceInputEnabled(): boolean {
    return this.props.voiceInputEnabled
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
  get admissionState(): ProfileAdmissionState {
    return this.props.admissionState
  }
  /** Every session/public selector uses this condition; pending never authorizes a child. */
  get isSelectable(): boolean {
    return this.props.status === 'active' && this.props.admissionState === 'ready'
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
   * Define a data de nascimento (`YYYY-MM-DD`). Separado de `updateDetails` DE PROPÓSITO: a
   * autorização é da rota (SÓ os pais editam — a sessão de perfil da criança é barrada antes de
   * chegar aqui). Desde 23/10/2026 a data é obrigatória: dá para informar ou corrigir, nunca
   * apagar (`null`/vazio é recusado; o perfil antigo sem data que recebe `null` fica como está).
   */
  setBirthDate(value: string | null, now: Date = new Date()): void {
    const next = normalizeOptional(value)
    // Um perfil válido não perde acesso ao completar 18 anos. O formulário dos pais
    // reenvia a data atual em toda edição; data idêntica é preservação, não cadastro novo.
    if (next === this.props.birthDate) return
    if (next === null) throw new ValidationError(BIRTH_DATE_REQUIRED_MESSAGE)
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

  /**
   * Liga/desliga a FALA da criança (voz → texto). Separado de `updateDetails` DE PROPÓSITO,
   * como o perfil público: a autorização é da rota/serviço (só os pais; ligar pede login
   * recente e a equipe de suporte nunca liga). Ligar carimba `voiceInputEnabledAt` (o
   * momento do consentimento em vigor); desligar zera para `null`. Cada mudança efetiva
   * deixa uma `VoiceInputConsentChange` pendente para a trilha (quem, quando, para qual
   * valor), que é a prova histórica do consentimento. Mesmo valor = no-op, sem trilha: o
   * formulário dos pais reenvia o campo ao trocar só o nome, e isso não pode reescrever a
   * data do consentimento nem registrar uma mudança que não houve.
   */
  setVoiceInputEnabled(value: boolean, by: VoiceInputActor, now: Date = new Date()): void {
    if (value === this.props.voiceInputEnabled) return
    // Defesa em profundidade da régua da aplicação (`assertMayEnableVoiceInput`): a trilha
    // nunca registra a equipe de suporte LIGANDO a fala (o banco também recusa, por CHECK).
    if (value && by.kind === 'support') throw new VoiceInputSupportCannotEnableError()
    this.props.voiceInputEnabled = value
    this.props.voiceInputEnabledAt = value ? now : null
    this.props.updatedAt = now
    // Ida e volta antes de salvar deixa o valor como estava no banco: nada a registrar.
    this.pendingVoiceInputChange = this.pendingVoiceInputChange
      ? null
      : {
          enabled: value,
          actor: by.kind,
          impersonatorId: by.kind === 'support' ? by.impersonatorId : null,
          at: now,
        }
  }

  /** A mudança da fala que o repositório deve gravar na trilha junto com o perfil (ou `null`). */
  get voiceInputChange(): VoiceInputConsentChange | null {
    return this.pendingVoiceInputChange ? { ...this.pendingVoiceInputChange } : null
  }

  /** O repositório chama depois do commit: a mudança já está na trilha. */
  markVoiceInputChangeSaved(): void {
    this.pendingVoiceInputChange = null
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

/** A recusa de um perfil sem data de nascimento (criar sem ela ou apagá-la). */
export const BIRTH_DATE_REQUIRED_MESSAGE = 'Informe a data de nascimento da criança'

/**
 * Data de nascimento: `YYYY-MM-DD` real, não-futura e com menos de 18 anos. A obrigatoriedade
 * (23/10/2026) é de quem chama (`create` e `setBirthDate`); `null` aqui só passa porque o perfil
 * antigo sem data continua válido. A autorização "só os pais" é da rota; aqui é só a sanidade.
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
