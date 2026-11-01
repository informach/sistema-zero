import { inventoryCourseMedia } from '@sistemazero/core/course/publication-media'
import { chaveDeVoz } from '@sistemazero/core/learning/scene'
import { type Snapshot, sourceHash } from '../../members/scripts/course-audience-sync/plan'
import { getEnv } from '../src/lib/env'
import { falasDaAula } from '../src/lib/voz-zappy-aula'
import { MAX_TEXTOS_POR_PEDIDO } from '../src/lib/voz-zappy-limites'
import { getVideo } from '../src/server/vimeo'
import { gerarVozes } from '../src/server/voz-zappy'

/** Runs only in the Admin service. Credentials never leave its process. */
export async function run(snapshot: Snapshot) {
  if (
    !['staging', 'production'].includes(snapshot.environment) ||
    process.env.RAILWAY_ENVIRONMENT_NAME !== snapshot.environment ||
    process.env.RAILWAY_SERVICE_NAME !== 'admin'
  )
    throw new Error('Ambiente ou serviço de mídia incorreto')
  const env = getEnv()
  const inventory = inventoryCourseMedia(
    {
      course: snapshot.source.course,
      modules: snapshot.source.modules,
      lessons: snapshot.source.lessons.map((lesson) => ({
        published: lesson.published,
        plannedVideos: lesson.draft?.document.plannedVideos ?? [],
      })),
    },
    {
      publicBaseUrl: env.R2_PUBLIC_URL ?? '',
      publicBucket: env.R2_BUCKET ?? '',
      privateBucket: env.R2_PRIVATE_BUCKET ?? '',
    },
  )
  const blocks = snapshot.source.lessons.flatMap((l) => l.published.blocks)
  const videoIds = [
    ...new Set(
      blocks.flatMap((b) => {
        if (b.content.kind !== 'video') return []
        const url = new URL(String(b.content.src))
        if (
          url.protocol !== 'https:' ||
          url.hostname !== 'player.vimeo.com' ||
          !/^\/video\/[0-9]+$/.test(url.pathname)
        )
          throw new Error('Vídeo fora do contrato Vimeo')
        return [url.pathname.slice('/video/'.length)]
      }),
    ),
  ]
  const readyVideoIds: string[] = []
  for (const id of videoIds) {
    const video = await getVideo(id)
    if (video.status !== 'available') throw new Error(`Vídeo ${id} ainda não está pronto no Vimeo`)
    readyVideoIds.push(id)
  }
  const speeches = falasDaAula(blocks as Parameters<typeof falasDaAula>[0])
  const unique = [
    ...new Map(speeches.flatMap((b) => b.falas).map((f) => [chaveDeVoz(f.speechText), f])).values(),
  ]
  const dictionary: Record<string, string> = {}
  let generated = 0
  let reused = 0
  for (let offset = 0; offset < unique.length; offset += MAX_TEXTOS_POR_PEDIDO) {
    const result = await gerarVozes(unique.slice(offset, offset + MAX_TEXTOS_POR_PEDIDO))
    generated += result.geradas
    reused += result.reaproveitadas
    Object.assign(dictionary, result.vozes)
  }
  const voices: Record<string, Record<string, string>> = {}
  for (const block of speeches) {
    const entries = block.falas.map((f) => {
      const key = chaveDeVoz(f.speechText)
      const url = dictionary[key]
      if (!url) throw new Error(`Faltou voz do Zappy no bloco ${block.id}`)
      return [key, url]
    })
    voices[block.id] = Object.fromEntries(entries)
  }
  // R2 HEAD from the official generator confirms existence, HTTP checks confirm delivery.
  for (const url of new Set(Object.values(dictionary))) {
    const response = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(20_000) })
    if (!response.ok || !response.headers.get('content-type')?.startsWith('audio/'))
      throw new Error('O áudio do Zappy não está acessível')
  }
  return {
    environment: snapshot.environment,
    sourceHash: sourceHash(snapshot),
    checkedAt: new Date().toISOString(),
    readyVideoIds,
    voices,
    generated,
    reused,
    inventory,
  }
}
