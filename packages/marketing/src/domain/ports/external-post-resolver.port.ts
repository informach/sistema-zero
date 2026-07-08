import type { Network } from '../publication/publication'
import type { SocialAccount } from '../social-account/social-account'

export interface ResolvedExternalPost {
  externalPostId: string
  externalUrl: string
}

/**
 * Resolve a URL de um post REAL (colada pela equipe) no id que as métricas
 * usam. YouTube é regex puro; IG/FB casam contra a listagem da conta (por
 * isso `requiresAccount`). null = não achou → 404 EXTERNAL_POST_NOT_FOUND.
 */
export interface ExternalPostResolver {
  readonly network: Network
  readonly requiresAccount: boolean
  resolve(input: {
    url: string
    account: SocialAccount | null
    accessToken: string | null
  }): Promise<ResolvedExternalPost | null>
}
