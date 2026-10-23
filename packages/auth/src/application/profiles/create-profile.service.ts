import { createHash } from 'node:crypto'
import { ForbiddenError } from '@sistemazero/core/http'
import type { ProfileAllowanceGateway } from '../../domain/ports/profile-allowance-gateway.port'
import type { ProfileRepository } from '../../domain/ports/profile-repository.port'
import { ProfileAggregate } from '../../domain/profile/profile.aggregate'
import {
  ProfileCreationConflictError,
  ProfileLimitReachedError,
  ProfileNotFoundError,
} from '../../domain/profile/profile.errors'
import { type ProfileView, toProfileView } from '../mappers/profile-view'
import type { ProfileAdmissionService } from './profile-admission.service'
import { assertMayEnableVoiceInput, voiceInputActor } from './voice-input.policy'

export interface CreateProfileCommand {
  /** Stable per parent submission; retries reuse the same child ID and durable job. */
  requestId: string
  /** Conta do responsável (x-auth-user-id) — dona do perfil. */
  accountUserId: string
  /**
   * Ator é equipe interna (superadmin/admin/staff)? Então perfis ILIMITADOS (pula o
   * teto do members) — a equipe testa/verifica o Kids sem matrícula. Resolvido na
   * borda por `isPrivilegedRole`. Cliente final fica `false` (teto do plano vale).
   */
  privileged?: boolean
  name: string
  avatarUrl?: string | null
  whatsapp?: string | null
  /** Data de nascimento (`YYYY-MM-DD`) — controle de idade; só os pais informam. */
  birthDate?: string | null
  /**
   * Opt-in do perfil público já na CRIAÇÃO (08/2026). A rota de criar recusa
   * sessão de perfil, então "só os pais" vale por construção. Ausente → OFF
   * (o default seguro do agregado).
   */
  publicProfileEnabled?: boolean
  /**
   * Fala da criança já na CRIAÇÃO. `true` segue a MESMA régua do PATCH ao ligar (login
   * recente do responsável do Kids; suporte nunca liga). Ausente/`false` → nasce desligada.
   */
  voiceInputEnabled?: boolean
  /**
   * Ator REAL de uma sessão de SUPORTE (impersonação, `x-auth-impersonator-id`); ausente =
   * os responsáveis. O suporte não pode criar o perfil já com a fala ligada.
   */
  impersonatorId?: string | null
  /**
   * Responsável do Kids com login de até 15 minutos? `undefined` = outro produto. Na criação
   * só pesa para ligar a fala (o perfil público na criação segue sem a exigência).
   */
  parentAuthRecent?: boolean
}

/** Teto efetivo da equipe interna — sem limite prático de perfis. */
const UNLIMITED_PROFILES = Number.MAX_SAFE_INTEGER

/**
 * Cria um perfil de criança para a conta. Para o CLIENTE, o teto vem do members
 * (matrícula kids ativa; `maxProfiles <= 0` = não comprou → 409). Para a EQUIPE
 * interna (`privileged`), o teto é ilimitado (sem chamada S2S). A contagem + insert
 * são atômicos no repositório (advisory lock por conta) — dois creates simultâneos
 * não furam o teto.
 */
export class CreateProfileService {
  constructor(
    private readonly profiles: ProfileRepository,
    private readonly allowance: ProfileAllowanceGateway,
    private readonly newId: () => string,
    private readonly clock: () => Date,
    private readonly admission: Pick<ProfileAdmissionService, 'tryProfile'>,
  ) {}

  async execute(input: CreateProfileCommand): Promise<ProfileView> {
    const cmd = { ...input }
    // Antes de tudo (sem S2S nem insert): criar com a fala LIGADA é o mesmo consentimento
    // sensível do PATCH.
    if (cmd.voiceInputEnabled === true) {
      assertMayEnableVoiceInput({
        supportSession: Boolean(cmd.impersonatorId),
        parentAuthRecent: cmd.parentAuthRecent,
      })
    }
    // Constrói o agregado ANTES da chamada S2S — valida nome/foto na borda do domínio.
    const profile = ProfileAggregate.create({
      id: this.newId(),
      accountUserId: cmd.accountUserId,
      name: cmd.name,
      avatarUrl: cmd.avatarUrl,
      whatsapp: cmd.whatsapp,
      birthDate: cmd.birthDate,
      now: this.clock(),
    })
    // O agregado nasce com o perfil público OFF (default seguro); o opt-in dos
    // pais na criação entra pelo MESMO caminho autorizado do PATCH.
    if (cmd.publicProfileEnabled !== undefined) {
      profile.setPublicProfileEnabled(cmd.publicProfileEnabled, this.clock())
    }
    // Fala: nasce desligada; ligar na criação carimba o consentimento (régua checada acima) e
    // deixa a 1ª linha da trilha, gravada pelo repositório na mesma transação do insert.
    if (cmd.voiceInputEnabled !== undefined) {
      profile.setVoiceInputEnabled(
        cmd.voiceInputEnabled,
        voiceInputActor(cmd.impersonatorId),
        this.clock(),
      )
    }
    const requestHash = createHash('sha256')
      .update(
        JSON.stringify({
          name: profile.name,
          avatarUrl: profile.avatarUrl,
          whatsapp: profile.whatsapp,
          birthDate: profile.birthDate,
          publicProfileEnabled: profile.publicProfileEnabled,
          voiceInputEnabled: profile.voiceInputEnabled,
        }),
      )
      .digest('hex')
    const existing = await this.profiles.findByCreationRequest(cmd.accountUserId, cmd.requestId)
    if (existing) {
      if (existing.requestHash !== requestHash) throw new ProfileCreationConflictError()
      return this.finish(existing.profile)
    }
    const maxProfiles = cmd.privileged
      ? UNLIMITED_PROFILES
      : (await this.allowance.getAllowance(cmd.accountUserId)).maxProfiles
    if (maxProfiles <= 0) throw new ProfileLimitReachedError()
    const result = await this.profiles.createWithinLimit(profile, maxProfiles, {
      requestId: cmd.requestId,
      requestHash,
    })
    if (result.outcome === 'account_inactive') {
      throw new ForbiddenError('A conta não pode mais criar perfis')
    }
    if (result.outcome === 'limit_reached') throw new ProfileLimitReachedError()
    if (result.outcome === 'request_conflict') throw new ProfileCreationConflictError()
    return this.finish(result.profile)
  }

  private async finish(profile: ProfileAggregate): Promise<ProfileView> {
    const id = profile.id
    const accountUserId = profile.accountUserId
    if (profile.isArchived) throw new ProfileNotFoundError()
    if (!profile.isSelectable) await this.admission.tryProfile(id, accountUserId)
    const current = await this.profiles.findById(id)
    if (!current?.belongsTo(accountUserId) || current.isArchived) throw new ProfileNotFoundError()
    return toProfileView(current)
  }
}
