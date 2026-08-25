interface UpstreamResult<T = unknown> {
  status: number
  body: T
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function invalidUpstream(): UpstreamResult {
  return {
    status: 502,
    body: { error: { code: 'UPSTREAM_ERROR', message: 'Não foi possível carregar o membro.' } },
  }
}

/** Auth (identidade + perfis) → Members → view hidratada, sem sucesso parcial silencioso. */
export async function composeMemberDetail(
  accountId: string,
  identityResult: UpstreamResult,
  profilesResult: UpstreamResult,
  loadMember: (accountId: string, profileIds: string[]) => Promise<UpstreamResult>,
): Promise<UpstreamResult> {
  if (identityResult.status !== 200) return identityResult
  if (profilesResult.status !== 200) return profilesResult
  if (!isRecord(identityResult.body) || !isRecord(profilesResult.body)) return invalidUpstream()
  if (!isRecord(identityResult.body.user)) return invalidUpstream()
  if (!Array.isArray(profilesResult.body.profiles)) return invalidUpstream()

  const profiles = profilesResult.body.profiles
  if (
    !profiles.every(
      (profile) =>
        isRecord(profile) &&
        typeof profile.id === 'string' &&
        typeof profile.name === 'string' &&
        (profile.avatarUrl === null || typeof profile.avatarUrl === 'string'),
    )
  )
    return invalidUpstream()
  const detailResult = await loadMember(
    accountId,
    profiles.map((profile) => (profile as { id: string }).id),
  )
  if (detailResult.status !== 200) return detailResult
  if (!isRecord(detailResult.body)) return invalidUpstream()
  if (
    typeof detailResult.body.userId !== 'string' ||
    !Array.isArray(detailResult.body.entitlements) ||
    !Array.isArray(detailResult.body.progress)
  )
    return invalidUpstream()

  const progressById = new Map<string, unknown>()
  if (Array.isArray(detailResult.body.profilesProgress)) {
    for (const item of detailResult.body.profilesProgress) {
      if (isRecord(item) && typeof item.userId === 'string' && Array.isArray(item.progress)) {
        progressById.set(item.userId, item.progress)
      }
    }
  }
  const hydratedProfiles = profiles.map((rawProfile) => {
    const profile = rawProfile as { id: string; name: string; avatarUrl: string | null }
    return {
      id: profile.id,
      name: profile.name,
      avatarUrl: profile.avatarUrl,
      progress: progressById.get(profile.id) ?? [],
    }
  })

  return {
    status: 200,
    body: {
      userId: detailResult.body.userId,
      entitlements: detailResult.body.entitlements,
      progress: detailResult.body.progress,
      user: identityResult.body.user ?? null,
      ...(hydratedProfiles.length > 0 ? { profiles: hydratedProfiles } : {}),
    },
  }
}
