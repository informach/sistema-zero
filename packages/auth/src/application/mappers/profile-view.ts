import type {
  ProfileAdmissionState,
  ProfileAggregate,
} from '../../domain/profile/profile.aggregate'

/** View da própria família/sessão. fullName é privado; nunca usar esta view em lotes sociais. */
export interface ProfileView {
  id: string
  /** The parent grade may show pending; child selectors require ready independently. */
  admissionState: ProfileAdmissionState
  name: string
  fullName?: string
  publicNickname: string | null
  identityConfirmed: boolean
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

export function toProfileView(p: ProfileAggregate, includePrivateIdentity = true): ProfileView {
  return {
    id: p.id,
    admissionState: p.admissionState,
    name: p.displayName,
    ...(includePrivateIdentity ? { fullName: p.name } : {}),
    publicNickname: p.publicNickname,
    identityConfirmed: Boolean(p.identityConfirmedAt && p.publicNickname),
    avatarUrl: p.avatarUrl,
    whatsapp: p.whatsapp,
    birthDate: p.birthDate,
    publicProfileEnabled: p.publicProfileEnabled,
    voiceInputEnabled: p.voiceInputEnabled,
    sortOrder: p.sortOrder,
  }
}
