import type { ProfileAggregate } from '../../domain/profile/profile.aggregate'

/** View pública do perfil (grade Netflix). Sem `accountUserId`/`status`/timestamps. */
export interface ProfileView {
  id: string
  name: string
  avatarUrl: string | null
  whatsapp: string | null
  birthDate: string | null
  sortOrder: number
}

export function toProfileView(p: ProfileAggregate): ProfileView {
  return {
    id: p.id,
    name: p.name,
    avatarUrl: p.avatarUrl,
    whatsapp: p.whatsapp,
    birthDate: p.birthDate,
    sortOrder: p.sortOrder,
  }
}
