import { useCallback, useEffect, useState } from 'react'
import { COPY } from '../../../core/copy'
import type { Vec3 } from '../../../core/model'
import {
  buildCharacterRig,
  type CharacterRole,
  characterMarkSequence,
  characterRigTarget,
  layoutCharacterSkeleton,
  removeCharacterBones,
} from '../../../scene/characterRig'
import type { MoldaSceneDocument } from '../../../scene/document'
import { keepSceneThumb, sameSceneContent } from '../../../scene/documentContent'
import { snapSceneMeasurement } from '../../../scene/measurementStep'
import { requireScene } from '../../../scene/validation'
import type { EditorStore } from '../../../state/editorStore'
import type { MotionChoice } from './useCharacterMotion'

export interface CharacterRigDraft {
  source: MoldaSceneDocument
  revision: number
  ids: readonly string[]
  mirror: boolean
  /** Os pontos caem no plano de frente que passa pelo meio do personagem. */
  center: Vec3
  points: readonly Vec3[]
  layout: Record<CharacterRole, Vec3> | null
  cameraRequest: { view: 'front'; frame: true }
}

/** Rascunho só da sessão: nada vai para o arquivo até Montar esqueleto. */
export function useCharacterRigBuilder(
  editor: EditorStore<MoldaSceneDocument>,
  run: (change: (source: MoldaSceneDocument) => MoldaSceneDocument) => unknown,
  enabled: boolean,
) {
  const [draft, setDraft] = useState<CharacterRigDraft | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)
  /** Movimento escolhido em Animar antes de existir esqueleto: entra em prévia logo depois de montar. */
  const [wanted, setWanted] = useState<MotionChoice | null>(null)
  const cancel = useCallback(() => {
    setDraft(null)
    setError(null)
  }, [])
  useEffect(() => {
    if (enabled) return
    cancel()
    setWanted(null)
  })
  useEffect(
    () =>
      editor.subscribe(() => {
        setDraft((current) =>
          current && current.revision !== editor.getState().contentRevision ? null : current,
        )
      }),
    [editor],
  )
  const fail = (reason: unknown) =>
    setError(reason instanceof Error ? reason.message : COPY.scene.commandFailed)
  /**
   * `points`: já começa com estes pontos (os achados sozinhos), para a pessoa só ajustar. Falso
   * quando a marcação não abriu (o motivo fica em `error`).
   */
  function start(
    ids: readonly string[],
    mirror: boolean,
    motion: MotionChoice | null = null,
    points: readonly Vec3[] = [],
  ) {
    if (!enabled) return false
    setError(null)
    setDone(null)
    try {
      const source = editor.getState().content
      const target = characterRigTarget(source, ids)
      setDraft({
        source,
        revision: editor.getState().contentRevision,
        ids: [...ids],
        mirror,
        center: target.min.map((low, axis) => (low + target.max[axis]!) / 2) as Vec3,
        points: [...points],
        layout: points.length ? layoutCharacterSkeleton(source, ids, points, mirror) : null,
        cameraRequest: { view: 'front', frame: true },
      })
      setWanted(motion)
      return true
    } catch (reason) {
      fail(reason)
      return false
    }
  }
  return {
    draft,
    error,
    done,
    wanted,
    want: setWanted,
    cancel() {
      cancel()
      setWanted(null)
    },
    start,
    remove(ids: readonly string[]) {
      setError(null)
      setDone(null)
      const next = run((source) => keepSceneThumb(removeCharacterBones(source, ids), source))
      if (next) setDone(COPY.scene.characterRig.removed)
      return !!next
    },
    mark(point: Vec3, step: number) {
      if (!draft || draft.layout) return
      const sequence = characterMarkSequence(draft.mirror)
      // O passo da oficina vale na tela (X e Y); a profundidade vem do corpo.
      const snapped: Vec3 = [
        snapSceneMeasurement(point[0], step),
        snapSceneMeasurement(point[1], step),
        point[2],
      ]
      const points = [...draft.points, snapped]
      if (points.length < sequence.length) {
        setError(null)
        setDraft({ ...draft, points })
        return
      }
      try {
        const layout = layoutCharacterSkeleton(draft.source, draft.ids, points, draft.mirror)
        setError(null)
        setDraft({ ...draft, points, layout })
      } catch (reason) {
        fail(reason)
      }
    },
    back() {
      if (!draft?.points.length) return
      setError(null)
      setDraft({ ...draft, points: draft.points.slice(0, -1), layout: null })
    },
    restart() {
      if (!draft) return
      setError(null)
      setDraft({ ...draft, points: [], layout: null })
    },
    confirm() {
      const current = draft
      if (!current?.layout) return false
      let pieces = 0
      const next = run((source) => {
        // A miniatura refeita no meio da marcação não conta como mudança da criação.
        requireScene(
          sameSceneContent(source, current.source),
          'source',
          COPY.scene.animationChanged,
        )
        const built = buildCharacterRig(source, current.ids, current.layout!)
        pieces = built.pieces
        return keepSceneThumb(built.document, source)
      })
      if (!next) return false
      setDraft(null)
      setError(null)
      setDone(COPY.scene.characterRig.done(pieces))
      return true
    },
  }
}
