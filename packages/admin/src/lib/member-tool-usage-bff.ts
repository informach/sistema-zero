import { parseMemberProfiles } from './member-profiles-bff'

interface UpstreamResult<T = unknown> {
  status: number
  body: T
}

function invalidProfilesUpstream(): UpstreamResult<unknown> {
  return {
    status: 502,
    body: { error: { code: 'UPSTREAM_ERROR', message: 'Não foi possível carregar os perfis.' } },
  }
}

/** Compõe Auth → Members sem transformar falha do Auth em sucesso parcial. */
export async function composeMemberToolUsage<TProfiles, TUsage>(
  accountId: string,
  profilesResult: UpstreamResult<TProfiles>,
  loadUsage: (accountId: string, profileIds: string[]) => Promise<UpstreamResult<TUsage>>,
): Promise<UpstreamResult<TProfiles> | UpstreamResult<TUsage> | UpstreamResult> {
  if (profilesResult.status !== 200) return profilesResult
  const profiles = parseMemberProfiles(profilesResult.body)
  if (!profiles) return invalidProfilesUpstream()
  return loadUsage(
    accountId,
    profiles.map((profile) => profile.id),
  )
}
