interface UpstreamResult<T> {
  status: number
  body: T
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function profileIdsFrom(body: unknown): string[] {
  if (!isRecord(body) || !Array.isArray(body.profiles)) return []
  return body.profiles.flatMap((profile) =>
    isRecord(profile) && typeof profile.id === 'string' ? [profile.id] : [],
  )
}

/** Compõe Auth → Members sem transformar falha do Auth em sucesso parcial. */
export async function composeMemberToolUsage<TProfiles, TUsage>(
  accountId: string,
  profilesResult: UpstreamResult<TProfiles>,
  loadUsage: (accountId: string, profileIds: string[]) => Promise<UpstreamResult<TUsage>>,
): Promise<UpstreamResult<TProfiles> | UpstreamResult<TUsage>> {
  if (profilesResult.status !== 200) return profilesResult
  return loadUsage(accountId, profileIdsFrom(profilesResult.body))
}
