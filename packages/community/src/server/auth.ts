import 'server-only'
import { getEnv } from '@/lib/env'
import type { UserView } from '@/lib/types'
import { type GatewayResponse, gatewayFetch, gatewayFetchReadonly } from './gateway'

/** Usuário fresco do banco (traz `phone`, que pode não estar nas claims). */
export function getMe(): Promise<GatewayResponse<{ user: UserView }>> {
  return gatewayFetch('/auth/me')
}

/**
 * Usuário fresco SEM refresh/escrita de cookie — único seguro em Server
 * Components (layout/page). Access expirado → 401 (caller usa fallback).
 */
export function getMeReadonly(): Promise<GatewayResponse<{ user: UserView }>> {
  return gatewayFetchReadonly('/auth/me')
}

export function updateMe(body: {
  firstName?: string
  lastName?: string
  phone?: string | null
  avatarUrl?: string | null
}): Promise<GatewayResponse<{ user: UserView }>> {
  return gatewayFetch('/auth/me', { method: 'PATCH', body })
}

export function changeMyPassword(body: {
  currentPassword: string
  newPassword: string
}): Promise<GatewayResponse<{ ok: boolean }>> {
  return gatewayFetch('/auth/me/password', { method: 'POST', body })
}

/** Rotas PÚBLICAS (sem Bearer) — chamadas diretas ao gateway. */
async function publicPost(path: string, body: unknown): Promise<GatewayResponse> {
  const env = getEnv()
  const res = await fetch(new URL(path, env.GATEWAY_URL), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  })
  return { status: res.status, body: await res.json().catch(() => null) }
}

export function forgotPassword(email: string): Promise<GatewayResponse> {
  return publicPost('/auth/forgot-password', { email })
}

export function resetPassword(token: string, newPassword: string): Promise<GatewayResponse> {
  return publicPost('/auth/reset-password', { token, newPassword })
}

/** Pede um código OTP (login passwordless ou recuperação de senha). Sempre 200 (anti-enum). */
export function requestOtp(
  email: string,
  purpose: 'sign_in' | 'password_reset',
): Promise<GatewayResponse> {
  return publicPost('/auth/otp/request', { email, purpose })
}

/** Redefine a senha consumindo um código OTP de recuperação. */
export function resetPasswordWithOtp(
  email: string,
  code: string,
  newPassword: string,
): Promise<GatewayResponse> {
  return publicPost('/auth/password/reset-otp', { email, code, newPassword })
}
