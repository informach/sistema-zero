import { randomUUID } from 'node:crypto'
import type { Logger } from '@sistemazero/core/logging'
import type { Attachment } from '../../src/domain/attachment/attachment'
import { DuplicateSlugError } from '../../src/domain/hub-errors'
import type { MuteBan, MuteBanKind } from '../../src/domain/moderation/mute-ban'
import { isActiveMuteBan } from '../../src/domain/moderation/mute-ban'
import type {
  AttachmentRepository,
  CreateAttachmentInput,
} from '../../src/domain/ports/attachment-repository.port'
import type {
  ChannelFields,
  CommunityAdminRepository,
  ListSpacesAdminFilter,
  SpaceFields,
} from '../../src/domain/ports/community-admin-repository.port'
import type { CommunityReadRepository } from '../../src/domain/ports/community-read-repository.port'
import type {
  ChallengeEntryArgs,
  ClubContributionArgs,
  CourseAccessResult,
  MembersGateway,
  MuralCommentArgs,
  MuralModerationMessageArgs,
  PlaysMilestoneArgs,
  ShowcaseEligibilityArgs,
  ShowcaseEligibilityResult,
  ShowcasePublishedArgs,
  StandaloneShowcaseArgs,
} from '../../src/domain/ports/members-gateway.port'
import type {
  CreateMuteBanInput,
  CreateReportInput,
  ModerationActionInput,
  ModerationRepository,
  PendingItem,
  ReportRecord,
  ReportStatus,
} from '../../src/domain/ports/moderation-repository.port'
import type { ProcessedWebhookRepository } from '../../src/domain/ports/processed-webhook-repository.port'
import type {
  ReactionRepository,
  ReactionSummaryItem,
  ReactionTarget,
} from '../../src/domain/ports/reaction-repository.port'
import type { ReadStateRepository } from '../../src/domain/ports/read-state-repository.port'
import type {
  CreateCommentInput,
  CreateShowcaseThreadInput,
  CreateThreadInput,
  ListCommentsOpts,
  ListThreadsOpts,
  ThreadRepository,
} from '../../src/domain/ports/thread-repository.port'
import type { Audience, Channel, Space } from '../../src/domain/space/space'
import type { Comment, Thread } from '../../src/domain/thread/thread'

export const silentLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
}

/** Fake in-memory de `CommunityAdminRepository` + `CommunityReadRepository`. */
export class InMemoryCommunityAdminRepository
  implements CommunityAdminRepository, CommunityReadRepository
{
  spaces: Space[] = []
  channels: Channel[] = []

  async listSpacesAdmin(filter: ListSpacesAdminFilter): Promise<{ items: Space[]; total: number }> {
    let items = [...this.spaces]
    if (filter.audience) items = items.filter((s) => s.audience === filter.audience)
    if (filter.status) items = items.filter((s) => s.status === filter.status)
    if (filter.q) {
      const q = filter.q.toLowerCase()
      items = items.filter(
        (s) => s.name.toLowerCase().includes(q) || s.slug.toLowerCase().includes(q),
      )
    }
    items.sort((a, b) => a.sortOrder - b.sortOrder)
    const total = items.length
    return { items: items.slice(filter.offset, filter.offset + filter.limit), total }
  }

  async findSpaceById(id: string): Promise<Space | null> {
    return this.spaces.find((s) => s.id === id) ?? null
  }

  async createSpace(fields: SpaceFields): Promise<Space> {
    if (this.spaces.some((s) => s.slug === fields.slug)) throw new DuplicateSlugError()
    const now = new Date()
    const maxOrder = this.spaces
      .filter((s) => s.audience === fields.audience)
      .reduce((m, s) => Math.max(m, s.sortOrder + 1), 0)
    const space: Space = {
      id: randomUUID(),
      version: 0,
      ...fields,
      sortOrder: maxOrder,
      createdAt: now,
      updatedAt: now,
    }
    this.spaces.push(space)
    return space
  }

  async updateSpace(space: Space): Promise<boolean> {
    const idx = this.spaces.findIndex((s) => s.id === space.id && s.version === space.version)
    if (idx === -1) return false
    if (this.spaces.some((s) => s.slug === space.slug && s.id !== space.id)) {
      throw new DuplicateSlugError()
    }
    this.spaces[idx] = { ...space, version: space.version + 1, updatedAt: new Date() }
    return true
  }

  async deleteSpace(id: string): Promise<boolean> {
    const before = this.spaces.length
    this.spaces = this.spaces.filter((s) => s.id !== id)
    this.channels = this.channels.filter((c) => c.spaceId !== id)
    return this.spaces.length < before
  }

  async listSpaceIds(audience: Audience): Promise<string[]> {
    return this.spaces
      .filter((s) => s.audience === audience)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((s) => s.id)
  }

  async reorderSpaces(audience: Audience, orderedIds: string[]): Promise<void> {
    orderedIds.forEach((id, i) => {
      const s = this.spaces.find((x) => x.id === id && x.audience === audience)
      if (s) s.sortOrder = i
    })
  }

  async listChannelsBySpace(spaceId: string): Promise<Channel[]> {
    return this.channels
      .filter((c) => c.spaceId === spaceId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
  }

  async findChannelById(id: string): Promise<Channel | null> {
    return this.channels.find((c) => c.id === id) ?? null
  }

  async createChannel(spaceId: string, fields: ChannelFields): Promise<Channel> {
    if (this.channels.some((c) => c.spaceId === spaceId && c.slug === fields.slug)) {
      throw new DuplicateSlugError()
    }
    const now = new Date()
    const maxOrder = this.channels
      .filter((c) => c.spaceId === spaceId)
      .reduce((m, c) => Math.max(m, c.sortOrder + 1), 0)
    const channel: Channel = {
      id: randomUUID(),
      version: 0,
      spaceId,
      ...fields,
      sortOrder: maxOrder,
      createdAt: now,
      updatedAt: now,
    }
    this.channels.push(channel)
    return channel
  }

  async updateChannel(channel: Channel): Promise<boolean> {
    const idx = this.channels.findIndex((c) => c.id === channel.id && c.version === channel.version)
    if (idx === -1) return false
    if (
      this.channels.some(
        (c) => c.spaceId === channel.spaceId && c.slug === channel.slug && c.id !== channel.id,
      )
    ) {
      throw new DuplicateSlugError()
    }
    this.channels[idx] = { ...channel, version: channel.version + 1, updatedAt: new Date() }
    return true
  }

  async deleteChannel(id: string): Promise<boolean> {
    const before = this.channels.length
    this.channels = this.channels.filter((c) => c.id !== id)
    return this.channels.length < before
  }

  async listChannelIds(spaceId: string): Promise<string[]> {
    return this.channels
      .filter((c) => c.spaceId === spaceId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((c) => c.id)
  }

  async reorderChannels(spaceId: string, orderedIds: string[]): Promise<void> {
    orderedIds.forEach((id, i) => {
      const c = this.channels.find((x) => x.id === id && x.spaceId === spaceId)
      if (c) c.sortOrder = i
    })
  }

  // ── CommunityReadRepository (status='active') ───────────────────────────────
  async listActiveSpaces(audience: Audience): Promise<Space[]> {
    return this.spaces
      .filter((s) => s.audience === audience && s.status === 'active')
      .sort((a, b) => a.sortOrder - b.sortOrder)
  }

  async findActiveSpaceById(id: string): Promise<Space | null> {
    return this.spaces.find((s) => s.id === id && s.status === 'active') ?? null
  }

  async findActiveSpaceBySlug(slug: string): Promise<Space | null> {
    return this.spaces.find((s) => s.slug === slug && s.status === 'active') ?? null
  }

  async listActiveChannels(spaceId: string): Promise<Channel[]> {
    return this.channels
      .filter((c) => c.spaceId === spaceId && c.status === 'active')
      .sort((a, b) => a.sortOrder - b.sortOrder)
  }

  async findActiveChannelById(id: string): Promise<Channel | null> {
    return this.channels.find((c) => c.id === id && c.status === 'active') ?? null
  }
}

/** `(t,id) < (t2,id2)` lexicográfico (timestamp, depois id). */
function ltPos(aT: Date, aId: string, bT: Date, bId: string): boolean {
  if (aT.getTime() !== bT.getTime()) return aT.getTime() < bT.getTime()
  return aId < bId
}

/** Fake in-memory de `ThreadRepository`. */
export class InMemoryThreadRepository implements ThreadRepository {
  threads: Thread[] = []
  comments: Comment[] = []
  /** Wireado pelo helper de teste: o vínculo de anexos é atômico com o create. */
  attachments: InMemoryAttachmentRepository | null = null

  async createThread(input: CreateThreadInput): Promise<Thread> {
    const thread: Thread = {
      id: input.id,
      version: 0,
      channelId: input.channelId,
      authorId: input.authorId,
      authorAccountId: input.authorAccountId,
      title: input.title,
      slug: input.slug,
      body: input.body,
      isPinned: false,
      isLocked: false,
      status: input.status,
      commentCount: 0,
      isShowcase: false,
      authorDisplayName: input.authorDisplayName,
      authorPublic: input.authorPublic,
      coverImageUrl: null,
      playId: input.playId ?? null,
      playsCount: 0,
      challengeKey: null,
      lastActivityAt: input.now,
      createdAt: input.now,
      editedAt: null,
    }
    this.threads.push(thread)
    if (input.attachmentIds.length > 0) {
      this.attachments?.linkMany(input.attachmentIds, { threadId: thread.id })
    }
    return thread
  }

  async listByAuthor(authorId: string, limit: number): Promise<Thread[]> {
    return this.threads
      .filter((t) => t.authorId === authorId && t.status === 'visible')
      .sort((a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime())
      .slice(0, limit)
  }

  /** Dedupe da vitrine: chave de idempotência → id do tópico (a chave não é do domínio). */
  private readonly showcaseKeys = new Map<string, string>()

  async createShowcaseThread(
    input: CreateShowcaseThreadInput,
  ): Promise<{ thread: Thread; deduped: boolean }> {
    const existingId = this.showcaseKeys.get(input.idempotencyKey)
    if (existingId) {
      const existing = this.threads.find((t) => t.id === existingId)
      if (existing) return { thread: existing, deduped: true }
    }
    const thread: Thread = {
      id: input.id,
      version: 0,
      channelId: input.channelId,
      authorId: input.authorId,
      // Vitrine não recebe recompensa de Clube (usa course_showcased) → sem conta snapshot.
      authorAccountId: null,
      title: input.title,
      slug: input.slug,
      body: input.body,
      isPinned: false,
      isLocked: false,
      status: 'visible',
      commentCount: 0,
      isShowcase: true,
      authorDisplayName: input.authorDisplayName,
      authorPublic: input.authorPublic,
      coverImageUrl: input.coverImageUrl,
      playId: input.playId,
      playsCount: 0,
      challengeKey: input.challengeKey ?? null,
      lastActivityAt: input.now,
      createdAt: input.now,
      editedAt: null,
    }
    this.threads.push(thread)
    this.showcaseKeys.set(input.idempotencyKey, thread.id)
    return { thread, deduped: false }
  }

  async hasVisibleShowcasePlayId(
    playId: string,
    countHit = false,
  ): Promise<{
    visible: boolean
    authorDisplayName: string | null
    authorId: string | null
    authorAccountId: string | null
    playsCount: number
  }> {
    const found = this.threads.find(
      (t) => t.playId === playId && t.isShowcase && t.status === 'visible',
    )
    if (found && countHit) found.playsCount += 1
    return {
      visible: Boolean(found),
      authorDisplayName: found?.authorDisplayName ?? null,
      authorId: found?.authorId ?? null,
      authorAccountId: found?.authorAccountId ?? null,
      playsCount: found?.playsCount ?? 0,
    }
  }

  async showcaseStatsByAuthor(authorId: string): Promise<{ published: number; plays: number }> {
    const mine = this.threads.filter(
      (t) => t.authorId === authorId && t.isShowcase && t.status === 'visible',
    )
    return { published: mine.length, plays: mine.reduce((sum, t) => sum + t.playsCount, 0) }
  }

  async listShowcaseByAuthors(
    authorIds: string[],
    from: Date,
    to: Date,
  ): Promise<Array<{ authorId: string; title: string; playId: string | null; createdAt: Date }>> {
    return this.threads
      .filter(
        (t) =>
          authorIds.includes(t.authorId) &&
          t.isShowcase &&
          t.status === 'visible' &&
          t.createdAt >= from &&
          t.createdAt < to,
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((t) => ({
        authorId: t.authorId,
        title: t.title,
        playId: t.playId,
        createdAt: t.createdAt,
      }))
  }

  async findThreadById(id: string): Promise<Thread | null> {
    return this.threads.find((t) => t.id === id) ?? null
  }

  async listThreads(
    channelId: string,
    opts: ListThreadsOpts,
  ): Promise<{ items: Thread[]; hasMore: boolean }> {
    const visible = (t: Thread) =>
      t.status === 'visible' ||
      (t.status === 'pending' && (opts.includeAllPending || t.authorId === opts.viewerId))
    const byActivityDesc = (a: Thread, b: Thread) =>
      b.lastActivityAt.getTime() - a.lastActivityAt.getTime() || (a.id < b.id ? 1 : -1)
    const all = this.threads.filter(
      (t) =>
        t.channelId === channelId &&
        visible(t) &&
        (!opts.challengeKey || t.challengeKey === opts.challengeKey),
    )
    const pinned = all.filter((t) => t.isPinned).sort(byActivityDesc)
    let rest = all.filter((t) => !t.isPinned).sort(byActivityDesc)
    if (opts.cursor) {
      const c = opts.cursor
      rest = rest.filter((t) => ltPos(t.lastActivityAt, t.id, c.t, c.id))
    }
    const slice = rest.slice(0, opts.limit + 1)
    const hasMore = slice.length > opts.limit
    const page = slice.slice(0, opts.limit)
    return { items: opts.cursor === null ? [...pinned, ...page] : page, hasMore }
  }

  async latestActivityByChannel(channelIds: string[]): Promise<Map<string, Date>> {
    const map = new Map<string, Date>()
    for (const t of this.threads) {
      if (t.status !== 'visible' || !channelIds.includes(t.channelId)) continue
      const cur = map.get(t.channelId)
      if (!cur || t.lastActivityAt > cur) map.set(t.channelId, t.lastActivityAt)
    }
    return map
  }

  async updateThread(thread: Thread): Promise<boolean> {
    const idx = this.threads.findIndex((t) => t.id === thread.id && t.version === thread.version)
    if (idx === -1) return false
    this.threads[idx] = { ...thread, version: thread.version + 1 }
    return true
  }

  async setThreadStatus(
    id: string,
    status: Thread['status'],
    now: Date,
    bumpActivity = false,
  ): Promise<boolean> {
    const t = this.threads.find((x) => x.id === id)
    if (!t) return false
    t.status = status
    if (bumpActivity) t.lastActivityAt = now
    return true
  }

  async setThreadPinned(id: string, pinned: boolean): Promise<boolean> {
    const t = this.threads.find((x) => x.id === id)
    if (!t) return false
    t.isPinned = pinned
    return true
  }

  async setThreadLocked(id: string, locked: boolean): Promise<boolean> {
    const t = this.threads.find((x) => x.id === id)
    if (!t) return false
    t.isLocked = locked
    return true
  }

  async setCommentStatus(id: string, status: Comment['status'], now: Date): Promise<boolean> {
    const c = this.comments.find((x) => x.id === id)
    if (!c) return false
    const prev = c.status
    c.status = status
    const thread = this.threads.find((t) => t.id === c.threadId)
    if (thread) {
      if (status === 'visible' && prev !== 'visible') {
        thread.commentCount += 1
        thread.lastActivityAt = now
      } else if (status !== 'visible' && prev === 'visible') {
        thread.commentCount = Math.max(0, thread.commentCount - 1)
      }
    }
    return true
  }

  async createComment(input: CreateCommentInput): Promise<Comment> {
    const comment: Comment = {
      id: input.id,
      version: 0,
      threadId: input.threadId,
      authorId: input.authorId,
      authorAccountId: input.authorAccountId,
      authorDisplayName: input.authorDisplayName,
      authorPublic: input.authorPublic,
      body: input.body,
      status: input.status,
      replyToId: input.replyToId,
      createdAt: input.now,
      editedAt: null,
    }
    this.comments.push(comment)
    if (input.status === 'visible') {
      const thread = this.threads.find((t) => t.id === input.threadId)
      if (thread) {
        thread.commentCount += 1
        thread.lastActivityAt = input.now
      }
    }
    if (input.attachmentIds.length > 0) {
      this.attachments?.linkMany(input.attachmentIds, { commentId: comment.id })
    }
    return comment
  }

  async findCommentById(id: string): Promise<Comment | null> {
    return this.comments.find((c) => c.id === id) ?? null
  }

  async listComments(
    threadId: string,
    opts: ListCommentsOpts,
  ): Promise<{ items: Comment[]; hasMore: boolean }> {
    const visible = (c: Comment) =>
      c.status === 'visible' ||
      (c.status === 'pending' && (opts.includeAllPending || c.authorId === opts.viewerId))
    let rows = this.comments
      .filter((c) => c.threadId === threadId && visible(c))
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || (a.id < b.id ? -1 : 1))
    if (opts.after) {
      const a = opts.after
      rows = rows.filter((c) => ltPos(a.t, a.id, c.createdAt, c.id))
    }
    const slice = rows.slice(0, opts.limit + 1)
    const hasMore = slice.length > opts.limit
    return { items: slice.slice(0, opts.limit), hasMore }
  }

  async updateComment(comment: Comment): Promise<boolean> {
    const idx = this.comments.findIndex((c) => c.id === comment.id && c.version === comment.version)
    if (idx === -1) return false
    this.comments[idx] = { ...comment, version: comment.version + 1 }
    return true
  }
}

/** Fake in-memory de `AttachmentRepository`. */
export class InMemoryAttachmentRepository implements AttachmentRepository {
  rows: Attachment[] = []

  async create(input: CreateAttachmentInput): Promise<Attachment> {
    const a: Attachment = {
      id: input.id,
      ownerId: input.ownerId,
      threadId: null,
      commentId: null,
      kind: input.kind,
      storageRef: input.storageRef,
      mime: input.mime,
      sizeBytes: input.sizeBytes,
      width: null,
      height: null,
      durationSeconds: null,
      originalName: input.originalName,
      status: 'pending_upload',
      createdAt: input.now,
    }
    this.rows.push(a)
    return a
  }

  async findById(id: string): Promise<Attachment | null> {
    return this.rows.find((a) => a.id === id) ?? null
  }

  async findOwnedPending(ownerId: string, ids: string[]): Promise<Attachment[]> {
    const set = new Set(ids)
    return this.rows.filter(
      (a) => a.ownerId === ownerId && a.status === 'pending_upload' && set.has(a.id),
    )
  }

  /**
   * Helper de teste (não faz parte da porta): o vínculo real acontece DENTRO da
   * transação do `createThread`/`createComment` do repo Drizzle; aqui o fake do
   * thread repo chama isto para espelhar a atomicidade.
   */
  linkMany(ids: string[], target: { threadId?: string; commentId?: string }): void {
    const set = new Set(ids)
    for (const a of this.rows) {
      if (!set.has(a.id) || a.status !== 'pending_upload') continue
      if (target.threadId) a.threadId = target.threadId
      if (target.commentId) a.commentId = target.commentId
      a.status = 'ready'
    }
  }

  async listByThreadIds(threadIds: string[]): Promise<Map<string, Attachment[]>> {
    const set = new Set(threadIds)
    const map = new Map<string, Attachment[]>()
    for (const a of this.rows) {
      if (a.status !== 'ready' || !a.threadId || !set.has(a.threadId)) continue
      const list = map.get(a.threadId) ?? []
      list.push(a)
      map.set(a.threadId, list)
    }
    return map
  }

  async listByCommentIds(commentIds: string[]): Promise<Map<string, Attachment[]>> {
    const set = new Set(commentIds)
    const map = new Map<string, Attachment[]>()
    for (const a of this.rows) {
      if (a.status !== 'ready' || !a.commentId || !set.has(a.commentId)) continue
      const list = map.get(a.commentId) ?? []
      list.push(a)
      map.set(a.commentId, list)
    }
    return map
  }
}

/** Fake in-memory de `ReactionRepository`. */
export class InMemoryReactionRepository implements ReactionRepository {
  rows: Array<{
    target: ReactionTarget
    targetId: string
    userId: string
    emoji: string
  }> = []

  async add(
    target: ReactionTarget,
    targetId: string,
    userId: string,
    emoji: string,
  ): Promise<void> {
    const exists = this.rows.some(
      (r) =>
        r.target === target && r.targetId === targetId && r.userId === userId && r.emoji === emoji,
    )
    if (!exists) this.rows.push({ target, targetId, userId, emoji })
  }

  async remove(
    target: ReactionTarget,
    targetId: string,
    userId: string,
    emoji: string,
  ): Promise<boolean> {
    const before = this.rows.length
    this.rows = this.rows.filter(
      (r) =>
        !(
          r.target === target &&
          r.targetId === targetId &&
          r.userId === userId &&
          r.emoji === emoji
        ),
    )
    return this.rows.length < before
  }

  async summarize(
    target: ReactionTarget,
    targetIds: string[],
    userId: string,
  ): Promise<Map<string, ReactionSummaryItem[]>> {
    const map = new Map<string, ReactionSummaryItem[]>()
    for (const id of targetIds) {
      const rows = this.rows.filter((r) => r.target === target && r.targetId === id)
      if (rows.length === 0) continue
      const byEmoji = new Map<string, { count: number; me: boolean }>()
      for (const r of rows) {
        const cur = byEmoji.get(r.emoji) ?? { count: 0, me: false }
        cur.count += 1
        if (r.userId === userId) cur.me = true
        byEmoji.set(r.emoji, cur)
      }
      map.set(
        id,
        [...byEmoji.entries()].map(([emoji, v]) => ({
          emoji,
          count: v.count,
          reactedByMe: v.me,
        })),
      )
    }
    return map
  }
}

/** Fake in-memory de `ReadStateRepository`. */
export class InMemoryReadStateRepository implements ReadStateRepository {
  rows = new Map<string, Date>() // key: `${userId}|${channelId}`

  async markSeen(userId: string, channelId: string, now: Date): Promise<void> {
    this.rows.set(`${userId}|${channelId}`, now)
  }

  async lastSeen(userId: string, channelIds: string[]): Promise<Map<string, Date>> {
    const map = new Map<string, Date>()
    for (const id of channelIds) {
      const v = this.rows.get(`${userId}|${id}`)
      if (v) map.set(id, v)
    }
    return map
  }
}

/** Fake in-memory de `ModerationRepository` (lê threads/structure por referência). */
export class InMemoryModerationRepository implements ModerationRepository {
  reports: ReportRecord[] = []
  mutesBans: MuteBan[] = []
  actions: ModerationActionInput[] = []

  constructor(
    private readonly threads: InMemoryThreadRepository,
    private readonly structure: InMemoryCommunityAdminRepository,
  ) {}

  async listPending(opts: { spaceId?: string; limit: number; offset: number }) {
    const channelSpace = new Map(this.structure.channels.map((c) => [c.id, c.spaceId]))
    const items: PendingItem[] = []
    for (const t of this.threads.threads) {
      if (t.status !== 'pending') continue
      const sid = channelSpace.get(t.channelId)
      if (!sid || (opts.spaceId && sid !== opts.spaceId)) continue
      items.push({
        type: 'thread',
        id: t.id,
        spaceId: sid,
        channelId: t.channelId,
        threadId: null,
        authorId: t.authorId,
        title: t.title,
        body: t.body,
        createdAt: t.createdAt,
      })
    }
    for (const c of this.threads.comments) {
      if (c.status !== 'pending') continue
      const thread = this.threads.threads.find((x) => x.id === c.threadId)
      if (!thread) continue
      const sid = channelSpace.get(thread.channelId)
      if (!sid || (opts.spaceId && sid !== opts.spaceId)) continue
      items.push({
        type: 'comment',
        id: c.id,
        spaceId: sid,
        channelId: thread.channelId,
        threadId: c.threadId,
        authorId: c.authorId,
        title: null,
        body: c.body,
        createdAt: c.createdAt,
      })
    }
    items.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    return { items: items.slice(opts.offset, opts.offset + opts.limit), total: items.length }
  }

  async createReport(input: CreateReportInput): Promise<void> {
    this.reports.push({
      id: randomUUID(),
      targetType: input.targetType,
      targetId: input.targetId,
      spaceId: input.spaceId,
      reporterId: input.reporterId,
      reason: input.reason,
      status: 'open',
      resolvedBy: null,
      resolvedAt: null,
      createdAt: input.now,
    })
  }

  async listReports(opts: {
    spaceId?: string
    status?: ReportStatus
    limit: number
    offset: number
  }) {
    let rows = [...this.reports]
    if (opts.spaceId) rows = rows.filter((r) => r.spaceId === opts.spaceId)
    if (opts.status) rows = rows.filter((r) => r.status === opts.status)
    rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    return { items: rows.slice(opts.offset, opts.offset + opts.limit), total: rows.length }
  }

  async findReportById(id: string): Promise<ReportRecord | null> {
    return this.reports.find((r) => r.id === id) ?? null
  }

  async resolveReport(
    id: string,
    status: ReportStatus,
    resolvedBy: string,
    now: Date,
  ): Promise<boolean> {
    const r = this.reports.find((x) => x.id === id && x.status === 'open')
    if (!r) return false
    r.status = status
    r.resolvedBy = resolvedBy
    r.resolvedAt = now
    return true
  }

  async createMuteBan(input: CreateMuteBanInput): Promise<MuteBan> {
    // Dedup: substitui o ativo de MESMO escopo (user, space, canal, tipo).
    this.mutesBans = this.mutesBans.filter(
      (m) =>
        !(
          m.userId === input.userId &&
          m.spaceId === input.spaceId &&
          m.kind === input.kind &&
          m.channelId === input.channelId &&
          isActiveMuteBan(m, input.now)
        ),
    )
    const mb: MuteBan = {
      id: randomUUID(),
      userId: input.userId,
      spaceId: input.spaceId,
      channelId: input.channelId,
      kind: input.kind,
      expiresAt: input.expiresAt,
      reason: input.reason,
      createdBy: input.createdBy,
      createdAt: input.now,
    }
    this.mutesBans.push(mb)
    return mb
  }

  async removeMuteBan(
    userId: string,
    spaceId: string,
    kind: MuteBanKind,
    now: Date,
  ): Promise<boolean> {
    const before = this.mutesBans.length
    this.mutesBans = this.mutesBans.filter(
      (m) =>
        !(
          m.userId === userId &&
          m.spaceId === spaceId &&
          m.kind === kind &&
          isActiveMuteBan(m, now)
        ),
    )
    return this.mutesBans.length < before
  }

  async findActiveForUser(
    userId: string,
    spaceId: string,
    channelId: string,
    now: Date,
  ): Promise<MuteBan | null> {
    const active = this.mutesBans.filter(
      (m) =>
        m.userId === userId &&
        m.spaceId === spaceId &&
        (m.channelId === null || m.channelId === channelId) &&
        isActiveMuteBan(m, now),
    )
    if (active.length === 0) return null
    return active.find((m) => m.kind === 'ban') ?? active[0] ?? null
  }

  async listMutesBans(spaceId: string): Promise<MuteBan[]> {
    return this.mutesBans.filter((m) => m.spaceId === spaceId)
  }

  async logAction(input: ModerationActionInput): Promise<void> {
    this.actions.push(input)
  }
}

/** Fake in-memory de `ProcessedWebhookRepository` (dedupe de webhooks). */
export class InMemoryProcessedWebhookRepository implements ProcessedWebhookRepository {
  ids = new Map<string, string>()

  async isProcessed(deliveryId: string): Promise<boolean> {
    return this.ids.has(deliveryId)
  }

  async markProcessed(deliveryId: string, eventName: string): Promise<void> {
    if (!this.ids.has(deliveryId)) this.ids.set(deliveryId, eventName)
  }
}

/** Fake do gateway do members: grants e master configuráveis por usuário. */
export class FakeMembersGateway implements MembersGateway {
  /** userId → cursos com matrícula ativa. */
  grantsByUser = new Map<string, Set<string>>()
  /** userIds com chave-mestra ADULTA (all_courses) ativa. */
  masters = new Set<string>()
  /** userIds com chave-mestra KIDS (all_kids_courses) ativa. */
  mastersKids = new Set<string>()
  /** userId → chaves de comunidade ativas (entitlement `community`). */
  communitiesByUser = new Map<string, Set<string>>()
  calls = 0
  /** Elegibilidade da vitrine: default ELEGÍVEL/kids; sobrescreva por teste. */
  showcaseEligibility: ShowcaseEligibilityResult = {
    eligible: true,
    title: 'Meu joguinho',
    summary: 'Um jogo de plataforma com a faísca pulando.',
    defaultCoverUrl: 'https://cdn.example.com/capa-padrao.png',
    chain: 'cadeia-1',
    courseId: 'curso-1',
    audience: 'kids',
  }
  eligibilityCalls: ShowcaseEligibilityArgs[] = []

  async checkAccess(
    userId: string,
    courseRefs: string[],
    _communityRefs: string[] = [],
  ): Promise<CourseAccessResult> {
    this.calls++
    const owned = this.grantsByUser.get(userId) ?? new Set<string>()
    return {
      granted: courseRefs.filter((c) => owned.has(c)),
      hasMaster: this.masters.has(userId),
      hasMasterKids: this.mastersKids.has(userId),
      communities: [...(this.communitiesByUser.get(userId) ?? [])],
    }
  }

  async getShowcaseEligibility(args: ShowcaseEligibilityArgs): Promise<ShowcaseEligibilityResult> {
    this.eligibilityCalls.push(args)
    return this.showcaseEligibility
  }

  /** Registra as notificações de "publicou no Mural" (nível do aluno) — best-effort. */
  showcaseNotifications: ShowcasePublishedArgs[] = []
  async notifyShowcasePublished(args: ShowcasePublishedArgs): Promise<void> {
    this.showcaseNotifications.push(args)
  }

  /** Registra as notificações do DESAFIO do mês (XP + badge) — best-effort. */
  challengeNotifications: ChallengeEntryArgs[] = []
  async notifyChallengeEntry(args: ChallengeEntryArgs): Promise<void> {
    this.challengeNotifications.push(args)
  }

  /** Registra as recompensas de contribuição no Clube (aprovação) — best-effort. */
  clubContributions: ClubContributionArgs[] = []
  async notifyClubContribution(args: ClubContributionArgs): Promise<void> {
    this.clubContributions.push(args)
  }

  /** Registra os marcos "comentar no Mural" (aprovação) — best-effort. */
  muralComments: MuralCommentArgs[] = []
  async notifyMuralComment(args: MuralCommentArgs): Promise<void> {
    this.muralComments.push(args)
  }

  /** Registra as publicações STANDALONE (marco + XP diário de publicar) — best-effort. */
  standaloneShowcases: StandaloneShowcaseArgs[] = []
  async notifyStandaloneShowcase(args: StandaloneShowcaseArgs): Promise<void> {
    this.standaloneShowcases.push(args)
  }

  /** Registra os marcos de plays (jogo cruzou 10/100 jogadas) — best-effort. */
  playsMilestones: PlaysMilestoneArgs[] = []
  async notifyPlaysMilestone(args: PlaysMilestoneArgs): Promise<void> {
    this.playsMilestones.push(args)
  }

  /** Registra os recados de moderação do Mural (motivo → recado ao aluno) — best-effort. */
  moderationMessages: MuralModerationMessageArgs[] = []
  async notifyMuralModerationMessage(args: MuralModerationMessageArgs): Promise<void> {
    this.moderationMessages.push(args)
  }
}
