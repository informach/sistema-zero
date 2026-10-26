import { createHash, randomUUID } from 'node:crypto'
import * as P from '@sistemazero/core/pensa'
import { and, count, desc, eq, inArray, isNull, ne, sql } from 'drizzle-orm'
import { pensaOperationRetryable } from '../../../domain/pensa/operation-budget'
import { pensaError } from '../../../domain/pensa/project.errors'
import type { Database } from './db'
import { lockPensaAccount, releasePensaReservation, releasePensaUsage } from './pensa-reservations'
import {
  accountDeletionFences,
  creations,
  pensaCheckpoints,
  pensaDeletionJobs,
  pensaExecutionEvents,
  pensaMissionProgress,
  pensaOperations,
  pensaPlanDrafts,
  pensaProjectMembers,
  pensaProjectMessages,
  pensaProjectRevisions,
  pensaProjectRoles,
  pensaProjects,
  privateNarrations,
} from './schema'

export type PensaTransaction = Parameters<Parameters<Database['transaction']>[0]>[0]
export type PensaProjectRow = typeof pensaProjects.$inferSelect
export interface PensaProjectState {
  project: PensaProjectRow
  revision: P.PensaProjectRevision | null
  draft: P.PensaPlanDraft | null
  progress: P.PensaMissionProgress[]
  team: P.PensaTeamView
  members: Array<typeof pensaProjectMembers.$inferSelect>
  operation: P.PensaOperationView | null
  messages: P.PensaMessage[]
  gameCreation: P.PensaCreationRef | null
  restoredSaveRevision: string | null
  studioAuthoring: P.PensaAuthoring
}

const activeDraftStatuses = ['collecting', 'needs_choice', 'ready']
export const pensaGameId = (projectId: string) => `pensa-${projectId.replaceAll('-', '')}`
export const pensaRequestHash = (actor: P.PensaActor, kind: string, input: object) =>
  createHash('sha256').update(P.pensaCanonicalJson({ actor, kind, input })).digest('hex')

export function operationView(row: typeof pensaOperations.$inferSelect): P.PensaOperationView {
  return P.PensaOperationViewSchema.parse({
    id: row.id,
    projectId: row.projectId,
    draftId: row.draftId,
    kind: row.kind,
    step: row.step,
    status: row.status,
    calls: row.calls,
    error: row.error,
    // Só a falha SEM orçamento diz `retryable: false` (a mesma régua da reivindicação); ausente
    // vale "pode tentar". O campo sai só nesse caso raro porque o Kids valida a view com schema
    // estrito: o app ainda sem o campo, no meio de um deploy, recusaria qualquer falha.
    ...(row.status === 'failed' && !pensaOperationRetryable(row) ? { retryable: false } : {}),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  })
}

export function projectMetadata(row: PensaProjectRow): P.PensaProjectMetadata {
  return P.PensaProjectMetadataSchema.parse({
    ...(row.audience === 'adult' ? { audience: 'adult' } : {}),
    id: row.id,
    name: row.name,
    status: row.status,
    paused: row.paused,
    ownerProfileId: row.userId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    metadataRevision: row.metadataRevision,
    teamRevision: row.teamRevision,
    executionRevision: row.executionRevision,
  })
}

/** PostgreSQL owns authorization, stable identities and the transaction boundary. */
export class DrizzlePensaProjectRepository {
  constructor(
    readonly db: Database,
    readonly clock: () => Date = () => new Date(),
  ) {}

  async load(
    tx: PensaTransaction,
    actor: P.PensaActor,
    projectId: string,
    lock = false,
  ): Promise<PensaProjectState> {
    if (actor.audience === 'adult' && actor.profileId !== actor.accountId)
      pensaError('PROJECT_GONE', 'Conta adulta inválida.')
    const query = tx
      .select()
      .from(pensaProjects)
      .where(
        and(eq(pensaProjects.id, projectId), eq(pensaProjects.audience, actor.audience ?? 'kids')),
      )
    const [project] = lock ? await query.for('update') : await query
    if (!project) pensaError('PROJECT_GONE', 'Este projeto não está mais aqui.')
    const members = await tx
      .select()
      .from(pensaProjectMembers)
      .where(eq(pensaProjectMembers.projectId, projectId))
    const owner = project.userId === actor.profileId && project.accountId === actor.accountId
    if (
      !owner &&
      (project.status !== 'active' ||
        !members.some((m) => m.profileId === actor.profileId && m.accountId === actor.accountId))
    )
      pensaError('PROJECT_GONE', 'Este projeto não está mais aqui.')
    const roles = await tx
      .select()
      .from(pensaProjectRoles)
      .where(eq(pensaProjectRoles.projectId, projectId))
    const peopleIds = new Set([project.userId, ...members.map((m) => m.profileId)])
    let programmerProfileId =
      roles.find((r) => r.role === 'code' && peopleIds.has(r.profileId))?.profileId ??
      project.userId
    const explicitArtists = roles
      .filter((r) => r.role === 'art' && peopleIds.has(r.profileId))
      .map((r) => r.profileId)
    const artistProfileIds = explicitArtists.length ? explicitArtists : [programmerProfileId]
    const [revisionRow] = project.activeRevisionId
      ? await tx
          .select()
          .from(pensaProjectRevisions)
          .where(
            and(
              eq(pensaProjectRevisions.id, project.activeRevisionId),
              eq(pensaProjectRevisions.projectId, projectId),
            ),
          )
      : []
    const [draftRow] = await tx
      .select()
      .from(pensaPlanDrafts)
      .where(
        and(
          eq(pensaPlanDrafts.projectId, projectId),
          inArray(pensaPlanDrafts.status, activeDraftStatuses),
        ),
      )
    const progress = (
      await tx
        .select()
        .from(pensaMissionProgress)
        .where(eq(pensaMissionProgress.projectId, projectId))
    ).map((r) => P.PensaMissionProgressSchema.parse(r.data))
    const revision = revisionRow ? P.PensaProjectRevisionSchema.parse(revisionRow.snapshot) : null
    if (project.gameProfileId) {
      const boundGame = await tx
        .select({ id: creations.id })
        .from(creations)
        .where(
          and(
            eq(creations.userId, project.gameProfileId),
            eq(creations.audience, project.audience),
            eq(creations.tool, 'studio'),
            eq(creations.itemId, pensaGameId(projectId)),
            isNull(creations.deletedAt),
          ),
        )
        .limit(1)
      if (
        !peopleIds.has(project.gameProfileId) ||
        boundGame.length ||
        progress.some(
          (p) =>
            p.status !== 'planned' &&
            revision?.plan.missions.some((m) => m.id === p.missionId && m.destination === 'studio'),
        )
      )
        programmerProfileId = project.gameProfileId
    }
    const [operation] = await tx
      .select()
      .from(pensaOperations)
      .where(
        and(
          eq(pensaOperations.projectId, projectId),
          inArray(pensaOperations.status, ['queued', 'running', 'waiting', 'failed']),
        ),
      )
      .orderBy(desc(pensaOperations.createdAt))
      .limit(1)
    const messages = (
      await tx
        .select()
        .from(pensaProjectMessages)
        .where(eq(pensaProjectMessages.projectId, projectId))
        .orderBy(desc(pensaProjectMessages.createdAt), desc(pensaProjectMessages.id))
        .limit(100)
    )
      .reverse()
      .map((r) => P.PensaMessageSchema.parse(r.data))
    const hasGame = await tx
      .select()
      .from(creations)
      .where(
        and(
          eq(creations.userId, programmerProfileId),
          eq(creations.audience, project.audience),
          eq(creations.tool, 'studio'),
          eq(creations.itemId, pensaGameId(projectId)),
          isNull(creations.deletedAt),
        ),
      )
      .limit(1)
    const game = hasGame[0]
    const gameCreation: P.PensaCreationRef | null =
      game?.storageRef && !game.pendingRevision
        ? {
            tool: 'studio',
            profileId: programmerProfileId,
            creationId: game.itemId,
            saveRevision: String(game.revision),
            contentFingerprint: game.contentFingerprint,
          }
        : null
    const [restore] = await tx
      .select({ output: pensaOperations.output })
      .from(pensaOperations)
      .where(
        and(
          eq(pensaOperations.projectId, projectId),
          eq(pensaOperations.kind, 'restore'),
          eq(pensaOperations.status, 'succeeded'),
        ),
      )
      .orderBy(desc(pensaOperations.updatedAt))
      .limit(1)
    const restoredSaveRevision =
      typeof restore?.output.nextSaveRevision === 'number'
        ? String(restore.output.nextSaveRevision)
        : null
    const codeLocked =
      hasGame.length > 0 ||
      progress.some(
        (p) =>
          p.status !== 'planned' &&
          revision?.plan.missions.some((m) => m.id === p.missionId && m.destination === 'studio'),
      )
    return {
      project,
      revision,
      draft: draftRow ? P.PensaPlanDraftSchema.parse(draftRow.data) : null,
      progress,
      members,
      operation: operation ? operationView(operation) : null,
      messages,
      gameCreation,
      restoredSaveRevision,
      studioAuthoring: game?.kind === 'pro' ? 'code' : (revision?.technical.authoring ?? 'blocks'),
      team: {
        viewerProfileId: actor.profileId,
        ownerProfileId: project.userId,
        programmerProfileId,
        artistProfileIds,
        memberCount: members.length,
        shareCode: owner ? project.shareCode : null,
        codeLocked,
        people: [
          {
            profileId: project.userId,
            firstName: null,
            photoUrl: null,
            owner: true,
            joinedAt: null,
          },
          ...members.map((m) => ({
            profileId: m.profileId,
            firstName: null,
            photoUrl: null,
            owner: false,
            joinedAt: m.joinedAt.toISOString(),
          })),
        ],
      },
    }
  }

  async get(actor: P.PensaActor, id: string) {
    return this.db.transaction((tx) => this.load(tx, actor, id), {
      isolationLevel: 'repeatable read',
    })
  }

  async list(actor: P.PensaActor, status: 'active' | 'archived') {
    const own = await this.db
      .select({ id: pensaProjects.id })
      .from(pensaProjects)
      .where(
        and(
          eq(pensaProjects.userId, actor.profileId),
          eq(pensaProjects.accountId, actor.accountId),
          eq(pensaProjects.status, status),
          eq(pensaProjects.audience, actor.audience ?? 'kids'),
        ),
      )
      .orderBy(desc(pensaProjects.updatedAt))
      .limit(200)
    const joined =
      status === 'active'
        ? await this.db
            .select({ id: pensaProjectMembers.projectId })
            .from(pensaProjectMembers)
            .innerJoin(pensaProjects, eq(pensaProjects.id, pensaProjectMembers.projectId))
            .where(
              and(
                eq(pensaProjectMembers.profileId, actor.profileId),
                eq(pensaProjectMembers.accountId, actor.accountId),
                eq(pensaProjects.status, status),
                eq(pensaProjects.audience, actor.audience ?? 'kids'),
              ),
            )
            .limit(200)
        : []
    return Promise.all(
      [...new Set([...own, ...joined].map((r) => r.id))].map((id) => this.get(actor, id)),
    )
  }

  async create(actor: P.PensaActor, request: P.PensaCreateProjectRequest): Promise<string> {
    return this.db.transaction(async (tx) => {
      await lockPensaAccount(tx, actor.accountId)
      const [fence] = await tx
        .select()
        .from(accountDeletionFences)
        .where(eq(accountDeletionFences.accountId, actor.accountId))
      if (fence) pensaError('PROJECT_GONE', 'Esta conta não está disponível.')
      const hash = pensaRequestHash(actor, 'create', request)
      const [existing] = await tx
        .select()
        .from(pensaExecutionEvents)
        .where(eq(pensaExecutionEvents.requestId, request.requestId))
      if (existing) {
        if (existing.requestHash !== hash || !existing.projectId)
          pensaError('REVISION_CONFLICT', 'Este pedido já foi usado. Atualize o projeto.')
        return existing.projectId
      }
      const [total] = await tx
        .select({ n: count() })
        .from(pensaProjects)
        .where(
          and(
            eq(pensaProjects.userId, actor.profileId),
            eq(pensaProjects.audience, actor.audience ?? 'kids'),
            eq(pensaProjects.status, 'active'),
          ),
        )
      if (Number(total?.n ?? 0) >= P.PENSA_LIMITS.activeProjects)
        pensaError('QUOTA_EXCEEDED', 'Arquive um projeto antes de começar outro.')
      const id = randomUUID(),
        now = this.clock()
      await tx.insert(pensaProjects).values({
        id,
        userId: actor.profileId,
        accountId: actor.accountId,
        audience: actor.audience ?? 'kids',
        kind: 'game',
        name: 'Minha ideia',
        status: 'active',
        createdAt: now,
        updatedAt: now,
      })
      await this.event(tx, actor, id, request.requestId, hash, 'create')
      return id
    })
  }

  async change<T, I extends { requestId: string }>(
    actor: P.PensaActor,
    id: string,
    kind: string,
    input: I,
    run: (tx: PensaTransaction, state: PensaProjectState, now: Date) => Promise<T>,
  ): Promise<{ repeated: boolean; value: T | null }> {
    return this.db.transaction(async (tx) => {
      const payers = await tx
        .select({ accountId: pensaOperations.accountId })
        .from(pensaOperations)
        .where(
          and(
            eq(pensaOperations.projectId, id),
            inArray(pensaOperations.status, ['queued', 'running', 'waiting', 'failed']),
          ),
        )
      for (const accountId of [
        ...new Set([actor.accountId, ...payers.map((r) => r.accountId)]),
      ].sort())
        await lockPensaAccount(tx, accountId)
      const [fence] = await tx
        .select()
        .from(accountDeletionFences)
        .where(eq(accountDeletionFences.accountId, actor.accountId))
      if (fence) pensaError('PROJECT_GONE', 'Esta conta não está disponível.')
      const hash = pensaRequestHash(actor, kind, input)
      const [previous] = await tx
        .select()
        .from(pensaExecutionEvents)
        .where(eq(pensaExecutionEvents.requestId, input.requestId))
      if (previous) {
        if (previous.requestHash !== hash || previous.projectKey !== id)
          pensaError('REVISION_CONFLICT', 'Este pedido já foi usado com outro conteúdo.')
        return { repeated: true, value: null }
      }
      const state = await this.load(tx, actor, id, true)
      const currentPayers = await tx
        .select({ accountId: pensaOperations.accountId })
        .from(pensaOperations)
        .where(
          and(
            eq(pensaOperations.projectId, id),
            inArray(pensaOperations.status, ['queued', 'running', 'waiting', 'failed']),
          ),
        )
      if (
        currentPayers.some(
          (payer) =>
            payer.accountId !== actor.accountId &&
            !payers.some((locked) => locked.accountId === payer.accountId),
        )
      )
        pensaError('REVISION_CONFLICT', 'O pedido mudou. Retome pela versão atual.')
      const now = this.clock()
      await this.event(tx, actor, id, input.requestId, hash, kind)
      const value = await run(tx, state, now)
      const [remaining] = await tx
        .select({ id: pensaProjects.id })
        .from(pensaProjects)
        .where(eq(pensaProjects.id, id))
      if (remaining) {
        const after = (
          await tx.select().from(pensaMissionProgress).where(eq(pensaMissionProgress.projectId, id))
        ).map((row) => P.PensaMissionProgressSchema.parse(row.data))
        const changedIds = new Set(
          after
            .filter(
              (p) =>
                P.pensaCanonicalJson(p) !==
                P.pensaCanonicalJson(state.progress.find((old) => old.missionId === p.missionId)),
            )
            .map((p) => p.missionId),
        )
        const data = P.PensaJsonObjectSchema.parse(
          JSON.parse(
            JSON.stringify({
              input,
              progressBefore: state.progress.filter((p) => changedIds.has(p.missionId)),
              progressAfter: after.filter((p) => changedIds.has(p.missionId)),
            }),
          ),
        )
        await tx
          .update(pensaExecutionEvents)
          .set({ data })
          .where(eq(pensaExecutionEvents.requestId, input.requestId))
      }
      await tx
        .update(pensaProjects)
        .set({ updatedAt: now, executionRevision: sql`${pensaProjects.executionRevision} + 1` })
        .where(eq(pensaProjects.id, id))
      return { repeated: false, value }
    })
  }

  async event(
    tx: PensaTransaction,
    actor: P.PensaActor,
    id: string,
    requestId: string,
    requestHash: string,
    kind: string,
  ) {
    await tx.insert(pensaExecutionEvents).values({
      id: randomUUID(),
      projectId: id,
      projectKey: id,
      requestId,
      requestHash,
      profileId: actor.profileId,
      accountId: actor.accountId,
      kind,
      data: {},
      createdAt: this.clock(),
    })
  }

  async cancelOperation(
    tx: PensaTransaction,
    operation: typeof pensaOperations.$inferSelect,
    now: Date,
  ) {
    if (operation.status === 'succeeded' || operation.status === 'cancelled') return
    if (operation.kind === 'restore' && Array.isArray(operation.output.files)) {
      const destinations = operation.output.files.flatMap((file) =>
        file &&
        typeof file === 'object' &&
        'destination' in file &&
        typeof file.destination === 'string'
          ? [file.destination]
          : [],
      )
      if (destinations.length)
        await tx.insert(pensaDeletionJobs).values({
          id: randomUUID(),
          accountId: operation.accountId,
          profileId: operation.profileId,
          prefixes: destinations,
          notBefore: new Date(now.getTime() + 600_000),
          createdAt: now,
          updatedAt: now,
        })
    }
    await tx
      .update(pensaOperations)
      .set({ status: 'cancelled', leaseId: null, leaseUntil: null, updatedAt: now })
      .where(eq(pensaOperations.id, operation.id))
    await releasePensaReservation(tx, operation.id, now)
  }

  async cancelPending(tx: PensaTransaction, projectId: string, now: Date, kind?: 'planning') {
    const operations = await tx
      .select()
      .from(pensaOperations)
      .where(
        and(
          eq(pensaOperations.projectId, projectId),
          kind ? eq(pensaOperations.kind, kind) : undefined,
          inArray(pensaOperations.status, ['queued', 'running', 'waiting', 'failed']),
        ),
      )
    for (const operation of operations) await this.cancelOperation(tx, operation, now)
    if (kind) return
    const checkpoints = await tx
      .select()
      .from(pensaCheckpoints)
      .where(and(eq(pensaCheckpoints.projectId, projectId), eq(pensaCheckpoints.status, 'copying')))
    for (const checkpoint of checkpoints) {
      const cleanupId = randomUUID()
      const files = checkpoint.manifest.files
      const destinations = Array.isArray(files)
        ? files.flatMap((file) =>
            file &&
            typeof file === 'object' &&
            'destination' in file &&
            typeof file.destination === 'string'
              ? [file.destination]
              : [],
          )
        : []
      if (destinations.length)
        await tx.insert(pensaDeletionJobs).values({
          id: cleanupId,
          accountId: checkpoint.accountId,
          profileId: checkpoint.profileId,
          prefixes: destinations,
          notBefore: new Date(now.getTime() + 600_000),
          createdAt: now,
          updatedAt: now,
        })
      await tx
        .update(pensaCheckpoints)
        .set({
          status: 'failed',
          manifest: { ...checkpoint.manifest, cleanupId: destinations.length ? cleanupId : null },
        })
        .where(eq(pensaCheckpoints.id, checkpoint.id))
    }
  }

  async saveDraft(tx: PensaTransaction, draft: P.PensaPlanDraft) {
    await tx
      .insert(pensaPlanDrafts)
      .values({
        id: draft.id,
        projectId: draft.projectId,
        status: draft.status,
        revision: draft.revision,
        data: draft,
        updatedAt: new Date(draft.updatedAt),
      })
      .onConflictDoUpdate({
        target: pensaPlanDrafts.id,
        set: {
          status: draft.status,
          revision: draft.revision,
          data: draft,
          updatedAt: new Date(draft.updatedAt),
        },
      })
  }

  async saveProgress(
    tx: PensaTransaction,
    projectId: string,
    progress: P.PensaMissionProgress,
    now: Date,
  ) {
    const [existing] = await tx
      .select({ projectId: pensaMissionProgress.projectId })
      .from(pensaMissionProgress)
      .where(eq(pensaMissionProgress.missionId, progress.missionId))
    if (existing && existing.projectId !== projectId)
      pensaError('DRAFT_CHANGED', 'Uma missão deste plano pertence a outro projeto.')
    await tx
      .insert(pensaMissionProgress)
      .values({
        missionId: progress.missionId,
        projectId,
        progressRevision: progress.progressRevision,
        status: progress.status,
        validity: progress.validity,
        assigneeProfileId: progress.assigneeProfileId,
        data: progress,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: pensaMissionProgress.missionId,
        set: {
          progressRevision: progress.progressRevision,
          status: progress.status,
          validity: progress.validity,
          assigneeProfileId: progress.assigneeProfileId,
          data: progress,
          updatedAt: now,
        },
      })
  }

  async assertExistingAssets(
    tx: PensaTransaction,
    state: PensaProjectState,
    definition: P.PensaGameDefinition,
  ) {
    const slots = [...definition.assetSlots].sort((a, b) =>
      `${a.existing?.profileId}/${a.existing?.tool}/${a.existing?.creationId}`.localeCompare(
        `${b.existing?.profileId}/${b.existing?.tool}/${b.existing?.creationId}`,
      ),
    )
    for (const slot of slots) {
      if (!slot.existing) continue
      const ref = slot.existing
      const accountId =
        ref.profileId === state.project.userId
          ? state.project.accountId
          : state.members.find((m) => m.profileId === ref.profileId)?.accountId
      if (!accountId || ref.tool === 'studio')
        pensaError('CREATION_CHANGED', 'Escolha uma arte guardada por uma pessoa desta equipe.')
      const [saved] = await tx
        .select()
        .from(creations)
        .where(
          and(
            eq(creations.userId, ref.profileId),
            eq(creations.audience, state.project.audience),
            eq(creations.accountId, accountId),
            eq(creations.tool, ref.tool),
            eq(creations.itemId, ref.creationId),
            isNull(creations.deletedAt),
          ),
        )
        .for('update')
      if (!saved?.storageRef || saved.pendingRevision)
        pensaError('CREATION_NOT_SAVED', 'Espere a arte escolhida ficar guardada na conta.')
      if (
        saved.kind.replace(/^(pixel|vector)-/, '') !== slot.kind ||
        String(saved.revision) !== ref.saveRevision ||
        (ref.contentFingerprint !== null && ref.contentFingerprint !== saved.contentFingerprint)
      )
        pensaError('CREATION_CHANGED', 'A arte escolhida mudou. Confira a versão guardada.')
    }
  }

  async saveMessage(
    tx: PensaTransaction,
    actor: P.PensaActor,
    projectId: string,
    kind: 'planning' | 'help',
    text: string,
    role: 'user' | 'assistant',
    missionId: string | null,
    now: Date,
  ) {
    const message: P.PensaMessage = {
      id: randomUUID(),
      projectId,
      kind,
      role,
      text,
      revision: 1,
      profileId: actor.profileId,
      missionId,
      createdAt: now.toISOString(),
    }
    await tx.insert(pensaProjectMessages).values({
      id: message.id,
      projectId,
      profileId: actor.profileId,
      context: kind,
      data: message,
      createdAt: now,
    })
    return message
  }

  async assertDeliveries(
    tx: PensaTransaction,
    actor: P.PensaActor,
    state: PensaProjectState,
    mission: P.PensaMission,
    deliveries: P.PensaDelivery[],
    requireComplete = true,
  ) {
    const slots = state.revision?.definition.assetSlots ?? []
    for (const delivery of deliveries) {
      const ref = delivery.creation
      if (
        ref.profileId !== actor.profileId ||
        ref.tool !== mission.destination ||
        (mission.destination === 'studio' && ref.creationId !== pensaGameId(state.project.id))
      )
        pensaError('CREATION_CHANGED', 'Escolha a criação desta missão.')
      const [saved] = await tx
        .select()
        .from(creations)
        .where(
          and(
            eq(creations.userId, actor.profileId),
            eq(creations.audience, actor.audience ?? 'kids'),
            eq(creations.accountId, actor.accountId),
            eq(creations.tool, ref.tool),
            eq(creations.itemId, ref.creationId),
            isNull(creations.deletedAt),
          ),
        )
        .for('update')
      if (!saved?.storageRef || saved.pendingRevision)
        pensaError('CREATION_NOT_SAVED', 'Espere sua criação ficar guardada na conta.')
      if (
        String(saved.revision) !== ref.saveRevision ||
        (ref.contentFingerprint && saved.contentFingerprint !== ref.contentFingerprint)
      )
        pensaError('CREATION_CHANGED', 'Sua criação mudou. Guarde e confira novamente.')
      if (mission.kind === 'asset') {
        const slot = slots.find(
          (s) => s.id === delivery.assetSlotId && mission.assetSlotIds.includes(s.id),
        )
        const family = saved.kind.replace(/^(pixel|vector)-/, '')
        if (!slot || slot.kind !== family)
          pensaError('CREATION_CHANGED', 'Este desenho ou modelo não corresponde ao pedido.')
      } else if (delivery.assetSlotId !== null)
        pensaError('CREATION_CHANGED', 'Esta missão precisa do jogo guardado.')
    }
    if (new Set(deliveries.map((d) => d.assetSlotId)).size !== deliveries.length)
      pensaError('CREATION_CHANGED', 'Cada arte precisa de uma entrega correspondente.')
    if (
      requireComplete &&
      mission.kind === 'asset' &&
      mission.assetSlotIds.some((id) => !deliveries.some((d) => d.assetSlotId === id))
    )
      pensaError('CREATION_NOT_SAVED', 'Guarde todas as artes pedidas nesta missão.')
    if (
      requireComplete &&
      mission.destination === 'studio' &&
      (deliveries.length !== 1 || deliveries[0]?.assetSlotId !== null)
    )
      pensaError('CREATION_NOT_SAVED', 'Vincule o jogo guardado antes de conferir.')
  }

  async delete(actor: P.PensaActor, projectId: string, requestId: string) {
    await this.change(actor, projectId, 'delete', { requestId }, async (tx, state, now) => {
      if (state.project.userId !== actor.profileId)
        pensaError('NOT_YOUR_MISSION', 'Só quem criou o projeto pode apagá-lo.')
      await this.deleteData(tx, actor, state, now)
    })
  }
  async deleteData(tx: PensaTransaction, actor: P.PensaActor, state: PensaProjectState, now: Date) {
    const projectId = state.project.id
    await releasePensaUsage(tx, projectId, now)
    const checkpoints = await tx
      .select()
      .from(pensaCheckpoints)
      .where(eq(pensaCheckpoints.projectId, projectId))
    const narrations = await tx
      .select()
      .from(privateNarrations)
      .where(eq(privateNarrations.projectId, projectId))
    const operations = await tx
      .select()
      .from(pensaOperations)
      .where(and(eq(pensaOperations.projectId, projectId), ne(pensaOperations.status, 'succeeded')))
    const people = [
      ...new Set([
        actor.profileId,
        ...state.members.map((m) => m.profileId),
        ...checkpoints.map((c) => c.profileId),
        ...narrations.map((n) => n.profileId),
      ]),
    ]
    const abandoned = operations
      .filter((o) => o.kind === 'restore')
      .flatMap((o) => {
        const files = o.output.files
        return Array.isArray(files)
          ? files.flatMap((f) =>
              f && typeof f === 'object' && 'destination' in f && typeof f.destination === 'string'
                ? [f.destination]
                : [],
            )
          : []
      })
    await tx
      .insert(pensaDeletionJobs)
      .values({
        id: projectId,
        accountId: actor.accountId,
        profileId: actor.profileId,
        prefixes: [...people.map((p) => `creations/${p}/pensa/${projectId}/`), ...abandoned],
        notBefore: new Date(now.getTime() + 600_000),
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing()
    await tx
      .update(privateNarrations)
      .set({ projectId: null })
      .where(eq(privateNarrations.projectId, projectId))
    await tx
      .update(pensaExecutionEvents)
      .set({ data: {} })
      .where(eq(pensaExecutionEvents.projectId, projectId))
    await tx
      .delete(pensaProjects)
      .where(
        and(eq(pensaProjects.id, projectId), eq(pensaProjects.audience, actor.audience ?? 'kids')),
      )
  }
}
