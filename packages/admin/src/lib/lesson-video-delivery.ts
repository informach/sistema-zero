import type { LessonVideoDeliveryReceipt } from '../components/media/lesson-video-uploads'
import type { ReadyVideo } from '../components/media/use-video-upload'
import type { BlockForm } from './lesson-block-form'
import type { LessonDraftSession } from './lesson-draft-session'
import type { LessonFormBuffer, LessonFormSnapshot } from './lesson-form-buffer'
import { buildLessonFormContent } from './lesson-form-content'
import type { LessonBlockContent, VideoBlock } from './types'

export function mergeLessonVideoContent(current: VideoBlock, video: ReadyVideo): VideoBlock {
  const same = current.src === video.embedUrl
  const captions = video.captions.length ? video.captions : same ? current.captions : undefined
  return {
    ...current,
    provider: 'vimeo',
    src: video.embedUrl,
    posterUrl: same ? current.posterUrl : undefined,
    durationSeconds: video.durationSeconds ?? (same ? current.durationSeconds : undefined),
    captions: captions?.map((caption) => ({ ...caption })),
  }
}

function mergeLessonVideoForm(
  current: LessonFormSnapshot<BlockForm>,
  video: ReadyVideo,
): LessonFormSnapshot<BlockForm> {
  const same = current.src === video.embedUrl
  return {
    ...current,
    provider: 'vimeo',
    src: video.embedUrl,
    posterUrl: same ? current.posterUrl : '',
    durationSeconds:
      video.durationSeconds == null
        ? same
          ? current.durationSeconds
          : ''
        : String(video.durationSeconds),
    captions: video.captions.length
      ? video.captions.map((caption) => ({ ...caption }))
      : same
        ? current.captions
        : [],
  }
}

export function applyLessonVideoDelivery({
  session,
  blockId,
  video,
  receipt,
  currentOpening,
}: {
  session: LessonDraftSession<LessonBlockContent>
  blockId: string
  video: ReadyVideo
  receipt: LessonVideoDeliveryReceipt
  /** Read the owner slot now; never capture a React render's form pointer here. */
  currentOpening: () => LessonFormBuffer<BlockForm> | null
}): boolean {
  const relevant = () => session.canEdit() && receipt.isCurrent()
  if (!relevant()) return false
  const currentBlock = () =>
    session.getSnapshot().draft?.document.blocks.find((block) => block.id === blockId)
  if (currentBlock()?.content.kind !== 'video') return false
  const candidateOpening = currentOpening()
  const opening = candidateOpening?.targetId === blockId ? candidateOpening : null
  const sameOpening = () => {
    const now = currentOpening()
    return opening ? now === opening && opening.isCurrent() : now?.targetId !== blockId
  }
  if (opening) {
    if (!opening.isCurrent() || opening.getSnapshot().kind !== 'video') return false
    if (!opening.update((form) => mergeLessonVideoForm(form, video))) return false
  }
  if (!relevant() || !sameOpening()) return false
  const block = currentBlock()
  if (block?.content.kind !== 'video') return false
  const content = opening
    ? buildLessonFormContent(opening, { kind: 'none' }, block.content)
    : mergeLessonVideoContent(block.content, video)
  if (!relevant() || !sameOpening()) return false
  if (!session.enqueue({ type: 'block', block: { id: blockId, content } }, true)) return false
  if (!relevant() || !sameOpening()) return false

  const document = session.getSnapshot().draft?.document
  const freshBlock = document?.blocks.find((item) => item.id === blockId)
  if (
    !document ||
    freshBlock?.content.kind !== 'video' ||
    freshBlock.content.src !== video.embedUrl
  )
    return false
  const planned = document.plannedVideos
  const plannedVideos = planned.some((entry) => entry.blockId === blockId)
    ? planned.map((entry) =>
        entry.blockId === blockId ? { ...entry, videoId: video.vimeoVideoId } : entry,
      )
    : [...planned, { blockId, instructions: '', videoId: video.vimeoVideoId }]
  if (!session.enqueue({ type: 'planned-videos', plannedVideos }, true)) return false
  if (!relevant() || !sameOpening()) return false
  // Both enqueues notify synchronous subscribers. Confirm only the promised effects,
  // preserving editorial changes instead of sending our earlier content again.
  const appliedDocument = session.getSnapshot().draft?.document
  const appliedBlock = appliedDocument?.blocks.find((item) => item.id === blockId)
  if (
    appliedBlock?.content.kind !== 'video' ||
    appliedBlock.content.src !== video.embedUrl ||
    !appliedDocument?.plannedVideos.some(
      (entry) => entry.blockId === blockId && entry.videoId === video.vimeoVideoId,
    )
  )
    return false
  if (opening) {
    const form = opening.getSnapshot()
    if (form.kind !== 'video' || form.src !== video.embedUrl) return false
  }
  return receipt.acknowledge()
}
