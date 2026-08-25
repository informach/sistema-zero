import type {
  ProfileRepository,
  ProfileWithAccountRow,
} from '../../../domain/ports/profile-repository.port'
import type { SearchProfilesCommand } from './search-profiles.command'

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

/** Item da busca: o perfil ATIVO + identidade mínima da conta responsável (ou null). */
export interface AdminProfileSearchView {
  id: string
  name: string
  avatarUrl: string | null
  birthDate: string | null
  accountUserId: string
  account: { id: string; email: string; firstName: string; lastName: string } | null
}

export interface SearchProfilesResult {
  items: AdminProfileSearchView[]
  total: number
}

/**
 * Busca UNIFICADA de perfis pelo painel (a 1ª busca por nome de CRIANÇA do
 * sistema): uma caixa só acha a criança pelo nome do PERFIL ou a família pelo
 * nome/e-mail do RESPONSÁVEL. Clamp de paginação no molde do ListUsersService.
 */
export class SearchProfilesService {
  constructor(private readonly profiles: ProfileRepository) {}

  async execute(command: SearchProfilesCommand): Promise<SearchProfilesResult> {
    const limit = clamp(command.limit, 1, MAX_LIMIT, DEFAULT_LIMIT)
    const offset =
      Number.isFinite(command.offset) && command.offset > 0 ? Math.trunc(command.offset) : 0

    const { items, total } = await this.profiles.searchWithAccount({
      q: command.q?.trim() || undefined,
      limit,
      offset,
    })

    return { items: items.map(toView), total }
  }
}

/** Mapeia campo a campo: o read-model do port não vaza direto na borda HTTP. */
function toView(row: ProfileWithAccountRow): AdminProfileSearchView {
  return {
    id: row.id,
    name: row.name,
    avatarUrl: row.avatarUrl,
    birthDate: row.birthDate,
    accountUserId: row.accountUserId,
    account: row.account
      ? {
          id: row.account.id,
          email: row.account.email,
          firstName: row.account.firstName,
          lastName: row.account.lastName,
        }
      : null,
  }
}

function clamp(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, Math.trunc(value)))
}
