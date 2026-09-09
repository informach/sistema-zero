import {
  applyLessonDraftChange,
  type LessonDraft,
  type LessonDraftChange,
  type LessonDraftCommand,
  type LessonDraftDocument,
} from '@sistemazero/core/learning'

interface Pending<T extends { kind: string }> {
  operationId: string
  change: LessonDraftChange<T>
  expectedRevision?: string
}
export interface DraftRecovery<T extends { kind: string }> {
  version: 1
  baseRevision: string
  document: LessonDraftDocument<T>
  pending: Pending<T>[]
}
export interface DraftSessionState<T extends { kind: string }> {
  draft: LessonDraft<T> | null
  status: 'loading' | 'saving' | 'saved' | 'error' | 'conflict'
  error: string
  recovery: DraftRecovery<T> | null
}
export interface DraftSessionPorts<T extends { kind: string }> {
  read: () => Promise<LessonDraft<T>>
  send: (command: LessonDraftCommand<T>) => Promise<Pick<LessonDraft<T>, 'revision' | 'updatedAt'>>
  readLocal: () => Promise<DraftRecovery<T> | null>
  writeLocal: (recovery: DraftRecovery<T> | null) => Promise<void>
  archiveLocal: (recovery: DraftRecovery<T>) => Promise<void>
}
const messageOf = (error: unknown) =>
  error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
    ? error.message
    : 'Não foi possível salvar — tente novamente.'

/** Serializes requests and keeps the latest local edits separate from acknowledgements. */
export class LessonDraftSession<T extends { kind: string }> {
  private state: DraftSessionState<T> = {
    draft: null,
    status: 'loading',
    error: '',
    recovery: null,
  }
  private listeners = new Set<() => void>()
  private pending: Pending<T>[] = []
  private revision = ''
  private running: Promise<void> | null = null
  private timer: ReturnType<typeof setTimeout> | null = null
  private localWrite: Promise<void> = Promise.resolve()
  private generation = 0
  constructor(private readonly ports: DraftSessionPorts<T>) {}
  getSnapshot = () => this.state
  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
  private update(patch: Partial<DraftSessionState<T>>) {
    this.state = { ...this.state, ...patch }
    for (const listener of this.listeners) listener()
  }
  private recovery(): DraftRecovery<T> | null {
    return this.state.draft && this.pending.length
      ? {
          version: 1,
          baseRevision: this.revision,
          document: this.state.draft.document,
          pending: this.pending.map((p) => ({ ...p })),
        }
      : null
  }
  private persist() {
    const recovery = this.recovery()
    // A previous failed local write is reported; the next write can retry the current snapshot.
    this.localWrite = this.localWrite.then(
      () => this.ports.writeLocal(recovery),
      () => this.ports.writeLocal(recovery),
    )
    return this.localWrite
  }
  async load() {
    const generation = ++this.generation
    this.update({ status: 'loading', error: '' })
    try {
      const [draft, recovery] = await Promise.all([this.ports.read(), this.ports.readLocal()])
      if (generation !== this.generation) return
      this.revision = draft.revision
      if (recovery?.pending.length && recovery.baseRevision !== draft.revision) {
        // A response may have been lost. Retry the exact first operation to check its ledger.
        const first = recovery.pending[0]
        if (first?.expectedRevision) {
          try {
            const acknowledged = await this.ports.send({
              ...first,
              expectedRevision: first.expectedRevision,
            })
            if (generation !== this.generation) return
            if (acknowledged.revision !== draft.revision)
              throw new Error(
                'O rascunho mudou durante a recuperação. Recarregue para comparar as versões.',
              )
            recovery.pending.shift()
          } catch (error) {
            this.update({ draft, status: 'conflict', error: messageOf(error), recovery })
            return
          }
        } else {
          this.update({
            draft,
            status: 'conflict',
            error:
              'Há alterações locais e outra versão no servidor. Compare as duas antes de continuar.',
            recovery,
          })
          return
        }
      }
      this.pending = recovery?.pending ?? []
      const document = this.pending.reduce(
        (doc, operation) => applyLessonDraftChange(doc, operation.change),
        draft.document,
      )
      this.update({
        draft: { ...draft, document },
        status: this.pending.length ? 'saving' : 'saved',
        recovery: null,
      })
      if (this.pending.length) await this.flush()
      else await this.persist()
    } catch (error) {
      if (generation === this.generation) this.update({ status: 'error', error: messageOf(error) })
    }
  }
  enqueue(change: LessonDraftChange<T>, immediate = false) {
    const draft = this.state.draft
    if (!draft || this.state.status === 'conflict' || this.state.status === 'loading') return
    const last = this.pending.at(-1)
    const same =
      last &&
      change.type !== 'remove-block' &&
      !last.expectedRevision &&
      last.change.type === change.type &&
      (change.type !== 'block' ||
        (last.change.type === 'block' && last.change.block.id === change.block.id))
    if (same)
      last.change =
        change.type === 'block' && last.change.type === 'block'
          ? { ...change, sectionId: change.sectionId ?? last.change.sectionId }
          : change
    else this.pending.push({ operationId: crypto.randomUUID(), change })
    this.update({
      draft: { ...draft, document: applyLessonDraftChange(draft.document, change) },
      status: 'saving',
      error: '',
    })
    void this.persist().catch((error) =>
      this.update({
        status: 'error',
        error: `Não foi possível guardar a cópia local: ${messageOf(error)}`,
      }),
    )
    if (this.timer) clearTimeout(this.timer)
    if (immediate) void this.flush().catch((error) => this.reportFailure(error))
    else
      this.timer = setTimeout(() => {
        this.timer = null
        void this.flush().catch((error) => this.reportFailure(error))
      }, 1000)
  }
  private reportFailure(error: unknown) {
    const conflict =
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'LESSON_DRAFT_CONFLICT'
    this.update({
      status: conflict ? 'conflict' : 'error',
      error: messageOf(error),
      recovery: conflict ? this.recovery() : null,
    })
  }
  async flush(): Promise<void> {
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
    if (this.state.status === 'conflict') throw new Error(this.state.error)
    if (this.running) return this.running
    const work = async () => {
      try {
        while (this.pending.length) {
          const first = this.pending[0]
          if (!first) break
          first.expectedRevision ??= this.revision
          await this.persist()
          const acknowledged = await this.ports.send({
            ...first,
            expectedRevision: first.expectedRevision,
          })
          this.pending.shift()
          this.revision = acknowledged.revision
          if (this.state.draft)
            this.update({
              draft: {
                ...this.state.draft,
                revision: acknowledged.revision,
                updatedAt: acknowledged.updatedAt,
              },
            })
          await this.persist()
        }
        this.update({ status: 'saved', error: '' })
      } catch (error) {
        this.reportFailure(error)
        throw error
      }
    }
    this.running = work()
    try {
      await this.running
    } finally {
      this.running = null
    }
  }
  /** Explicit reconciliation retains a separate local archive before loading the server version. */
  async restoreServerVersion() {
    if (this.state.recovery) await this.ports.archiveLocal(this.state.recovery)
    this.pending = []
    await this.ports.writeLocal(null)
    await this.load()
  }
  dispose() {
    this.generation++
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
    if (this.pending.length && this.state.status !== 'conflict')
      void this.flush().catch((error) => this.reportFailure(error))
  }
}
