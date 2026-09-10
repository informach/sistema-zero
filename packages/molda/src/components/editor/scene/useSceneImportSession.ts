import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import type { MoldaSceneDocument } from '../../../scene/document'
import type { EditorStore } from '../../../state/editorStore'

export interface SceneImportOwner {
  editor: EditorStore<MoldaSceneDocument>
  revision: number
  documentId: string
  requestId: number
  controller: AbortController
}
export interface SceneImportMessages {
  cancelled: string
  changed: string
  interrupted: string
}

/** Revision-owned staging, independent of file format. Initial/cancelled adapters must be stable. */
export function useSceneImportSession<View>(
  editor: EditorStore<MoldaSceneDocument>,
  initial: () => View,
  cancelled: (view: View, message: string) => View,
  messages: SceneImportMessages,
) {
  const [view, setView] = useState<View>(initial),
    current = useRef(view),
    owner = useRef<SceneImportOwner | null>(null),
    active = useRef<EditorStore<MoldaSceneDocument> | null>(null),
    serial = useRef(0)
  const publish = useCallback((next: View) => {
    current.current = next
    setView(next)
  }, [])
  const invalidate = useCallback(() => {
    const generation = ++serial.current,
      previous = owner.current
    owner.current = null
    previous?.controller.abort()
    return generation === serial.current
  }, [])
  const cancel = useCallback(
    (message: string = messages.cancelled) => {
      if (active.current !== editor || !invalidate()) return
      publish(cancelled(current.current, message))
    },
    [editor, invalidate, publish, cancelled, messages.cancelled],
  )
  function isActive() {
    return active.current === editor
  }
  function revoke() {
    return isActive() && invalidate()
  }
  function owns(entry: SceneImportOwner) {
    const state = entry.editor.getState()
    return (
      owner.current === entry &&
      active.current === entry.editor &&
      !entry.controller.signal.aborted &&
      state.asset.id === entry.documentId &&
      state.contentRevision === entry.revision
    )
  }
  function begin(): SceneImportOwner | null {
    if (!revoke()) return null
    if (document.hidden) {
      publish(cancelled(current.current, messages.interrupted))
      return null
    }
    const state = editor.getState(),
      entry: SceneImportOwner = {
        editor,
        revision: state.contentRevision,
        documentId: state.asset.id,
        requestId: serial.current,
        controller: new AbortController(),
      }
    owner.current = entry
    return entry
  }
  /** Detach before notifying editor subscribers; keep a generation guard for reentrant host work. */
  function detach(entry: SceneImportOwner): number | null {
    if (!owns(entry)) return null
    const generation = ++serial.current
    owner.current = null
    return generation
  }
  function isCurrent(generation: number) {
    return isActive() && serial.current === generation
  }
  useLayoutEffect(() => {
    active.current = editor
    publish(initial())
    const unsubscribe = editor.subscribe((state) => {
        const entry = owner.current
        if (
          entry &&
          (entry.revision !== state.contentRevision || entry.documentId !== state.asset.id)
        )
          cancel(messages.changed)
      }),
      blur = () => {
        if (owner.current) cancel(messages.interrupted)
      },
      hidden = () => {
        if (document.hidden) blur()
      }
    window.addEventListener('blur', blur)
    document.addEventListener('visibilitychange', hidden)
    return () => {
      active.current = null
      unsubscribe()
      window.removeEventListener('blur', blur)
      document.removeEventListener('visibilitychange', hidden)
      invalidate()
    }
  }, [editor, initial, publish, cancel, invalidate, messages.changed, messages.interrupted])
  return { view, current, owner, publish, cancel, revoke, owns, begin, detach, isCurrent, isActive }
}
