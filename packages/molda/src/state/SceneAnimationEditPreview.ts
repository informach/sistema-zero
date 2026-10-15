import type { MoldaSceneDocument } from '../scene/document'
import { keepSceneThumb, sameSceneContent } from '../scene/documentContent'
import { requireScene } from '../scene/validation'
import type { EditorStore } from './editorStore'
import type { SceneAnimationPlayer, SceneAnimationSnapshot } from './SceneAnimationPlayer'

export type SceneAnimationEditOrigin = 'range' | 'settings' | 'curves'

interface EditOwner {
  origin: SceneAnimationEditOrigin | null
  before: MoldaSceneDocument
  after: MoldaSceneDocument
  source: NonNullable<SceneAnimationSnapshot['source']>
}

/** Existing-clip edits share one reversible player preview; save/export always retain the committed scene. */
export class SceneAnimationEditPreview {
  private owner: EditOwner | null = null
  private snapshot = {
    pending: false,
    error: null as string | null,
    origin: null as SceneAnimationEditOrigin | null,
  }
  private readonly listeners = new Set<() => void>()
  constructor(
    private readonly editor: EditorStore<MoldaSceneDocument>,
    private readonly player: SceneAnimationPlayer,
  ) {}
  getSnapshot = () => this.snapshot
  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }
  private publish(error: string | null = null, origin = this.owner?.origin ?? null) {
    const pending = this.owner !== null
    if (
      this.snapshot.pending === pending &&
      this.snapshot.error === error &&
      this.snapshot.origin === origin
    )
      return
    this.snapshot = { pending, error, origin }
    for (const listener of this.listeners) listener()
  }
  connect() {
    const offPlayer = this.player.subscribe(() => {
      if (this.owner && this.owner.source !== this.player.getSnapshot().source) this.owner = null
      this.publish(this.player.getSnapshot().error)
    })
    const offEditor = this.editor.subscribe((state) => {
      if (!this.owner || state.content === this.owner.before) return
      this.owner = null
      // An external edit owns the new revision. Never restore the old preview return over it.
      const clipId = this.player.getSnapshot().source?.clip.id
      const clip = state.content.animations?.find((clip) => clip.id === clipId)
      this.player.setClip(clip ? state.content : null, clip?.id ?? null)
      this.publish()
    })
    return () => {
      offPlayer()
      offEditor()
      this.cancel()
    }
  }
  cancel = () => {
    const owner = this.owner
    this.owner = null
    if (owner?.source === this.player.getSnapshot().source) this.player.cancelPreview()
    this.publish()
  }
  prepare = (
    clipId: string,
    change: (document: MoldaSceneDocument) => MoldaSceneDocument,
    origin: SceneAnimationEditOrigin | null = null,
  ) => {
    this.cancel()
    try {
      const before = this.editor.getState().content
      const current = this.player.getSnapshot()
      requireScene(
        current.source?.document === before &&
          current.source.clip.id === clipId &&
          !current.source.preview,
        'preview',
        'Escolha um movimento confirmado antes de ajustar o conjunto.',
      )
      requireScene(
        sameSceneContent(before, this.editor.getState().saveSnapshot()),
        'preview',
        'Conclua o ajuste em andamento primeiro.',
      )
      const after = change(before)
      requireScene(
        sameSceneContent(before, { ...after, animations: before.animations }),
        'preview',
        'Esta prévia só pode alterar movimentos.',
      )
      const clip = after.animations?.find((clip) => clip.id === clipId)
      requireScene(clip, 'clip', 'O movimento não existe mais.')
      this.player.setPreview(before, clip)
      const source = this.player.getSnapshot().source
      requireScene(
        source?.preview && source.document === before && source.clip.id === clipId,
        'preview',
        'A prévia foi interrompida. Escolha o movimento novamente.',
      )
      this.owner = { before, after, source, origin }
      this.player.seek(Math.min(current.time, clip.duration))
      this.publish()
      return true
    } catch (error) {
      this.cancel()
      this.publish(
        error instanceof Error ? error.message : 'Não foi possível preparar este ajuste.',
        origin,
      )
      return false
    }
  }
  confirm = () => {
    const owner = this.owner
    if (
      !owner ||
      owner.before !== this.editor.getState().content ||
      owner.source !== this.player.getSnapshot().source ||
      this.player.getSnapshot().error
    )
      return false
    const time = this.player.getSnapshot().time
    this.owner = null
    this.player.cancelPreview()
    this.editor.getState().commit(keepSceneThumb(owner.after, this.editor.getState().asset))
    const committed = this.editor.getState().content
    if (!sameSceneContent(owner.after, committed)) {
      this.publish(
        this.editor.getState().saveError ??
          'O ajuste não foi aplicado. Confira o espaço da criação.',
        owner.origin,
      )
      return false
    }
    this.player.setClip(committed, owner.source.clip.id)
    this.player.seek(Math.min(time, owner.source.clip.duration))
    this.publish()
    return true
  }
}
