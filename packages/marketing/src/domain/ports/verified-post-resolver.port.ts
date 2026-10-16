import type { Network } from '../publication/publication'
import type { ResolvedExternalPost } from './external-post-resolver.port'

export interface VerifiedPost extends ResolvedExternalPost {
  socialAccountId: string
  accountVersion: number
}
export interface VerifiedPostResolver {
  readonly networks: ReadonlySet<Network>
  verify(network: Network, accountId: string, url: string): Promise<VerifiedPost>
}
