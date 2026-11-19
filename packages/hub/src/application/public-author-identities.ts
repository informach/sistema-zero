import type { MembersGateway } from '../domain/ports/members-gateway.port'

interface AuthorSnapshot {
  authorId: string
  authorAccountId: string | null
  authorDisplayName: string | null
  authorPublic: boolean
}

/** Historical snapshots never authorize publishing a child's private name. */
export class PublicAuthorIdentities {
  constructor(private readonly members?: Pick<MembersGateway, 'getPublicProfileIdentities'>) {}

  async project<T extends AuthorSnapshot>(rows: T[], audience: string): Promise<T[]> {
    if (audience !== 'kids') return rows
    // Default legacy profiles share the account UUID. Only the identity authority
    // can distinguish them from staff accounts; snapshots cannot do so.
    const ids = [...new Set(rows.map((row) => row.authorId))]
    const identities = new Map<string, { publicNickname: string; publicProfileEnabled: boolean }>()
    for (let offset = 0; offset < ids.length; offset += 200) {
      try {
        const batch = await this.members?.getPublicProfileIdentities?.(
          ids.slice(offset, offset + 200),
        )
        for (const [id, identity] of batch ?? []) identities.set(id, identity)
      } catch {
        /* Fail closed for identity; the creation remains available. */
      }
    }
    return rows.map((row) => {
      const identity = identities.get(row.authorId)
      return {
        ...row,
        authorDisplayName: identity?.publicNickname.trim() || 'Criador(a)',
        authorPublic: identity?.publicProfileEnabled === true,
      }
    })
  }

  async one<T extends AuthorSnapshot>(row: T, audience: string): Promise<T> {
    return (await this.project([row], audience))[0] as T
  }
}
