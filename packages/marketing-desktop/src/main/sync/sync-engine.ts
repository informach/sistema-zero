import { runViewSchema } from '../../../../marketing-contracts/src/execution'
import { snapshotPagePath } from '../../../../marketing-contracts/src/snapshot'
import type { SyncReport } from '../../../../marketing-contracts/src/sync'
import { changePageSchema } from '../../../../marketing-contracts/src/sync'
import { WorkspaceHeadReader } from '../../../../marketing-contracts/src/workspace-head'
import type { WorkspaceRequest } from '../../shared/connection'

export type { SyncReport } from '../../../../marketing-contracts/src/sync'

import type { LocalWorkspaceStore } from './local-store'
export interface SyncTransport {
  request(path: string, method?: WorkspaceRequest['method'], body?: unknown): Promise<unknown>
}
export class SyncTransportError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly retryAfterMs?: number,
  ) {
    super(message)
  }
  get retryable() {
    return this.status === 408 || this.status === 429 || this.status >= 500
  }
}
export class WorkspaceSyncEngine {
  private readonly head: WorkspaceHeadReader
  private flight: Promise<SyncReport> | undefined
  private report: SyncReport = {
    phase: 'idle',
    message: 'Pronto para sincronizar',
    pending: 0,
    confirmedAt: null,
  }
  constructor(
    private readonly store: LocalWorkspaceStore,
    private readonly transport: SyncTransport,
    private readonly changed: (report: SyncReport) => void = () => {},
  ) {
    this.head = new WorkspaceHeadReader((path) => this.transport.request(path))
  }
  state() {
    return { ...this.report }
  }
  async waitForIdle() {
    while (this.flight) await this.flight
  }
  synchronize(fresh = false): Promise<SyncReport> {
    // An explicit sync after a mutation needs a request begun after that mutation.
    // Background polling can still share a cycle; post-save callers wait for the next one.
    if (fresh && this.flight) return this.flight.then(() => this.synchronize())
    this.flight ??= this.cycle().finally(() => {
      this.flight = undefined
    })
    return this.flight
  }
  private publish(value: Partial<SyncReport>) {
    this.report = { ...this.report, ...value }
    this.changed({ ...this.report })
  }
  private async pull(projectId: string, snapshots: boolean) {
    for (let pages = 0; pages < 200; pages++) {
      if (
        snapshots &&
        (this.store.cursor(projectId) === 0 || this.store.snapshotCursor(projectId))
      ) {
        const pending = this.store.snapshotCursor(projectId)
        this.store.applySnapshotPage(
          projectId,
          pending,
          await this.transport.request(snapshotPagePath(projectId, pending)),
        )
        if (this.store.snapshotCursor(projectId)) continue
      }
      const cursor = this.store.cursor(projectId)
      const page = changePageSchema.parse(
        await this.transport.request(`/projects/${projectId}/changes?cursor=${cursor}`),
      )
      this.store.applyPage(projectId, cursor, page)
      if (!page.hasMore && !page.resetRequired) return true
    }
    return false
  }
  private async cycle(): Promise<SyncReport> {
    this.publish({ phase: 'syncing', message: 'Sincronizando com a equipe' })
    try {
      const head = await this.head.read()
      this.store.saveProjects(head.projects)
      let catchingUp = false,
        accessChanged = false
      for (const project of this.store.projects()) {
        try {
          let wrote = false
          for (const cancellation of this.store.pendingCancellations(project.id)) {
            try {
              runViewSchema.parse(
                await this.transport.request(
                  `/projects/${project.id}/runs/${cancellation.runId}/cancel`,
                  'POST',
                  { operationId: cancellation.operationId },
                ),
              )
              this.store.settleCancellation(cancellation.runId, 'confirmed')
              wrote = true
            } catch (error) {
              if (error instanceof SyncTransportError && !error.retryable)
                this.store.settleCancellation(cancellation.runId, 'blocked', error.message)
              throw error
            }
          }
          // The freshly authorized project list is a high-water mark. A project
          // already at that sequence needs no empty delta request. Pending pages
          // and a server reset still require reconciliation.
          if (
            (wrote ||
              this.store.cursor(project.id) !== project.sequence ||
              this.store.snapshotCursor(project.id)) &&
            !(await this.pull(project.id, head.snapshotPages === 1))
          ) {
            catchingUp = true
            continue
          }
          wrote = false
          for (let count = 0; count < 50; count++) {
            const batch = this.store.nextBatch(project.id)
            if (!batch) break
            try {
              this.store.settleBatch(
                batch.operationId,
                await this.transport.request('/batches', 'POST', batch),
              )
              wrote = true
            } catch (error) {
              const retryable = error instanceof SyncTransportError && error.retryable
              this.store.failBatch(
                batch.operationId,
                error instanceof Error ? error.message : 'Falha de sincronização',
                retryable,
              )
              if (
                retryable ||
                (error instanceof SyncTransportError && [401, 403, 404].includes(error.status))
              )
                throw error
            }
          }
          for (let count = 0; count < 100; count++) {
            const operation = this.store.next(project.id)
            if (!operation) break
            try {
              this.store.settle(
                operation.operationId,
                await this.transport.request('/operations', 'POST', operation),
              )
              wrote = true
            } catch (error) {
              const retryable = error instanceof SyncTransportError && error.retryable
              this.store.fail(
                operation.operationId,
                error instanceof Error ? error.message : 'Falha de sincronização',
                retryable,
              )
              if (
                retryable ||
                (error instanceof SyncTransportError && [401, 403, 404].includes(error.status))
              )
                throw error
            }
          }
          if (wrote && !(await this.pull(project.id, head.snapshotPages === 1))) catchingUp = true
        } catch (error) {
          if (error instanceof SyncTransportError && [403, 404].includes(error.status)) {
            this.store.setInaccessible(project.id)
            accessChanged = true
            continue
          }
          throw error
        }
      }
      const { pending, inaccessible } = this.store.summary()
      this.publish({
        phase: accessChanged || inaccessible > 0 ? 'blocked' : 'idle',
        pending,
        confirmedAt:
          catchingUp || pending > 0 || accessChanged
            ? this.report.confirmedAt
            : new Date().toISOString(),
        message:
          accessChanged || inaccessible > 0
            ? 'O acesso a um projeto mudou. Os rascunhos locais foram preservados.'
            : catchingUp
              ? 'Carregando o histórico; a sincronização continua'
              : pending
                ? 'Há alterações locais para conferir'
                : 'Sincronizado com a equipe',
      })
    } catch (error) {
      const retryable = error instanceof SyncTransportError && error.retryable
      this.publish({
        phase: retryable ? 'offline' : 'blocked',
        pending: this.store.summary().pending,
        message: error instanceof Error ? error.message : 'Falha ao sincronizar',
      })
    }
    return this.state()
  }
}
