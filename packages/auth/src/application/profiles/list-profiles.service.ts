import type { ProfileRepository } from '../../domain/ports/profile-repository.port'
import { type ProfileView, toProfileView } from '../mappers/profile-view'

/** Lista os perfis ATIVOS da conta (a grade Netflix), na ordem da grade. */
export class ListProfilesService {
  constructor(private readonly profiles: ProfileRepository) {}

  async execute(
    accountUserId: string,
    options: { includePending: boolean },
  ): Promise<{ profiles: ProfileView[] }> {
    const list = options.includePending
      ? await this.profiles.listForParent(accountUserId)
      : await this.profiles.listActiveByAccount(accountUserId)
    return { profiles: list.map(toProfileView) }
  }
}
