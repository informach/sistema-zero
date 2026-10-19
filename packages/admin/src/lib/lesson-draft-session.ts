import {
  applyLessonDraftChange,
  type LessonDraft,
  type LessonDraftChange,
  type LessonDraftCommand,
  type LessonDraftDocument,
} from '@sistemazero/core/learning'
import { LessonDraftRecoveryWriter } from './lesson-draft-recovery-writer'
import { runLessonDraftRequest } from './lesson-draft-transport'

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
  send: (
    command: LessonDraftCommand<T>,
    signal: AbortSignal,
  ) => Promise<Pick<LessonDraft<T>, 'revision' | 'updatedAt'>>
  readLocal: () => Promise<DraftRecovery<T> | null>
  writeLocal: (recovery: DraftRecovery<T> | null) => Promise<void>
  archiveLocal: (recovery: DraftRecovery<T>) => Promise<void>
}
export interface LessonDraftHandoff<T extends { kind: string }> {
  capture(change: LessonDraftChange<T>): void
  seal(): DraftRecovery<T> | null
  confirmLocal(): Promise<void>
  retire(): Promise<void>
  resume(): Promise<void>
}
interface HandoffState<T extends { kind: string }> {
  captured: DraftRecovery<T> | null | undefined
  confirmed: boolean
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
  private readonly localWriter: LessonDraftRecoveryWriter<T>
  private generation = 0
  private loading: { generation: number; promise: Promise<void>; interrupted: boolean } | null =
    null
  private intervening = false
  private sendState: 'in-flight' | 'unknown' | 'acknowledged' | 'rejected' | null = null
  private sendGeneration = 0
  private sendAttempt: AbortController | null = null
  private retired = false
  private handoff: HandoffState<T> | null = null
  constructor(private readonly ports: DraftSessionPorts<T>) {
    this.localWriter = new LessonDraftRecoveryWriter(
      (value) => ports.writeLocal(value),
      (error) => {
        if (this.intervening || this.retired) return
        this.update({
          status: 'error',
          error: `Não foi possível guardar a cópia local: ${messageOf(error)}`,
          recovery: this.recovery() ?? this.state.recovery,
        })
      },
    )
  }
  getSnapshot = () => this.state
  canEdit = () =>
    Boolean(this.state.draft) &&
    this.state.status !== 'loading' &&
    this.state.status !== 'conflict' &&
    !this.intervening &&
    !this.handoff &&
    !this.retired &&
    !this.hasUnadoptedRecovery()
  canCancelOpening = () =>
    !this.retired &&
    !this.state.draft &&
    this.pending.length === 0 &&
    !this.running &&
    !this.sendState &&
    !this.handoff
  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
  /** Cancel an opening with no adopted document and no attempted server command. A store may
   * still be blocked upgrading; its owner must retire, drain that store, then release the lock. */
  async retireUnopened() {
    if (this.retired && !this.handoff) return
    if (!this.canCancelOpening())
      throw new Error('Esta edição já contém trabalho. Capture e confirme antes de encerrá-la.')
    this.retired = true
    this.generation++
    this.sendGeneration++
    this.localWriter.advanceEpoch()
    await this.localWriter.drain()
  }
  /** Opening may be replaying an uncertain operation. End only its local wait, retaining
   * the exact recovery and allowing performLoad to report its unknown outcome. */
  interruptOpeningTransport() {
    if (!this.loading) return
    this.loading.interrupted = true
    // A flush may still be waiting on local persistence, with no sendAttempt yet. Retire
    // that right to start a request too, while keeping load's recovery-adoption catch alive.
    this.sendGeneration++
    if (this.sendAttempt) {
      this.sendState = 'unknown'
      this.sendAttempt.abort(this.handoffInterrupted())
    }
  }
  beginHandoff(): LessonDraftHandoff<T> {
    if (!this.state.draft || this.loading || this.intervening || this.retired)
      throw new Error('Aguarde a abertura do rascunho antes de trocar de aula.')
    if (this.handoff) throw new Error('Esta edição já está em captura.')
    const handoff: HandoffState<T> = { captured: undefined, confirmed: false }
    this.handoff = handoff
    // Already-sent commands can still commit. Keep their exact envelopes in the capture,
    // but retire their ability to adopt ACKs, shift the queue or schedule another local write.
    this.sendGeneration++
    this.generation++
    if (this.sendAttempt) {
      this.sendState = 'unknown'
      this.sendAttempt.abort(this.handoffInterrupted())
    }
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
    const assertCurrent = () => {
      if (this.handoff !== handoff || this.retired)
        throw new Error('Esta captura não pertence mais à edição ativa.')
    }
    return {
      capture: (change) => {
        assertCurrent()
        if (handoff.captured !== undefined) throw new Error('A captura já está fechada.')
        if (!this.enqueueCaptured(change, false, true))
          throw new Error('O rascunho não permite novas alterações durante esta captura.')
      },
      seal: () => {
        assertCurrent()
        if (handoff.captured === undefined)
          handoff.captured = structuredClone(this.recovery() ?? this.state.recovery)
        return structuredClone(handoff.captured)
      },
      confirmLocal: async () => {
        assertCurrent()
        if (handoff.captured === undefined)
          throw new Error('Capture os editores antes de confirmar.')
        if (handoff.confirmed) return
        const barrier = this.localWriter.request(handoff.captured)
        await this.localWriter.wait(barrier, handoff.captured === null ? { empty: true } : {})
        assertCurrent()
        handoff.confirmed = true
      },
      retire: async () => {
        if (this.retired && this.handoff === handoff) return
        assertCurrent()
        if (!handoff.confirmed) throw new Error('A cópia local ainda não foi confirmada.')
        this.retired = true
        this.localWriter.advanceEpoch()
        await this.localWriter.drain()
      },
      resume: async () => {
        assertCurrent()
        if (handoff.captured !== undefined)
          throw new Error('A captura já foi fechada. Confirme a cópia antes de reabrir a aula.')
        const previousRunning = this.running
        // beginHandoff has already aborted this local wait. Never wait for the remote ACK,
        // adopt its result, or change the frozen command identity while returning to edit.
        if (previousRunning) await previousRunning.catch(() => {})
        assertCurrent()
        if (handoff.captured !== undefined)
          throw new Error('A captura foi fechada enquanto a retomada aguardava.')
        if (this.running === previousRunning) this.running = null
        this.sendGeneration++
        this.generation++
        this.handoff = null
        if (this.pending.length && this.state.status !== 'conflict' && !this.hasUnadoptedRecovery())
          this.scheduleFlush(false)
        // Notify gates without clearing storage/conflict errors or claiming saved. A and
        // partial valid captures stay in the same queue; old capabilities are now invalid.
        this.update({})
      },
    }
  }
  private update(patch: Partial<DraftSessionState<T>>) {
    if (this.retired) return
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
  private hasUnadoptedRecovery() {
    return this.pending.length === 0 && Boolean(this.state.recovery?.pending.length)
  }
  private handoffInterrupted() {
    return new DOMException(
      'A troca de edição interrompeu a sincronização. A cópia local foi preservada; retome antes de publicar.',
      'AbortError',
    )
  }
  private persist(operation?: Pending<T>) {
    const barrier = this.localWriter.request(this.recovery())
    return this.localWriter.wait(barrier, operation ? { operation } : {})
  }
  private async send(command: LessonDraftCommand<T>) {
    if (this.loading?.interrupted) {
      this.sendState = 'unknown'
      throw this.handoffInterrupted()
    }
    const generation = this.sendGeneration
    const attempt = new AbortController()
    this.sendAttempt = attempt
    this.sendState = 'in-flight'
    try {
      const acknowledged = await runLessonDraftRequest(attempt.signal, () =>
        this.ports.send(command, attempt.signal),
      )
      if (generation !== this.sendGeneration) throw this.handoffInterrupted()
      this.sendState = 'acknowledged'
      return acknowledged
    } catch (error) {
      if (generation !== this.sendGeneration) throw error
      // Only a definite domain rejection proves that this attempt did not apply the command.
      const rejected =
        error &&
        typeof error === 'object' &&
        'code' in error &&
        (error.code === 'LESSON_DRAFT_CONFLICT' || error.code === 'VALIDATION_ERROR')
      this.sendState = rejected ? 'rejected' : 'unknown'
      throw error
    } finally {
      if (this.sendAttempt === attempt) this.sendAttempt = null
    }
  }
  load(): Promise<void> {
    if (this.handoff || this.retired) return Promise.resolve()
    if (this.intervening || (this.state.draft && this.state.status === 'conflict'))
      return Promise.resolve()
    if (this.loading?.generation === this.generation) return this.loading.promise
    const previous = this.loading?.promise
    const generation = ++this.generation
    const work = (async () => {
      await previous
      if (generation !== this.generation) return
      await this.performLoad(generation)
    })()
    const promise = work.finally(() => {
      if (this.loading?.promise === promise) this.loading = null
    })
    this.loading = { generation, promise, interrupted: false }
    return promise
  }
  /** Adopt only the confirmed publication for this owner and revision. No reload/remount, and
   * no rebasing or discarding commands accepted while the request was in flight. */
  publicationConfirmation(
    expectedRevision: string,
  ): (published: LessonDraft<T>) => 'adopted' | 'conflict' | 'stale' {
    const expected = this.state.draft
    if (
      !expected ||
      !this.canEdit() ||
      this.state.status !== 'saved' ||
      this.pending.length ||
      this.running ||
      this.loading ||
      this.revision !== expectedRevision
    )
      throw new Error('Sincronize a versão atual antes de publicar.')
    const generation = this.generation
    const sendGeneration = this.sendGeneration
    let consumed = false
    return (published) => {
      if (
        consumed ||
        generation !== this.generation ||
        sendGeneration !== this.sendGeneration ||
        this.retired ||
        this.handoff ||
        this.intervening ||
        this.loading
      )
        return 'stale'
      consumed = true
      if (
        this.state.draft !== expected ||
        this.revision !== expectedRevision ||
        this.pending.length ||
        this.running ||
        this.state.status !== 'saved' ||
        !published ||
        published.lessonId !== expected.lessonId ||
        !published.revision ||
        published.revision === expectedRevision ||
        !published.isPublished
      ) {
        if (this.timer) clearTimeout(this.timer)
        this.timer = null
        this.update({
          status: 'conflict',
          error:
            'A aula foi publicada, mas há uma versão local diferente. Compare as versões antes de continuar; suas alterações locais foram preservadas.',
          recovery: this.recovery() ?? this.state.recovery,
        })
        return 'conflict'
      }
      this.revision = published.revision
      this.update({ draft: published, status: 'saved', error: '', recovery: null })
      return 'adopted'
    }
  }
  private async performLoad(generation: number) {
    this.update({ status: 'loading', error: '' })
    try {
      // A reload cannot race an older send or discard its uncertain outcome.
      if (this.running || this.pending.length) await this.flush()
      if (generation !== this.generation) return
      this.update({ status: 'loading', error: '' })
      this.localWriter.advanceEpoch()
      await this.localWriter.drain()
      if (generation !== this.generation) return
      const [draft, recovery] = await Promise.all([this.ports.read(), this.ports.readLocal()])
      if (generation !== this.generation) return
      this.revision = draft.revision
      if (recovery?.pending.length && recovery.baseRevision !== draft.revision) {
        // A response may have been lost. Retry the exact first operation to check its ledger.
        const first = recovery.pending[0]
        if (first?.expectedRevision) {
          try {
            const sendGeneration = this.sendGeneration
            const acknowledged = await this.send({
              ...first,
              expectedRevision: first.expectedRevision,
            })
            if (sendGeneration !== this.sendGeneration) {
              this.sendState = 'unknown'
              throw this.handoffInterrupted()
            }
            if (generation !== this.generation) return
            if (acknowledged.revision !== draft.revision)
              throw new Error(
                'O rascunho mudou durante a recuperação. Recarregue para comparar as versões.',
              )
            recovery.pending.shift()
          } catch (error) {
            if (generation !== this.generation) return
            this.update({
              draft,
              status: this.sendState === 'unknown' ? 'error' : 'conflict',
              error: messageOf(error),
              recovery,
            })
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
      if (generation === this.generation)
        this.update({
          status: 'error',
          error: messageOf(error),
          recovery: this.recovery() ?? this.state.recovery,
        })
    }
  }
  enqueue(change: LessonDraftChange<T>, immediate = false): boolean {
    if (this.handoff || this.retired) return false
    return this.enqueueCaptured(change, immediate)
  }
  private enqueueCaptured(
    change: LessonDraftChange<T>,
    immediate: boolean,
    fromHandoff = false,
  ): boolean {
    const draft = this.state.draft
    if (
      !draft ||
      this.intervening ||
      this.hasUnadoptedRecovery() ||
      (this.state.status === 'conflict' && (!fromHandoff || this.pending.length === 0)) ||
      this.state.status === 'loading'
    )
      return false
    // Validate before mutating the retry queue. A saved example must retain the exact bytes
    // captured now even if the mounted editor subsequently mutates its working project.
    const captured = structuredClone(change)
    const document = applyLessonDraftChange(draft.document, captured)
    const last = this.pending.at(-1)
    const sameExample =
      last &&
      !last.expectedRevision &&
      captured.type === 'studio-example' &&
      captured.action.type === 'save' &&
      last.change.type === 'studio-example' &&
      last.change.action.type === 'save' &&
      captured.blockId === last.change.blockId &&
      captured.sectionId === last.change.sectionId &&
      captured.role === last.change.role
    const same =
      sameExample ||
      (last &&
        captured.type !== 'remove-block' &&
        captured.type !== 'studio-example' &&
        !last.expectedRevision &&
        last.change.type === captured.type &&
        (captured.type !== 'block' ||
          (last.change.type === 'block' && last.change.block.id === captured.block.id)))
    if (same && last)
      this.pending[this.pending.length - 1] = {
        operationId: crypto.randomUUID(),
        change:
          captured.type === 'block' && last.change.type === 'block'
            ? { ...captured, sectionId: captured.sectionId ?? last.change.sectionId }
            : captured,
      }
    else this.pending.push({ operationId: crypto.randomUUID(), change: captured })
    const preserveConflict = fromHandoff && this.state.status === 'conflict'
    this.update({
      draft: { ...draft, document },
      status: preserveConflict ? 'conflict' : 'saving',
      error: preserveConflict ? this.state.error : '',
    })
    this.localWriter.request(this.recovery())
    if (this.handoff) return true
    this.scheduleFlush(immediate)
    return true
  }
  private scheduleFlush(immediate: boolean) {
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
    if (immediate) void this.flush().catch((error) => this.reportFailure(error))
    else
      this.timer = setTimeout(() => {
        this.timer = null
        void this.flush().catch((error) => this.reportFailure(error))
      }, 1000)
  }
  private reportFailure(error: unknown) {
    if (this.handoff || this.retired) return
    const conflict =
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'LESSON_DRAFT_CONFLICT'
    this.update({
      status: conflict ? 'conflict' : 'error',
      error: messageOf(error),
      recovery: this.recovery(),
    })
  }
  async flush(): Promise<void> {
    if (this.handoff || this.retired) throw this.handoffInterrupted()
    const generation = this.sendGeneration
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
    if (!this.pending.length && this.state.recovery && this.sendState === 'unknown') {
      // An initial recovery replay failed before its queue could be adopted. Retry that
      // reconciliation (including the fresh-revision check), rather than clearing it as saved.
      await this.load()
      if (generation !== this.sendGeneration) throw this.handoffInterrupted()
      if (this.state.status !== 'saved')
        throw new Error(this.state.error || 'A recuperação continua pendente.')
      return
    }
    if (this.state.status === 'conflict') throw new Error(this.state.error)
    if (this.intervening) throw new Error('Aguarde a abertura da versão do servidor.')
    if (this.running) {
      await this.running
      if (generation !== this.sendGeneration) throw this.handoffInterrupted()
      return
    }
    const work = async () => {
      try {
        while (this.pending.length) {
          if (generation !== this.sendGeneration) throw this.handoffInterrupted()
          const pending = this.pending[0]
          if (!pending) break
          const first = { ...pending, expectedRevision: pending.expectedRevision ?? this.revision }
          this.pending[0] = first
          await this.persist(first)
          if (generation !== this.sendGeneration) throw this.handoffInterrupted()
          // A confirmed publication may reveal a newer server revision while this local
          // barrier is pending. Keep C's exact bytes, but do not start a known-stale send.
          if (this.state.status === 'conflict')
            throw Object.assign(new Error(this.state.error), { code: 'LESSON_DRAFT_CONFLICT' })
          const acknowledged = await this.send({
            ...first,
            expectedRevision: first.expectedRevision,
          })
          if (generation !== this.sendGeneration) throw this.handoffInterrupted()
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
        if (generation !== this.sendGeneration) throw this.handoffInterrupted()
        this.update({ status: 'saved', error: '', recovery: null })
      } catch (error) {
        if (generation !== this.sendGeneration) throw this.handoffInterrupted()
        this.reportFailure(error)
        throw error
      }
    }
    const running = work()
    this.running = running
    try {
      await running
      if (generation !== this.sendGeneration) throw this.handoffInterrupted()
    } finally {
      if (this.running === running) this.running = null
    }
  }
  /** Explicit reconciliation retains a separate local archive before loading the server version. */
  async restoreServerVersion() {
    if (
      this.handoff ||
      this.retired ||
      this.intervening ||
      this.loading ||
      this.running ||
      this.sendState === 'in-flight' ||
      this.sendState === 'unknown'
    )
      throw new Error(
        'Há uma gravação sem confirmação. Retome a sincronização antes de abrir outra versão.',
      )
    if (this.state.status !== 'conflict')
      throw new Error(
        'A versão local não está em conflito. Sincronize antes de abrir outra versão.',
      )
    const recovery = this.state.recovery ?? this.recovery()
    this.intervening = true
    const generation = ++this.generation
    this.localWriter.advanceEpoch()
    try {
      if (recovery) await this.ports.archiveLocal(structuredClone(recovery))
      await this.localWriter.drain()
      const cleared = this.localWriter.request(null)
      await this.localWriter.wait(cleared, { empty: true })
      const draft = await this.ports.read()
      if (generation !== this.generation) throw new Error('A sessão de recuperação mudou.')
      this.pending = []
      this.revision = draft.revision
      this.sendState = null
      this.update({ draft, status: 'saved', error: '', recovery: null })
    } catch (error) {
      this.update({ status: 'conflict', error: messageOf(error), recovery })
      throw error
    } finally {
      this.intervening = false
    }
  }
  dispose() {
    if (this.handoff || this.retired) return
    this.generation++
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
    if (this.pending.length && !this.intervening && this.state.status !== 'conflict')
      void this.flush().catch((error) => this.reportFailure(error))
  }
}
