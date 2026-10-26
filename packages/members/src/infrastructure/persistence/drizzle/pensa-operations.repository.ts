import { randomUUID } from 'node:crypto'
import * as P from '@sistemazero/core/pensa'
import { and, eq, inArray, sql } from 'drizzle-orm'
import { localDateSaoPaulo } from '../../../domain/gamification/gamification'
import {
  pensaBudgetRefusal,
  pensaManifestCoherent,
  pensaOperationBudget,
  pensaOperationRetryable,
  pensaOperationUnit,
} from '../../../domain/pensa/operation-budget'
import { PensaProjectError, pensaError } from '../../../domain/pensa/project.errors'
import type { DrizzlePensaProjectCommands } from './pensa-project.commands'
import {
  type DrizzlePensaProjectRepository,
  operationView,
  type PensaTransaction,
} from './pensa-project.repository'
import {
  commitPensaUsage,
  lockPensaAccount,
  releasePensaReservation,
  reservePensaUsage,
} from './pensa-reservations'
import { accountDeletionFences, pensaOperations, pensaProviderUsage } from './schema'

export class DrizzlePensaOperationsRepository {
  constructor(
    readonly projects: DrizzlePensaProjectCommands,
    readonly limits: { dailyLimit: number; monthlyLimit: number },
  ) {}
  get store(): DrizzlePensaProjectRepository {
    return this.projects.repo
  }

  async lock(tx: PensaTransaction, actor: P.PensaActor, projectId: string, operationId: string) {
    const [payer] = await tx
      .select({ accountId: pensaOperations.accountId })
      .from(pensaOperations)
      .where(and(eq(pensaOperations.id, operationId), eq(pensaOperations.projectId, projectId)))
    if (!payer) pensaError('PROJECT_GONE', 'Este pedido não está mais disponível.')
    for (const accountId of [...new Set([actor.accountId, payer.accountId])].sort())
      await lockPensaAccount(tx, accountId)
    const state = await this.store.load(tx, actor, projectId, true)
    const [operation] = await tx
      .select()
      .from(pensaOperations)
      .where(and(eq(pensaOperations.id, operationId), eq(pensaOperations.projectId, projectId)))
      .for('update')
    if (!operation) pensaError('PROJECT_GONE', 'Este pedido não está mais disponível.')
    if (operation.accountId !== payer.accountId)
      pensaError('REVISION_CONFLICT', 'O pedido mudou. Tente novamente pela versão atual.')
    const fences = await tx
      .select()
      .from(accountDeletionFences)
      .where(
        inArray(accountDeletionFences.accountId, [
          ...new Set([actor.accountId, operation.accountId]),
        ]),
      )
    if (fences.length) pensaError('PROJECT_GONE', 'Esta conta não está disponível.')
    return { state, operation }
  }

  unit(operation: typeof pensaOperations.$inferSelect) {
    const unit = pensaOperationUnit(operation)
    if (!unit) pensaError('OPERATION_FAILED', 'O trabalho desta parte precisa ser reorganizado.')
    return unit
  }

  manifest(value: unknown): P.PensaWorkManifest {
    const manifest = P.PensaWorkManifestSchema.parse(value)
    if (!pensaManifestCoherent(manifest))
      pensaError('OPERATION_FAILED', 'O orçamento precisa cobrir as partes únicas do plano.')
    return manifest
  }

  async claim(
    actor: P.PensaActor,
    projectId: string,
    operationId: string,
    leaseId: string,
    capabilities: P.PensaCapabilities,
  ): Promise<P.PensaOperationWork | null> {
    try {
      return await this.store.db.transaction(async (tx) => {
        const { state, operation } = await this.lock(tx, actor, projectId, operationId)
        this.projects.assertCapabilities(state, capabilities)
        const now = this.store.clock()
        if (
          state.project.status !== 'active' ||
          state.project.paused ||
          !['queued', 'running', 'failed'].includes(operation.status) ||
          (operation.leaseUntil && operation.leaseUntil > now)
        )
          return null
        if (
          operation.input.baseRevisionId !== (state.revision?.id ?? null) ||
          operation.input.baseTeamRevision !== state.project.teamRevision
        )
          pensaError(
            'RESOURCES_CHANGED',
            'O projeto mudou. Retome a organização pela versão atual.',
          )
        const budget = pensaOperationBudget(operation)
        if (!budget) pensaError('OPERATION_FAILED', 'O orçamento desta parte não pôde ser lido.')
        const unitId = this.unit(operation)
        const key = `${String(operation.input.messageRequestId ?? operation.id)}:${unitId}`
        const dialogue = operation.step === 'understanding'
        const help = operation.kind === 'help'
        const manifest = operation.output.manifest ? this.manifest(operation.output.manifest) : null
        const refusal = pensaBudgetRefusal(operation, unitId, budget, manifest)
        if (refusal === 'plan')
          pensaError(
            'QUOTA_EXCEEDED',
            'O plano atingiu o orçamento combinado. O rascunho está guardado.',
          )
        if (refusal === 'unit')
          pensaError(
            'QUOTA_EXCEEDED',
            'Esta parte atingiu o limite de tentativas. Sua ideia está guardada.',
          )
        const day = localDateSaoPaulo(now),
          month = `${day.slice(0, 7)}-01`
        const [usage] = await tx
          .select({
            day: sql<number>`coalesce(sum(case when ${pensaProviderUsage.day} = ${day} then ${pensaProviderUsage.calls} else 0 end), 0)`,
            month: sql<number>`coalesce(sum(${pensaProviderUsage.calls}), 0)`,
          })
          .from(pensaProviderUsage)
          .where(
            and(
              eq(pensaProviderUsage.accountId, operation.accountId),
              sql`${pensaProviderUsage.day} >= ${month}`,
            ),
          )
        if (
          Number(usage?.day ?? 0) >= P.PENSA_LIMITS.providerCallsPerDay ||
          Number(usage?.month ?? 0) >= P.PENSA_LIMITS.providerCallsPerMonth
        )
          pensaError(
            'QUOTA_EXCEEDED',
            'O Zappy atingiu o limite deste período. Seu rascunho continua guardado.',
          )
        await reservePensaUsage(tx, {
          id: operation.id,
          projectId,
          profileId: operation.profileId,
          accountId: operation.accountId,
          privileged: operation.input.privileged === true,
          feature: help ? 'pensa-help' : 'pensa-planning',
          ...this.limits,
          now,
        })
        const nextBudget = {
          ...budget,
          dialogueCalls: budget.dialogueCalls + (dialogue ? 1 : 0),
          roundCalls: budget.roundCalls + (dialogue ? 1 : 0),
          planningCalls: budget.planningCalls + (!dialogue && !help ? 1 : 0),
          helpCalls: budget.helpCalls + (help ? 1 : 0),
          unitAttempts: { ...budget.unitAttempts, [key]: (budget.unitAttempts[key] ?? 0) + 1 },
        }
        const leaseUntil = new Date(now.getTime() + P.PENSA_LIMITS.operationLeaseMs)
        const input = {
          ...operation.input,
          budget: nextBudget,
          claimedUnitKey: unitId,
          capabilities,
          expectedDraftRevision: state.draft?.revision ?? null,
        }
        await tx
          .update(pensaOperations)
          .set({
            status: 'running',
            leaseId,
            leaseUntil,
            calls: operation.calls + 1,
            attempts: operation.attempts + 1,
            input,
            error: null,
            updatedAt: now,
          })
          .where(eq(pensaOperations.id, operation.id))
        await tx
          .insert(pensaProviderUsage)
          .values({ accountId: operation.accountId, day, calls: 1, updatedAt: now })
          .onConflictDoUpdate({
            target: [pensaProviderUsage.accountId, pensaProviderUsage.day],
            set: { calls: sql`${pensaProviderUsage.calls} + 1`, updatedAt: now },
          })
        return P.PensaOperationWorkSchema.parse({
          ...operationView(operation),
          status: 'running',
          calls: operation.calls + 1,
          actor: {
            ...(state.project.audience === 'adult' ? { audience: 'adult' as const } : {}),
            profileId: operation.profileId,
            accountId: operation.accountId,
            privileged: operation.input.privileged === true,
          },
          baseRevisionId: state.revision?.id ?? null,
          baseTeamRevision: state.project.teamRevision,
          input,
          output: operation.output,
          budget: nextBudget,
          leaseId,
          leaseUntil: leaseUntil.toISOString(),
        })
      })
    } catch (error) {
      if (
        error instanceof PensaProjectError &&
        [
          'QUOTA_EXCEEDED',
          'RESOURCES_CHANGED',
          'RESOURCES_UNAVAILABLE',
          'OPERATION_FAILED',
        ].includes(error.code)
      ) {
        await this.store.db.transaction(async (tx) => {
          const { operation } = await this.lock(tx, actor, projectId, operationId)
          const now = this.store.clock()
          if (
            !['queued', 'failed', 'running'].includes(operation.status) ||
            (operation.leaseUntil && operation.leaseUntil > now)
          )
            return
          await tx
            .update(pensaOperations)
            .set({
              status: 'failed',
              leaseId: null,
              leaseUntil: null,
              error: error.message,
              updatedAt: now,
            })
            .where(eq(pensaOperations.id, operationId))
          await releasePensaReservation(tx, operationId, now)
        })
      }
      throw error
    }
  }

  async publish(
    actor: P.PensaActor,
    projectId: string,
    operationId: string,
    leaseId: string,
    result: P.PensaOperationStepResult,
    capabilities: P.PensaCapabilities,
  ) {
    await this.store.db.transaction(async (tx) => {
      const { state, operation } = await this.lock(tx, actor, projectId, operationId)
      this.projects.assertCapabilities(state, capabilities)
      const now = this.store.clock()
      if (
        operation.status !== 'running' ||
        operation.leaseId !== leaseId ||
        !operation.leaseUntil ||
        operation.leaseUntil <= now ||
        operation.input.baseRevisionId !== (state.revision?.id ?? null) ||
        operation.input.baseTeamRevision !== state.project.teamRevision ||
        (operation.kind === 'planning' &&
          operation.input.expectedDraftRevision !== (state.draft?.revision ?? null)) ||
        state.project.status !== 'active' ||
        state.project.paused
      )
        pensaError('REVISION_CONFLICT', 'Este resultado ficou antigo. Retome a organização atual.')
      const completed = Array.isArray(operation.output.completedUnitIds)
        ? operation.output.completedUnitIds.filter((id): id is string => typeof id === 'string')
        : []
      const currentKey = String(operation.input.claimedUnitKey)
      const completedUnitIds = [...new Set([...completed, currentKey])]
      let output = operation.output,
        step = operation.step,
        status = 'queued'
      if (result.type === 'step') {
        if (!['understanding', 'outline', 'missions', 'review', 'answer'].includes(result.step))
          pensaError('OPERATION_FAILED', 'O resultado não corresponde a uma parte de planejamento.')
        const allowed: Record<P.PensaOperationStep, P.PensaOperationStep[]> = {
          understanding: ['outline', 'understanding'],
          outline: ['missions'],
          missions: ['missions', 'review'],
          review: ['review'],
          choice: ['understanding'],
          answer: ['answer'],
          copy: [],
          commit: [],
        }
        if (!allowed[operation.step].includes(result.step))
          pensaError('OPERATION_FAILED', 'A preparação precisa seguir a ordem combinada.')
        output = { ...operation.output, ...result.output, completedUnitIds }
        if (result.step === 'missions' || result.step === 'review') {
          const manifest = this.manifest(output.manifest)
          output.completedUnitIds = completedUnitIds.filter((id) =>
            manifest.units.some((unit) => unit.id === id),
          )
          const nextKey = output.unitKey
          if (
            typeof nextKey !== 'string' ||
            !manifest.units.some((u) => u.id === nextKey) ||
            completedUnitIds.includes(nextKey)
          )
            pensaError('OPERATION_FAILED', 'O plano precisa indicar sua próxima parte pendente.')
          if (
            operation.output.manifest &&
            P.pensaCanonicalJson(operation.output.manifest) !==
              P.pensaCanonicalJson(output.manifest)
          )
            pensaError(
              'OPERATION_FAILED',
              'O orçamento combinado não pode ser ampliado durante a geração.',
            )
        }
        step = result.step
      } else if (result.type === 'question') {
        if (operation.step !== 'understanding' || !state.draft)
          pensaError('OPERATION_FAILED', 'Esta pergunta não corresponde ao pedido atual.')
        const definition = this.preserveReceipts(state.draft.definition, result.definition)
        await this.store.saveDraft(tx, {
          ...state.draft,
          revision: state.draft.revision + 1,
          status: 'needs_choice',
          definition,
          pendingChoices: result.pendingChoices,
          updatedAt: now.toISOString(),
        })
        await this.store.saveMessage(
          tx,
          actor,
          projectId,
          'planning',
          result.text,
          'assistant',
          null,
          now,
        )
        status = 'waiting'
        step = 'choice'
        output = { ...output, completedUnitIds }
      } else if (result.type === 'draft') {
        if (operation.step !== 'review' || !state.draft)
          pensaError('OPERATION_FAILED', 'O plano precisa passar pela revisão completa.')
        const manifest = this.manifest(operation.output.manifest)
        if (manifest.units.some((unit) => !completedUnitIds.includes(unit.id)))
          pensaError('OPERATION_FAILED', 'Ainda falta revisar uma parte do plano.')
        const definition = this.preserveReceipts(state.draft.definition, result.definition)
        const plan = await this.projects.normalizePlan(tx, state, result.plan)
        const validation = P.validatePensaPlan({
          ...result,
          definition,
          plan,
          capabilities,
          team: state.team,
        })
        if (!validation.ok)
          pensaError(
            'OPERATION_FAILED',
            validation.issues[0]?.message ?? 'O plano precisa de um ajuste.',
          )
        if (result.technical.capabilitiesFingerprint !== capabilities.fingerprint)
          pensaError('RESOURCES_CHANGED', 'Os recursos mudaram durante a preparação.')
        const impact = P.analyzePensaChange(state.revision, { ...result, definition, plan })
        const affected = new Set([
          ...impact.reviewMissionIds,
          ...impact.removedMissionIds,
          ...impact.changedMissionIds,
        ])
        await this.store.saveDraft(tx, {
          ...state.draft,
          revision: state.draft.revision + 1,
          status: 'ready',
          definition,
          plan,
          technical: result.technical,
          pendingChoices: [],
          impact,
          affectedProgressVersions: Object.fromEntries(
            state.progress
              .filter((p) => affected.has(p.missionId))
              .map((p) => [p.missionId, p.progressRevision]),
          ),
          capabilitiesFingerprint: capabilities.fingerprint,
          updatedAt: now.toISOString(),
        })
        await this.store.event(tx, actor, projectId, randomUUID(), '0'.repeat(64), 'draft_ready')
        output = { ...output, completedUnitIds }
        status = 'waiting'
        step = 'choice'
      } else {
        if (operation.kind !== 'help' || operation.step !== 'answer')
          pensaError('OPERATION_FAILED', 'Esta resposta não corresponde ao pedido.')
        await this.store.saveMessage(
          tx,
          actor,
          projectId,
          'help',
          result.text,
          'assistant',
          typeof operation.input.missionId === 'string' ? operation.input.missionId : null,
          now,
        )
        await commitPensaUsage(tx, operation.id, operation.accountId, now)
        output = { ...output, answer: result.text }
        status = 'succeeded'
      }
      await tx
        .update(pensaOperations)
        .set({ step, status, output, leaseId: null, leaseUntil: null, error: null, updatedAt: now })
        .where(eq(pensaOperations.id, operation.id))
    })
  }

  preserveReceipts(
    previous: P.PensaGameDefinition | null,
    next: P.PensaGameDefinition,
  ): P.PensaGameDefinition {
    if (previous && next.originalIntent !== previous.originalIntent)
      pensaError('DRAFT_CHANGED', 'A intenção original precisa continuar registrada.')
    const adaptations = next.adaptations.map((a) => {
      const existing = previous?.adaptations.find((p) => p.id === a.id)
      if (existing?.acceptedByProfileId) {
        if (
          P.pensaCanonicalJson({
            ...a,
            acceptedAt: existing.acceptedAt,
            acceptedByProfileId: existing.acceptedByProfileId,
          }) !== P.pensaCanonicalJson(existing)
        )
          pensaError('DRAFT_CHANGED', 'Uma adaptação escolhida não pode mudar sem nova escolha.')
        return existing
      }
      return { ...a, acceptedByProfileId: null, acceptedAt: null }
    })
    for (const existing of previous?.adaptations ?? [])
      if (existing.acceptedByProfileId && !adaptations.some((a) => a.id === existing.id))
        adaptations.push(existing)
    return { ...next, adaptations }
  }

  async fail(
    actor: P.PensaActor,
    projectId: string,
    operationId: string,
    leaseId: string,
    message?: string,
  ) {
    await this.store.db.transaction(async (tx) => {
      const { operation } = await this.lock(tx, actor, projectId, operationId)
      if (operation.leaseId !== leaseId || operation.status !== 'running') return
      await tx
        .update(pensaOperations)
        .set({
          status: 'failed',
          leaseId: null,
          leaseUntil: null,
          error:
            message?.trim().slice(0, 1_000) ||
            'Não consegui preparar esta parte. Seu rascunho está guardado.',
          updatedAt: this.store.clock(),
        })
        .where(eq(pensaOperations.id, operation.id))
      await releasePensaReservation(tx, operation.id, this.store.clock())
    })
  }

  async cancel(actor: P.PensaActor, projectId: string, operationId: string, requestId: string) {
    await this.store.change(
      actor,
      projectId,
      'operation_cancel',
      { requestId, operationId },
      async (tx) => {
        const [operation] = await tx
          .select()
          .from(pensaOperations)
          .where(and(eq(pensaOperations.id, operationId), eq(pensaOperations.projectId, projectId)))
        if (!operation) pensaError('PROJECT_GONE', 'Este pedido não está mais disponível.')
        await this.store.cancelOperation(tx, operation, this.store.clock())
      },
    )
  }

  async retry(
    actor: P.PensaActor,
    projectId: string,
    operationId: string,
    requestId: string,
    capabilities: P.PensaCapabilities,
  ) {
    await this.store.change(
      actor,
      projectId,
      'operation_retry',
      { requestId, operationId },
      async (tx, state, now) => {
        this.projects.assertCapabilities(state, capabilities)
        if (state.project.status !== 'active' || state.project.paused)
          pensaError('MISSION_UNAVAILABLE', 'Retome o projeto antes de organizar esta parte.')
        const [operation] = await tx
          .select()
          .from(pensaOperations)
          .where(and(eq(pensaOperations.id, operationId), eq(pensaOperations.projectId, projectId)))
          .for('update')
        if (!operation || !['planning', 'help'].includes(operation.kind))
          pensaError('PROJECT_GONE', 'Este pedido não está disponível para retomar.')
        if (operation.status === 'queued' || operation.status === 'running') return
        if (operation.status !== 'failed')
          pensaError('REVISION_CONFLICT', 'Este pedido mudou. Confira a proposta atual.')
        // Recolocar na fila uma parte sem tentativas só faria a reivindicação recusar de novo.
        if (!pensaOperationRetryable(operation))
          pensaError(
            'QUOTA_EXCEEDED',
            'Esta parte já usou as tentativas que tinha. Sua ideia está guardada; conte de outro jeito para continuar.',
          )
        await tx
          .update(pensaOperations)
          .set({ status: 'queued', error: null, leaseId: null, leaseUntil: null, updatedAt: now })
          .where(eq(pensaOperations.id, operationId))
      },
    )
  }
}
