import { useCallback, useEffect, useRef, useState } from 'react'
import { COPY } from '../../../core/copy'
import { newId } from '../../../core/id'
import type { MoldaSceneDocument } from '../../../scene/document'
import { SCENE_SKIN_LIMITS } from '../../../scene/skin'
import {
  addSceneSkinJoint,
  createSceneSkin,
  rebindSceneSkin,
  removeSceneSkin,
  removeSceneSkinJoint,
} from '../../../scene/skinCommands'
import { sceneSkinJointUsage } from '../../../scene/skinJoints'
import {
  prepareSceneSkinSuggestion,
  type SceneSkinSuggestionInput,
} from '../../../scene/skinSuggestion'
import { SceneValidationError } from '../../../scene/validation'
import type { EditorStore } from '../../../state/editorStore'
import { suggestSkinInWorker } from '../../../workers/sceneSkinSuggestion'
import type { SceneSkinSuggestionResult } from '../../../workers/sceneSkinSuggestionProtocol'
import type { TaskWorker } from '../../../workers/workerTask'

type Settings = Pick<SceneSkinSuggestionInput, 'method' | 'jointIds'>
interface Session {
  editor: EditorStore<MoldaSceneDocument>
  nodeId: string
  settings: Settings
}
interface Owner {
  session: Session
  settings: Settings
  documentId: string
  revision: number
  controller: AbortController
}
type Change =
  | { kind: 'create'; result: SceneSkinSuggestionResult }
  | { kind: 'remove' | 'rebind'; skinId: string }
  | { kind: 'addJoint' | 'removeJoint'; skinId: string; jointId: string }
type State =
  | { status: 'idle'; message?: string }
  | { status: 'error'; message: string }
  | { status: 'applied' }
  | { status: 'busy'; owner: Owner }
  | { status: 'ready'; owner: Owner; change: Change }
type Pending = Extract<State, { status: 'busy' | 'ready' }>

const initialSettings: Settings = { method: 'segments', jointIds: [] }

/** Modal session only. Calculation/review never replaces the editor document or writes history. */
export function useSceneSkinBinding(
  editor: EditorStore<MoldaSceneDocument>,
  nodeId: string,
  createWorker?: () => TaskWorker,
) {
  const active = useRef<Session | null>(null),
    pending = useRef<Pending | null>(null),
    [settings, setSettings] = useState(initialSettings),
    [state, setState] = useState<State>({ status: 'idle' }),
    copy = COPY.scene.skinBinding

  const cancel = useCallback((message?: string) => {
    const previous = pending.current
    pending.current = null
    previous?.owner.controller.abort()
    setState({ status: 'idle', message })
  }, [])

  useEffect(() => {
    const session: Session = { editor, nodeId, settings: initialSettings }
    active.current = session
    setSettings(initialSettings)
    setState({ status: 'idle' })
    const unsubscribe = editor.subscribe((current, previous) => {
      if (
        current.contentRevision === previous.contentRevision &&
        current.asset.id === previous.asset.id
      )
        return
      if (pending.current) cancel(copy.changed)
      if (current.asset.id !== previous.asset.id) {
        session.settings = initialSettings
        setSettings(initialSettings)
        return
      }
      const alive = new Set(
          current.asset.nodes.filter((node) => node.kind !== 'mesh').map((node) => node.id),
        ),
        jointIds = session.settings.jointIds.filter((id) => alive.has(id))
      if (jointIds.length !== session.settings.jointIds.length) {
        session.settings = { ...session.settings, jointIds }
        setSettings(session.settings)
      }
    })
    const interrupt = () => {
      if (pending.current) cancel(copy.interrupted)
    }
    const hidden = () => {
      if (document.hidden) interrupt()
    }
    window.addEventListener('blur', interrupt)
    document.addEventListener('webglcontextlost', interrupt, true)
    document.addEventListener('visibilitychange', hidden)
    return () => {
      active.current = null
      unsubscribe()
      window.removeEventListener('blur', interrupt)
      document.removeEventListener('webglcontextlost', interrupt, true)
      document.removeEventListener('visibilitychange', hidden)
      const previous = pending.current
      pending.current = null
      previous?.owner.controller.abort()
    }
  }, [editor, nodeId, cancel, copy.changed, copy.interrupted])

  function configure(update: (previous: Settings) => Settings) {
    const session = active.current
    if (session?.editor !== editor || session.nodeId !== nodeId) return
    const next = update(session.settings)
    cancel()
    session.settings = next
    setSettings(next)
  }

  function begin(): Owner | null {
    const session = active.current
    // A captured Prepare callback cannot start work for superseded parameters.
    if (session?.editor !== editor || session.nodeId !== nodeId || session.settings !== settings)
      return null
    cancel()
    if (document.hidden) {
      cancel(copy.interrupted)
      return null
    }
    const current = editor.getState()
    return {
      session,
      settings,
      documentId: current.asset.id,
      revision: current.contentRevision,
      controller: new AbortController(),
    }
  }

  function fail(owner: Owner, error: unknown) {
    if (pending.current?.owner !== owner) return
    pending.current = null
    setState({
      status: 'error',
      message: error instanceof SceneValidationError ? error.message : copy.failed,
    })
  }

  async function prepare() {
    const owner = begin()
    if (!owner) return
    const busy: Pending = { status: 'busy', owner }
    pending.current = busy
    setState(busy)
    try {
      const data = prepareSceneSkinSuggestion(editor.getState().asset, { nodeId, ...settings }),
        result = await suggestSkinInWorker(
          // Opaque identity for this exact document/revision/node/settings owner, never persisted.
          { sourceKey: newId(), data },
          owner.controller.signal,
          createWorker,
        )
      if (pending.current?.owner !== owner) return
      const ready: Pending = { status: 'ready', owner, change: { kind: 'create', result } }
      pending.current = ready
      setState(ready)
    } catch (error) {
      fail(owner, error)
    }
  }

  function review(kind: 'remove' | 'rebind') {
    const owner = begin()
    if (!owner) return
    const skin = editor.getState().asset.skins?.find((skin) => skin.nodeId === nodeId)
    if (!skin) {
      setState({ status: 'error', message: copy.changed })
      return
    }
    const ready: Pending = { status: 'ready', owner, change: { kind, skinId: skin.id } }
    pending.current = ready
    setState(ready)
  }

  function apply() {
    if (state.status !== 'ready' || pending.current !== state) return false
    const { owner, change } = state,
      current = editor.getState()
    if (
      active.current !== owner.session ||
      owner.settings !== owner.session.settings ||
      current.asset.id !== owner.documentId ||
      current.contentRevision !== owner.revision ||
      document.hidden
    ) {
      cancel(copy.changed)
      return false
    }
    try {
      let next: MoldaSceneDocument
      switch (change.kind) {
        case 'create':
          next = createSceneSkin(current.asset, {
            nodeId,
            name: copy.bindingName,
            jointIds: [...owner.settings.jointIds].sort(),
            weights: change.result.weights,
          })
          break
        case 'remove':
          next = removeSceneSkin(current.asset, change.skinId)
          break
        case 'rebind':
          next = rebindSceneSkin(current.asset, change.skinId)
          break
        case 'addJoint':
          next = addSceneSkinJoint(current.asset, change.skinId, change.jointId)
          break
        case 'removeJoint':
          next = removeSceneSkinJoint(current.asset, change.skinId, change.jointId)
          break
      }
      // Revoke captured confirmations before synchronous store notifications.
      pending.current = null
      if (next !== current.asset) current.commit(next)
      setState({ status: 'applied' })
      return true
    } catch (error) {
      // A synchronous commit failure must not leave a revoked Ready screen behind.
      if (
        active.current === owner.session &&
        (pending.current === null || pending.current?.owner === owner)
      ) {
        pending.current = null
        setState({
          status: 'error',
          message: error instanceof SceneValidationError ? error.message : copy.failed,
        })
      }
      return false
    }
  }

  return {
    state,
    settings,
    setMethod: (method: Settings['method']) => configure((previous) => ({ ...previous, method })),
    toggleJoint: (id: string) =>
      configure((previous) => ({
        ...previous,
        jointIds: previous.jointIds.includes(id)
          ? previous.jointIds.filter((jointId) => jointId !== id)
          : [...previous.jointIds, id],
      })),
    prepare,
    review,
    reviewJoint: (kind: 'addJoint' | 'removeJoint', jointId: string) => {
      const owner = begin()
      if (!owner) return
      const current = editor.getState().asset,
        skin = current.skins?.find((skin) => skin.nodeId === nodeId),
        node = current.nodes.find((node) => node.id === jointId),
        usage = skin && sceneSkinJointUsage(skin).get(jointId)
      const message =
        !skin || !node || node.kind === 'mesh' || (kind === 'addJoint' ? !!usage : !usage)
          ? copy.changed
          : kind === 'removeJoint' && usage!.positive > 0
            ? copy.jointInUse(usage!.positive)
            : kind === 'addJoint' && skin.joints.length >= SCENE_SKIN_LIMITS.joints
              ? copy.jointLimit(SCENE_SKIN_LIMITS.joints)
              : null
      if (message || !skin) {
        setState({ status: 'error', message: message ?? copy.changed })
        return
      }
      const ready: Pending = { status: 'ready', owner, change: { kind, skinId: skin.id, jointId } }
      pending.current = ready
      setState(ready)
    },
    apply,
    cancel: () => cancel(copy.cancelled),
  }
}
