import type {
  ProfileAdmissionState,
  ProfileAggregate,
} from '../../domain/profile/profile.aggregate'

/** View pública do perfil (grade Netflix). Sem `accountUserId`/`status`/timestamps. */
export interface ProfileView {
  id: string
  /** The parent grade may show pending; child selectors require ready independently. */
  admissionState: ProfileAdmissionState
  name: string
  avatarUrl: string | null
  whatsapp: string | null
  birthDate: string | null
  /** Perfil público entre crianças (opt-in dos pais). A grade/área dos pais exibe o toggle. */
  publicProfileEnabled: boolean
  /**
   * Fala da criança ligada pelos pais (voz → texto). O app Kids lê pelo `GET /auth/me` da
   * sessão da criança; a área dos pais exibe o toggle. A data do consentimento NÃO sai aqui.
   */
  voiceInputEnabled: boolean
  sortOrder: number
}

export function toProfileView(p: ProfileAggregate): ProfileView {
  return {
    id: p.id,
    admissionState: p.admissionState,
    name: p.name,
    avatarUrl: p.avatarUrl,
    whatsapp: p.whatsapp,
    birthDate: p.birthDate,
    publicProfileEnabled: p.publicProfileEnabled,
    voiceInputEnabled: p.voiceInputEnabled,
    sortOrder: p.sortOrder,
  }
}
