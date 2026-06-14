import type { AccessConfig } from '../../domain/access/access-config'
import {
  ChannelNotFoundError,
  ConcurrencyConflictError,
  InvalidReorderError,
  SpaceNotFoundError,
} from '../../domain/hub-errors'
import type {
  ChannelFields,
  CommunityAdminRepository,
  ListSpacesAdminFilter,
  SpaceFields,
} from '../../domain/ports/community-admin-repository.port'
import { ValidationError } from '../../domain/shared/errors'
import {
  type ChannelView,
  type SpaceTreeView,
  type SpaceView,
  toChannelView,
  toSpaceTreeView,
  toSpaceView,
} from '../mappers/admin-views'

/** Reordenação só vale se os ids enviados forem EXATAMENTE os filhos atuais. */
function assertSameSet(current: string[], provided: string[]): void {
  if (current.length !== provided.length) {
    throw new InvalidReorderError('A reordenação precisa conter exatamente os itens atuais')
  }
  const set = new Set(current)
  for (const id of provided) {
    if (!set.has(id)) throw new InvalidReorderError('Id desconhecido na reordenação')
  }
}

/**
 * Coerência do accessConfig: `course_gated` exige ≥1 curso; `role_gated` exige ≥1
 * cargo (senão seria um acesso impossível — ninguém entraria). `public` ignora ambos.
 * `null` (canal que herda) é coerente por definição.
 */
function assertAccessCoherent(access: AccessConfig | null): void {
  if (!access) return
  if (access.visibility === 'course_gated' && access.courses.length === 0) {
    throw new ValidationError('Selecione ao menos um curso para o acesso "por curso"')
  }
  if (access.visibility === 'role_gated' && access.roles.length === 0) {
    throw new ValidationError('Selecione ao menos um cargo para o acesso "por cargo"')
  }
}

// ── Servidores ────────────────────────────────────────────────────────────────
export class SpaceAdminService {
  constructor(private readonly repo: CommunityAdminRepository) {}

  async list(
    filter: ListSpacesAdminFilter,
  ): Promise<{ items: SpaceView[]; total: number; limit: number; offset: number }> {
    const { items, total } = await this.repo.listSpacesAdmin(filter)
    return { items: items.map(toSpaceView), total, limit: filter.limit, offset: filter.offset }
  }

  async create(fields: SpaceFields): Promise<SpaceView> {
    assertAccessCoherent(fields.accessConfig)
    return toSpaceView(await this.repo.createSpace(fields))
  }

  async get(id: string): Promise<SpaceTreeView> {
    const space = await this.repo.findSpaceById(id)
    if (!space) throw new SpaceNotFoundError()
    const channels = await this.repo.listChannelsBySpace(id)
    return toSpaceTreeView(space, channels)
  }

  async update(id: string, fields: SpaceFields): Promise<SpaceView> {
    assertAccessCoherent(fields.accessConfig)
    const existing = await this.repo.findSpaceById(id)
    if (!existing) throw new SpaceNotFoundError()
    const merged = { ...existing, ...fields }
    const ok = await this.repo.updateSpace(merged)
    if (!ok) throw new ConcurrencyConflictError()
    const fresh = await this.repo.findSpaceById(id)
    return toSpaceView(fresh ?? merged)
  }

  async remove(id: string): Promise<{ ok: true }> {
    if (!(await this.repo.deleteSpace(id))) throw new SpaceNotFoundError()
    return { ok: true }
  }

  async reorder(audience: SpaceFields['audience'], orderedIds: string[]): Promise<{ ok: true }> {
    assertSameSet(await this.repo.listSpaceIds(audience), orderedIds)
    await this.repo.reorderSpaces(audience, orderedIds)
    return { ok: true }
  }
}

// ── Canais ──────────────────────────────────────────────────────────────────
export class ChannelAdminService {
  constructor(private readonly repo: CommunityAdminRepository) {}

  async create(spaceId: string, fields: ChannelFields): Promise<ChannelView> {
    assertAccessCoherent(fields.accessConfig)
    if (!(await this.repo.findSpaceById(spaceId))) throw new SpaceNotFoundError()
    return toChannelView(await this.repo.createChannel(spaceId, fields))
  }

  async update(id: string, fields: ChannelFields): Promise<ChannelView> {
    assertAccessCoherent(fields.accessConfig)
    const existing = await this.repo.findChannelById(id)
    if (!existing) throw new ChannelNotFoundError()
    const merged = { ...existing, ...fields }
    const ok = await this.repo.updateChannel(merged)
    if (!ok) throw new ConcurrencyConflictError()
    const fresh = await this.repo.findChannelById(id)
    return toChannelView(fresh ?? merged)
  }

  async remove(id: string): Promise<{ ok: true }> {
    if (!(await this.repo.deleteChannel(id))) throw new ChannelNotFoundError()
    return { ok: true }
  }

  async reorder(spaceId: string, orderedIds: string[]): Promise<{ ok: true }> {
    if (!(await this.repo.findSpaceById(spaceId))) throw new SpaceNotFoundError()
    assertSameSet(await this.repo.listChannelIds(spaceId), orderedIds)
    await this.repo.reorderChannels(spaceId, orderedIds)
    return { ok: true }
  }
}
