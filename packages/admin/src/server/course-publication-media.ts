import 'server-only'
import {
  CoursePublicationMediaResultSchema,
  type CoursePublicationMediaTask,
  CoursePublicationMediaTaskSchema,
} from '@sistemazero/core/course/publication'
import { chaveDeVoz } from '@sistemazero/core/learning/scene'
import { getVideo } from './vimeo'
import { gerarVozes } from './voz-zappy'
import { extractZappySourceContent } from './zappy-knowledge'

/** One bounded resource per call, using the same provider configuration as the authoring UI. */
export async function executeCoursePublicationMedia(task: CoursePublicationMediaTask) {
  task = CoursePublicationMediaTaskSchema.parse(task)
  if (task.kind === 'voice') {
    const result = await gerarVozes([{ speechText: task.speechText, visibleText: task.speechText }])
    const key = chaveDeVoz(task.speechText)
    const url = result.vozes[key]
    if (!url) throw new Error('Não foi possível preparar esta fala do Zappy')
    const response = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(20_000) })
    if (!response.ok || !response.headers.get('content-type')?.startsWith('audio/'))
      throw new Error('O áudio preparado do Zappy não está acessível')
    return CoursePublicationMediaResultSchema.parse({
      kind: 'voice',
      key,
      url,
      generated: result.geradas > 0,
    })
  }
  if (task.kind === 'video') {
    const result = await getVideo(task.videoId)
    if (result.status !== 'available') throw new Error('O vídeo ainda não está disponível no Vimeo')
    return CoursePublicationMediaResultSchema.parse({ kind: 'video', videoId: task.videoId })
  }
  const content =
    task.extraction.kind === 'text'
      ? task.extraction.content
      : await extractZappySourceContent(task.extraction)
  return CoursePublicationMediaResultSchema.parse({
    kind: 'knowledge',
    sourceRef: task.sourceRef,
    sourceType: task.sourceType,
    content,
  })
}
