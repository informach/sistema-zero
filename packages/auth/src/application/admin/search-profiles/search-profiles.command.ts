/** Filtros da busca unificada admin de perfis. `limit`/`offset` já vêm coeridos da borda. */
export interface SearchProfilesCommand {
  /** Texto livre: nome da CRIANÇA (perfil) ou nome/e-mail do RESPONSÁVEL (conta). */
  q?: string
  limit: number
  offset: number
}
