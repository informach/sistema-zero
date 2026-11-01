import { createHash } from 'node:crypto'
import {
  type CoursePublicationMediaPlan,
  CoursePublicationMediaPlanSchema,
  type CoursePublicationMediaTask,
} from '@sistemazero/core/course/publication'
import type { LessonDraftDocument } from '@sistemazero/core/learning'
import { chaveDeVoz } from '@sistemazero/core/learning/scene'
import { zappyVimeoVideoId } from '@sistemazero/core/zappy'
import { falasDaAula } from './voz-zappy-aula'

/** Pure planning: no synthesis, downloads, course writes or provider calls. */
export function planCoursePublicationMedia(
  documents: readonly LessonDraftDocument[],
  profileHash: string,
): CoursePublicationMediaPlan {
  const tasks = new Map<string, CoursePublicationMediaTask>()
  const voices: CoursePublicationMediaPlan['voices'] = {}
  const add = (input: CoursePublicationMediaTask, identity = JSON.stringify(input)) => {
    const id = `${input.kind}:${createHash('sha256').update(identity).digest('hex')}`
    tasks.set(id, input)
    return id
  }
  for (const document of documents) {
    const blocks = document.blocks as Parameters<typeof falasDaAula>[0]
    for (const speech of falasDaAula(blocks)) {
      voices[speech.id] = [
        ...new Set(
          speech.falas.map((fala) =>
            add({ kind: 'voice', speechText: fala.speechText }, chaveDeVoz(fala.speechText)),
          ),
        ),
      ]
    }
    for (const block of blocks) {
      const content = block.content
      if (content.kind === 'dialogue' || content.kind === 'rich_text') {
        add({
          kind: 'knowledge',
          sourceRef: `block:${block.id}`,
          sourceType: 'rich-text',
          extraction: {
            kind: 'text',
            content:
              content.kind === 'dialogue' ? content.text : (content.markdown ?? content.html ?? ''),
          },
        })
      } else if (content.kind === 'video') {
        const videoId = zappyVimeoVideoId(content.provider, content.src)
        if (!videoId) throw new Error('A publicação exige vídeo Vimeo com identidade válida')
        add({ kind: 'video', videoId })
        const location = content.captions?.[0]?.url
        add({
          kind: 'knowledge',
          sourceRef: `block:${block.id}`,
          sourceType: 'video-vtt',
          extraction: location ? { kind: 'stable-vtt', location } : { kind: 'vimeo', videoId },
        })
      }
    }
    for (const attachment of document.attachments) {
      if (attachment.zappyStudentNotebook)
        add({
          kind: 'knowledge',
          sourceRef: `attachment:${attachment.id}`,
          sourceType: 'student-notebook',
          extraction: { kind: 'private-pdf', location: attachment.url },
        })
    }
  }
  return CoursePublicationMediaPlanSchema.parse({
    profileHash,
    tasks: [...tasks].map(([id, input]) => ({ id, input })),
    voices,
  })
}
