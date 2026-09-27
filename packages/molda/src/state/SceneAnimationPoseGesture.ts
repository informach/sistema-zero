import { COPY } from '../core/copy'
import type { Vec3 } from '../core/model'
import { setSceneAnimationKeys } from '../scene/animationKeyBatch'
import {
  pasteSceneAnimationPoseSet,
  type SceneAnimationPosePair,
  type SceneAnimationPoseSet,
} from '../scene/animationPoseSet'
import {
  prepareSceneAnimationPoseTransform,
  type SceneAnimationPoseFrame,
} from '../scene/animationPoseTransform'
import type { MoldaSceneDocument } from '../scene/document'
import type { AffineMatrix } from '../scene/matrix'
import { prepareSceneAnimation, type SceneAnimationPose } from '../scene/sampleAnimation'
import { prepareSceneTwoBonePose, type SceneTwoBonePoseFrame } from '../scene/twoBonePose'
import { requireScene, SceneValidationError, tuple } from '../scene/validation'
import type { EditorStore } from './editorStore'
import type { SceneAnimationPlayer, SceneAnimationSnapshot } from './SceneAnimationPlayer'

export interface SceneAnimationPoseGestureSnapshot {
  kind: PoseOwner['kind'] | null
  pose: SceneAnimationPose | null
  pending: boolean
  dragging: boolean
  autoKey: boolean
  error: string | null
  reach: SceneTwoBonePoseFrame['reach'] | null
}
interface PoseOwnerContext {
  source: NonNullable<SceneAnimationSnapshot['source']>
  revision: number
  time: number
}
interface TransformOwner extends PoseOwnerContext {
  kind: 'transform'
  selection: string
  prepared: ReturnType<typeof prepareSceneAnimationPoseTransform>
  frame: SceneAnimationPoseFrame
}
interface TwoBoneOwner extends PoseOwnerContext {
  kind: 'two-bone'
  chain: readonly [string, string, string]
  prepared: ReturnType<typeof prepareSceneTwoBonePose>
  frame: SceneTwoBonePoseFrame
  drag?: { seed: SceneTwoBonePoseFrame }
}
interface PoseSetOwner extends PoseOwnerContext {
  kind: 'pose-set'
  next: MoldaSceneDocument
}
type PoseOwner = TransformOwner | TwoBoneOwner | PoseSetOwner

/** Session-only pose drafts. No editor replacement/autosave until one explicit or opt-in commit. */
export class SceneAnimationPoseGesture {
  private snapshot: SceneAnimationPoseGestureSnapshot = {
    kind: null,
    pose: null,
    pending: false,
    dragging: false,
    autoKey: false,
    error: null,
    reach: null,
  }
  private owner: PoseOwner | null = null
  private seed: SceneAnimationPoseFrame | null = null
  private generation = 0
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
  private publish(next: Omit<SceneAnimationPoseGestureSnapshot, 'kind'>) {
    const before = this.snapshot
    const kind = this.owner?.kind ?? null
    if (
      before.kind === kind &&
      before.pose === next.pose &&
      before.pending === next.pending &&
      before.dragging === next.dragging &&
      before.autoKey === next.autoKey &&
      before.error === next.error &&
      before.reach === next.reach
    )
      return
    this.snapshot = { ...next, kind }
    for (const listener of this.listeners) listener()
  }
  private current(owner: PoseOwnerContext) {
    const state = this.editor.getState(),
      snapshot = this.player.getSnapshot()
    return (
      state.content === owner.source.document &&
      state.contentRevision === owner.revision &&
      snapshot.source === owner.source &&
      snapshot.time === owner.time &&
      !snapshot.playing &&
      !snapshot.error
    )
  }
  /** Reversible subscription lifecycle, including React StrictMode remounts. */
  connect() {
    const check = () => {
      if (this.owner && !this.current(this.owner)) this.cancel()
    }
    const offEditor = this.editor.subscribe(check),
      offPlayer = this.player.subscribe(check)
    check()
    return () => {
      offEditor()
      offPlayer()
      this.cancel()
    }
  }
  setAutoKey = (autoKey: boolean) => {
    // Choosing this option never silently records an already pending pose.
    if (this.snapshot.pending || this.snapshot.dragging) return
    this.publish({ ...this.snapshot, autoKey })
  }
  cancel = () => {
    const ticket = this.release()
    this.publish({
      ...this.snapshot,
      pose: null,
      pending: false,
      dragging: false,
      error: null,
      reach: null,
    })
    return ticket
  }
  private release() {
    const owner = this.owner
    this.owner = null
    this.seed = null
    if (owner?.kind === 'two-bone') owner.prepared.cancel()
    return ++this.generation
  }
  reportError = (error: unknown) => {
    this.release()
    this.publish({
      ...this.snapshot,
      pose: null,
      pending: false,
      dragging: false,
      error: error instanceof SceneValidationError ? error.message : COPY.scene.animationPoseFailed,
      reach: null,
    })
  }
  begin(ids: readonly string[]): boolean {
    // A pending assisted pose has explicit record/cancel controls; handles cannot silently replace it.
    if (this.owner && this.owner.kind !== 'transform') return false
    let ticket = this.generation
    if (this.seed) this.end(false)
    if (this.generation !== ticket) return false
    this.player.pause()
    if (this.generation !== ticket) return false
    const { source, time, error } = this.player.getSnapshot()
    const state = this.editor.getState()
    if (!source || source.preview || error || source.document !== state.content) return false
    const selection = JSON.stringify([...new Set(ids)].sort())
    if (this.owner && (!this.current(this.owner) || selection !== this.owner.selection)) {
      ticket = this.cancel()
      if (this.generation !== ticket) return false
    }
    try {
      if (!this.owner) {
        const prepared = prepareSceneAnimationPoseTransform(
          state.content,
          source.clip.id,
          ids,
          time,
        )
        const owner: TransformOwner = {
          kind: 'transform',
          source,
          time,
          selection,
          revision: state.contentRevision,
          prepared,
          frame: prepared.original,
        }
        // Selection cancellation can synchronously seek/change the source before preparation.
        if (!this.current(owner)) return false
        this.owner = owner
        this.generation++
      }
      const owner = this.owner
      this.seed = owner.frame
      this.publish({ ...this.snapshot, pose: owner.frame.pose, dragging: true, error: null })
      return this.owner === owner && this.seed !== null && this.current(owner)
    } catch (error) {
      this.reportError(error)
      return false
    }
  }
  /** A mapped clipboard candidate shares record/cancel, but never the direct-drag/autokey path. */
  beginPoseSet(
    input: SceneAnimationPoseSet,
    pairs: readonly SceneAnimationPosePair[],
    mirror?: 'x' | 'y' | 'z',
  ) {
    const ticket = this.cancel()
    if (this.generation !== ticket) return null
    this.player.pause()
    if (this.generation !== ticket) return null
    const { source, time, error } = this.player.getSnapshot(),
      state = this.editor.getState()
    if (!source || source.preview || error || source.document !== state.content) return null
    try {
      const next = pasteSceneAnimationPoseSet(
        state.content,
        source.clip.id,
        time,
        input,
        pairs,
        mirror,
      )
      const pose = prepareSceneAnimation(next, source.clip.id).sample(time, false)
      const owner: PoseSetOwner = {
        kind: 'pose-set',
        source,
        time,
        revision: state.contentRevision,
        next,
      }
      if (this.generation !== ticket || !this.current(owner)) return null
      this.owner = owner
      this.generation++
      this.publish({
        ...this.snapshot,
        pose: { ...pose, source: source.document },
        pending: next !== source.document,
        dragging: false,
        error: null,
        reach: null,
      })
      if (this.owner !== owner || !this.current(owner)) return null
      return {
        isCurrent: () => this.owner === owner && this.current(owner),
        record: () => this.owner === owner && this.record(),
        cancel: () => {
          if (this.owner === owner) this.cancel()
        },
      }
    } catch (error) {
      if (this.generation === ticket) this.reportError(error)
      return null
    }
  }
  /** One revocable input handle per assisted pose; automatic recording belongs only to direct drags. */
  beginTwoBone(chain: readonly [string, string, string]) {
    const ticket = this.cancel()
    if (this.generation !== ticket) return null
    this.player.pause()
    if (this.generation !== ticket) return null
    const { source, time, error } = this.player.getSnapshot(),
      state = this.editor.getState()
    if (!source || source.preview || error || source.document !== state.content) return null
    try {
      const prepared = prepareSceneTwoBonePose(state.content, source.clip.id, chain, time),
        owner: TwoBoneOwner = {
          kind: 'two-bone',
          source,
          time,
          chain: [...chain],
          revision: state.contentRevision,
          prepared,
          frame: prepared.original,
        }
      this.owner = owner
      this.generation++
      this.publish({
        ...this.snapshot,
        pose: owner.frame.pose,
        pending: false,
        dragging: false,
        error: null,
        reach: owner.frame.reach,
      })
      if (this.owner !== owner || !this.current(owner)) return null
      return {
        original: owner.frame.pose,
        isCurrent: () => this.owner === owner && this.current(owner),
        reset: () => {
          if (this.owner !== owner || !this.current(owner)) return false
          owner.drag = undefined
          owner.frame = prepared.original
          this.publish({
            ...this.snapshot,
            pose: owner.frame.pose,
            pending: false,
            dragging: false,
            error: null,
            reach: null,
          })
          return this.owner === owner && this.current(owner)
        },
        sample: (target: Vec3, hint?: Vec3): boolean => {
          if (this.owner !== owner || owner.drag) return false
          if (!this.current(owner)) {
            this.cancel()
            return false
          }
          try {
            const frame = prepared.sample(target, hint),
              pending = prepared.keys(frame).length > 0
            owner.frame = frame
            this.publish({
              ...this.snapshot,
              pose: frame.pose,
              pending,
              dragging: false,
              error: null,
              reach: frame.reach,
            })
            return this.owner === owner && this.current(owner)
          } catch (error) {
            if (this.owner === owner) this.reportError(error)
            return false
          }
        },
        record: () => this.owner === owner && this.record(),
        cancel: () => {
          if (this.owner === owner) this.cancel()
        },
      }
    } catch (error) {
      if (this.generation === ticket) this.reportError(error)
      return null
    }
  }
  /** Captures one translation of the requested destination, not of the constrained endpoint. */
  beginTwoBoneDrag(ids: readonly string[]) {
    const owner = this.owner
    if (
      owner?.kind !== 'two-bone' ||
      owner.drag ||
      !owner.frame.pose.twoBoneGuide ||
      ids.length !== 1 ||
      ids[0] !== owner.chain[2] ||
      !this.current(owner)
    )
      return null
    const drag = { seed: owner.frame },
      current = () => this.owner === owner && owner.drag === drag && this.current(owner),
      stale = () => {
        if (this.owner === owner && owner.drag === drag) this.cancel()
      }
    owner.drag = drag
    this.publish({ ...this.snapshot, dragging: true })
    if (!current()) return null
    return {
      preview: (input: AffineMatrix): boolean => {
        if (!current()) {
          stale()
          return false
        }
        try {
          const delta = tuple(input, 16, 'delta')
          requireScene(
            delta.every((value, i) => (i >= 12 && i <= 14) || value === (i % 5 === 0 ? 1 : 0)),
            'delta',
            'Use apenas as alças de Mover para ajustar esse destino.',
          )
          owner.frame = owner.prepared.translate(drag.seed, [delta[12]!, delta[13]!, delta[14]!])
          this.publish({
            ...this.snapshot,
            pose: owner.frame.pose,
            pending: owner.prepared.keys(owner.frame).length > 0,
            dragging: true,
            error: null,
            reach: owner.frame.reach,
          })
          return current()
        } catch (error) {
          if (this.owner === owner && owner.drag === drag) this.reportError(error)
          return false
        }
      },
      end: (commit: boolean) => {
        if (!current()) {
          stale()
          return
        }
        owner.drag = undefined
        if (!commit) owner.frame = drag.seed
        this.publish({
          ...this.snapshot,
          pose: owner.frame.pose,
          pending: owner.prepared.keys(owner.frame).length > 0,
          dragging: false,
          error: null,
          reach: owner.frame.reach,
        })
      },
    }
  }
  /** Captured adapter shared by the existing gizmo; even late normal-pose input cannot retarget a new drag. */
  transformActions(ids: readonly string[]) {
    type Input = { preview(delta: AffineMatrix): boolean; end(commit: boolean): void }
    const selection = [...ids]
    let input: Input | null = null,
      generation = 0
    const begin = (): Input | null => {
      if (this.owner?.kind === 'two-bone') {
        if (this.owner.frame.pose.twoBoneGuide) return this.beginTwoBoneDrag(selection)
        // An edited form has withdrawn its target. A direct handle now starts ordinary posing.
        const ticket = this.cancel()
        if (ticket !== this.generation) return null
      }
      if (!this.begin(selection)) return null
      const owner = this.owner,
        seed = this.seed
      if (owner?.kind !== 'transform' || !seed) return null
      return {
        preview: (delta) => this.owner === owner && this.seed === seed && this.preview(delta),
        end: (commit) => {
          if (this.owner === owner && this.seed === seed) this.end(commit)
        },
      }
    }
    return {
      begin: () => {
        if (input) return false
        const ticket = ++generation,
          next = begin()
        if (ticket !== generation) {
          next?.end(false)
          return false
        }
        input = next
        return input !== null
      },
      preview: (delta: AffineMatrix) => input?.preview(delta) ?? false,
      end: (commit: boolean) => {
        generation++
        const previous = input
        input = null
        previous?.end(commit)
      },
    }
  }
  preview = (delta: AffineMatrix): boolean => {
    const owner = this.owner,
      seed = this.seed
    if (owner?.kind !== 'transform' || !seed) return false
    if (!this.current(owner)) {
      this.cancel()
      return false
    }
    try {
      const frame = owner.prepared.apply(seed, delta)
      const pending = owner.prepared.keys(frame).length > 0
      owner.frame = frame
      this.publish({ ...this.snapshot, pose: frame.pose, pending, error: null })
      return this.owner === owner && this.seed === seed && this.current(owner)
    } catch (error) {
      this.reportError(error)
      return false
    }
  }
  end = (commit: boolean) => {
    const owner = this.owner,
      seed = this.seed
    this.seed = null
    if (owner?.kind !== 'transform' || !seed) return
    if (!this.current(owner)) {
      this.cancel()
      return
    }
    if (!commit) owner.frame = seed
    const pending = owner.prepared.keys(owner.frame).length > 0
    if (!pending) {
      this.cancel()
      return
    }
    this.publish({ ...this.snapshot, pose: owner.frame.pose, pending, dragging: false })
    if (commit && this.snapshot.autoKey && this.owner === owner) this.record()
  }
  record = (): boolean => {
    const owner = this.owner
    if (
      !owner ||
      this.seed ||
      (owner.kind === 'two-bone' && owner.drag) ||
      !this.snapshot.pending ||
      this.snapshot.error
    )
      return false
    if (!this.current(owner)) {
      this.cancel()
      return false
    }
    let ticket = this.generation
    try {
      const next =
        owner.kind === 'pose-set'
          ? owner.next
          : owner.kind === 'two-bone'
            ? owner.prepared.commit(owner.frame, this.editor.getState().content)
            : setSceneAnimationKeys(
                owner.source.document,
                owner.source.clip.id,
                owner.prepared.keys(owner.frame),
              )
      ticket = this.cancel()
      if (this.generation !== ticket) return false
      // A subscriber can change the creation/clip while the preview is being removed.
      requireScene(this.current(owner), 'pose', COPY.scene.animationChanged)
      if (next !== owner.source.document) {
        const state = this.editor.getState()
        const recorded = { ...next }
        if (state.asset.thumb) recorded.thumb = state.asset.thumb
        else delete recorded.thumb
        state.commit(recorded)
      }
      return true
    } catch (error) {
      if (this.generation === ticket) this.reportError(error)
      return false
    }
  }
}
