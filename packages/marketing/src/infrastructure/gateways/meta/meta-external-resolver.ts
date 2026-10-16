import type {
  ExternalPostResolver,
  ResolvedExternalPost,
} from '../../../domain/ports/external-post-resolver.port'
import { facebookPostIdentity, instagramShortcode } from '../../../domain/publication/post-url'
import type { SocialAccount } from '../../../domain/social-account/social-account'
import type { MetaApi } from './meta-api.port'

/** Teto de páginas na busca (50/página ≈ os últimos ~400 posts, ~90d típicos). */
const MAX_PAGES = 8

/**
 * Resolve a URL de um post real do IG/FB contra a LISTAGEM da conta conectada
 * (a Graph API não tem lookup por URL): IG casa o shortcode do permalink;
 * FB casa o permalink normalizado ou o id numérico presente na URL.
 */
export class MetaExternalResolver implements ExternalPostResolver {
  readonly network: 'instagram' | 'facebook'
  readonly requiresAccount = true

  constructor(
    private readonly api: MetaApi,
    network: 'instagram' | 'facebook',
  ) {
    this.network = network
  }

  async resolve(input: {
    url: string
    account: SocialAccount | null
    accessToken: string | null
  }): Promise<ResolvedExternalPost | null> {
    if (!input.account || input.account.network !== this.network || !input.accessToken) return null
    return this.network === 'instagram'
      ? this.resolveInstagram(input.url, input.account, input.accessToken)
      : this.resolveFacebook(input.url, input.account, input.accessToken)
  }

  private async resolveInstagram(
    url: string,
    account: SocialAccount,
    accessToken: string,
  ): Promise<ResolvedExternalPost | null> {
    const shortcode = instagramShortcode(url)
    if (!shortcode) return null
    let after: string | undefined
    for (let page = 0; page < MAX_PAGES; page++) {
      const { items, nextCursor } = await this.api.listIgMedia({
        accessToken,
        igUserId: account.externalId,
        after,
      })
      const found = items.find((m) => m.permalink && instagramShortcode(m.permalink) === shortcode)
      if (found) return { externalPostId: found.id, externalUrl: found.permalink ?? url }
      if (!nextCursor) break
      after = nextCursor
    }
    return null
  }

  private async resolveFacebook(
    url: string,
    account: SocialAccount,
    accessToken: string,
  ): Promise<ResolvedExternalPost | null> {
    const target = facebookPostIdentity(url)
    if (!target) return null
    let after: string | undefined
    for (let page = 0; page < MAX_PAGES; page++) {
      const { items, nextCursor } = await this.api.listFbPosts({
        accessToken,
        pageId: account.externalId,
        after,
      })
      const found = items.find((p) => {
        if (p.permalinkUrl && facebookPostIdentity(p.permalinkUrl) === target) return true
        // Post id é `{pageId}_{postId}` — casa o sufixo com o id da URL.
        const postPart = p.id.split('_')[1]
        return Boolean(postPart && target === `post:${postPart}`)
      })
      if (found) return { externalPostId: found.id, externalUrl: found.permalinkUrl ?? url }
      if (!nextCursor) break
      after = nextCursor
    }
    return null
  }
}
