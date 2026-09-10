import type { SceneImage, SceneImageFlipbook } from '../scene/document'
import { readSceneImageFlipbook, sampleSceneFlipbook } from '../scene/imageFlipbook'
import { number } from '../scene/validation'
import type { PlaybackClock } from './playbackClock'

interface Source {
  imageId: string
  width: number
  height: number
  flipbook: SceneImageFlipbook
}
export interface SceneFlipbookSnapshot {
  source: Source | null
  step: number
  playing: boolean
}

/** One session clock, no editor writes and no image bytes. Only step changes notify consumers. */
export class SceneFlipbookPlayer {
  private snapshot: SceneFlipbookSnapshot = { source: null, step: 0, playing: false }
  private readonly listeners = new Set<() => void>()
  private pending: number | null = null
  private generation = 0
  private elapsed = 0
  private startStep = 0
  private startedAt = 0

  constructor(private readonly clock: PlaybackClock) {}

  getSnapshot = () => this.snapshot
  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }
  private publish(next: SceneFlipbookSnapshot) {
    const before = this.snapshot
    if (
      before.source === next.source &&
      before.step === next.step &&
      before.playing === next.playing
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
  setImage(image: SceneImage | null) {
    const before = this.snapshot.source
    const flipbook = image?.flipbook
    if (
      image &&
      flipbook &&
      before?.imageId === image.id &&
      before.flipbook === flipbook &&
      before.width === image.width &&
      before.height === image.height
    )
      return
    if (image && flipbook) readSceneImageFlipbook(flipbook, image)
    this.cancel()
    this.elapsed = 0
    this.startStep = 0
    this.publish({
      source:
        image && flipbook
          ? { imageId: image.id, width: image.width, height: image.height, flipbook }
          : null,
      step: 0,
      playing: false,
    })
  }
  seek(step: number) {
    const source = this.snapshot.source
    if (!source) return
    number(step, 'step', 0, source.flipbook.frames.length - 1, true)
    this.cancel()
    this.elapsed = 0
    this.startStep = step
    this.publish({ source, step, playing: false })
  }
  pause = () => {
    if (!this.snapshot.playing) return
    this.cancel()
    this.elapsed += Math.max(0, this.clock.now() - this.startedAt) / 1000
    const sampled = sampleSceneFlipbook(
      this.snapshot.source!.flipbook,
      this.elapsed,
      this.startStep,
    )
    this.publish({ ...this.snapshot, step: sampled.step, playing: false })
  }
  play() {
    const { source, playing } = this.snapshot
    if (!source || playing) return
    if (sampleSceneFlipbook(source.flipbook, this.elapsed, this.startStep).finished) {
      this.elapsed = 0
      this.startStep = 0
    }
    this.startedAt = this.clock.now()
    this.publish({
      source,
      step: sampleSceneFlipbook(source.flipbook, this.elapsed, this.startStep).step,
      playing: true,
    })
    this.schedule()
  }
  private schedule() {
    if (!this.snapshot.playing || this.pending !== null) return
    const generation = this.generation
    this.pending = this.clock.request(() => {
      if (generation !== this.generation || !this.snapshot.playing) return
      this.pending = null
      const source = this.snapshot.source!
      const seconds = this.elapsed + Math.max(0, this.clock.now() - this.startedAt) / 1000
      const sample = sampleSceneFlipbook(source.flipbook, seconds, this.startStep)
      if (sample.finished) this.elapsed = seconds
      this.publish({ source, step: sample.step, playing: !sample.finished })
      this.schedule()
    })
  }
}
