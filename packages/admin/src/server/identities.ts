import 'server-only'
import { batchGetProfiles, batchGetUsers } from '@/server/users'

/** Referência mínima de identidade: perfil/conta que agiu + conta responsável. */
export interface IdentityRef {
  userId: string
  accountId: string | null
}

export interface HydratedIdentity {
  accountName: string | null
  accountEmail: string | null
  childName: string | null
}

/**
 * Resolve contas e perfis kids em lotes de 100. As duas fontes são best-effort:
 * indisponibilidade do Auth remove só a identidade hidratada, nunca a moderação.
 */
export async function resolveIdentities(
  refs: readonly IdentityRef[],
): Promise<(ref: IdentityRef) => HydratedIdentity> {
  const accountIdOf = (ref: IdentityRef) => ref.accountId ?? ref.userId
  const accountMap = new Map<string, { name: string; email: string }>()
  const accountIds = [...new Set(refs.map(accountIdOf))]
  await Promise.all(
    chunksOf(accountIds, 100).map(async (ids) => {
      try {
        const usersRes = await batchGetUsers(ids)
        if (usersRes.status === 200 && usersRes.body) {
          for (const user of usersRes.body.users) {
            accountMap.set(user.id, {
              name: `${user.firstName} ${user.lastName}`.trim(),
              email: user.email,
            })
          }
        }
      } catch {
        // Best-effort: snapshots do Hub continuam disponíveis na tela.
      }
    }),
  )

  const profileNames = new Map<string, string>()
  const profileIds = [
    ...new Set(
      refs.filter((ref) => ref.accountId && ref.accountId !== ref.userId).map((ref) => ref.userId),
    ),
  ]
  await Promise.all(
    chunksOf(profileIds, 100).map(async (ids) => {
      try {
        const profilesRes = await batchGetProfiles(ids)
        if (profilesRes.status === 200 && profilesRes.body) {
          for (const profile of profilesRes.body.profiles) {
            profileNames.set(profile.id, profile.name)
          }
        }
      } catch {
        // Best-effort: o nome snapshot do autor é o fallback da UI.
      }
    }),
  )

  return (ref) => {
    const account = accountMap.get(accountIdOf(ref))
    const isProfile = Boolean(ref.accountId && ref.accountId !== ref.userId)
    return {
      accountName: account?.name || null,
      accountEmail: account?.email ?? null,
      childName: isProfile ? (profileNames.get(ref.userId) ?? null) : null,
    }
  }
}

function chunksOf<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}
