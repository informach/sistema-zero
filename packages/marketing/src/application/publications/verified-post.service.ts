import type { ExternalPostResolver } from '../../domain/ports/external-post-resolver.port'
import type { SocialAccountRepository } from '../../domain/ports/social-account-repository.port'
import type { VerifiedPostResolver } from '../../domain/ports/verified-post-resolver.port'
import { postUrl } from '../../domain/publication/post-url'
import type { Network } from '../../domain/publication/publication'
import { WorkspaceError } from '../../domain/workspace/workspace-error'
import type { AccountService } from '../accounts/account.service'

/** Read-only provider lookup. Explicit account, no first-account fallback or external mutation. */
export class VerifiedPostService implements VerifiedPostResolver {
  readonly networks: ReadonlySet<Network>
  constructor(
    private readonly accounts: SocialAccountRepository,
    private readonly accountService: Pick<AccountService, 'getFreshAccessToken'>,
    private readonly resolvers: ReadonlyMap<Network, ExternalPostResolver>,
  ) {
    this.networks = new Set(
      [...resolvers].filter(([, value]) => value.requiresAccount).map(([key]) => key),
    )
  }
  async verify(network: Network, accountId: string, url: string) {
    const resolver = this.resolvers.get(network)
    if (!resolver?.requiresAccount || !postUrl(network, url))
      throw new WorkspaceError(
        'INVALID_OPERATION',
        'A verificação deste link não está disponível para esta rede',
      )
    const account = await this.accounts.byId(accountId)
    if (!account || account.network !== network || account.status !== 'connected')
      throw new WorkspaceError(
        'INVALID_OPERATION',
        'Selecione a conta conectada que publicou esta peça',
      )
    const accessToken = await this.accountService.getFreshAccessToken(account)
    const resolved = await resolver.resolve({ url, account, accessToken })
    if (!resolved || !postUrl(network, resolved.externalUrl))
      throw new WorkspaceError(
        'INVALID_OPERATION',
        'A publicação não foi encontrada na conta escolhida. Confira o link, a conta e se ela já está publicada.',
      )
    return { ...resolved, socialAccountId: account.id, accountVersion: account.version }
  }
}
