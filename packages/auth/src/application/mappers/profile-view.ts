import type { ProfileAggregate } from '../../domain/profile/profile.aggregate'

/** View pública do perfil (grade Netflix). Sem `accountUserId`/`status`/timestamps. */
export interface ProfileView {
  id: string
  name: string
  avatarUrl: string | null
  whatsapp: string | null
  birthDate: string | null
  /** Perfil público entre crianças (opt-in dos pais). A grade/área dos pais exibe o toggle. */
  publicProfileEnabled: boolean
  sortOrder: number
}

export function toProfileView(p: ProfileAggregate): ProfileView {
  return {
    id: p.id,
    name: p.name,
    avatarUrl: p.avatarUrl,
    whatsapp: p.whatsapp,
    birthDate: p.birthDate,
    publicProfileEnabled: p.publicProfileEnabled,
    sortOrder: p.sortOrder,
  }
}
