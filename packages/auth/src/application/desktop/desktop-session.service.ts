import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { ValidationError } from '@sistemazero/core/errors'
import { ForbiddenError, UnauthorizedError } from '@sistemazero/core/http'
import { sha256Hex } from '@sistemazero/core/security'
import type { DesktopSessionRepository } from '../../domain/ports/desktop-session-repository.port'
import type { AccessTokenClaims } from '../../domain/ports/token-issuer.port'
import type { UserRepository } from '../../domain/ports/user-repository.port'
import type { AuthTokenService } from '../tokens/auth-token.service'

const normalizeCode = (code: string) => code.replace(/[-\s]/g, '').toUpperCase()
export class DesktopSessionService {
  constructor(
    private readonly repository: DesktopSessionRepository,
    private readonly users: UserRepository,
    private readonly tokens: AuthTokenService,
  ) {}
  async start(input: { label: string; challenge: string }) {
    if (
      !/^[A-Za-z0-9_-]{43}$/.test(input.challenge) ||
      input.label.trim().length < 2 ||
      input.label.length > 80
    )
      throw new ValidationError('Identificação do computador inválida')
    const deviceCode = randomBytes(32).toString('base64url'),
      userCode = randomBytes(6).toString('hex').toUpperCase()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)
    await this.repository.createPairing({
      id: randomUUID(),
      deviceCodeHash: sha256Hex(deviceCode),
      userCodeHash: sha256Hex(userCode),
      challenge: input.challenge,
      label: input.label.trim(),
      expiresAt,
    })
    return {
      deviceCode,
      userCode: `${userCode.slice(0, 4)}-${userCode.slice(4, 8)}-${userCode.slice(8)}`,
      expiresAt: expiresAt.toISOString(),
      intervalSeconds: 5,
    }
  }
  private async staff(claims: AccessTokenClaims, browserOnly = false) {
    if (claims.act || claims.pfl || claims.kids || (browserOnly && claims.desktop))
      throw new ForbiddenError('Use sua conta da equipe no navegador')
    const user = await this.users.findById(claims.sub)
    if (!user?.isActive() || !['staff', 'admin', 'superadmin'].includes(user.role))
      throw new ForbiddenError('Acesso restrito à equipe ativa')
    return user
  }
  async describe(claims: AccessTokenClaims, code: string) {
    await this.staff(claims, true)
    const pairing = await this.repository.describe(sha256Hex(normalizeCode(code)), new Date())
    if (!pairing) throw new UnauthorizedError('Código inválido ou expirado')
    return { label: pairing.label, expiresAt: pairing.expiresAt.toISOString() }
  }
  async approve(claims: AccessTokenClaims, code: string) {
    const user = await this.staff(claims, true)
    if (!(await this.repository.approve(sha256Hex(normalizeCode(code)), user.id, new Date())))
      throw new UnauthorizedError('Código inválido ou já utilizado')
    return { approved: true }
  }
  async exchange(input: { deviceCode: string; verifier: string }) {
    if (
      !/^[A-Za-z0-9_-]{43}$/.test(input.deviceCode) ||
      !/^[A-Za-z0-9._~-]{43,128}$/.test(input.verifier)
    )
      throw new ValidationError('Prova do dispositivo inválida')
    const challenge = createHash('sha256').update(input.verifier).digest('base64url')
    const credential = randomBytes(32).toString('base64url')
    const grant = await this.repository.consume(
      sha256Hex(input.deviceCode),
      challenge,
      sha256Hex(credential),
      new Date(),
    )
    if (!grant)
      throw new UnauthorizedError('Conexão expirada ou já utilizada. Inicie uma nova conexão.')
    if (grant.status === 'pending') return grant
    const user = await this.users.findById(grant.device.userId)
    if (!user?.isActive() || !['staff', 'admin', 'superadmin'].includes(user.role)) {
      await this.repository.revoke(grant.device.userId, grant.device.id, new Date())
      throw new ForbiddenError('Conta sem acesso à equipe')
    }
    const access = await this.tokens.issueDesktopAccess(user, {
      app: 'marketing',
      deviceId: grant.device.id,
      sessionId: grant.device.sessionId,
    })
    return {
      status: 'connected' as const,
      deviceId: grant.device.id,
      userId: user.id,
      credential,
      expiresAt: grant.device.expiresAt.toISOString(),
      ...access,
    }
  }
  async access(credential: string) {
    const device = await this.repository.findByCredential(sha256Hex(credential), new Date())
    if (!device) throw new UnauthorizedError('Conecte novamente este computador')
    const user = await this.users.findById(device.userId)
    if (!user?.isActive() || !['staff', 'admin', 'superadmin'].includes(user.role))
      throw new ForbiddenError('Conta sem acesso à equipe')
    return this.tokens.issueDesktopAccess(user, {
      app: 'marketing',
      deviceId: device.id,
      sessionId: device.sessionId,
    })
  }
  async disconnect(credential: string) {
    const device = await this.repository.findByCredential(sha256Hex(credential), new Date())
    if (device) await this.repository.revoke(device.userId, device.id, new Date())
    return { revoked: true }
  }
  async list(claims: AccessTokenClaims) {
    const user = await this.staff(claims)
    const devices = await this.repository.list(user.id)
    return {
      devices: devices.map((d) => ({
        id: d.id,
        label: d.label,
        createdAt: d.createdAt.toISOString(),
        expiresAt: d.expiresAt.toISOString(),
        revokedAt: d.revokedAt?.toISOString() ?? null,
        current: claims.desktop?.deviceId === d.id,
      })),
    }
  }
  async revoke(claims: AccessTokenClaims, id: string) {
    const user = await this.staff(claims, true)
    if (!(await this.repository.revoke(user.id, id, new Date())))
      throw new UnauthorizedError('Computador não encontrado')
    return { revoked: true }
  }
}
