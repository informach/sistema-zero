export type AvatarReturnPath = '/' | '/perfil'

/** Allowlist pequena evita que `returnTo` transforme o configurador em open redirect. */
export function resolveAvatarReturnPath(value: string | undefined): AvatarReturnPath {
  return value === '/' ? '/' : '/perfil'
}
