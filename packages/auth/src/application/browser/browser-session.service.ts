import { randomBytes } from 'node:crypto'
import { UnauthorizedError } from '@sistemazero/core/http'
import { sha256Hex } from '@sistemazero/core/security'
import type { BrowserSessionRepository } from '../../domain/ports/browser-session-repository.port'
import type { UserRepository } from '../../domain/ports/user-repository.port'
import type { AuthTokenService } from '../tokens/auth-token.service'

/** Marketing browser sessions are not desktop devices or rotating refreshes.
 * Every BFF request resolves this opaque credential against canonical revocation. */
export class BrowserSessionService {
  constructor(
    private readonly sessions: BrowserSessionRepository,
    private readonly users: UserRepository,
    private readonly tokens: AuthTokenService,
  ) {}
  private hash(value: string) {
    if (!/^[A-Za-z0-9_-]{43}$/.test(value))
      throw new UnauthorizedError('Entre novamente na sua conta')
    return sha256Hex(value)
  }
  async exchange(refreshToken: string) {
    const credential = randomBytes(32).toString('base64url')
    const session = await this.sessions.exchange(
      this.hash(refreshToken),
      sha256Hex(credential),
      new Date(),
    )
    if (!session) throw new UnauthorizedError('Entre novamente na sua conta')
    return { credential, expiresAt: session.expiresAt.toISOString() }
  }
  async access(credential: string) {
    const session = await this.sessions.find(this.hash(credential), new Date())
    if (!session) throw new UnauthorizedError('Entre novamente na sua conta')
    const user = await this.users.findById(session.userId)
    if (!user?.isActive() || !['staff', 'admin', 'superadmin'].includes(user.role))
      throw new UnauthorizedError('Entre novamente com uma conta da equipe ativa')
    return this.tokens.issueAccessForUser(user)
  }
  async disconnect(credential: string) {
    await this.sessions.disconnect(this.hash(credential), new Date())
    return { revoked: true }
  }
}
