import { randomUUID } from 'node:crypto'
import * as P from '@sistemazero/core/pensa'
import { and, count, desc, eq, isNull, ne, or, sql } from 'drizzle-orm'
import { z } from 'zod'
import {
  CREATION_LIMITS,
  creationPartStorageKey,
  creationStorageKey,
} from '../../../domain/creations/creation'
import { pensaError } from '../../../domain/pensa/project.errors'
import {
  type DrizzlePensaProjectRepository,
  type PensaTransaction,
  pensaGameId,
} from './pensa-project.repository'
import { lockPensaAccount } from './pensa-reservations'
import {
  accountDeletionFences,
  creations,
  pensaCheckpoints,
  pensaDeletionJobs,
  pensaOperations,
  pensaProjectRevisions,
  pensaProjects,
} from './schema'

const fileSchema = z.strictObject({ source: z.string().min(1), destination: z.string().min(1) })
const savedSchema = z.strictObject({
  name: z.string(),
  kind: z.string(),
  bytes: z.number(),
  formatVersion: z.number(),
  contentFingerprint: z.string().nullable(),
  parts: z.array(z.strictObject({ hash: z.string(), bytes: z.number(), rev: z.number() })),
})
const snapshotSchema = z.strictObject({
  revision: P.PensaProjectRevisionSchema,
  progress: z.array(P.PensaMissionProgressSchema),
  teamRevision: z.number(),
  creation: savedSchema,
})
const manifestSchema = z.strictObject({
  files: z.array(fileSchema),
  bytes: z.number(),
  cleanupId: z.uuid().nullable(),
})
const restoreOutputSchema = z.strictObject({
  files: z.array(fileSchema),
  checkpointId: z.uuid(),
  baseRevisionId: z.uuid(),
  baseSaveRevision: z.number(),
  nextSaveRevision: z.number(),
  teamRevision: z.number(),
  progressVersions: z.record(z.string(), z.number()),
})

export const PensaProtectionActionSchema = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('prepare'),
    id: z.uuid(),
    baseRevisionId: z.uuid(),
    saveRevision: z.string().min(1),
  }),
  z.strictObject({ type: z.literal('commit'), id: z.uuid() }),
  z.strictObject({
    type: z.literal('restore_prepare'),
    id: z.uuid(),
    checkpointId: z.uuid(),
    baseRevisionId: z.uuid(),
    saveRevision: z.string().min(1),
  }),
  z.strictObject({ type: z.literal('restore_commit'), id: z.uuid() }),
  z.strictObject({ type: z.literal('abort'), id: z.uuid() }),
])
export type PensaProtectionAction = z.infer<typeof PensaProtectionActionSchema>

export class DrizzlePensaCheckpointsRepository {
  constructor(readonly projects: DrizzlePensaProjectRepository) {}

  async list(actor: P.PensaActor, projectId: string): Promise<P.PensaCheckpoint[]> {
    await this.projects.get(actor, projectId)
    const rows = await this.projects.db
      .select()
      .from(pensaCheckpoints)
      .where(
        and(
          eq(pensaCheckpoints.projectId, projectId),
          eq(pensaCheckpoints.profileId, actor.profileId),
          ne(pensaCheckpoints.status, 'failed'),
        ),
      )
      .orderBy(desc(pensaCheckpoints.createdAt))
      .limit(P.PENSA_LIMITS.checkpointCount)
    return rows.map((r) => ({
      id: r.id,
      projectId,
      projectRevisionId: r.projectRevisionId,
      creation: {
        tool: 'studio',
        profileId: r.profileId,
        creationId: r.creationId,
        saveRevision: r.saveRevision,
        contentFingerprint: snapshotSchema.parse(r.snapshot).creation.contentFingerprint,
      },
      status: z.enum(['copying', 'ready', 'failed']).parse(r.status),
      createdAt: r.createdAt.toISOString(),
    }))
  }

  async orphan(
    tx: PensaTransaction,
    actor: P.PensaActor,
    files: Array<{ destination: string }>,
    now: Date,
  ) {
    const id = randomUUID()
    await tx.insert(pensaDeletionJobs).values({
      id,
      accountId: actor.accountId,
      profileId: actor.profileId,
      prefixes: files.map((f) => f.destination),
      notBefore: new Date(now.getTime() + 600_000),
      createdAt: now,
      updatedAt: now,
    })
    return id
  }

  async protect(
    actor: P.PensaActor,
    projectId: string,
    action: PensaProtectionAction,
    capabilities: P.PensaCapabilities,
  ) {
    const outcome = await this.projects.db.transaction(async (tx) => {
      await lockPensaAccount(tx, actor.accountId)
      const [fence] = await tx
        .select()
        .from(accountDeletionFences)
        .where(eq(accountDeletionFences.accountId, actor.accountId))
      if (fence) pensaError('PROJECT_GONE', 'Esta conta não está disponível.')
      const state = await this.projects.load(tx, actor, projectId, true)
      if (
        state.team.programmerProfileId !== actor.profileId ||
        !state.revision ||
        state.project.status !== 'active'
      )
        pensaError('NOT_YOUR_MISSION', 'Só quem programa pode guardar e restaurar o jogo.')
      const now = this.projects.clock()
      if (action.type === 'abort') {
        const [checkpoint] = await tx
          .select()
          .from(pensaCheckpoints)
          .where(
            and(
              eq(pensaCheckpoints.id, action.id),
              eq(pensaCheckpoints.projectId, projectId),
              eq(pensaCheckpoints.profileId, actor.profileId),
            ),
          )
          .for('update')
        if (checkpoint?.status === 'copying') {
          const manifest = manifestSchema.parse(checkpoint.manifest)
          const cleanupId = await this.orphan(tx, actor, manifest.files, now)
          await tx
            .update(pensaCheckpoints)
            .set({ status: 'failed', manifest: { ...manifest, cleanupId } })
            .where(eq(pensaCheckpoints.id, action.id))
        }
        const [operation] = await tx
          .select()
          .from(pensaOperations)
          .where(
            and(
              eq(pensaOperations.id, action.id),
              eq(pensaOperations.projectId, projectId),
              eq(pensaOperations.profileId, actor.profileId),
            ),
          )
          .for('update')
        if (operation?.kind === 'restore' && operation.status === 'waiting') {
          await this.orphan(tx, actor, restoreOutputSchema.parse(operation.output).files, now)
          await tx
            .update(pensaOperations)
            .set({ status: 'cancelled', updatedAt: now })
            .where(eq(pensaOperations.id, operation.id))
        }
        return { id: action.id, files: [] }
      }
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`creation-quota:${actor.profileId}`}, 0))`,
      )
      const [creation] = await tx
        .select()
        .from(creations)
        .where(
          and(
            eq(creations.userId, actor.profileId),
            eq(creations.audience, actor.audience ?? 'kids'),
            eq(creations.accountId, actor.accountId),
            eq(creations.tool, 'studio'),
            eq(creations.itemId, pensaGameId(projectId)),
            isNull(creations.deletedAt),
          ),
        )
        .for('update')
      if (!creation?.storageRef || creation.pendingRevision)
        pensaError('CREATION_NOT_SAVED', 'Guarde o jogo na conta antes de continuar.')
      if (
        'baseRevisionId' in action &&
        (action.baseRevisionId !== state.revision.id ||
          action.saveRevision !== String(creation.revision))
      )
        pensaError('REVISION_CONFLICT', 'O jogo mudou. Confira a versão atual.')
      if (action.type === 'prepare') {
        const [existing] = await tx
          .select()
          .from(pensaCheckpoints)
          .where(eq(pensaCheckpoints.id, action.id))
        if (existing) {
          if (existing.status === 'failed')
            pensaError('REVISION_CONFLICT', 'Esta tentativa foi encerrada. Guarde uma nova versão.')
          if (
            existing.projectId !== projectId ||
            existing.profileId !== actor.profileId ||
            existing.projectRevisionId !== action.baseRevisionId ||
            existing.saveRevision !== action.saveRevision
          )
            pensaError('REVISION_CONFLICT', 'Este pedido já pertence a outra versão.')
          return { id: existing.id, files: manifestSchema.parse(existing.manifest).files }
        }
        const [usage] = await tx
          .select({
            n: count(),
            bytes: sql<number>`coalesce(sum((${pensaCheckpoints.manifest}->>'bytes')::bigint),0)`,
          })
          .from(pensaCheckpoints)
          .leftJoin(
            pensaDeletionJobs,
            eq(pensaDeletionJobs.id, sql`(${pensaCheckpoints.manifest}->>'cleanupId')::uuid`),
          )
          .where(
            and(
              eq(pensaCheckpoints.profileId, actor.profileId),
              or(ne(pensaCheckpoints.status, 'failed'), isNull(pensaDeletionJobs.completedAt)),
            ),
          )
        if (
          Number(usage?.n ?? 0) >= P.PENSA_LIMITS.checkpointCount ||
          Number(usage?.bytes ?? 0) + creation.bytes > P.PENSA_LIMITS.checkpointBytes
        )
          pensaError('QUOTA_EXCEEDED', 'O espaço de versões guardadas está cheio.')
        const parts = z
          .array(z.strictObject({ hash: z.string(), bytes: z.number(), rev: z.number() }))
          .parse(creation.parts)
        const prefix = `creations/${actor.profileId}/pensa/${projectId}/checkpoints/${action.id}`
        const files = [
          { source: creation.storageRef, destination: `${prefix}/game.json.gz` },
          ...parts.map((p) => ({
            source: creationPartStorageKey(
              actor.profileId,
              'studio',
              creation.itemId,
              p.hash,
              p.rev,
            ),
            destination: `${prefix}/${p.hash}.gz`,
          })),
        ]
        const snapshot = {
          revision: state.revision,
          progress: state.progress,
          teamRevision: state.project.teamRevision,
          creation: {
            name: creation.name,
            kind: creation.kind,
            bytes: creation.bytes,
            formatVersion: creation.formatVersion,
            contentFingerprint: creation.contentFingerprint,
            parts,
          },
        }
        await tx.insert(pensaCheckpoints).values({
          id: action.id,
          projectId,
          projectRevisionId: state.revision.id,
          profileId: actor.profileId,
          accountId: actor.accountId,
          creationId: creation.itemId,
          saveRevision: String(creation.revision),
          snapshot,
          manifest: { files, bytes: creation.bytes, cleanupId: null },
          status: 'copying',
          createdAt: now,
        })
        return { id: action.id, files }
      }
      if (action.type === 'commit') {
        const [checkpoint] = await tx
          .select()
          .from(pensaCheckpoints)
          .where(
            and(
              eq(pensaCheckpoints.id, action.id),
              eq(pensaCheckpoints.projectId, projectId),
              eq(pensaCheckpoints.profileId, actor.profileId),
            ),
          )
          .for('update')
        if (!checkpoint) pensaError('PROJECT_GONE', 'Esta versão não está disponível.')
        if (checkpoint.status === 'ready') return { id: checkpoint.id, files: [] }
        if (checkpoint.status !== 'copying')
          pensaError('REVISION_CONFLICT', 'Esta proteção falhou ou foi cancelada.')
        const captured = snapshotSchema.parse(checkpoint.snapshot)
        if (
          checkpoint.projectRevisionId !== state.revision.id ||
          checkpoint.saveRevision !== String(creation.revision) ||
          captured.teamRevision !== state.project.teamRevision ||
          state.progress.some(
            (p) =>
              captured.progress.find((old) => old.missionId === p.missionId)?.progressRevision !==
              p.progressRevision,
          )
        ) {
          const manifest = manifestSchema.parse(checkpoint.manifest)
          const cleanupId = await this.orphan(tx, actor, manifest.files, now)
          await tx
            .update(pensaCheckpoints)
            .set({ status: 'failed', manifest: { ...manifest, cleanupId } })
            .where(eq(pensaCheckpoints.id, checkpoint.id))
          return { conflict: true }
        }
        await tx
          .update(pensaCheckpoints)
          .set({ status: 'ready' })
          .where(eq(pensaCheckpoints.id, checkpoint.id))
        return { id: checkpoint.id, files: [] }
      }
      if (action.type === 'restore_prepare') {
        const [currentProtection] = await tx
          .select()
          .from(pensaCheckpoints)
          .where(
            and(
              eq(pensaCheckpoints.projectId, projectId),
              eq(pensaCheckpoints.profileId, actor.profileId),
              eq(pensaCheckpoints.saveRevision, String(creation.revision)),
              eq(pensaCheckpoints.projectRevisionId, state.revision.id),
              eq(pensaCheckpoints.status, 'ready'),
            ),
          )
          .limit(1)
        if (!currentProtection)
          pensaError(
            'CREATION_NOT_SAVED',
            'Guarde uma versão protegida do estado atual antes de restaurar.',
          )
        const [target] = await tx
          .select()
          .from(pensaCheckpoints)
          .where(
            and(
              eq(pensaCheckpoints.id, action.checkpointId),
              eq(pensaCheckpoints.projectId, projectId),
              eq(pensaCheckpoints.profileId, actor.profileId),
              eq(pensaCheckpoints.status, 'ready'),
            ),
          )
        if (!target) pensaError('PROJECT_GONE', 'Esta versão não está disponível.')
        const [existing] = await tx
          .select()
          .from(pensaOperations)
          .where(eq(pensaOperations.id, action.id))
        if (existing) {
          const oldOutput = restoreOutputSchema.parse(existing.output)
          if (
            existing.projectId !== projectId ||
            existing.kind !== 'restore' ||
            existing.profileId !== actor.profileId ||
            oldOutput.checkpointId !== action.checkpointId ||
            oldOutput.baseRevisionId !== action.baseRevisionId ||
            String(oldOutput.baseSaveRevision) !== action.saveRevision ||
            !['waiting', 'succeeded'].includes(existing.status)
          )
            pensaError('REVISION_CONFLICT', 'Este pedido já foi usado.')
          return { id: existing.id, files: existing.status === 'succeeded' ? [] : oldOutput.files }
        }
        const snapshot = snapshotSchema.parse(target.snapshot),
          manifest = manifestSchema.parse(target.manifest)
        const technical = {
          ...snapshot.revision.technical,
          capabilitiesFingerprint: capabilities.fingerprint,
          catalogVersion: capabilities.catalogVersion,
        }
        if (
          !P.validatePensaPlan({
            ...snapshot.revision,
            technical,
            capabilities,
            team: state.team,
            accepted: true,
          }).ok
        )
          pensaError(
            'RESOURCES_CHANGED',
            'Esta versão precisa de recursos diferentes. Consulte a versão e adapte o projeto antes de restaurar.',
          )
        if (
          new Set(
            [
              ...snapshot.revision.definition.futureIdeas,
              ...state.revision.definition.futureIdeas,
            ].map((idea) => idea.id),
          ).size > 80
        )
          pensaError(
            'QUOTA_EXCEEDED',
            'Há muitas ideias guardadas para reunir nesta restauração. Organize-as antes de continuar.',
          )
        const nextSaveRevision = creation.lastReservedRevision + 1
        const files = manifest.files.map((f, i) => ({
          source: f.destination,
          destination:
            i === 0
              ? creationStorageKey(actor.profileId, 'studio', creation.itemId, nextSaveRevision)
              : creationPartStorageKey(
                  actor.profileId,
                  'studio',
                  creation.itemId,
                  snapshot.creation.parts[i - 1]!.hash,
                  nextSaveRevision,
                ),
        }))
        const impact = P.analyzePensaChange(state.revision, { ...snapshot.revision, technical })
        const affected = new Set([
          ...impact.changedMissionIds,
          ...impact.removedMissionIds,
          ...impact.reviewMissionIds,
          ...snapshot.revision.plan.missions
            .filter((m) => m.destination === 'studio')
            .map((m) => m.id),
        ])
        const output = {
          files,
          checkpointId: target.id,
          baseRevisionId: state.revision.id,
          baseSaveRevision: creation.revision,
          nextSaveRevision,
          teamRevision: state.project.teamRevision,
          progressVersions: Object.fromEntries(
            state.progress
              .filter((p) => affected.has(p.missionId))
              .map((p) => [p.missionId, p.progressRevision]),
          ),
        }
        await tx
          .update(creations)
          .set({ lastReservedRevision: nextSaveRevision })
          .where(eq(creations.id, creation.id))
        await tx.insert(pensaOperations).values({
          id: action.id,
          projectId,
          profileId: actor.profileId,
          accountId: actor.accountId,
          kind: 'restore',
          step: 'copy',
          status: 'waiting',
          inputRevision: state.project.revisionNumber,
          input: {},
          output,
          createdAt: now,
          updatedAt: now,
        })
        return { id: action.id, files }
      }
      const [operation] = await tx
        .select()
        .from(pensaOperations)
        .where(
          and(
            eq(pensaOperations.id, action.id),
            eq(pensaOperations.projectId, projectId),
            eq(pensaOperations.profileId, actor.profileId),
          ),
        )
        .for('update')
      if (operation?.kind !== 'restore')
        pensaError('PROJECT_GONE', 'Esta restauração não está disponível.')
      if (operation.status === 'succeeded') return { id: operation.id, files: [] }
      if (operation.status !== 'waiting')
        pensaError('REVISION_CONFLICT', 'Esta restauração foi cancelada ou falhou.')
      const output = restoreOutputSchema.parse(operation.output)
      if (
        output.baseRevisionId !== state.revision.id ||
        output.baseSaveRevision !== creation.revision ||
        output.teamRevision !== state.project.teamRevision ||
        Object.entries(output.progressVersions).some(
          ([id, revision]) =>
            state.progress.find((p) => p.missionId === id)?.progressRevision !== revision,
        )
      ) {
        await tx
          .update(pensaOperations)
          .set({ status: 'failed', error: 'O projeto mudou durante a cópia.' })
          .where(eq(pensaOperations.id, operation.id))
        await this.orphan(tx, actor, output.files, now)
        return { conflict: true }
      }
      const [target] = await tx
        .select()
        .from(pensaCheckpoints)
        .where(
          and(eq(pensaCheckpoints.id, output.checkpointId), eq(pensaCheckpoints.status, 'ready')),
        )
      if (!target) pensaError('PROJECT_GONE', 'Esta versão não está disponível.')
      const snapshot = snapshotSchema.parse(target.snapshot)
      const technical = {
        ...snapshot.revision.technical,
        capabilitiesFingerprint: capabilities.fingerprint,
        catalogVersion: capabilities.catalogVersion,
      }
      if (
        !P.validatePensaPlan({
          ...snapshot.revision,
          technical,
          capabilities,
          team: state.team,
          accepted: true,
        }).ok
      ) {
        await tx
          .update(pensaOperations)
          .set({ status: 'failed', error: 'Os recursos mudaram.' })
          .where(eq(pensaOperations.id, operation.id))
        await this.orphan(tx, actor, output.files, now)
        return { conflict: true }
      }
      const [usage] = await tx
        .select({ bytes: sql<number>`coalesce(sum(${creations.bytes}),0)` })
        .from(creations)
        .where(
          and(
            eq(creations.userId, actor.profileId),
            eq(creations.audience, actor.audience ?? 'kids'),
            isNull(creations.deletedAt),
          ),
        )
      if (
        Number(usage?.bytes ?? 0) - creation.bytes + snapshot.creation.bytes >
        CREATION_LIMITS.maxTotalBytes
      )
        pensaError('QUOTA_EXCEEDED', 'Não há espaço para restaurar o jogo agora.')
      const futureIdeas = [
        ...new Map(
          [
            ...snapshot.revision.definition.futureIdeas,
            ...state.revision.definition.futureIdeas,
          ].map((i) => [i.id, i]),
        ).values(),
      ]
      if (futureIdeas.length > 80)
        pensaError('QUOTA_EXCEEDED', 'Organize as ideias guardadas antes de restaurar.')
      const history = await tx
        .select({ snapshot: pensaProjectRevisions.snapshot })
        .from(pensaProjectRevisions)
        .where(eq(pensaProjectRevisions.projectId, projectId))
      const maxContent = new Map<string, number>()
      for (const row of history)
        for (const mission of P.PensaProjectRevisionSchema.parse(row.snapshot).plan.missions)
          maxContent.set(
            mission.id,
            Math.max(maxContent.get(mission.id) ?? 0, mission.contentRevision),
          )
      const revision: P.PensaProjectRevision = {
        ...snapshot.revision,
        technical,
        id: randomUUID(),
        number: state.project.revisionNumber + 1,
        previousRevisionId: state.revision.id,
        acceptedByProfileId: actor.profileId,
        acceptedAt: now.toISOString(),
        definition: { ...snapshot.revision.definition, futureIdeas },
        plan: {
          ...snapshot.revision.plan,
          missions: snapshot.revision.plan.missions.map((m) => ({
            ...m,
            contentRevision: (maxContent.get(m.id) ?? m.contentRevision) + 1,
          })),
        },
      }
      const missingAssets: string[] = []
      for (const p of snapshot.progress)
        for (const delivery of p.deliveries) {
          if (delivery.creation.tool === 'studio') continue
          const ref = delivery.creation
          const [saved] = await tx
            .select()
            .from(creations)
            .where(
              and(
                eq(creations.userId, ref.profileId),
                eq(creations.tool, ref.tool),
                eq(creations.itemId, ref.creationId),
                isNull(creations.deletedAt),
              ),
            )
          if (
            !state.team.people.some((person) => person.profileId === ref.profileId) ||
            !saved?.storageRef ||
            saved.pendingRevision ||
            String(saved.revision) !== ref.saveRevision
          )
            missingAssets.push(p.missionId)
        }
      const needsReview = P.pensaDependentClosure(missingAssets, revision.plan.missions)
      await tx.insert(pensaProjectRevisions).values({
        id: revision.id,
        projectId,
        number: revision.number,
        previousRevisionId: state.revision.id,
        snapshot: revision,
        acceptedByProfileId: actor.profileId,
        acceptedAt: now,
      })
      for (const captured of snapshot.progress) {
        const capturedMission = revision.plan.missions.find((m) => m.id === captured.missionId)
        const existing = state.progress.find((p) => p.missionId === captured.missionId)
        const p =
          capturedMission?.kind === 'asset' &&
          existing &&
          !(captured.missionId in output.progressVersions)
            ? existing
            : captured
        const mission = revision.plan.missions.find((m) => m.id === p.missionId)
        const current = state.progress.find((x) => x.missionId === p.missionId)
        const final = mission?.kind === 'playtest' && mission.scope === 'project'
        const assignee =
          p.assigneeProfileId && state.team.people.some((x) => x.profileId === p.assigneeProfileId)
            ? p.assigneeProfileId
            : null
        await this.projects.saveProgress(
          tx,
          projectId,
          {
            ...p,
            progressRevision: Math.max(p.progressRevision, current?.progressRevision ?? 0) + 1,
            validity: final || needsReview.has(p.missionId) ? 'needs_review' : p.validity,
            assigneeProfileId: assignee,
            deliveries: p.deliveries.map((d) =>
              d.creation.tool === 'studio'
                ? {
                    ...d,
                    creation: { ...d.creation, saveRevision: String(output.nextSaveRevision) },
                  }
                : d,
            ),
            verification:
              p.verification && mission
                ? { ...p.verification, missionContentRevision: mission.contentRevision }
                : p.verification,
          },
          now,
        )
      }
      await tx
        .update(creations)
        .set({
          revision: output.nextSaveRevision,
          storageRef: output.files[0]!.destination,
          name: snapshot.creation.name,
          kind: snapshot.creation.kind,
          bytes: snapshot.creation.bytes,
          formatVersion: snapshot.creation.formatVersion,
          contentFingerprint: snapshot.creation.contentFingerprint,
          parts: snapshot.creation.parts.map((p) => ({ ...p, rev: output.nextSaveRevision })),
          itemUpdatedAt: now,
          syncedAt: now,
        })
        .where(eq(creations.id, creation.id))
      await tx
        .update(pensaProjects)
        .set({
          activeRevisionId: revision.id,
          revisionNumber: revision.number,
          executionRevision: state.project.executionRevision + 1,
          updatedAt: now,
        })
        .where(eq(pensaProjects.id, projectId))
      await tx
        .update(pensaOperations)
        .set({ status: 'succeeded', step: 'commit', updatedAt: now })
        .where(eq(pensaOperations.id, operation.id))
      return { id: operation.id, files: [] }
    })
    if ('conflict' in outcome)
      pensaError(
        'REVISION_CONFLICT',
        'O projeto mudou durante a cópia. O estado atual foi preservado.',
      )
    return outcome
  }
}
