import { useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { COPY } from '../../../core/copy'
import { newId } from '../../../core/id'
import { MOLDA_LIMITS } from '../../../core/limits'
import { checkSceneProjectFileSize, SceneProjectFileError } from '../../../import/sceneProjectFile'
import { sceneProjectName } from '../../../scene/createProject'
import type { MoldaSceneDocument } from '../../../scene/document'
import { isStorageBudgetError } from '../../../state/persistence'
import type { SceneViewportFactory } from '../../../viewport/sceneViewportTypes'
import { prepareSceneProjectFileInWorker } from '../../../workers/sceneProjectFile'
import { Button } from '../../ui/Button'
import { SceneImportPreview } from './SceneImportPreview'
import { SCENE_APPEARANCE_FIELD } from './sceneAppearanceForm'

export type RestoreSceneProject = (
  document: MoldaSceneDocument,
  name: string,
  signal: AbortSignal,
) => Promise<void>
type Prepared = { document: MoldaSceneDocument; name: string; fileName: string }
interface RestoreSession {
  onRestore: RestoreSceneProject
  prepare: typeof prepareSceneProjectFileInWorker
  active: boolean
  saving: boolean
  serial: number
  controller: AbortController | null
}

/** Scoped by its dialog/namespace. Reading/review never grants permission to write. */
export function SceneProjectRestore({
  onRestore,
  onClose,
  viewportFactory,
  prepare = prepareSceneProjectFileInWorker,
}: {
  onRestore: RestoreSceneProject
  onClose(): void
  viewportFactory?: SceneViewportFactory
  prepare?: typeof prepareSceneProjectFileInWorker
}) {
  const copy = COPY.scene.restore
  const session = useMemo<RestoreSession>(
    () => ({
      onRestore,
      prepare,
      active: false,
      saving: false,
      serial: 0,
      controller: null,
    }),
    [onRestore, prepare],
  )
  type State = {
    session: typeof session
    prepared: Prepared | null
    status: 'idle' | 'reading' | 'ready' | 'saving'
    error: string | null
    invalidName: boolean
  }
  const empty = (): State => ({
    session,
    prepared: null,
    status: 'idle',
    error: null,
    invalidName: false,
  })
  const [state, setState] = useState<State>(empty)
  const current = state.session === session ? state : empty()
  const field = useRef<HTMLInputElement>(null),
    errorId = useId()
  useLayoutEffect(() => {
    session.active = true
    return () => {
      session.active = false
      session.serial++
      session.controller?.abort()
      session.saving = false
    }
  }, [session])
  function begin() {
    session.controller?.abort()
    const controller = new AbortController(),
      serial = ++session.serial
    session.controller = controller
    return {
      signal: controller.signal,
      owns: () => session.active && serial === session.serial && !controller.signal.aborted,
    }
  }
  async function choose(file: File) {
    if (!session.active || session.saving) return
    const task = begin()
    setState({ ...empty(), status: 'reading' })
    try {
      checkSceneProjectFileSize(file.size)
      const buffer = await file.arrayBuffer()
      if (!task.owns()) return
      if (buffer.byteLength !== file.size) throw new SceneProjectFileError('invalid')
      const document = await session.prepare(
        { taskId: newId(), bytes: new Uint8Array(buffer) },
        { signal: task.signal },
      )
      if (task.owns())
        setState({
          ...empty(),
          status: 'ready',
          prepared: { document, name: document.name, fileName: file.name },
        })
    } catch (error) {
      if (task.owns())
        setState({
          ...empty(),
          error: error instanceof SceneProjectFileError ? error.message : copy.readError,
        })
    }
  }
  async function restore() {
    if (!session.active || session.saving || !current.prepared) return
    let name: string
    try {
      name = sceneProjectName(current.prepared.name)
    } catch {
      setState({
        ...current,
        invalidName: true,
        error: COPY.scene.start.nameError(MOLDA_LIMITS.maxNameChars),
      })
      field.current?.focus()
      return
    }
    const task = begin()
    session.saving = true
    setState({ ...current, status: 'saving', error: null, invalidName: false })
    try {
      await session.onRestore(current.prepared.document, name, task.signal)
    } catch (error) {
      if (task.owns())
        setState({
          ...current,
          status: 'ready',
          invalidName: false,
          error: isStorageBudgetError(error) ? COPY.gallery.storageBudget : copy.saveError,
        })
    } finally {
      if (task.owns()) {
        session.saving = false
        setState((previous) =>
          previous.session === session && previous.status === 'saving'
            ? { ...previous, status: 'ready' }
            : previous,
        )
      }
    }
  }
  const busy = current.status === 'saving'
  return (
    <div className="space-y-4">
      <p className="text-sm text-mld-text-soft">{copy.hint}</p>
      <label className="flex flex-col gap-2 text-sm font-bold">
        {copy.file}
        <input
          name="sceneProjectFile"
          type="file"
          accept=".molda.json,application/json"
          disabled={busy}
          className={SCENE_APPEARANCE_FIELD}
          onChange={(event) => {
            const file = event.currentTarget.files?.[0]
            event.currentTarget.value = ''
            if (file) void choose(file)
          }}
        />
      </label>
      {current.status === 'reading' && <p role="status">{copy.reading}</p>}
      {current.error && (
        <p role="alert" id={errorId} className="text-sm text-mld-danger">
          {current.error}
        </p>
      )}
      {current.prepared && (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            void restore()
          }}
        >
          <p className="break-words text-sm text-mld-muted">
            {copy.source(current.prepared.fileName)}
          </p>
          <label className="flex flex-col gap-2 text-sm font-bold">
            {COPY.scene.start.name}
            <input
              name="restoredProjectName"
              ref={field}
              value={current.prepared.name}
              maxLength={MOLDA_LIMITS.maxNameChars}
              disabled={busy}
              autoComplete="off"
              aria-invalid={current.invalidName ? true : undefined}
              aria-describedby={current.error ? errorId : undefined}
              className={SCENE_APPEARANCE_FIELD}
              onChange={(event) => {
                const name = event.currentTarget.value
                setState((previous) =>
                  previous.session === session && previous.prepared
                    ? {
                        ...previous,
                        prepared: { ...previous.prepared, name },
                        invalidName: false,
                        error: previous.invalidName ? null : previous.error,
                      }
                    : previous,
                )
              }}
            />
          </label>
          <SceneImportPreview document={current.prepared.document} factory={viewportFactory} />
          <p className="text-sm text-mld-text-soft">{copy.newIdentity}</p>
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? copy.saving : copy.confirm}
          </Button>
          {busy && <p role="status">{copy.saving}</p>}
        </form>
      )}
      <Button onClick={onClose}>{copy.cancel}</Button>
    </div>
  )
}
