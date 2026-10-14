import type { ProfileRepository } from '../../domain/ports/profile-repository.port'
import { ProfileNotFoundError } from '../../domain/profile/profile.errors'
import { ParentReauthenticationRequiredError } from '../../domain/study-access/errors'
import { type ProfileView, toProfileView } from '../mappers/profile-view'
import { assertMayEnableVoiceInput, voiceInputActor } from './voice-input.policy'

export interface UpdateProfileDetailsCommand {
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
    const profile = await this.profiles.findById(cmd.profileId)
    if (!profile?.belongsTo(cmd.accountUserId) || profile.isArchived) {
      throw new ProfileNotFoundError()
    }
    // Fala: só a passagem de DESLIGADA para LIGADA é sensível. Reenviar `true` com ela já
    // ligada (formulário dos pais trocando só o nome) e desligar seguem livres.
    if (cmd.voiceInputEnabled === true && !profile.voiceInputEnabled) {
      assertMayEnableVoiceInput({
        supportSession: Boolean(cmd.impersonatorId),
        parentAuthRecent: cmd.parentAuthRecent,
      })
    }
    // ⚠️ A exigência vale para a MUDANÇA, não para o campo no corpo: o formulário dos pais
    // reenvia nascimento e perfil público ao trocar só o nome, e isso não pede login de novo.
    const sensitiveChange =
      (cmd.birthDate !== undefined && (cmd.birthDate?.trim() || null) !== profile.birthDate) ||
      (cmd.publicProfileEnabled !== undefined &&
        cmd.publicProfileEnabled !== profile.publicProfileEnabled)
    if (sensitiveChange && cmd.parentAuthRecent === false)
      throw new ParentReauthenticationRequiredError()
    const now = this.clock()
    profile.updateDetails({ name: cmd.name, avatarUrl: cmd.avatarUrl, whatsapp: cmd.whatsapp }, now)
    // birthDate tem caminho próprio (autorização parent-only na rota; `undefined` = não mexe).
    if (cmd.birthDate !== undefined) profile.setBirthDate(cmd.birthDate, now)
    // Perfil público: idem (parent-only na rota).
    if (cmd.publicProfileEnabled !== undefined) {
      profile.setPublicProfileEnabled(cmd.publicProfileEnabled, now)
    }
    // Fala: caminho próprio (ligar carimba o consentimento; desligar zera). A mudança efetiva
    // vai para a trilha na mesma transação do UPDATE; reenviar o mesmo valor não registra nada.
    if (cmd.voiceInputEnabled !== undefined) {
      profile.setVoiceInputEnabled(cmd.voiceInputEnabled, voiceInputActor(cmd.impersonatorId), now)
    }
    const ok = await this.profiles.update(profile)
    if (!ok) throw new ProfileNotFoundError()
    return toProfileView(profile)
  }
}
