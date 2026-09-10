import { clsx } from 'clsx'
import { useCallback, useEffect, useId, useMemo, useRef } from 'react'
import { useStore } from 'zustand'
import { COPY } from '../../../core/copy'
import type { MoldaSceneDocument } from '../../../scene/document'
import { indexSceneDocument } from '../../../scene/documentIndex'
import { evaluateSceneNodeFlags } from '../../../scene/evaluate'
import { SCENE_SKIN_LIMITS } from '../../../scene/skin'
import type { EditorStore } from '../../../state/editorStore'
import { Button } from '../../ui/Button'
import { SceneSkinJointTools } from './SceneSkinJointTools'
import { useSceneSkinBinding } from './useSceneSkinBinding'

/** Loaded only inside the contextual modal. Review is a summary, not a claimed 3D preview. */
export function SceneSkinPanel({
  editor,
  nodeId,
  onClose,
}: {
  editor: EditorStore<MoldaSceneDocument>
  nodeId: string
  onClose: () => void
}) {
  const document = useStore(editor, (state) => state.content),
    index = useMemo(() => indexSceneDocument(document), [document]),
    locked = useMemo(
      () => evaluateSceneNodeFlags(index.scene).get(nodeId)?.locked,
      [index, nodeId],
    ),
    binding = index.skinsByNode.get(nodeId),
    node = index.scene.nodes.get(nodeId),
    geometry = node?.kind === 'mesh' ? index.geometries.get(node.geometryId) : null,
    vertexCount = useMemo(
      () => (geometry?.kind === 'mesh' ? Object.keys(geometry.vertices).length : 0),
      [geometry],
    ),
    candidates = useMemo(
      () => document.nodes.filter((node) => node.kind !== 'mesh'),
      [document.nodes],
    ),
    session = useSceneSkinBinding(editor, nodeId),
    { state, settings } = session,
    copy = COPY.scene.skinBinding,
    methodName = useId(),
    notice = useRef<HTMLElement>(null),
    hasPending = state.status === 'busy' || state.status === 'ready'

  const setNotice = useCallback((element: HTMLElement | null) => {
    notice.current = element
  }, [])

  useEffect(() => {
    if (state.status !== 'idle' || state.message) notice.current?.focus()
  }, [state])

  const jointList = (ids: readonly string[]) => (
    <ul className="max-h-44 space-y-1 overflow-y-auto rounded-lg border border-mld-border p-3 text-sm">
      {ids.map((id) => (
        <li key={id} className="break-words">
          {index.scene.nodes.get(id)?.name ?? id}
        </li>
      ))}
    </ul>
  )

  return (
    <div className="space-y-4">
      <p className="break-words text-sm font-bold text-mld-text">{node?.name}</p>
      <p className="text-sm text-mld-muted">{binding ? copy.linkedHint : copy.intro}</p>
      {locked && (
        <p role="status" className="text-sm text-mld-muted">
          {copy.locked}
        </p>
      )}
      {binding ? (
        <>
          <p className="text-sm font-bold">{copy.linked}</p>
          {!hasPending && (
            <SceneSkinJointTools
              skin={binding}
              nodes={candidates}
              disabled={!!locked}
              onReview={session.reviewJoint}
            />
          )}
          {!hasPending && (
            <div className="flex flex-col gap-2">
              <Button disabled={locked} onClick={() => session.review('rebind')}>
                {copy.rebind}
              </Button>
              <Button disabled={locked} onClick={() => session.review('remove')}>
                {copy.remove}
              </Button>
            </div>
          )}
        </>
      ) : (
        <>
          <fieldset className="space-y-2" disabled={locked}>
            <legend className="text-sm font-bold">{copy.choose}</legend>
            <p className="text-sm text-mld-muted">{copy.chooseHint}</p>
            {settings.jointIds.length === SCENE_SKIN_LIMITS.joints && (
              <p role="status" className="text-sm text-mld-muted">
                {copy.jointLimit(SCENE_SKIN_LIMITS.joints)}
              </p>
            )}
            {!candidates.length && <p className="text-sm text-mld-muted">{copy.noJoints}</p>}
            <div className="max-h-60 overflow-y-auto rounded-lg border border-mld-border">
              {candidates.map((joint) => {
                const checked = settings.jointIds.includes(joint.id)
                return (
                  <label
                    key={joint.id}
                    className={clsx(
                      'flex min-h-11 cursor-pointer items-center gap-3 px-3 py-2 text-sm',
                      'hover:bg-mld-bg focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-mld-accent',
                    )}
                  >
                    <input
                      type="checkbox"
                      name="skin-joints"
                      value={joint.id}
                      checked={checked}
                      disabled={!checked && settings.jointIds.length >= SCENE_SKIN_LIMITS.joints}
                      onChange={() => session.toggleJoint(joint.id)}
                      className="size-5 shrink-0 accent-mld-accent"
                    />
                    <span className="min-w-0 break-words">
                      {joint.name}
                      <span className="block text-xs text-mld-muted">{copy[joint.kind]}</span>
                    </span>
                  </label>
                )
              })}
            </div>
          </fieldset>
          <fieldset className="space-y-2" disabled={locked}>
            <legend className="text-sm font-bold">{copy.method}</legend>
            {(['segments', 'rigid'] as const).map((method) => (
              <label
                key={method}
                className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border border-mld-border p-3 text-sm"
              >
                <input
                  type="radio"
                  name={methodName}
                  value={method}
                  checked={settings.method === method}
                  onChange={() => session.setMethod(method)}
                  className="mt-0.5 size-5 shrink-0 accent-mld-accent"
                />
                <span>
                  <span className="block font-bold">{copy.methods[method]}</span>
                  <span className="text-mld-muted">{copy.methodHints[method]}</span>
                </span>
              </label>
            ))}
          </fieldset>
          {vertexCount > 8192 && <p className="text-sm text-mld-muted">{copy.large}</p>}
          {!hasPending && (
            <Button
              variant="primary"
              className="w-full"
              disabled={locked || !settings.jointIds.length}
              onClick={() => void session.prepare()}
            >
              {copy.prepare}
            </Button>
          )}
        </>
      )}
      {state.status === 'busy' && (
        <p ref={setNotice} tabIndex={-1} role="status" className="text-sm">
          {copy.busy}
        </p>
      )}
      {state.status === 'error' && (
        <p ref={setNotice} tabIndex={-1} role="alert" className="text-sm text-mld-danger">
          {state.message}
        </p>
      )}
      {state.status === 'idle' && state.message && (
        <p ref={setNotice} tabIndex={-1} role="status" className="text-sm">
          {state.message}
        </p>
      )}
      {state.status === 'ready' && (
        <div className="space-y-3 rounded-xl border border-mld-border bg-mld-bg p-3">
          <h3 ref={setNotice} tabIndex={-1} className="text-sm font-bold">
            {state.change.kind === 'create' ? copy.review : copy[state.change.kind]}
          </h3>
          {state.change.kind === 'create' ? (
            <>
              <p role="status" className="text-sm">
                {copy.summary(
                  state.change.result.stats.vertices,
                  state.change.result.stats.joints,
                  state.change.result.stats.maximumInfluences,
                )}
              </p>
              {jointList(settings.jointIds)}
              {settings.method === 'segments' && state.change.result.stats.segments === 0 && (
                <p className="text-sm text-mld-muted">{copy.noSegments}</p>
              )}
              <p className="text-sm">{copy.confirmHint}</p>
            </>
          ) : state.change.kind === 'addJoint' || state.change.kind === 'removeJoint' ? (
            <>
              <p className="break-words text-sm font-bold">
                {index.scene.nodes.get(state.change.jointId)?.name}
              </p>
              <p className="text-sm">
                {state.change.kind === 'addJoint' ? copy.addJointHint : copy.removeJointHint}
              </p>
            </>
          ) : (
            <p className="text-sm">
              {state.change.kind === 'remove' ? copy.removeHint : copy.rebindHint}
            </p>
          )}
          <p className="text-sm text-mld-muted">{copy.undoHint}</p>
          <Button
            variant={
              state.change.kind === 'remove' || state.change.kind === 'removeJoint'
                ? 'danger'
                : 'primary'
            }
            className="w-full"
            disabled={locked}
            onClick={() => {
              if (session.apply()) onClose()
            }}
          >
            {state.change.kind === 'create'
              ? copy.apply
              : state.change.kind === 'remove'
                ? copy.confirmRemove
                : state.change.kind === 'rebind'
                  ? copy.confirmRebind
                  : state.change.kind === 'addJoint'
                    ? copy.confirmAddJoint
                    : copy.confirmRemoveJoint}
          </Button>
        </div>
      )}
      {hasPending && (
        <Button className="w-full" onClick={session.cancel}>
          {state.status === 'busy' ? copy.cancelWork : copy.cancel}
        </Button>
      )}
      <p className="text-sm text-mld-muted">{copy.exportHint}</p>
      <Button variant="ghost" className="w-full" onClick={onClose}>
        {copy.close}
      </Button>
    </div>
  )
}
