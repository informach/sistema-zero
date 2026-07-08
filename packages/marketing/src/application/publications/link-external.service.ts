import {
  AccountNotConnectedError,
  ConcurrencyConflictError,
  ExternalPostNotFoundError,
  InvalidPublicationStateError,
  NetworkNotSupportedError,
  PublicationNotFoundError,
} from '../../domain/marketing-errors'
import type { ExternalPostResolver } from '../../domain/ports/external-post-resolver.port'
import type { PublicationAssetRepository } from '../../domain/ports/publication-asset-repository.port'
import type { PublicationRepository } from '../../domain/ports/publication-repository.port'
import type { SocialAccountRepository } from '../../domain/ports/social-account-repository.port'
import type { Network } from '../../domain/publication/publication'
import type { AccountService } from '../accounts/account.service'
import { type PublicationView, toPublicationView } from '../mappers/views'

/**
 * Vínculo publicação manual ↔ post REAL: a equipe postou na mão, cola o link e
 * o post entra no radar de métricas (externalPostId + nextCollectAt=now).
 */
export class LinkExternalService {
  constructor(
    private readonly publications: PublicationRepository,
    private readonly accounts: SocialAccountRepository,
    private readonly accountService: AccountService,
    private readonly assetLinks: PublicationAssetRepository,
    private readonly resolvers: ReadonlyMap<Network, ExternalPostResolver>,
    private readonly now: () => Date,
  ) {}

  async link(id: string, url: string): Promise<PublicationView> {
    const pub = await this.publications.byId(id)
    if (!pub) throw new PublicationNotFoundError()
    if (pub.status !== 'published') {
      throw new InvalidPublicationStateError(
        'Só publicações já marcadas como publicadas podem ser vinculadas ao post real',
      )
    }
    const resolver = this.resolvers.get(pub.network)
    if (!resolver) {
      throw new NetworkNotSupportedError('Vínculo de post ainda não disponível para esta rede')
    }
    let account = null
    let accessToken: string | null = null
    if (resolver.requiresAccount) {
      const candidates = await this.accounts.listByNetwork(pub.network)
      account =
        (pub.socialAccountId
          ? candidates.find((a) => a.id === pub.socialAccountId && a.status === 'connected')
          : undefined) ??
        candidates.find((a) => a.status === 'connected') ??
        null
      if (!account) throw new AccountNotConnectedError()
      accessToken = await this.accountService.getFreshAccessToken(account)
    }
    const resolved = await resolver.resolve({ url, account, accessToken })
    if (!resolved) throw new ExternalPostNotFoundError()

    const expectedVersion = pub.version
    pub.externalPostId = resolved.externalPostId
    pub.externalUrl = resolved.externalUrl
    // Post identificado → coleta de métricas entra no radar imediatamente.
    pub.metricsNextCollectAt = this.now()
    pub.version = expectedVersion + 1
    pub.updatedAt = this.now()
    const ok = await this.publications.update(pub, expectedVersion)
    if (!ok) throw new ConcurrencyConflictError()
    return toPublicationView(pub, await this.assetLinks.listByPublication(pub.id))
  }
}
