/**
 * Estado de conta. Só `active` pode autenticar/renovar tokens (gate aplicado no
 * login e na autorização do gateway). `pending` reservado p/ verificação de
 * e-mail (futuro); `suspended`/`blocked` para moderação.
 */
export const USER_STATUSES = ['active', 'pending', 'suspended', 'blocked'] as const

export type UserStatus = (typeof USER_STATUSES)[number]

/** Status padrão no cadastro. (Quando houver verificação de e-mail, passa a `pending`.) */
export const DEFAULT_STATUS: UserStatus = 'active'

export function isUserStatus(value: unknown): value is UserStatus {
  return typeof value === 'string' && (USER_STATUSES as readonly string[]).includes(value)
}
