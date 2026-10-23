import { createHash, randomUUID } from 'node:crypto'
import * as P from '@sistemazero/core/pensa'
import { and, count, desc, eq, inArray } from 'drizzle-orm'
import { pensaError } from '../../../domain/pensa/project.errors'
import type {
  PensaProjectBase,
  PensaProjectRepository,
} from '../../../domain/ports/pensa-project-repository.port'
import {
  type DrizzlePensaProjectRepository,
  type PensaProjectState,
  type PensaTransaction,
  pensaGameId,
  projectMetadata,
} from './pensa-project.repository'
import { commitPensaUsage, reservePensaUsage } from './pensa-reservations'
import {
  aiUsageReservations,
  pensaExecutionEvents,
  pensaMissionProgress,
  pensaOperations,
  pensaProjectRevisions,
  pensaProjects,
} from './schema'

const childRequestId = (requestId: string) => {
  const h = createHash('sha256').update(`pensa-message:${requestId}`).digest('hex')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`
}

/** Use cases share the repository transaction; the BFF supplies trusted current capabilities. */
export class DrizzlePensaProjectCommands implements PensaProjectRepository {
  constructor(
    readonly repo: DrizzlePensaProjectRepository,
    readonly fundingLimits: { dailyLimit: number; monthlyLimit: number },
  ) {}
  async readBase(actor: P.PensaActor, id: string) {
    return this.base(await this.repo.get(actor, id))
  }

  assertCapabilities(state: PensaProjectState, capabilities: P.PensaCapabilities) {
    if (
      capabilities.programmerProfileId !== state.team.programmerProfileId ||
      capabilities.participants.some(
        (p) => !state.team.people.some((person) => person.profileId === p.profileId),
      )
    )
      pensaError('RESOURCES_CHANGED', 'A equipe mudou. Confira os recursos novamente.')
  }

  base(state: PensaProjectState): PensaProjectBase {
    return {
      project: projectMetadata(state.project),
      revision: state.revision,
      draft: state.draft,
      progress: state.progress.filter((p) =>
        state.revision?.plan.missions.some((m) => m.id === p.missionId),
      ),
      team: state.team,
      operation: state.operation,
      messages: state.messages,
      studioAuthoring: state.studioAuthoring,
      gameCreation: state.gameCreation,
      restoredSaveRevision: state.restoredSaveRevision,
    }
  }

  async normalizePlan(
    tx: PensaTransaction,
    state: PensaProjectState,
    plan: P.PensaPlan,
  ): Promise<P.PensaPlan> {
    const normalized = P.reconcilePensaMissionVersions(state.revision, plan)
    const returning = normalized.missions.filter(
      (m) => !state.revision?.plan.missions.some((old) => old.id === m.id),
    )
    if (!returning.length) return normalized
    const historical = await tx
      .select({ snapshot: pensaProjectRevisions.snapshot })
      .from(pensaProjectRevisions)
      .where(eq(pensaProjectRevisions.projectId, state.project.id))
    for (const mission of returning) {
      const versions = historical.flatMap((r) =>
        P.PensaProjectRevisionSchema.parse(r.snapshot)
          .plan.missions.filter((old) => old.id === mission.id)
          .map((old) => old.contentRevision),
      )
      if (versions.length) mission.contentRevision = Math.max(...versions) + 1
    }
    return normalized
  }

  viewFrom(state: PensaProjectState, capabilities: P.PensaCapabilities): P.PensaProjectView {
    this.assertCapabilities(state, capabilities)
    const base = this.base(state)
    const availability = P.resolvePensaAvailability({
      revision: state.revision,
      progress: base.progress,
      capabilities,
      team: state.team,
      viewerProfileId: state.team.viewerProfileId,
      project: state.project,
    })
    return {
      ...base,
      availability,
      nextAction: P.nextPensaMissionFor({
        revision: state.revision,
        progress: base.progress,
        availability,
        draft: state.draft,
      }),
      studioAuthoring:
        capabilities.observedGame?.authoring ??
        capabilities.participants.find((p) => p.profileId === state.team.programmerProfileId)
          ?.studioAuthoring ??
        base.studioAuthoring,
    }
  }

  async get(actor: P.PensaActor, projectId: string, capabilities: P.PensaCapabilities) {
    return this.repo.db.transaction(async (tx) => {
      const state = await this.repo.load(tx, actor, projectId, true)
      await this.reconcileObservation(tx, state, capabilities, this.repo.clock())
      return this.viewFrom(state, capabilities)
    })
  }

  async reconcileObservation(
    tx: PensaTransaction,
    state: PensaProjectState,
    capabilities: P.PensaCapabilities,
    now: Date,
  ) {
    this.assertCapabilities(state, capabilities)
    const observed = capabilities.observedGame
    if (!observed) return
    const current = state.gameCreation
    if (
      !current ||
      observed.creation.profileId !== current.profileId ||
      observed.creation.tool !== 'studio' ||
      observed.creation.creationId !== current.creationId ||
      observed.creation.saveRevision !== current.saveRevision
    )
      pensaError(
        'RESOURCES_CHANGED',
        'O jogo mudou. Confira os recursos da versão guardada novamente.',
      )
    const invalid =
      state.revision?.plan.missions
        .filter(
          (m) =>
            m.kind === 'setup' &&
            state.progress.some(
              (p) => p.missionId === m.id && p.status === 'completed' && p.validity === 'current',
            ) &&
            (observed.authoring !== m.setup.authoring ||
              observed.dimension !== state.revision?.definition.dimension ||
              observed.runtimeExtensionId !== m.setup.runtimeExtensionId ||
              [m.setup.runtimeExtensionId, ...m.setup.requiredAuxiliaryExtensionIds].some(
                (id) => !observed.installedExtensionIds.includes(id),
              )),
        )
        .map((m) => m.id) ?? []
    if (!invalid.length) return
    const affected = P.pensaDependentClosure(invalid, state.revision?.plan.missions ?? [])
    const next = P.invalidatePensaProgress(state.progress, [...affected])
    for (const p of next)
      if (
        affected.has(p.missionId) &&
        P.pensaCanonicalJson(p) !==
          P.pensaCanonicalJson(state.progress.find((old) => old.missionId === p.missionId))
      )
        await this.repo.saveProgress(tx, state.project.id, p, now)
    await tx
      .update(pensaProjects)
      .set({ executionRevision: state.project.executionRevision + 1, updatedAt: now })
      .where(eq(pensaProjects.id, state.project.id))
    await tx.insert(pensaExecutionEvents).values({
      id: randomUUID(),
      projectId: state.project.id,
      projectKey: state.project.id,
      requestId: randomUUID(),
      requestHash: '0'.repeat(64),
      profileId: state.team.viewerProfileId,
      accountId: state.project.accountId,
      kind: 'configuration_invalidated',
      data: { missionIds: [...affected], saveRevision: current.saveRevision },
      createdAt: now,
    })
    state.progress = next
    state.project.executionRevision += 1
  }

  async list(
    actor: P.PensaActor,
    status: 'active' | 'archived',
  ): Promise<P.PensaProjectListItem[]> {
    return (await this.repo.list(actor, status)).map((state) => {
      const applicable =
        state.revision?.plan.missions.filter(
          (m) => m.kind !== 'setup' || state.studioAuthoring !== 'code',
        ) ?? []
      const active = state.progress.filter((p) => applicable.some((m) => m.id === p.missionId))
      const done = active.filter((p) => p.status === 'completed' && p.validity === 'current')
      const final = state.revision?.plan.missions.find(
        (m) => m.kind === 'playtest' && m.scope === 'project',
      )
      return {
        project: projectMetadata(state.project),
        summary: state.revision?.definition.summary ?? null,
        completedMissions: done.length,
        totalMissions: applicable.length,
        needsReview: active.filter((p) => p.validity === 'needs_review').length,
        lifecycle: !state.revision
          ? 'defining'
          : final && done.length === applicable.length && done.some((p) => p.missionId === final.id)
            ? 'completed'
            : done.length >= applicable.length - 1
              ? 'reviewing'
              : 'building',
        memberCount: state.members.length,
      }
    })
  }

  async create(actor: P.PensaActor, input: P.PensaCreateProjectRequest) {
    const projectId = await this.repo.create(actor, input)
    await this.message(actor, projectId, {
      requestId: childRequestId(input.requestId),
      kind: 'planning',
      message: input.message,
      baseRevisionId: null,
      missionId: null,
      choice: null,
    })
    return this.base(await this.repo.get(actor, projectId))
  }

  async metadata(actor: P.PensaActor, id: string, input: P.PensaMetadataRequest) {
    await this.repo.change(actor, id, 'metadata', input, async (tx, state) => {
      if (state.project.userId !== actor.profileId)
        pensaError('NOT_YOUR_MISSION', 'Só quem criou o projeto pode mudar estes cuidados.')
      if (state.project.metadataRevision !== input.expectedMetadataRevision)
        pensaError('REVISION_CONFLICT', 'O projeto mudou. Atualize antes de tentar novamente.')
      if (input.status === 'active' && state.project.status !== 'active') {
        const [n] = await tx
          .select({ n: count() })
          .from(pensaProjects)
          .where(and(eq(pensaProjects.userId, actor.profileId), eq(pensaProjects.status, 'active')))
        if (Number(n?.n ?? 0) >= P.PENSA_LIMITS.activeProjects)
          pensaError('QUOTA_EXCEEDED', 'Arquive outro projeto antes de reabrir este.')
      }
      await tx
        .update(pensaProjects)
        .set({
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.paused !== undefined ? { paused: input.paused } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          metadataRevision: state.project.metadataRevision + 1,
        })
        .where(eq(pensaProjects.id, id))
      if (input.status === 'archived' || input.paused)
        await this.repo.cancelPending(tx, id, this.repo.clock())
    })
    return this.base(await this.repo.get(actor, id))
  }

  async message(actor: P.PensaActor, id: string, input: P.PensaMessageRequest) {
    await this.repo.change(actor, id, 'message', input, async (tx, state, now) => {
      if (state.project.status !== 'active' || state.project.paused)
        pensaError('MISSION_UNAVAILABLE', 'Retome o projeto antes de conversar sobre mudanças.')
      if ((state.revision?.id ?? null) !== input.baseRevisionId)
        pensaError('REVISION_CONFLICT', 'O plano mudou. Retome pela versão atual.')
      let draft = state.draft
      if (input.kind === 'planning' && !draft) {
        draft = {
          id: randomUUID(),
          projectId: id,
          revision: 0,
          baseRevisionId: state.revision?.id ?? null,
          status: 'collecting',
          definition: state.revision?.definition ?? null,
          plan: state.revision?.plan ?? null,
          technical: state.revision?.technical ?? null,
          pendingChoices: [],
          impact: null,
          affectedProgressVersions: {},
          capabilitiesFingerprint: null,
          acceptedRevisionId: null,
          updatedAt: now.toISOString(),
        }
        await this.repo.saveDraft(tx, draft)
      }
      if (input.missionId && !state.revision?.plan.missions.some((m) => m.id === input.missionId))
        pensaError('PROJECT_GONE', 'Esta missão não está no plano atual.')
      await this.repo.saveMessage(
        tx,
        actor,
        id,
        input.kind,
        input.message,
        'user',
        input.missionId,
        now,
      )
      const [current] =
        input.kind === 'planning'
          ? await tx
              .select()
              .from(pensaOperations)
              .where(
                and(
                  eq(pensaOperations.projectId, id),
                  eq(pensaOperations.kind, 'planning'),
                  inArray(pensaOperations.status, ['queued', 'running', 'waiting', 'failed']),
                ),
              )
              .orderBy(desc(pensaOperations.createdAt))
              .limit(1)
          : []
      if (current?.status === 'running' && current.leaseUntil && current.leaseUntil > now)
        pensaError('REVISION_CONFLICT', 'Espere esta parte terminar antes de enviar outra escolha.')
      if (
        input.choice &&
        !draft?.pendingChoices.some(
          (c) =>
            c.id === input.choice?.choiceId &&
            c.options.some((o) => o.id === input.choice?.optionId),
        )
      )
        pensaError('DRAFT_CHANGED', 'Esta escolha mudou. Abra a pergunta atual.')
      const choiceReceipt = input.choice
        ? { ...input.choice, profileId: actor.profileId, at: now.toISOString() }
        : null
      if (draft && input.kind === 'planning') {
        const chosen = draft.pendingChoices.find((c) => c.id === input.choice?.choiceId)
        const selected = chosen?.options.find((o) => o.id === input.choice?.optionId)
        let definition = draft.definition
        if (definition && chosen?.kind === 'adaptation' && selected)
          definition = {
            ...definition,
            adaptations: [
              ...definition.adaptations,
              {
                id: randomUUID(),
                originalIntent: definition.originalIntent,
                limitation: chosen.question,
                alternative: selected.description,
                preserved: definition.playerExperience,
                acceptedByProfileId: actor.profileId,
                acceptedAt: now.toISOString(),
              },
            ],
          }
        draft = {
          ...draft,
          revision: draft.revision + 1,
          status: 'collecting',
          baseRevisionId: state.revision?.id ?? null,
          definition,
          pendingChoices: input.choice
            ? draft.pendingChoices.filter((c) => c.id !== input.choice?.choiceId)
            : draft.pendingChoices,
          impact: null,
          affectedProgressVersions: {},
          updatedAt: now.toISOString(),
        }
        await this.repo.saveDraft(tx, draft)
      }
      const budget: P.PensaOperationBudget = {
        dialogueCalls: 0,
        roundCalls: 0,
        planningCalls: 0,
        helpCalls: 0,
        unitAttempts: {},
      }
      if (current) {
        const previousBudget = P.PensaOperationBudgetSchema.parse(current.input.budget ?? budget)
        await tx
          .update(pensaOperations)
          .set({
            status: 'queued',
            step: 'understanding',
            input: {
              ...current.input,
              message: input.message,
              messageRequestId: input.requestId,
              choiceReceipt,
              budget: { ...previousBudget, roundCalls: 0 },
              baseRevisionId: state.revision?.id ?? null,
              baseTeamRevision: state.project.teamRevision,
            },
            output: {},
            leaseId: null,
            leaseUntil: null,
            error: null,
            updatedAt: now,
          })
          .where(eq(pensaOperations.id, current.id))
      } else
        await tx.insert(pensaOperations).values({
          id: randomUUID(),
          projectId: id,
          draftId: input.kind === 'planning' ? (draft?.id ?? null) : null,
          profileId: actor.profileId,
          accountId: actor.accountId,
          kind: input.kind,
          step: input.kind === 'planning' ? 'understanding' : 'answer',
          status: 'queued',
          inputRevision: state.project.revisionNumber,
          input: {
            message: input.message,
            messageRequestId: input.requestId,
            missionId: input.missionId,
            baseRevisionId: state.revision?.id ?? null,
            baseTeamRevision: state.project.teamRevision,
            privileged: actor.privileged,
            choiceReceipt,
            budget,
          },
          output: {},
          createdAt: now,
          updatedAt: now,
        })
    })
    return this.base(await this.repo.get(actor, id))
  }

  async editDraft(
    actor: P.PensaActor,
    id: string,
    input: P.PensaDraftEditRequest,
    capabilities: P.PensaCapabilities,
  ) {
    await this.repo.change(actor, id, 'draft_edit', input, async (tx, state, now) => {
      if (state.project.status !== 'active' || state.project.paused)
        pensaError('MISSION_UNAVAILABLE', 'Retome o projeto antes de mudar este caminho.')
      this.assertCapabilities(state, capabilities)
      const draft = state.draft
      if (
        draft?.status !== 'ready' ||
        draft.revision !== input.expectedDraftRevision ||
        draft.baseRevisionId !== input.baseRevisionId ||
        (input.baseRevisionId !== state.revision?.id &&
          !(input.baseRevisionId === null && state.revision === null))
      )
        pensaError('DRAFT_CHANGED', 'O rascunho mudou. Confira a proposta atual.')
      if (!draft.technical)
        pensaError('DRAFT_CHANGED', 'Espere a organização do plano para editar este rascunho.')
      if (
        input.definition.originalIntent !== draft.definition?.originalIntent ||
        JSON.stringify(input.definition.adaptations) !==
          JSON.stringify(draft.definition?.adaptations ?? [])
      )
        pensaError(
          'DRAFT_CHANGED',
          'Use a conversa para registrar uma mudança de intenção ou adaptação.',
        )
      const knownRequirements = new Map(draft.definition?.requirements.map((r) => [r.id, r]) ?? [])
      const definition = {
        ...input.definition,
        requirements: input.definition.requirements.map((r) => ({
          ...r,
          origin: knownRequirements.get(r.id)?.origin ?? ('child' as const),
        })),
      }
      const plan = await this.normalizePlan(tx, state, input.plan)
      const technical = { ...draft.technical, capabilitiesFingerprint: capabilities.fingerprint }
      const validation = P.validatePensaPlan({
        definition,
        plan,
        technical,
        capabilities,
        team: state.team,
      })
      if (!validation.ok)
        pensaError('DRAFT_CHANGED', validation.issues[0]?.message ?? 'Confira as partes do plano.')
      await this.repo.assertExistingAssets(tx, state, definition)
      const impact = P.analyzePensaChange(state.revision, { definition, plan, technical })
      const affectedProgressVersions = Object.fromEntries(
        state.progress
          .filter((p) =>
            [
              ...impact.reviewMissionIds,
              ...impact.removedMissionIds,
              ...impact.changedMissionIds,
            ].includes(p.missionId),
          )
          .map((p) => [p.missionId, p.progressRevision]),
      )
      await this.repo.saveDraft(tx, {
        ...draft,
        revision: draft.revision + 1,
        status: 'ready',
        definition,
        plan,
        technical,
        impact,
        affectedProgressVersions,
        capabilitiesFingerprint: capabilities.fingerprint,
        updatedAt: now.toISOString(),
      })
    })
    return this.get(actor, id, capabilities)
  }

  async acceptDraft(
    actor: P.PensaActor,
    id: string,
    input: P.PensaDraftAcceptRequest,
    capabilities: P.PensaCapabilities,
  ) {
    await this.repo.change(actor, id, 'draft_accept', input, async (tx, state, now) => {
      if (state.project.status !== 'active' || state.project.paused)
        pensaError('MISSION_UNAVAILABLE', 'Retome o projeto antes de escolher este caminho.')
      this.assertCapabilities(state, capabilities)
      const draft = state.draft
      if (
        !draft ||
        draft.id !== input.draftId ||
        draft.revision !== input.draftRevision ||
        draft.status !== 'ready' ||
        draft.pendingChoices.length ||
        !draft.definition ||
        !draft.plan ||
        !draft.technical ||
        draft.baseRevisionId !== input.baseRevisionId ||
        (state.revision?.id ?? null) !== input.baseRevisionId
      )
        pensaError('DRAFT_CHANGED', 'Confira a proposta atual antes de aceitar.')
      if (draft.capabilitiesFingerprint !== capabilities.fingerprint)
        pensaError('RESOURCES_CHANGED', 'Os recursos mudaram. Confira o plano novamente.')
      const definition: P.PensaGameDefinition = {
        ...draft.definition,
        requirements: draft.definition.requirements.map((r) => ({
          ...r,
          origin: r.origin === 'suggestion' ? 'accepted_suggestion' : r.origin,
        })),
        adaptations: draft.definition.adaptations.map((a) =>
          a.acceptedByProfileId && a.acceptedAt
            ? a
            : { ...a, acceptedByProfileId: actor.profileId, acceptedAt: now.toISOString() },
        ),
      }
      const plan = await this.normalizePlan(tx, state, draft.plan)
      const validation = P.validatePensaPlan({
        definition,
        plan,
        technical: draft.technical,
        capabilities,
        team: state.team,
        accepted: true,
      })
      if (!validation.ok)
        pensaError(
          'DRAFT_CHANGED',
          validation.issues[0]?.message ?? 'O plano precisa de um ajuste.',
        )
      await this.repo.assertExistingAssets(tx, state, definition)
      const impact = P.analyzePensaChange(state.revision, {
        definition,
        plan,
        technical: draft.technical,
      })
      const affected = new Set([
        ...impact.reviewMissionIds,
        ...impact.removedMissionIds,
        ...impact.changedMissionIds,
      ])
      for (const missionId of affected) {
        const current = state.progress.find((p) => p.missionId === missionId)
        if (
          current &&
          (input.affectedProgressVersions[missionId] !== current.progressRevision ||
            draft.affectedProgressVersions[missionId] !== current.progressRevision)
        )
          pensaError(
            'REVISION_CONFLICT',
            'Uma colega avançou nesta parte. Confira o impacto atualizado.',
          )
      }
      const revision: P.PensaProjectRevision = {
        id: randomUUID(),
        projectId: id,
        number: state.project.revisionNumber + 1,
        previousRevisionId: state.revision?.id ?? null,
        definition,
        plan,
        technical: draft.technical,
        acceptedByProfileId: actor.profileId,
        acceptedAt: now.toISOString(),
      }
      await tx.insert(pensaProjectRevisions).values({
        id: revision.id,
        projectId: id,
        number: revision.number,
        previousRevisionId: revision.previousRevisionId,
        snapshot: revision,
        acceptedByProfileId: actor.profileId,
        acceptedAt: now,
      })
      const invalidated = P.invalidatePensaProgress(state.progress, [
        ...impact.reviewMissionIds,
        ...impact.addedMissionIds.filter((id) => state.progress.some((p) => p.missionId === id)),
      ])
      for (const mission of revision.plan.missions) {
        let progress =
          invalidated.find((p) => p.missionId === mission.id) ??
          P.createPensaMissionProgress(mission.id)
        if (impact.editorialMissionIds.includes(mission.id) && progress.verification)
          progress = {
            ...progress,
            verification: {
              ...progress.verification,
              missionContentRevision: mission.contentRevision,
            },
          }
        await this.repo.saveProgress(tx, id, progress, now)
      }
      await tx
        .update(pensaProjects)
        .set({
          activeRevisionId: revision.id,
          revisionNumber: revision.number,
          gameProfileId: state.team.programmerProfileId,
          gameAccountId:
            state.team.programmerProfileId === state.project.userId
              ? state.project.accountId
              : state.members.find((m) => m.profileId === state.team.programmerProfileId)
                  ?.accountId,
          gameCreationId: pensaGameId(id),
        })
        .where(eq(pensaProjects.id, id))
      await this.repo.saveDraft(tx, {
        ...draft,
        revision: draft.revision + 1,
        status: 'accepted',
        acceptedRevisionId: revision.id,
        updatedAt: now.toISOString(),
      })
      const [operation] = await tx
        .select()
        .from(pensaOperations)
        .where(
          and(
            eq(pensaOperations.projectId, id),
            eq(pensaOperations.draftId, draft.id),
            eq(pensaOperations.kind, 'planning'),
          ),
        )
        .orderBy(desc(pensaOperations.createdAt))
        .limit(1)
      if (operation) {
        const [hold] = await tx
          .select()
          .from(aiUsageReservations)
          .where(eq(aiUsageReservations.id, operation.id))
        if (!hold) pensaError('QUOTA_EXCEEDED', 'Retome a preparação para reservar esta entrega.')
        await reservePensaUsage(tx, {
          id: operation.id,
          projectId: id,
          profileId: operation.profileId,
          accountId: operation.accountId,
          privileged: hold.privileged,
          feature: 'pensa-planning',
          ...this.fundingLimits,
          now,
        })
        await commitPensaUsage(tx, operation.id, operation.accountId, now)
        await tx
          .update(pensaOperations)
          .set({
            status: 'succeeded',
            step: 'commit',
            leaseId: null,
            leaseUntil: null,
            updatedAt: now,
          })
          .where(eq(pensaOperations.id, operation.id))
      }
      await this.milestone(tx, actor, id, 'plan_accepted', 15, 5, now)
    })
    return this.get(actor, id, capabilities)
  }

  async discardDraft(actor: P.PensaActor, id: string, requestId: string) {
    await this.repo.change(actor, id, 'draft_discard', { requestId }, async (tx, state, now) => {
      if (state.draft)
        await this.repo.saveDraft(tx, {
          ...state.draft,
          revision: state.draft.revision + 1,
          status: 'discarded',
          updatedAt: now.toISOString(),
        })
      await this.repo.cancelPending(tx, id, now, 'planning')
    })
  }

  async handoff(
    actor: P.PensaActor,
    missionId: string,
    capabilities: P.PensaCapabilities,
  ): Promise<P.PensaMissionHandoff> {
    const [row] = await this.repo.db
      .select({ projectId: pensaMissionProgress.projectId })
      .from(pensaMissionProgress)
      .where(eq(pensaMissionProgress.missionId, missionId))
    if (!row) pensaError('PROJECT_GONE', 'Esta missão não está mais no plano.')
    const view = await this.get(actor, row.projectId, capabilities)
    const mission = view.revision?.plan.missions.find((m) => m.id === missionId)
    const progress = view.progress.find((p) => p.missionId === missionId)
    const availability = view.availability.find((a) => a.missionId === missionId)
    if (!view.revision || !mission || !progress || !availability)
      pensaError('PROJECT_GONE', 'Esta missão não está mais no plano.')
    return {
      project: view.project,
      projectRevisionId: view.revision.id,
      mission,
      progress,
      availability,
      nextAction: view.nextAction,
      studioProjectId: pensaGameId(row.projectId),
      studioAuthoring: view.studioAuthoring,
      team: view.team,
      assetSlots: view.revision.definition.assetSlots,
      extensions: view.revision.technical.extensions,
      references: view.revision.technical.references,
      gameCreation: view.gameCreation,
      restoredSaveRevision: view.restoredSaveRevision,
    }
  }

  async mission(
    actor: P.PensaActor,
    missionId: string,
    command: 'start' | 'note' | 'deliveries' | 'complete' | 'reopen' | 'reconfirm',
    input:
      | P.PensaMissionStartRequest
      | P.PensaMissionNoteRequest
      | P.PensaMissionCompleteRequest
      | P.PensaMissionDeliveriesRequest,
    capabilities: P.PensaCapabilities,
    configurationVerified = false,
  ) {
    const [row] = await this.repo.db
      .select({ projectId: pensaMissionProgress.projectId })
      .from(pensaMissionProgress)
      .where(eq(pensaMissionProgress.missionId, missionId))
    if (!row) pensaError('PROJECT_GONE', 'Esta missão não está mais no plano.')
    await this.repo.change(
      actor,
      row.projectId,
      `mission_${command}`,
      { ...input, missionId },
      async (tx, state, now) => {
        if (state.project.status !== 'active' || state.project.paused)
          pensaError('MISSION_UNAVAILABLE', 'Retome o projeto antes de continuar esta missão.')
        this.assertCapabilities(state, capabilities)
        const mission = state.revision?.plan.missions.find((m) => m.id === missionId)
        await this.reconcileObservation(tx, state, capabilities, now)
        const progress = state.progress.find((p) => p.missionId === missionId)
        if (!mission || !progress || !state.revision)
          pensaError('PROJECT_GONE', 'Esta missão não está mais no plano.')
        if (
          input.expectedProgressRevision !== progress.progressRevision ||
          ('baseRevisionId' in input &&
            (input.baseRevisionId !== state.revision.id ||
              input.contentRevision !== mission.contentRevision))
        )
          pensaError('REVISION_CONFLICT', 'A missão mudou. Confira a versão atual.')
        const permittedRole =
          mission.destination === 'studio'
            ? state.team.programmerProfileId === actor.profileId
            : state.team.artistProfileIds.includes(actor.profileId)
        if (!permittedRole)
          pensaError('NOT_YOUR_MISSION', 'Esta missão é de outra pessoa da equipe.')
        if (
          progress.assigneeProfileId &&
          progress.assigneeProfileId !== actor.profileId &&
          state.team.people.some((p) => p.profileId === progress.assigneeProfileId)
        )
          pensaError('NOT_YOUR_MISSION', 'Uma colega está fazendo esta missão.')
        const view = this.viewFrom(state, capabilities),
          availability = view.availability.find((a) => a.missionId === missionId)
        if (command !== 'reopen' && command !== 'note' && !availability?.available)
          pensaError(
            availability?.reason === 'dependency_pending'
              ? 'DEPENDENCY_PENDING'
              : 'MISSION_UNAVAILABLE',
            availability?.message ?? 'Esta missão não está disponível agora.',
          )
        let next: P.PensaMissionProgress = {
          ...progress,
          progressRevision: progress.progressRevision + 1,
        }
        if (command === 'note' && 'note' in input) next.resumeNote = input.note
        if (command === 'start')
          next = {
            ...next,
            status: 'in_progress',
            assigneeProfileId: actor.profileId,
            startedAt: progress.startedAt ?? now.toISOString(),
          }
        if ('deliveries' in input) {
          await this.repo.assertDeliveries(
            tx,
            actor,
            state,
            mission,
            input.deliveries,
            command === 'complete' || command === 'reconfirm',
          )
          next = {
            ...next,
            deliveries: input.deliveries,
            assigneeProfileId: actor.profileId,
            status: progress.status === 'planned' ? 'in_progress' : progress.status,
            startedAt: progress.startedAt ?? now.toISOString(),
          }
        }
        if (command === 'complete' || command === 'reconfirm') {
          if (!('confirmed' in input))
            pensaError('MISSION_UNAVAILABLE', 'Confira a missão antes de concluir.')
          if (mission.kind === 'setup' && !configurationVerified)
            pensaError('CREATION_CHANGED', 'Confira a extensão no jogo guardado antes de concluir.')
          next = {
            ...next,
            status: 'completed',
            validity: 'current',
            assigneeProfileId: actor.profileId,
            completedByProfileId: actor.profileId,
            completedAt: now.toISOString(),
            startedAt: progress.startedAt ?? now.toISOString(),
            verification: {
              missionContentRevision: mission.contentRevision,
              source: mission.kind === 'setup' ? 'saved_configuration' : 'child',
              note: input.note,
              verifiedAt: now.toISOString(),
              verifiedByProfileId: actor.profileId,
            },
          }
        }
        if (command === 'reopen') {
          next = {
            ...next,
            status: 'in_progress',
            validity: 'needs_review',
            assigneeProfileId: actor.profileId,
          }
          const dependents = P.pensaDependentClosure([missionId], state.revision.plan.missions)
          for (const dependent of P.invalidatePensaProgress(
            state.progress,
            [...dependents].filter((id) => id !== missionId),
          ))
            if (dependents.has(dependent.missionId) && dependent.missionId !== missionId)
              await this.repo.saveProgress(tx, state.project.id, dependent, now)
        }
        await this.repo.saveProgress(tx, state.project.id, next, now)
        if (next.status === 'completed' && next.validity === 'current') {
          if (mission.kind === 'feature' || mission.kind === 'integration')
            await this.milestone(tx, actor, state.project.id, 'first_feature', 15, 5, now)
          const all = state.progress.map((p) => (p.missionId === missionId ? next : p))
          const final = state.revision.plan.missions.find(
            (m) => m.kind === 'playtest' && m.scope === 'project',
          )
          const construction = state.revision.plan.missions.filter(
            (m) => m.id !== final?.id && (m.kind !== 'setup' || state.studioAuthoring !== 'code'),
          )
          if (
            construction.every((m) =>
              all.some(
                (p) => p.missionId === m.id && p.status === 'completed' && p.validity === 'current',
              ),
            )
          )
            await this.milestone(tx, actor, state.project.id, 'construction_complete', 15, 5, now)
          if (mission.id === final?.id)
            await this.milestone(tx, actor, state.project.id, 'project_verified', 30, 15, now)
        }
      },
    )
    return this.handoff(actor, missionId, capabilities)
  }

  async milestone(
    tx: PensaTransaction,
    actor: P.PensaActor,
    projectId: string,
    kind: string,
    xp: number,
    coins: number,
    now: Date,
  ) {
    await tx
      .insert(pensaExecutionEvents)
      .values({
        id: randomUUID(),
        projectId,
        projectKey: projectId,
        requestId: randomUUID(),
        requestHash: '0'.repeat(64),
        profileId: actor.profileId,
        accountId: actor.accountId,
        kind,
        data: {},
        reward: {
          ...(actor.audience === 'adult' ? { audience: 'adult' } : {}),
          xp,
          coins,
          privileged: actor.privileged,
          sourceType: kind === 'project_verified' ? 'pensa_cycle_complete' : 'pensa_stage_complete',
        },
        rewardStatus: 'pending',
        createdAt: now,
      })
      .onConflictDoNothing()
  }
}
