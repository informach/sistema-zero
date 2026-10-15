import type {
  LiveWorkspaceRecord,
  LiveWorkspaceRepository,
  LiveWorkspaceRevision,
  LiveWorkspaceTransaction,
} from '../../src/domain/ports/live-workspace-repository.port'
import type { InMemoryLiveRepository } from './live-in-memory'

/** Live projects in memory, with the cohort read through the live repository fake. */
export class InMemoryLiveWorkspaceRepository implements LiveWorkspaceRepository {
  readonly records = new Map<string, LiveWorkspaceRecord>()
  readonly revisions = new Map<string, LiveWorkspaceRevision>()
  constructor(private readonly live: InMemoryLiveRepository) {}
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
