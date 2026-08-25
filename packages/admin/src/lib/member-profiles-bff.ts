export interface MemberProfileUpstream {
  id: string
  name: string
  avatarUrl: string | null
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/** Contrato compartilhado da resposta de perfis do Auth usada pelos dois BFFs. */
export function parseMemberProfiles(body: unknown): MemberProfileUpstream[] | null {
  if (!isRecord(body) || !Array.isArray(body.profiles)) return null

  const profiles: MemberProfileUpstream[] = []
  for (const profile of body.profiles) {
    if (
      !isRecord(profile) ||
      typeof profile.id !== 'string' ||
      profile.id.length === 0 ||
      typeof profile.name !== 'string' ||
      (profile.avatarUrl !== null && typeof profile.avatarUrl !== 'string')
    ) {
      return null
    }
    profiles.push({ id: profile.id, name: profile.name, avatarUrl: profile.avatarUrl })
  }
  return profiles
}

/**
 * Valida a resposta de progresso do Members contra os IDs enviados. Não aceita
 * itens parciais, duplicados ou de outro perfil: qualquer um deles faria a UI
 * exibir progresso vazio como se fosse um resultado verdadeiro.
 */
export function parseProfilesProgress(
  body: Record<string, unknown>,
  profileIds: string[],
): Map<string, unknown[]> | null {
  if (profileIds.length === 0 && body.profilesProgress === undefined) return new Map()
  if (!Array.isArray(body.profilesProgress)) return null

  const expected = new Set(profileIds)
  const progressById = new Map<string, unknown[]>()
  for (const item of body.profilesProgress) {
    if (
      !isRecord(item) ||
      typeof item.userId !== 'string' ||
      !expected.has(item.userId) ||
      progressById.has(item.userId) ||
      !Array.isArray(item.progress)
    ) {
      return null
    }
    progressById.set(item.userId, item.progress)
  }

  return progressById.size === expected.size ? progressById : null
}
