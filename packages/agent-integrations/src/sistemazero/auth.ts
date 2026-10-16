import { createHash } from 'node:crypto'
import { type StaffOperation, staffMutation, staffOperationSchema } from '@sistemazero/core/staff'
import { z } from 'zod'
import { ApiError, JsonService } from './http'

export interface CredentialVault {
  get(name: string): Promise<string | null>
  set(name: string, value: string): Promise<unknown>
  delete(name: string): Promise<unknown>
}
const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  role: z.string(),
  status: z.string(),
})
const tokensSchema = z.object({
  accessToken: z.string().min(10),
  refreshToken: z.string().min(20),
  tokenType: z.literal('Bearer'),
  expiresIn: z.number().positive(),
  refreshExpiresIn: z.number().positive(),
})
const sessionSchema = z.object({ user: userSchema, tokens: tokensSchema, expiresAt: z.number() })
export class StaffClient {
  readonly http: JsonService
  private name: string
  private tail: Promise<unknown> = Promise.resolve()
  constructor(
    origin: string,
    private vault: CredentialVault,
    fetchImpl?: typeof fetch,
  ) {
    this.http = new JsonService(origin, fetchImpl)
    this.name = `staff.${createHash('sha256').update(this.http.origin).digest('hex').slice(0, 32)}`
  }
  private serial<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.tail.catch(() => undefined).then(operation)
    this.tail = next.then(
      () => undefined,
      () => undefined,
    )
    return next
  }
  requestCode(email: string, signal?: AbortSignal) {
    return this.serial(async () => {
      await this.http.request('/auth/otp/request', {
        method: 'POST',
        body: { email: z.string().email().parse(email), purpose: 'sign_in', platform: 'main' },
        signal,
      })
      return { requested: true }
    })
  }
  verifyCode(email: string, code: string, signal?: AbortSignal) {
    return this.serial(async () => {
      const response = await this.http.request('/auth/otp/verify', {
        method: 'POST',
        body: {
          email: z.string().email().parse(email),
          code: z
            .string()
            .regex(/^\d{6}$/)
            .parse(code),
          platform: 'main',
        },
        signal,
      })
      const parsed = z.object({ user: userSchema, tokens: tokensSchema }).parse(response.value)
      const session = { ...parsed, expiresAt: Date.now() + parsed.tokens.expiresIn * 1000 }
      await this.vault.set(this.name, JSON.stringify(session))
      return { connected: true, user: parsed.user }
    })
  }
  private async session(signal?: AbortSignal) {
    const raw = await this.vault.get(this.name)
    if (!raw) throw new ApiError(401, 'LOGIN_REQUIRED')
    let session = sessionSchema.parse(JSON.parse(raw))
    if (session.expiresAt <= Date.now() + 30000) {
      // Refresh is single-use. An ambiguous rotation requires a new login, never replay.
      try {
        const response = await this.http.request('/auth/refresh', {
          method: 'POST',
          body: { refreshToken: session.tokens.refreshToken },
          signal,
        })
        const { tokens } = z.object({ tokens: tokensSchema }).parse(response.value)
        session = { ...session, tokens, expiresAt: Date.now() + tokens.expiresIn * 1000 }
        await this.vault.set(this.name, JSON.stringify(session))
      } catch (error) {
        await this.vault.delete(this.name)
        throw error
      }
    }
    return session
  }
  status(signal?: AbortSignal) {
    return this.serial(async () => {
      if (!(await this.vault.get(this.name))) return { connected: false, origin: this.http.origin }
      try {
        const session = await this.session(signal)
        const response = await this.http.request('/auth/me', {
          token: session.tokens.accessToken,
          signal,
        })
        const { user } = z.object({ user: userSchema }).parse(response.value)
        await this.http.request('/auth/staff/operations', {
          method: 'POST',
          token: session.tokens.accessToken,
          body: { refreshToken: session.tokens.refreshToken, operation: { action: 'identity' } },
          signal,
        })
        return { connected: true, origin: this.http.origin, user }
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          await this.vault.delete(this.name)
          return { connected: false, origin: this.http.origin }
        }
        throw error
      }
    })
  }
  operation(raw: StaffOperation, signal?: AbortSignal, expectedUserId?: string) {
    return this.serial(async () => {
      const operation = staffOperationSchema.parse(raw)
      const session = await this.session(signal)
      if (expectedUserId && session.user.id !== expectedUserId)
        throw new ApiError(403, 'ACCOUNT_CHANGED')
      try {
        return await this.http.request('/auth/staff/operations', {
          method: 'POST',
          token: session.tokens.accessToken,
          body: { refreshToken: session.tokens.refreshToken, operation },
          signal,
          maxBytes: operation.action === 'studio.build' ? 4_000_000 : 2_000_000,
          timeoutMs: operation.action === 'studio.build' ? 65000 : 20000,
          readOnly: !staffMutation(operation),
        })
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) await this.vault.delete(this.name)
        throw error
      }
    })
  }
  logout(signal?: AbortSignal) {
    return this.serial(async () => {
      const raw = await this.vault.get(this.name)
      if (!raw) return { connected: false }
      const session = sessionSchema.parse(JSON.parse(raw))
      // Preserve the credential on failed revocation so the user can retry logout.
      await this.http.request('/auth/logout', {
        method: 'POST',
        body: { refreshToken: session.tokens.refreshToken, allSessions: false },
        signal,
      })
      await this.vault.delete(this.name)
      return { connected: false }
    })
  }
}
