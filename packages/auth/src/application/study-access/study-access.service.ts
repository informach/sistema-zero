import { randomUUID } from 'node:crypto'
import { ValidationError } from '@sistemazero/core/errors'
import { ForbiddenError, TooManyRequestsError, UnauthorizedError } from '@sistemazero/core/http'
import { sha256Hex } from '@sistemazero/core/security'
import type { ProfileRepository } from '../../domain/ports/profile-repository.port'
import type {
  StudyAccessRepository,
  StudyGrant,
} from '../../domain/ports/study-access-repository.port'
import type { AccessTokenClaims } from '../../domain/ports/token-issuer.port'
import type { UserRepository } from '../../domain/ports/user-repository.port'
import {
  DeviceOtherFamilyError,
  ParentReauthenticationRequiredError,
  StudyAccessRequiredError,
} from '../../domain/study-access/errors'
import {
  createStudyCode,
  isRecentParentAuth,
  normalizeStudyCode,
  STUDY_CODE_TTL_MS,
  studyAccessExpiresAt,
} from '../../domain/study-access/policy'
import type { AuthTokenService } from '../tokens/auth-token.service'

export {
  DeviceOtherFamilyError,
  ParentReauthenticationRequiredError,
  StudyAccessRequiredError,
} from '../../domain/study-access/errors'

export class StudyAccessService {
  constructor(
    private readonly repository: StudyAccessRepository,
    private readonly profiles: ProfileRepository,
    private readonly users: UserRepository,
    private readonly tokens: AuthTokenService,
  ) {}

  async list(claims: AccessTokenClaims, profileId: string, deviceToken?: string) {
    const account = requireParent(claims, false)
    await this.requireProfile(account, profileId)
    const device = deviceToken
      ? await this.repository.getDevice(deviceHash(deviceToken), new Date())
      : null
    const grants = await this.repository.listGrants(account, profileId)
    return {
      grants: grants.map((grant) => ({
        ...grantView(grant),
        isCurrentDevice: grant.deviceId === device?.id,
      })),
    }
  }

  async create(
    claims: AccessTokenClaims,
    input: {
      profileId: string
      label: string
      durationDays: number
      deviceToken?: string
      mode: 'code' | 'current'
    },
  ) {
    const accountUserId = requireParent(claims)
    await this.requireProfile(accountUserId, input.profileId)
    const label = input.label.trim()
    if (label.length < 2 || label.length > 60)
      throw new ValidationError('Dê um nome de 2 a 60 letras para o aparelho.')
    const now = new Date()
    const expiresAt = studyAccessExpiresAt(input.durationDays, now)
    if (input.mode === 'current') {
      const grant = await this.repository.createGrant({
        accountUserId,
        profileId: input.profileId,
        deviceHash: deviceHash(input.deviceToken ?? ''),
        label,
        expiresAt,
        now,
      })
      if (!grant) throw new StudyAccessRequiredError()
      return { grant: grantView(grant) }
    }
    // Limita emissão por conta também em múltiplas réplicas.
    if (!(await this.repository.takeAttempt(sha256Hex(`issue:${accountUserId}`), now)))
      throw new TooManyRequestsError(600)
    const code = createStudyCode()
    const codeExpiresAt = new Date(now.getTime() + STUDY_CODE_TTL_MS)
    await this.repository.createCode({
      id: randomUUID(),
      codeHash: sha256Hex(code),
      accountUserId,
      profileId: input.profileId,
      label,
      durationDays: input.durationDays,
      expiresAt: codeExpiresAt,
    })
    return {
      code: `${code.slice(0, 5)}-${code.slice(5)}`,
      codeExpiresAt: codeExpiresAt.toISOString(),
      durationDays: input.durationDays,
    }
  }

  async redeem(input: {
    code: string
    deviceToken: string
    expectedProfileId?: string
    ip: string
  }) {
    const now = new Date()
    const hash = deviceHash(input.deviceToken)
    // IP confiável vem da borda HTTP, nunca do corpo enviado pelo navegador.
    // ⚠️ Só a FALHA conta: o resgate certo e a repetição da mesma tentativa (resposta que se
    // perdeu) nunca podem esgotar o limite de uma escola inteira atrás do mesmo IP.
    const attemptsKey = sha256Hex(`redeem:${input.ip}`)
    if (await this.repository.attemptsExhausted(attemptsKey, now))
      throw new TooManyRequestsError(600)
    try {
      const normalized = normalizeStudyCode(input.code)
      if (!normalized) throw new StudyAccessRequiredError()
      const grant = await this.repository.redeemCode({
        codeHash: sha256Hex(normalized),
        deviceHash: hash,
        expectedProfileId: input.expectedProfileId,
        now,
      })
      if (!grant) throw new StudyAccessRequiredError()
      return { profileId: grant.profileId }
    } catch (error) {
      if (error instanceof StudyAccessRequiredError || error instanceof DeviceOtherFamilyError)
        await this.repository.takeAttempt(attemptsKey, now)
      throw error
    }
  }

  async recognize(deviceToken: string) {
    const now = new Date()
    const device = await this.repository.getDevice(deviceHash(deviceToken), now)
    if (!device) return { profiles: [] }
    const [profiles, grants] = await Promise.all([
      this.profiles.listActiveByAccount(device.accountUserId),
      this.repository.listGrants(device.accountUserId),
    ])
    const here = grants.filter(
      (grant) =>
        grant.deviceId === device.id && profiles.some((profile) => profile.id === grant.profileId),
    )
    const live = (grant: StudyGrant) => !grant.revokedAt && grant.expiresAt > now
    // ⚠️ Sem nenhuma autorização VIVA o navegador é DESCONHECIDO: nomes e fotos da família só
    // aparecem enquanto o responsável mantém um acesso aberto aqui. Antes, a credencial de
    // 365 dias seguia listando a família depois de todos os acessos encerrados.
    if (!here.some(live)) return { profiles: [] }
    const latest = here
      .filter((grant) => grant.lastUsedAt)
      .sort((a, b) => (b.lastUsedAt?.getTime() ?? 0) - (a.lastUsedAt?.getTime() ?? 0))[0]
    return {
      profiles: profiles.map((profile) => {
        const grant = here.find((g) => g.profileId === profile.id)
        return {
          id: profile.id,
          name: profile.name,
          available: Boolean(grant && live(grant)),
          expiresAt: grant?.expiresAt.toISOString() ?? null,
          revoked: Boolean(grant?.revokedAt),
          lastUsed: grant?.id === latest?.id && Boolean(latest),
        }
      }),
    }
  }

  async enter(input: {
    deviceToken: string
    profileId: string
    userAgent?: string | null
    ip?: string | null
  }) {
    const now = new Date()
    const sessionId = randomUUID()
    const grant = await this.repository.activate(
      deviceHash(input.deviceToken),
      input.profileId,
      sessionId,
      now,
    )
    if (!grant) throw new StudyAccessRequiredError()
    const [account, profile] = await Promise.all([
      this.users.findById(grant.accountUserId),
      this.profiles.findById(grant.profileId),
    ])
    if (!account?.isActive() || !profile?.belongsTo(account.id) || profile.isArchived)
      throw new StudyAccessRequiredError()
    const tokens = await this.tokens.issueForUser(account, {
      kids: { kind: 'student', sessionId, deviceId: grant.deviceId, grantId: grant.id },
      familyExpiresAt: grant.expiresAt,
      profile: {
        profileId: profile.id,
        claim: { accountId: account.id, name: profile.name, pub: profile.publicProfileEnabled },
      },
      userAgent: input.userAgent,
      ip: input.ip,
    })
    return { tokens, profile: { id: profile.id, name: profile.name } }
  }

  async suspend(deviceToken: string) {
    await this.repository.suspend(deviceHash(deviceToken), new Date())
  }

  /**
   * Esquece o navegador INTEIRO (todos os perfis da família nele). ⚠️ Só o responsável
   * autenticado há pouco: com o cookie do aparelho uma criança apagava o acesso dos irmãos.
   */
  async forgetDevice(claims: AccessTokenClaims, deviceToken: string) {
    const account = requireParent(claims)
    await this.repository.forgetDevice(deviceHash(deviceToken), account, new Date())
  }

  async disconnect(deviceToken: string, profileId: string) {
    await this.repository.revokeOnDevice(deviceHash(deviceToken), profileId, new Date())
  }

  async update(
    claims: AccessTokenClaims,
    grantId: string,
    input: { action: 'renew' | 'revoke' | 'rename'; durationDays?: number; label?: string },
  ) {
    const account = requireParent(claims)
    const now = new Date()
    let changed = false
    if (input.action === 'renew')
      changed = await this.repository.renew(
        account,
        grantId,
        studyAccessExpiresAt(input.durationDays ?? -1, now),
        now,
      )
    if (input.action === 'revoke') changed = await this.repository.revoke(account, grantId, now)
    if (input.action === 'rename') {
      const label = input.label?.trim() ?? ''
      if (label.length < 2 || label.length > 60)
        throw new ValidationError('Dê um nome de 2 a 60 letras para o aparelho.')
      changed = await this.repository.rename(account, grantId, label)
    }
    if (!changed) throw new StudyAccessRequiredError()
    return { ok: true }
  }

  private async requireProfile(account: string, profileId: string) {
    const profile = await this.profiles.findById(profileId)
    if (!profile?.belongsTo(account) || profile.isArchived) throw new StudyAccessRequiredError()
    return profile
  }
}

function requireParent(claims: AccessTokenClaims, recent = true): string {
  if (claims.kids?.kind !== 'parent' || claims.pfl || claims.act)
    throw new ForbiddenError('Entre como responsável.')
  if (recent && !isRecentParentAuth(claims.kids.authenticatedAt))
    throw new ParentReauthenticationRequiredError()
  return claims.sub
}

function deviceHash(token: string): string {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new UnauthorizedError('Aparelho não reconhecido.')
  return sha256Hex(token)
}

function grantView(grant: StudyGrant) {
  return {
    id: grant.id,
    profileId: grant.profileId,
    label: grant.label,
    expiresAt: grant.expiresAt.toISOString(),
    revokedAt: grant.revokedAt?.toISOString() ?? null,
    lastUsedAt: grant.lastUsedAt?.toISOString() ?? null,
    // A área dos pais compara o prazo escolhido com o que falta: "Somente hoje" não pede renovação.
    createdAt: grant.createdAt.toISOString(),
  }
}
