import type { MoldaSceneDocument } from '../scene/document'
import { prepareSceneRecoveryInWorker } from '../workers/sceneRecovery'
import type { EditorStore } from './editorStore'
import type { SceneIndexRevision } from './sceneIndexRevision'
import type { PreparedSceneRecovery, SceneRecoveryRecord } from './sceneRecoveryCodec'
import type { SceneRecoveryPersistence } from './sceneRecoveryPersistence'
import { sameSceneStoredValue } from './sceneStorageCompare'

export interface SceneRecoveryCandidate {
  record: SceneRecoveryRecord
  document: MoldaSceneDocument
  conflict: boolean
}
export interface SceneRecoverySnapshot {
  phase: 'idle' | 'protecting' | 'protected' | 'error'
  protectedDocument: MoldaSceneDocument | null
  protectedContentRevision: number | null
  available: SceneRecoveryCandidate | null
  error: string | null
}
export const EMPTY_RECOVERY: SceneRecoverySnapshot = {
  phase: 'idle',
  protectedDocument: null,
  protectedContentRevision: null,
  available: null,
  error: null,
}

function sameAuthorship(a: MoldaSceneDocument, b: MoldaSceneDocument) {
  const { thumb: _a, updatedAt: _at, ...left } = a
  const { thumb: _b, updatedAt: _bt, ...right } = b
  return sameSceneStoredValue(left, right)
}

/** A serial checkpoint lane independent of normal autosave success and its gallery budget. */
export function createSceneRecoveryController(
  editor: EditorStore<MoldaSceneDocument>,
  persistence: SceneRecoveryPersistence,
  revision: () => number,
  readRevision: () => Promise<SceneIndexRevision>,
) {
  const initial = editor.getState().asset
  const initialRevision = revision()
  const session = crypto.randomUUID()
  let snapshot = EMPTY_RECOVERY
  const listeners = new Set<() => void>()
  const publish = (patch: Partial<SceneRecoverySnapshot>) => {
    snapshot = { ...snapshot, ...patch }
    for (const listener of listeners) listener()
  }
  let target: MoldaSceneDocument | null = null
  let targetContentRevision = editor.getState().contentRevision
  let wanted = 0
  let completed = 0
  let running: Promise<void> | null = null
  let abandoned = false
  let ownCheckpoint = false
  let observedRevision = revision()
  let observedCommit = editor.getState().committedRevision
  let preparedCheckpoint: PreparedSceneRecovery | null = null
  let preparedContentRevision: number | null = null
  async function drain() {
    while (completed !== wanted) {
      const serial = wanted
      const source = target
      const sourceContentRevision = targetContentRevision
      try {
        if (source) {
          publish({ phase: 'protecting', error: null })
          const prepared =
            preparedCheckpoint && preparedContentRevision === sourceContentRevision
              ? preparedCheckpoint
              : await prepareSceneRecoveryInWorker(source, revision(), session)
          preparedCheckpoint = prepared
          preparedContentRevision = sourceContentRevision
          await persistence.save({
            ...prepared,
            record: { ...prepared.record, baseRevision: revision() },
          })
          ownCheckpoint = true
        } else if (ownCheckpoint) {
          await persistence.clear(initial.id, session)
          ownCheckpoint = false
          preparedCheckpoint = null
          preparedContentRevision = null
        }
        completed = serial
        if (serial === wanted)
          publish({
            phase: source ? 'protected' : 'idle',
            protectedDocument: source,
            protectedContentRevision: source ? sourceContentRevision : null,
            error: null,
          })
      } catch {
        completed = serial
        if (!source && serial === wanted) {
          preparedCheckpoint = null
          preparedContentRevision = null
          publish({
            phase: 'idle',
            protectedDocument: null,
            protectedContentRevision: null,
            error: 'Seu projeto foi salvo. Uma cópia de recuperação anterior foi preservada.',
          })
        } else if (serial === wanted)
          publish({
            phase: 'error',
            error:
              'Não consegui proteger as últimas mudanças. Guarde uma cópia do projeto antes de sair.',
          })
      }
    }
  }
  function run(): Promise<void> {
    if (running) return running
    const pending = Promise.resolve()
      .then(drain)
      .finally(() => {
        if (running === pending) running = null
        if (completed !== wanted) void run()
      })
    running = pending
    return pending
  }
  editor.subscribe((state) => {
    if (abandoned) return
    if (state.asset.id !== initial.id) {
      publish({
        phase: 'error',
        error: 'Esta recuperação pertence a outra criação; os projetos foram preservados.',
      })
      return
    }
    const next = state.saveSnapshot() === state.savedAsset ? null : state.saveSnapshot()
    const currentRevision = revision()
    if (next && state.committedRevision === observedCommit && currentRevision === observedRevision)
      return
    observedCommit = state.committedRevision
    if (next === target && currentRevision === observedRevision) return
    observedRevision = currentRevision
    target = next
    targetContentRevision = state.contentRevision
    wanted++
    void run()
  })
  const ready = (async () => {
    try {
      const inspected = await persistence.inspect(initial.id)
      const visited = new Set<string>()
      const superseded = new Set<string>()
      if (inspected.unreadable)
        publish({ error: 'Uma cópia de recuperação não pôde ser lida. Ela foi preservada.' })
      for (const record of inspected.records) {
        if (record.session === session || superseded.has(record.session)) continue
        const latest = !visited.has(record.session)
        visited.add(record.session)
        try {
          const document = await persistence.restore(record)
          if (sameAuthorship(document, initial)) {
            // The primary already owns these exact authored bytes. CAS retains newer work.
            if (latest) superseded.add(record.session)
            await persistence.discard(record)
            continue
          }
          if (!snapshot.available)
            publish({
              available: { record, document, conflict: record.baseRevision !== initialRevision },
            })
        } catch {
          publish({ error: 'Uma cópia de recuperação não pôde ser lida. Ela foi preservada.' })
        }
      }
    } catch {
      publish({
        error: 'Não consegui conferir a recuperação. As cópias existentes foram preservadas.',
      })
    }
  })()
  async function flush() {
    const state = editor.getState()
    const next = state.saveSnapshot() === state.savedAsset ? null : state.saveSnapshot()
    // Thumbnails/save stamps do not require another worker, especially during page exit.
    const alreadyProtected =
      snapshot.protectedContentRevision === state.contentRevision &&
      snapshot.protectedDocument?.id === initial.id
    if (
      !abandoned &&
      next?.id !== undefined &&
      next.id === initial.id &&
      next !== target &&
      !alreadyProtected
    ) {
      target = next
      targetContentRevision = state.contentRevision
      wanted++
    }
    if (snapshot.phase === 'error') wanted++
    do {
      await run()
    } while (completed !== wanted)
  }
  return {
    ready,
    getSnapshot: () => snapshot,
    getServerSnapshot: () => EMPTY_RECOVERY,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    flush,
    async discardCurrent() {
      abandoned = true
      target = null
      wanted++
      await flush()
    },
    async restore() {
      const candidate = snapshot.available
      if (!candidate || editor.getState().contentRevision !== 0) return false
      const observed = await readRevision()
      if (
        observed.status !== 'indexed' ||
        observed.revision !== revision() ||
        candidate.record.baseRevision !== initialRevision ||
        editor.getState().contentRevision !== 0
      ) {
        publish({
          available: { ...candidate, conflict: true },
          error:
            'A criação mudou em outra aba. Baixe a cópia encontrada para manter as duas versões.',
        })
        return false
      }
      editor.getState().commit(candidate.document)
      const source = editor.getState().saveSnapshot()
      await flush()
      if (
        !(snapshot.protectedDocument && sameAuthorship(snapshot.protectedDocument, source)) &&
        !sameAuthorship(editor.getState().savedAsset, source)
      )
        return false
      if (await persistence.discard(candidate.record)) publish({ available: null })
      return true
    },
    async keepCurrent(expected = snapshot.available) {
      const candidate = snapshot.available
      if (candidate !== expected) return false
      if (!candidate) return true
      try {
        if (!(await persistence.discard(candidate.record))) {
          publish({ error: 'A cópia encontrada mudou em outra aba. Ela foi preservada.' })
          return false
        }
        publish({ available: null })
        return true
      } catch {
        publish({ error: 'Não consegui encerrar a recuperação. A cópia foi preservada.' })
        return false
      }
    },
  }
}
export type SceneRecoveryController = ReturnType<typeof createSceneRecoveryController>
