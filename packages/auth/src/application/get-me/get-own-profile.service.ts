import type { ProfileRepository } from '../../domain/ports/profile-repository.port'
import { type ProfileView, toProfileView } from '../mappers/profile-view'

/**
 * `GET /auth/me` numa sessão de PERFIL: devolve só o PRÓPRIO perfil (nome, avatar,
 * telefone, nascimento e a flag pública). ⚠️ Nunca a ficha da conta: no perfil-padrão o
 * `sub` é o id da CONTA, e o `/me` antigo entregava e-mail, telefone e nome do responsável
 * a quem estivesse na sessão da criança. Perfil de outra conta ou arquivado → `null` (401).
 */
export class GetOwnProfileService {
  constructor(private readonly profiles: ProfileRepository) {}

  async execute(accountUserId: string, profileId: string): Promise<ProfileView | null> {
    const profile = await this.profiles.findById(profileId)
    if (!profile?.belongsTo(accountUserId) || profile.isArchived) return null
    return toProfileView(profile)
  }
}
