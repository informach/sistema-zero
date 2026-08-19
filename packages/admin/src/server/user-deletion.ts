import type { CallOpts, GatewayResponse } from './gateway'

interface UserDeletionDependencies {
  gatewayFetch(path: string, options?: CallOpts): Promise<GatewayResponse<unknown>>
  purgeCreationBlobs(userIds: readonly string[]): Promise<void>
}

function preparedDeletionFrom(body: unknown): { profileIds: string[]; completed: boolean } | null {
  if (
    !body ||
    typeof body !== 'object' ||
    !('profileIds' in body) ||
    !Array.isArray(body.profileIds)
  ) {
    return null
  }
  const ids: string[] = []
  for (const id of body.profileIds) {
    if (typeof id !== 'string' || id.length === 0) return null
    ids.push(id)
  }
  const completed = 'completed' in body && body.completed === true
  return { profileIds: ids, completed }
}

/** Orquestra a exclusão idempotente; o Members registra a limpeza durável antes de apagar o índice. */
export async function executeUserDeletion(
  id: string,
  deps: UserDeletionDependencies,
): Promise<GatewayResponse> {
  const encodedId = encodeURIComponent(id)
  const profiles = await deps.gatewayFetch(`/auth/admin/users/${encodedId}/deletion/prepare`, {
    method: 'POST',
  })
  if (profiles.status >= 400) return profiles
  const prepared = preparedDeletionFrom(profiles.body)
  if (!prepared) {
    return {
      status: 502,
      body: {
        error: {
          code: 'INVALID_PROFILES_RESPONSE',
          message: 'Não foi possível identificar os perfis da conta para a exclusão.',
        },
      },
    }
  }
  if (prepared.completed) return { status: 200, body: { ok: true } }
  const { profileIds } = prepared

  const creationOwners = [...new Set([id, ...profileIds])]
  const purgeCreationBlobs = async (): Promise<void> => {
    try {
      await deps.purgeCreationBlobs(creationOwners)
    } catch (error) {
      console.error('[user-deletion] falha ao apagar criações no R2', { id, error })
      // Redução de storage best-effort. A garantia é o job pós-TTL que a purga
      // do Members registra de forma atômica antes de apagar o índice.
    }
  }
  await purgeCreationBlobs()

  const query = profileIds.length > 0 ? { profileIds: profileIds.join(',') } : undefined
  const members = await deps.gatewayFetch(`/members/admin/users/${encodedId}/data`, {
    method: 'DELETE',
    query,
  })
  if (members.status >= 400) return members
  const hub = await deps.gatewayFetch(`/hub/admin/users/${encodedId}/data`, {
    method: 'DELETE',
    query,
  })
  if (hub.status >= 400) return hub

  // Reduz o resíduo imediato; PUTs ainda em voo são cobertos pelo job pós-TTL.
  await purgeCreationBlobs()

  const auth = await deps.gatewayFetch(`/auth/admin/users/${encodedId}`, { method: 'DELETE' })
  if (auth.status >= 400) return auth
  return { status: 200, body: { ok: true } }
}
