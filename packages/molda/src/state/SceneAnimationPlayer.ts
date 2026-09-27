import type { SceneAnimationClip } from '../scene/animation'
import type { MoldaSceneDocument } from '../scene/document'
import {
  prepareSceneAnimation,
  prepareSceneAnimationPreview,
  type SceneAnimationPose,
  sceneAnimationTime,
} from '../scene/sampleAnimation'
import { number } from '../scene/validation'
import type { PlaybackClock } from './playbackClock'

export interface SceneAnimationSnapshot {
  source: { document: MoldaSceneDocument; clip: SceneAnimationClip; preview?: true } | null
  pose: SceneAnimationPose | null
  time: number
  playing: boolean
  error: string | null
}
interface PreviewReturn {
  document: MoldaSceneDocument
  clipId: string
  time: number
}

/** One explicit session clock; never writes the editor and never queues more than one callback. */
export class SceneAnimationPlayer {
  private snapshot: SceneAnimationSnapshot = {
    source: null,
    pose: null,
    time: 0,
    playing: false,
    error: null,
  }
  private sampler: ReturnType<typeof prepareSceneAnimation> | null = null
  private readonly listeners = new Set<() => void>()
  private pending: number | null = null
  private generation = 0
  private startedAt = 0
  private startTime = 0
  private previewReturn: PreviewReturn | null = null

  constructor(private readonly clock: PlaybackClock) {}

  getSnapshot = () => this.snapshot
  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }
  private publish(next: SceneAnimationSnapshot) {
    const before = this.snapshot
    if (
      before.source === next.source &&
      before.time === next.time &&
      before.playing === next.playing &&
      before.pose === next.pose &&
      before.error === next.error
    )
      return
    this.snapshot = next
    for (const listener of this.listeners) listener()
  }
  private cancel() {
    this.generation++
    if (this.pending !== null) this.clock.cancel(this.pending)
    this.pending = null
  }
  private seconds() {
    return this.startTime + Math.max(0, this.clock.now() - this.startedAt) / 1000
  }
  private show(seconds: number, loop: boolean, playing: boolean) {
    const source = this.snapshot.source
    if (!source || !this.sampler) return
    let pose: SceneAnimationPose
    try {
      const time = sceneAnimationTime({ duration: source.clip.duration, loop }, seconds)
      pose =
        this.snapshot.pose?.time === time ? this.snapshot.pose : this.sampler.sample(time, false)
    } catch (error) {
      this.reportError(error)
      return
    }
    this.publish({ source, pose, time: pose.time, playing, error: null })
  }

  /** A revision edit pauses and retains a bounded cursor; replacing a creation/clip starts at zero. */
  setClip(document: MoldaSceneDocument | null, clipId: string | null) {
    const before = this.snapshot.source
    if (
      document &&
      clipId &&
      before?.document === document &&
      before.clip.id === clipId &&
      !before.preview
    )
      return
    const sampler = document && clipId ? prepareSceneAnimation(document, clipId) : null
    const time =
      sampler &&
      before &&
      !before.preview &&
      before.document.id === document?.id &&
      before.clip.id === clipId
        ? Math.min(this.snapshot.time, sampler.clip.duration)
        : 0
    this.install(sampler, time)
  }

  /** Preview a candidate without replacing the editor document, writing autosave, or adding history. */
  setPreview(document: MoldaSceneDocument, clip: SceneAnimationClip) {
    const sampler = prepareSceneAnimationPreview(document, clip)
    const { source, time, playing } = this.snapshot
    const previous =
      source?.document === document
        ? source.preview
          ? this.previewReturn
          : {
              document,
              clipId: source.clip.id,
              time: playing ? sceneAnimationTime(source.clip, this.seconds()) : time,
            }
        : null
    this.install(sampler, 0, previous)
  }

  cancelPreview = () => {
    if (!this.snapshot.source?.preview) return
    const previous = this.previewReturn
    try {
      this.setClip(previous?.document ?? null, previous?.clipId ?? null)
      const source = this.snapshot.source
      if (
        previous &&
        source?.document === previous.document &&
        source.clip.id === previous.clipId &&
        !source.preview
      )
        this.seek(previous.time)
    } catch (error) {
      this.setClip(null, null)
      this.reportError(error)
    }
  }

  private install(
    sampler: ReturnType<typeof prepareSceneAnimation> | null,
    time: number,
    preview?: PreviewReturn | null,
  ) {
    // Prepare before cancelling the previous session; invalid explicit input is atomic.
    const pose = sampler?.sample(time, false) ?? null
    this.cancel()
    this.sampler = sampler
    this.startTime = time
    this.previewReturn = preview ?? null
    this.publish({
      source: sampler
        ? {
            document: sampler.source,
            clip: sampler.clip,
            ...(preview !== undefined ? { preview: true as const } : {}),
          }
        : null,
      pose,
      time,
      playing: false,
      error: null,
    })
  }
  seek = (seconds: number) => {
    const source = this.snapshot.source
    if (!source) return
    number(seconds, 'time', 0, source.clip.duration)
    this.cancel()
    this.show(seconds, false, false)
  }
  /** Render-boundary failures also stop scheduling and remain visible to the controls. */
  reportError(error: unknown) {
    this.cancel()
    this.publish({
      ...this.snapshot,
      playing: false,
      error: error instanceof Error ? error.message : 'Não foi possível mostrar essa pose.',
    })
  }
  pause = () => {
    if (!this.snapshot.playing) return
    const seconds = this.seconds()
    this.cancel()
    this.show(seconds, this.snapshot.source!.clip.loop, false)
  }
  play() {
    const { source, playing, time } = this.snapshot
    if (!source || playing) return
    this.startTime = time >= source.clip.duration ? 0 : time
    this.startedAt = this.clock.now()
    this.show(this.startTime, source.clip.loop, true)
    this.schedule()
  }
  private schedule() {
    if (!this.snapshot.playing || this.pending !== null) return
    const generation = this.generation
    this.pending = this.clock.request(() => {
      if (generation !== this.generation || !this.snapshot.playing) return
      this.pending = null
      const source = this.snapshot.source!
      const seconds = this.seconds()
      this.show(seconds, source.clip.loop, source.clip.loop || seconds < source.clip.duration)
      this.schedule()
    })
  }
}
