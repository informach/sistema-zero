import {
  assetManifestSchema,
  batchResultSchema,
  changePageSchema,
  type DraftResolution,
  draftResolutionSchema,
  type EditorialBatch,
  type EditorialItem,
  type EditorialOperation,
  operationResultSchema,
  type Project,
  type ProjectView,
  projectCreateSchema,
  projectSchema,
  type SyncReport,
} from '@sistemazero/marketing-contracts'
import { z } from 'zod'
import { BrowserJournal, type JournalEntry, type MutationJournal } from './browser-journal'
import { type UploadProgress, uploadBrowserFile } from './browser-upload'
import { errorMessage, type WorkbenchPort } from './port'

export class WorkspaceHttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message)
  }
  get retryable() {
    return this.status === 408 || this.status === 429 || this.status >= 500
  }
}
type Transport = WorkbenchPort['request']
type Cache = {
  items: Map<string, { item: EditorialItem; sequence: number }>
  cursor: number
  permissions: Project['permissions']
}
export class BrowserWorkspaceAdapter implements WorkbenchPort {
  uploadFile(projectId: string, file: File, signal: AbortSignal, progress: UploadProgress) {
    return uploadBrowserFile(this.identity, projectId, file, this.request, signal, progress)
  }
  async assetUrl(projectId: string, assetId: string) {
    const result = z
      .object({ manifest: assetManifestSchema, url: z.string().url() })
      .parse(await this.request(`/projects/${projectId}/assets/${assetId}/download`))
    if (result.manifest.projectId !== projectId || result.manifest.id !== assetId)
      throw new Error('Arquivo pertence a outro projeto')
    return result.url
  }
  get userId() {
    return this.identity
  }
  readonly location = 'web'
  private readonly caches = new Map<string, Cache>()
  private readonly listeners = new Set<() => void>()
  private readonly views = new Map<string, Promise<ProjectView>>()
  private sync: Promise<void> | undefined
  private generation = 0
  private retryTimer: ReturnType<typeof setTimeout> | undefined
  private retryDelay = 1500
  private projectList: Project[] | undefined
  private report: SyncReport = {
    phase: 'idle',
    message: 'Pronto para sincronizar',
    pending: 0,
    confirmedAt: null,
  }
  constructor(
    readonly identity: string,
    readonly request: Transport,
    private readonly journal: MutationJournal = new BrowserJournal(identity),
  ) {}
  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    if (this.report.phase === 'offline') this.scheduleRetry()
    return () => {
      this.listeners.delete(listener)
      if (!this.listeners.size && this.retryTimer) {
        clearTimeout(this.retryTimer)
        this.retryTimer = undefined
      }
    }
  }
  private scheduleRetry() {
    if (!this.listeners.size || this.retryTimer) return
    this.retryTimer = setTimeout(() => {
      this.retryTimer = undefined
      void this.synchronize().catch(() => this.scheduleRetry())
    }, this.retryDelay)
    this.retryDelay = Math.min(this.retryDelay * 2, 60000)
  }
  private changed() {
    for (const listener of this.listeners) listener()
  }
  async projects() {
    try {
      this.projectList = z.array(projectSchema).parse(await this.request('/projects'))
      return this.projectList
    } catch (error) {
      if (error instanceof WorkspaceHttpError && error.retryable && this.projectList)
        return this.projectList
      throw error
    }
  }
  private async enqueue(entry: JournalEntry) {
    await this.journal.add(entry)
    this.generation++
    this.changed()
    try {
      await this.synchronize()
    } catch (error) {
      // The draft is durable; the report exposes the network failure. Do not make a form create a second operation.
      if (!(error instanceof WorkspaceHttpError && error.retryable)) throw error
    }
  }
  private base(id: string) {
    return {
      id,
      scope: this.identity,
      createdAt: new Date().toISOString(),
      state: 'local' as const,
      error: null,
    }
  }
  async createProject(input: z.infer<typeof projectCreateSchema>) {
    const value = projectCreateSchema.parse(input)
    await this.enqueue({ ...this.base(value.operationId), kind: 'project', input: value })
    const stored = (await this.journal.entries()).find((entry) => entry.id === value.operationId)
    if (stored?.state !== 'confirmed')
      throw new Error(stored?.error ?? 'O projeto aguarda confirmação do servidor')
    return projectSchema.parse(stored.result)
  }
  async save(operation: EditorialOperation, dependsOnOperationId: string | null) {
    if (dependsOnOperationId)
      throw new Error('Aguarde a confirmação do rascunho anterior antes de editar novamente na web')
    await this.enqueue({ ...this.base(operation.operationId), kind: 'operation', input: operation })
  }
  async saveBatch(operation: EditorialBatch) {
    await this.enqueue({ ...this.base(operation.operationId), kind: 'batch', input: operation })
  }
  async resolveDrafts(raw: DraftResolution) {
    const input = draftResolutionSchema.parse(raw),
      entries = await this.journal.entries()
    const selected = entries.filter((entry) => input.operationIds.includes(entry.id))
    if (
      selected.length !== input.operationIds.length ||
      selected.some(
        (entry) => entry.kind === 'project' || entry.input.projectId !== input.projectId,
      )
    )
      throw new Error('A resolução inclui outro projeto')
    const touched = new Set(
      selected.flatMap((entry) =>
        entry.kind === 'project'
          ? []
          : entry.kind === 'batch'
            ? entry.input.changes.map((change) => change.entityId)
            : [entry.input.entityId],
      ),
    )
    if (input.replacement?.changes.some((change) => !touched.has(change.entityId)))
      throw new Error('A resolução contém peças não selecionadas')
    if (
      entries.some(
        (entry) =>
          !entry.resolvedAt &&
          entry.state !== 'confirmed' &&
          !input.operationIds.includes(entry.id) &&
          entry.kind !== 'project' &&
          entry.input.projectId === input.projectId &&
          (entry.kind === 'batch'
            ? entry.input.changes.some((change) => touched.has(change.entityId))
            : touched.has(entry.input.entityId)),
      )
    )
      throw new Error('Inclua os rascunhos dependentes na mesma resolução')
    await this.journal.resolve(
      input.operationIds,
      input.replacement
        ? { ...this.base(input.replacement.operationId), kind: 'batch', input: input.replacement }
        : null,
    )
    this.generation++
    this.changed()
    try {
      await this.synchronize()
    } catch (error) {
      if (!(error instanceof WorkspaceHttpError && error.retryable)) throw error
    }
  }
  synchronize() {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer)
      this.retryTimer = undefined
    }
    this.sync ??= this.drain().finally(() => {
      this.sync = undefined
      this.changed()
    })
    return this.sync
  }
  private async drain() {
    try {
      let generation: number
      do {
        generation = this.generation
        await this.flush()
      } while (generation !== this.generation)
      this.retryDelay = 1500
    } catch (error) {
      if (error instanceof WorkspaceHttpError && error.retryable) this.scheduleRetry()
      throw error
    }
  }
  private async flush() {
    this.report = { ...this.report, phase: 'syncing', message: 'Confirmando rascunhos' }
    try {
      for (const entry of (await this.journal.entries())
        .filter((entry) => entry.state === 'local' && !entry.resolvedAt)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
        try {
          const raw = await this.request(
            entry.kind === 'project'
              ? '/projects'
              : entry.kind === 'batch'
                ? '/batches'
                : '/operations',
            'POST',
            entry.input,
          )
          const result =
            entry.kind === 'project'
              ? projectSchema.parse(raw)
              : entry.kind === 'batch'
                ? batchResultSchema.parse(raw)
                : operationResultSchema.parse(raw)
          const conflict = 'status' in result && result.status === 'conflict'
          await this.journal.settle(
            entry.id,
            conflict ? 'conflict' : 'confirmed',
            result,
            conflict ? 'Há uma revisão mais recente. Os dois textos foram preservados.' : null,
          )
        } catch (error) {
          const retryable = error instanceof WorkspaceHttpError && error.retryable
          await this.journal.settle(
            entry.id,
            retryable ? 'local' : 'blocked',
            undefined,
            errorMessage(error),
          )
          if (retryable) throw error
        }
      }
      const pending = (await this.journal.entries()).filter(
        (entry) => entry.state !== 'confirmed' && !entry.resolvedAt,
      )
      this.report = {
        phase: pending.length ? 'blocked' : 'idle',
        message: pending.length
          ? 'Existem alterações que precisam de atenção'
          : 'Rascunhos confirmados',
        pending: pending.length,
        confirmedAt: pending.length ? this.report.confirmedAt : new Date().toISOString(),
      }
    } catch (error) {
      this.report = { ...this.report, phase: 'offline', message: errorMessage(error) }
      throw error
    }
  }
  view(projectId: string) {
    let pending = this.views.get(projectId)
    if (!pending) {
      pending = this.load(projectId).finally(() => this.views.delete(projectId))
      this.views.set(projectId, pending)
    }
    return pending
  }
  private async load(projectId: string): Promise<ProjectView> {
    let cache = this.caches.get(projectId) ?? { items: new Map(), cursor: 0, permissions: [] }
    try {
      for (let count = 0; count < 200; count++) {
        const page = changePageSchema.parse(
          await this.request(`/projects/${projectId}/changes?cursor=${cache.cursor}`),
        )
        if (page.resetRequired) {
          cache = { items: new Map(), cursor: 0, permissions: page.permissions }
          continue
        }
        if (
          page.events.some(
            (event, index) =>
              event.projectId !== projectId || event.sequence !== cache.cursor + index + 1,
          ) ||
          page.cursor !== cache.cursor + page.events.length
        )
          throw new Error('A sequência do acervo não foi confirmada; atualize novamente')
        for (const item of page.items) {
          if (item.projectId !== projectId || item.sequence > page.cursor)
            throw new Error('A resposta contém uma revisão de outro contexto')
          const previous = cache.items.get(item.id)
          if (!previous || previous.sequence <= item.sequence) {
            const { sequence, ...document } = item
            cache.items.set(item.id, { item: document, sequence })
          }
        }
        cache.cursor = page.cursor
        cache.permissions = page.permissions
        this.caches.set(projectId, cache)
        if (!page.hasMore) break
        if (count === 199)
          throw new Error(
            'O acervo ainda está sendo carregado. Continue a sincronização para ver as próximas revisões.',
          )
      }
    } catch (error) {
      if (!(error instanceof WorkspaceHttpError && error.retryable)) throw error
      this.report = { ...this.report, phase: 'offline', message: errorMessage(error) }
      this.scheduleRetry()
    }
    const allDrafts = await this.journal.entries()
    const journal = allDrafts.filter(
      (entry) =>
        entry.kind !== 'project' && entry.input.projectId === projectId && !entry.resolvedAt,
    )
    // Receipts may be newer than the last delta page; overlay by sequence without advancing its cursor.
    for (const entry of journal.filter((entry) => entry.state === 'confirmed')) {
      if (entry.kind === 'operation') {
        const receipt = operationResultSchema.parse(entry.result)
        if (
          receipt.status === 'applied' &&
          (cache.items.get(receipt.entityId)?.sequence ?? 0) < receipt.sequence
        )
          cache.items.set(receipt.entityId, { item: receipt.item, sequence: receipt.sequence })
      } else if (entry.kind === 'batch') {
        const receipt = batchResultSchema.parse(entry.result)
        if (receipt.status === 'applied')
          for (const item of receipt.items)
            if ((cache.items.get(item.id)?.sequence ?? 0) < receipt.cursor)
              cache.items.set(item.id, { item, sequence: receipt.cursor })
      }
    }
    const pending = journal.flatMap((entry) =>
      entry.kind === 'operation' && entry.state !== 'confirmed'
        ? [
            {
              operation: entry.input,
              state: entry.state,
              dependsOnOperationId: null,
              result: entry.result === undefined ? null : operationResultSchema.parse(entry.result),
              error: entry.error,
              createdAt: entry.createdAt,
            },
          ]
        : [],
    )
    const pendingBatches = journal.flatMap((entry) =>
      entry.kind === 'batch' && entry.state !== 'confirmed'
        ? [
            {
              operation: entry.input,
              state: entry.state,
              result: entry.result === undefined ? null : batchResultSchema.parse(entry.result),
              error: entry.error,
              createdAt: entry.createdAt,
            },
          ]
        : [],
    )
    return {
      items: [...cache.items.values()].map((value) => value.item),
      pending,
      pendingBatches,
      resolvedDrafts: allDrafts.flatMap((entry) =>
        entry.kind !== 'project' && entry.input.projectId === projectId && entry.resolvedAt
          ? [
              {
                operation: entry.input,
                resolvedAt: entry.resolvedAt,
                replacementId: entry.replacementId ?? null,
              },
            ]
          : [],
      ),
      report: { ...this.report, pending: pending.length + pendingBatches.length },
    }
  }
  async openDesktop(input: Parameters<WorkbenchPort['openDesktop']>[0]) {
    const response = z
      .object({ id: z.string().uuid() })
      .passthrough()
      .parse(await this.request('/handoffs', 'POST', input))
    const link = new URL(`sistema-zero-marketing://open/${response.id}`)
    link.searchParams.set('server', window.location.origin)
    window.location.assign(link.href)
  }
}
