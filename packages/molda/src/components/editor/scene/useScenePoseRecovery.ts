import { useLayoutEffect, useRef, useState } from 'react'
import type { SceneAnimationClip } from '../../../scene/animation'
import type { MoldaSceneDocument } from '../../../scene/document'
import { sameSceneContent } from '../../../scene/documentContent'
import { sceneToJson } from '../../../scene/documentJson'
import type { EditorStore } from '../../../state/editorStore'
import { getMoldaStorageNamespace } from '../../../state/persistence'
import type { SceneAnimationPoseGesture } from '../../../state/SceneAnimationPoseGesture'

interface Recovery {
  version: 1
  revision: string
  time: number
  clip: SceneAnimationClip
}
const hashes = new WeakMap<MoldaSceneDocument, Promise<string>>()
export function scenePoseRecoveryRevision(source: MoldaSceneDocument) {
  let hash = hashes.get(source)
  if (!hash) {
    hash = (async () => {
      const document = sceneToJson(source)
      delete document.thumb
      // Thumbnails and persistence stamps are derived, not authoring revisions.
      const { updatedAt: _updatedAt, ...content } = document
      const bytes = new TextEncoder().encode(JSON.stringify(content))
      const digest = await crypto.subtle.digest('SHA-256', bytes)
      return Array.from(new Uint8Array(digest), (value) =>
        value.toString(16).padStart(2, '0'),
      ).join('')
    })()
    hashes.set(source, hash)
  }
  return hash
}

/** Separate recovery record: never a saved pose and never part of the project/cloud payload. */
export function useScenePoseRecovery(
  editor: EditorStore<MoldaSceneDocument>,
  gesture: SceneAnimationPoseGesture,
) {
  const [available, setAvailable] = useState<Recovery | null>(null)
  const [error, setError] = useState<string | null>(null)
  const stored = useRef<Recovery | null>(null)
  // A revisão em que o rascunho foi OFERECIDO: editar ou marcar outra pose depois disso torna a
  // oferta velha, e ela não pode ser mesclada na criação nova.
  const offeredFor = useRef<MoldaSceneDocument | null>(null)
  const key = `molda:pose-draft:${JSON.stringify([getMoldaStorageNamespace(), editor.getState().content.id])}`
  useLayoutEffect(() => {
    let active = true,
      serial = 0,
      ownedDraft = false,
      retryAfterSave = false
    const source = editor.getState().content
    void (async () => {
      try {
        const raw = localStorage.getItem(key)
        if (!raw) return
        const recovery = JSON.parse(raw) as Recovery
        const revision = await scenePoseRecoveryRevision(source)
        if (
          !active ||
          serial !== 0 ||
          gesture.getSnapshot().pending ||
          editor.getState().content !== source
        )
          return
        if (recovery.version !== 1 || recovery.revision !== revision) {
          localStorage.removeItem(key)
          return
        }
        stored.current = recovery
        offeredFor.current = source
        setAvailable(recovery)
      } catch {
        if (active) setError('Não foi possível ler o rascunho da pose.')
      }
    })()
    const persist = () => {
      if (!active) return
      const snapshot = gesture.getSnapshot()
      if (snapshot.dragging) return
      let draft: ReturnType<typeof gesture.recoveryDraft>
      try {
        draft = gesture.recoveryDraft()
      } catch {
        setError('Marque a pose antes de fechar a página para guardar seus ajustes.')
        return
      }
      if (!draft) {
        if (snapshot.pending || stored.current) return
        if (!ownedDraft) return
        serial++
        ownedDraft = false
        try {
          localStorage.removeItem(key)
        } catch {
          /* No persistent draft to remove. */
        }
        return
      }
      const ticket = ++serial
      ownedDraft = true
      void scenePoseRecoveryRevision(draft.source)
        .then(async (revision) => {
          // Recovery must never reference authoring changes that exist only in RAM.
          await editor.getState().flush()
          if (!active || ticket !== serial || editor.getState().content !== draft.source) return
          if (editor.getState().saveState !== 'saved') {
            retryAfterSave = true
            setError(
              'Não foi possível guardar o rascunho. Mantenha esta página aberta e tente salvar novamente.',
            )
            return
          }
          try {
            localStorage.setItem(
              key,
              JSON.stringify({
                version: 1,
                revision,
                time: draft.time,
                clip: draft.clip,
              } satisfies Recovery),
            )
            setError(null)
            retryAfterSave = false
          } catch {
            setError('O rascunho está nesta sessão. Marque a pose antes de fechar a página.')
          }
        })
        .catch(() => {
          if (active) setError('Marque a pose antes de fechar a página para guardar seus ajustes.')
        })
    }
    const unsubscribe = gesture.subscribe(persist)
    const unsubscribeSave = editor.subscribe((state) => {
      const offered = offeredFor.current
      if (stored.current && offered && !sameSceneContent(state.content, offered)) {
        stored.current = null
        offeredFor.current = null
        setAvailable(null)
        try {
          localStorage.removeItem(key)
        } catch {
          /* A oferta já saiu da tela; o rascunho velho é recusado pela revisão ao abrir. */
        }
      }
      if (retryAfterSave && state.saveState === 'saved') {
        retryAfterSave = false
        persist()
      }
    })
    return () => {
      active = false
      serial++
      unsubscribe()
      unsubscribeSave()
    }
  }, [editor, gesture, key])
  const discard = () => {
    stored.current = null
    offeredFor.current = null
    setAvailable(null)
    try {
      localStorage.removeItem(key)
    } catch {
      setError('Não foi possível apagar o rascunho recuperável.')
    }
  }
  return {
    available,
    error,
    discard,
    restore: () => {
      const recovery = stored.current
      if (!recovery) return false
      const offered = offeredFor.current
      if (!offered || !sameSceneContent(editor.getState().content, offered)) {
        stored.current = null
        offeredFor.current = null
        setAvailable(null)
        setError('Esse rascunho é de antes das suas últimas mudanças e não pode mais ser usado.')
        return false
      }
      const restored = gesture.restoreDraft(recovery.clip, recovery.time)
      if (restored) {
        stored.current = null
        offeredFor.current = null
        setAvailable(null)
      } else setError('Esse rascunho não pôde ser recuperado. A criação salva continua disponível.')
      return restored
    },
  }
}
