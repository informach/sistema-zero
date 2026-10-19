import type { ProfileRepository } from '../../domain/ports/profile-repository.port'
import { ProfileNotFoundError } from '../../domain/profile/profile.errors'
import { ParentReauthenticationRequiredError } from '../../domain/study-access/errors'
import { type ProfileView, toProfileView } from '../mappers/profile-view'
import { assertMayEnableVoiceInput, voiceInputActor } from './voice-input.policy'

export interface UpdateProfileDetailsCommand {
  /** True only for the child's profile session, captured by the authenticated HTTP boundary. */
  profileSession?: boolean
  accountUserId: string
  profileId: string
  name?: string
  avatarUrl?: string | null
  whatsapp?: string | null
  /**
   * Data de nascimento (`YYYY-MM-DD`; `null` limpa). A AUTORIZAÇÃO (só os pais) é da
   * rota — quando chega aqui já está liberada. `undefined` = não mexe.
   */
  birthDate?: string | null
  /** Perfil público (opt-in). AUTORIZAÇÃO parent-only é da rota; `undefined` = não mexe. */
  publicProfileEnabled?: boolean
  /**
   * Fala da criança (voz → texto). A rota barra a sessão da criança; aqui valem as regras
   * de LIGAR (`assertMayEnableVoiceInput`). Desligar é livre. `undefined` = não mexe.
   */
  voiceInputEnabled?: boolean
  /**
   * Ator REAL de uma sessão de SUPORTE (impersonação, `x-auth-impersonator-id`); ausente =
   * os responsáveis. O suporte pode desligar a fala, nunca ligar; o id vai para a trilha.
   */
  impersonatorId?: string | null
  /**
   * Sessão de RESPONSÁVEL do Kids: o login dele tem até 15 minutos? `undefined` = sessão de
   * outro produto (sem a exigência). `false` recusa MUDAR nascimento ou perfil público e
   * LIGAR a fala (desligar não pede login de novo).
   */
  parentAuthRecent?: boolean
}

/**
 * Edita nome/foto/WhatsApp de um perfil DA PRÓPRIA CONTA. Ownership: perfil de
 * outra conta ou arquivado → 404 (não vaza a existência). A validação de foto
 * (http(s)) vive no agregado.
 */
export class UpdateProfileDetailsService {
  constructor(
    private readonly profiles: ProfileRepository,
    private readonly clock: () => Date,
  ) {}

  async execute(cmd: UpdateProfileDetailsCommand): Promise<ProfileView> {
    // Capture caller-owned values before any asynchronous lock acquisition.
    const input = { ...cmd }
    const now = new Date(this.clock().getTime())
    const profile = await this.profiles.editDetails(
      { profileId: input.profileId, accountUserId: input.accountUserId },
      (current) => {
        if (input.profileSession && current.admissionState !== 'ready')
          throw new ProfileNotFoundError()
        if (input.voiceInputEnabled === true && !current.voiceInputEnabled) {
          assertMayEnableVoiceInput({
            supportSession: Boolean(input.impersonatorId),
            parentAuthRecent: input.parentAuthRecent,
          })
        }
        const sensitiveChange =
          (input.birthDate !== undefined &&
            (input.birthDate?.trim() || null) !== current.birthDate) ||
          (input.publicProfileEnabled !== undefined &&
            input.publicProfileEnabled !== current.publicProfileEnabled)
        if (sensitiveChange && input.parentAuthRecent === false)
          throw new ParentReauthenticationRequiredError()
        return {
          changes: {
            name: input.name,
            avatarUrl: input.avatarUrl,
            whatsapp: input.whatsapp,
            birthDate: input.birthDate,
            publicProfileEnabled: input.publicProfileEnabled,
            voiceInputEnabled: input.voiceInputEnabled,
          },
          voiceActor: voiceInputActor(input.impersonatorId),
          now,
        }
      },
    )
    if (!profile) throw new ProfileNotFoundError()
    return toProfileView(profile)
  }
}
