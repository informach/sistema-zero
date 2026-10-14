import { ValidationError } from '@sistemazero/core/errors'
import type { LiveRecordingVimeo } from '@sistemazero/core/live'

/** Uma aula tem no máximo 60 partes (`validateLessonSections`); o relato da criança também. */
export const LIVE_SECTIONS_MAX = 60

const VIMEO_STATUSES = new Set<LiveRecordingVimeo['status']>(['processing', 'ready', 'failed'])

/**
 * A gravação no Vimeo, validada de forma estrita: o player só abre
 * `https://player.vimeo.com/video/<id>` do MESMO vídeo, com no máximo o `h=<hash>` de
 * privacidade que o Vimeo acrescenta aos vídeos não listados. Nada de outro host, porta,
 * credencial, fragmento ou parâmetro: a URL vai parar num iframe na tela da criança.
 */
export function liveVimeoRecording(input: {
  videoId: string
  embedUrl: string
  status: string
}): LiveRecordingVimeo {
  const videoId = input.videoId
  if (!/^\d{1,20}$/.test(videoId)) throw new ValidationError('Vídeo do Vimeo inválido.')
  if (!VIMEO_STATUSES.has(input.status as LiveRecordingVimeo['status']))
    throw new ValidationError('Estado do vídeo do Vimeo inválido.')
  let url: URL
  try {
    url = new URL(input.embedUrl)
  } catch {
    throw new ValidationError('Endereço do vídeo do Vimeo inválido.')
  }
  const params = [...url.searchParams.keys()]
  if (
    input.embedUrl.length > 300 ||
    url.protocol !== 'https:' ||
    url.hostname !== 'player.vimeo.com' ||
    url.port !== '' ||
    url.username !== '' ||
    url.password !== '' ||
    url.hash !== '' ||
    url.pathname !== `/video/${videoId}` ||
    params.some((key) => key !== 'h') ||
    params.length > 1 ||
    (params.length === 1 && !/^[\da-f]{1,40}$/i.test(url.searchParams.get('h') ?? ''))
  )
    throw new ValidationError(
      'Use o endereço do player do Vimeo deste vídeo (https://player.vimeo.com/video/<id>).',
    )
  return {
    videoId,
    embedUrl: url.toString(),
    status: input.status as LiveRecordingVimeo['status'],
  }
}

/**
 * A chave do projeto ao vivo por bloco: o curso + o `chain` do bloco Estúdio (o mesmo projeto
 * atravessa as aulas da cadeia) ou o curso + o id do bloco sem chain. A criança entra na busca
 * pela coluna `learner_id`.
 */
export function liveProjectKey(courseId: string, block: { blockId: string; chain: string | null }) {
  return block.chain
    ? `course:${courseId}:chain:${block.chain}`
    : `course:${courseId}:block:${block.blockId}`
}
