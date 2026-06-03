import type { EntitlementStatus } from '../../domain/entitlement/entitlement.status'
import type { EntitlementRepository } from '../../domain/ports/entitlement-repository.port'
import { type MemberSummaryView, toMemberSummaryView } from '../mappers/admin-views'

export interface ListMembersCommand {
  status?: EntitlementStatus
  courseRef?: string
  limit: number
  offset: number
}

export interface ListMembersResultView {
  items: MemberSummaryView[]
  total: number
  limit: number
  offset: number
}

/**
 * Listagem admin de MEMBROS (usuários com matrículas). Autoritativa no members
 * (identidade nome/email é hidratada do auth pelo BFF). Paginada; `total` é o nº
 * de membros (grupos), não de matrículas.
 */
export class ListMembersService {
  constructor(
    private readonly entitlements: EntitlementRepository,
    private readonly clock: () => Date,
  ) {}

  async execute(cmd: ListMembersCommand): Promise<ListMembersResultView> {
    const { items, total } = await this.entitlements.listMembers(
      { status: cmd.status, courseRef: cmd.courseRef, limit: cmd.limit, offset: cmd.offset },
      this.clock(),
    )
    return {
      items: items.map(toMemberSummaryView),
      total,
      limit: cmd.limit,
      offset: cmd.offset,
    }
  }
}
