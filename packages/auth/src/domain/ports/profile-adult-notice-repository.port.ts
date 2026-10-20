/**
 * Perfil ATIVO com data de nascimento na faixa pedida e AINDA sem aviso de 18 anos, com o
 * responsável (conta dona, `profiles.account_user_id`) ativo. Vale também para o
 * perfil-padrão legado (`id = id da conta`): o responsável sai sempre de `account_user_id`.
 */
export interface AdultNoticeCandidate {
  profileId: string
  profileName: string
  /** `YYYY-MM-DD`. */
  birthDate: string
  accountUserId: string
  guardianEmail: string
  guardianFirstName: string
}

/**
 * Porta do aviso "o perfil completou 18 anos". O registro (`profile_adult_notices`) é o
 * dedupe PARA SEMPRE: no máximo um aviso por perfil. Sai junto com o perfil (FK em cascata).
 */
export interface ProfileAdultNoticeRepository {
  /** Ordem estável por data de nascimento e id; `limit` limita o ciclo. */
  listCandidates(input: {
    birthDateFrom: string
    birthDateTo: string
    limit: number
  }): Promise<AdultNoticeCandidate[]>
  /** Idempotente (conflito no perfil = já registrado). */
  markNotified(input: {
    profileId: string
    accountUserId: string
    /** 18º aniversário (`YYYY-MM-DD`). */
    turnedAdultOn: string
    notifiedAt: Date
  }): Promise<void>
}
