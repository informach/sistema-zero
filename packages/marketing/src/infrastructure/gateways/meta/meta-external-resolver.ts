import type {
  ExternalPostResolver,
  ResolvedExternalPost,
} from '../../../domain/ports/external-post-resolver.port'
import type { SocialAccount } from '../../../domain/social-account/social-account'
import type { MetaApi } from './meta-api.port'

/** Teto de páginas na busca (50/página ≈ os últimos ~400 posts, ~90d típicos). */
const MAX_PAGES = 8

/** Host/query/trailing-slash fora — sobra o caminho canônico p/ comparar. */
function normalizeUrl(url: string): string {
  try {
    const u = new URL(url)
    return u.pathname.replace(/\/+$/, '').toLowerCase()
  } catch {
    return url.toLowerCase()
  }
}

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
    if (!input.account || !input.accessToken) return null
    return this.network === 'instagram'
      ? this.resolveInstagram(input.url, input.account, input.accessToken)
      : this.resolveFacebook(input.url, input.account, input.accessToken)
  }

  private async resolveInstagram(
    url: string,
    account: SocialAccount,
    accessToken: string,
  ): Promise<ResolvedExternalPost | null> {
    const match = url.match(/instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/)
    const shortcode = match?.[1]
    if (!shortcode) return null
    let after: string | undefined
    for (let page = 0; page < MAX_PAGES; page++) {
      const { items, nextCursor } = await this.api.listIgMedia({
        accessToken,
        igUserId: account.externalId,
        after,
      })
      const found = items.find((m) => m.permalink?.includes(`/${shortcode}/`))
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
    const target = normalizeUrl(url)
    // Ids numéricos longos na URL (story_fbid/fbid/posts/<id>) também casam.
    const numericIds = [...url.matchAll(/(\d{10,})/g)].map((m) => m[1])
    let after: string | undefined
    for (let page = 0; page < MAX_PAGES; page++) {
      const { items, nextCursor } = await this.api.listFbPosts({
        accessToken,
        pageId: account.externalId,
        after,
      })
      const found = items.find((p) => {
        if (p.permalinkUrl && normalizeUrl(p.permalinkUrl) === target) return true
        // Post id é `{pageId}_{postId}` — casa o sufixo com o id da URL.
        const postPart = p.id.split('_')[1]
        return Boolean(postPart && numericIds.includes(postPart))
      })
      if (found) return { externalPostId: found.id, externalUrl: found.permalinkUrl ?? url }
      if (!nextCursor) break
      after = nextCursor
    }
    return null
  }
}
