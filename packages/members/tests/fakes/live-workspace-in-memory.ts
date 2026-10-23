import {
  studioProjectContinuityIssue,
  studioProjectContinuityReference,
} from '@sistemazero/core/studio/project-continuity'
import { LiveConflictError } from '../../src/domain/live/live.errors'
import type {
  LiveWorkspaceRecord,
  LiveWorkspaceRepository,
  LiveWorkspaceRevision,
  LiveWorkspaceTransaction,
} from '../../src/domain/ports/live-workspace-repository.port'
import type {
  StudioLessonBinding,
  StudioLessonOwner,
} from '../../src/domain/ports/studio-lesson-binding-repository.port'
import type { StudioLessonBaseline } from '../../src/domain/studio/lesson-baseline'
import type { InMemoryLiveRepository } from './live-in-memory'

/** Live projects in memory, with the cohort read through the live repository fake. */
export class InMemoryLiveWorkspaceRepository implements LiveWorkspaceRepository {
  readonly records = new Map<string, LiveWorkspaceRecord>()
  readonly revisions = new Map<string, LiveWorkspaceRevision>()
  readonly bindings = new Map<string, StudioLessonBinding & { accountId: string }>()
  constructor(private readonly live: InMemoryLiveRepository) {}
  async readRuntimeContext(id: string, sessionId: string | null, blockId: string | null) {
    const record = this.records.get(id)
    if (!record) return null
    const { project, ...workspace } = structuredClone(record)
    const anchor = await this.live.sessionRef(workspace.sessionId)
    const selected = sessionId ? await this.live.sessionRef(sessionId) : anchor
    const cohort =
      anchor && selected?.cohortId === anchor.cohortId
        ? await this.live.findCohort(anchor.cohortId)
        : null
    const found = blockId
      ? await this.findBinding(
          { userId: workspace.learnerId, accountId: workspace.accountId },
          blockId,
        )
      : null
    const baseline = found?.workspaceId === id ? found.baseline : null
    const { initialProject, chain: _chain, ...curation } = baseline?.configuration ?? {}
    return {
      workspace,
      environment: studioProjectContinuityReference(project),
      cohort,
      binding: baseline
        ? {
            baselineId: baseline.id,
            lessonId: baseline.lessonId,
            courseId: baseline.courseId,
            environment: studioProjectContinuityReference(initialProject),
            curation,
          }
        : null,
    }
  }
  async findBinding(owner: StudioLessonOwner, blockId: string) {
    const found = this.bindings.get(`${owner.userId}:${blockId}`)
    return found?.accountId === owner.accountId ? structuredClone(found) : null
  }
  async openBound(
    candidate: LiveWorkspaceRecord & { projectKey: string },
    baseline: StudioLessonBaseline,
    sessionId: string,
  ) {
    const owner = { userId: candidate.learnerId, accountId: candidate.accountId }
    const bound = await this.findBinding(owner, baseline.blockId)
    const existing = bound?.workspaceId
      ? await this.find(bound.workspaceId)
      : await this.findByKey(candidate.learnerId, candidate.projectKey)
    const original = bound?.baseline ?? baseline
    if (
      studioProjectContinuityIssue(
        (existing ?? candidate).project,
        original.configuration.initialProject,
      )
    )
      throw new LiveConflictError('ambientes diferentes')
    const workspace = existing ?? (await this.ensureByKey(candidate))
    this.bindings.set(`${owner.userId}:${baseline.blockId}`, {
      baseline: structuredClone(original),
      workspaceId: workspace.id,
      accountId: owner.accountId,
    })
    return {
      workspace: await this.linkLesson(workspace.id, { lessonId: original.lessonId, sessionId }),
      baseline: original,
    }
  }
  async find(id: string) {
    return structuredClone(this.records.get(id) ?? null)
  }
  async listOwned(accountId: string, learnerId: string) {
    return structuredClone(
      [...this.records.values()].filter(
        (record) => record.accountId === accountId && record.learnerId === learnerId,
      ),
    )
  }
  async findByKey(learnerId: string, projectKey: string) {
    return structuredClone(
      [...this.records.values()].find(
        (record) => record.learnerId === learnerId && record.projectKey === projectKey,
      ) ?? null,
    )
  }
  async ensureByKey(workspace: LiveWorkspaceRecord & { projectKey: string }) {
    const existing = await this.findByKey(workspace.learnerId, workspace.projectKey)
    if (existing) return existing
    this.records.set(workspace.id, structuredClone(workspace))
    return structuredClone(workspace)
  }
  async linkLesson(id: string, input: { lessonId: string; sessionId: string }) {
    const record = this.records.get(id)
    if (!record) throw new Error('Missing workspace')
    const anchor = (await this.live.sessionRef(record.sessionId))?.cohortId
    const target = (await this.live.sessionRef(input.sessionId))?.cohortId
    if (anchor !== target && record.assistance === null) {
      record.sessionId = input.sessionId
      record.lessonIds = [input.lessonId]
    } else if (!record.lessonIds.includes(input.lessonId)) record.lessonIds.push(input.lessonId)
    return structuredClone(record)
  }
  async transaction<T>(
    id: string,
    action: (tx: LiveWorkspaceTransaction) => Promise<T>,
  ): Promise<T> {
    const record = this.records.get(id)
    if (!record) throw new Error('Missing workspace')
    const workspace = structuredClone(record)
    const added: LiveWorkspaceRevision[] = []
    const result = await action({
      workspace,
      findMutation: async (mutation) => this.revisions.get(mutation) ?? null,
      appendRevision: async (revision) => {
        added.push(revision)
      },
      teacherHasActiveWorkspace: async () => false,
      loadCohort: async () => {
        const ref = await this.live.sessionRef(workspace.sessionId)
        return ref ? this.live.findCohort(ref.cohortId) : null
      },
    })
    this.records.set(id, workspace)
    for (const revision of added) this.revisions.set(revision.mutationId, revision)
    return result
  }
}
