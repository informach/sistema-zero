import type { ProviderAccount } from '../../domain/ports/oauth-provider.port'
import type { SecretBox } from '../../domain/ports/secret-box.port'
import type { SocialAccount } from '../../domain/social-account/social-account'

/**
 * Materializa uma `ProviderAccount` (o que o consent/renovação devolveu) numa
 * `SocialAccount` pronta p/ upsert — tokens SEMPRE selados aqui, nunca depois.
 * Usado pelo callback OAuth e pela renovação proativa (Meta 60d).
 */
export function buildSocialAccount(input: {
  account: ProviderAccount
  secretBox: SecretBox
  connectedBy: string
  now: Date
  id: string
}): SocialAccount {
  const { account, secretBox, now } = input
  return {
    id: input.id,
    version: 0,
    network: account.network,
    externalId: account.identity.externalId,
    displayName: account.identity.displayName,
    username: account.identity.username,
    accessTokenEnc: secretBox.seal(account.tokens.accessToken),
    refreshTokenEnc: account.tokens.refreshToken
      ? secretBox.seal(account.tokens.refreshToken)
      : null,
    tokenExpiresAt: account.tokens.expiresInSeconds
      ? new Date(now.getTime() + account.tokens.expiresInSeconds * 1000)
      : null,
    refreshExpiresAt: account.tokens.refreshExpiresInSeconds
      ? new Date(now.getTime() + account.tokens.refreshExpiresInSeconds * 1000)
      : null,
    scopes: account.tokens.scopes,
    status: 'connected',
    metadata: account.identity.metadata,
    connectedBy: input.connectedBy,
    lastRefreshAt: null,
    lastRefreshError: null,
    createdAt: now,
    updatedAt: now,
  }
}
