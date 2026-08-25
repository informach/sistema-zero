import { isRecord, parseMemberProfiles, parseProfilesProgress } from './member-profiles-bff'

interface UpstreamResult<T = unknown> {
  status: number
  body: T
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
  if (!isRecord(identityResult.body)) return invalidUpstream()
  if (!isRecord(identityResult.body.user)) return invalidUpstream()
  if (identityResult.body.user.id !== accountId) return invalidUpstream()
  const profiles = parseMemberProfiles(profilesResult.body)
  if (!profiles) return invalidUpstream()
  const detailResult = await loadMember(
    accountId,
    profiles.map((profile) => profile.id),
  )
  if (detailResult.status !== 200) return detailResult
  if (!isRecord(detailResult.body)) return invalidUpstream()
  if (
    detailResult.body.userId !== accountId ||
    !Array.isArray(detailResult.body.entitlements) ||
    !Array.isArray(detailResult.body.progress)
  )
    return invalidUpstream()

  const progressById = parseProfilesProgress(
    detailResult.body,
    profiles.map((profile) => profile.id),
  )
  if (!progressById) return invalidUpstream()
  const hydratedProfiles = []
  for (const profile of profiles) {
    const progress = progressById.get(profile.id)
    if (!progress) return invalidUpstream()
    hydratedProfiles.push({
      id: profile.id,
      name: profile.name,
      avatarUrl: profile.avatarUrl,
      progress,
    })
  }

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
