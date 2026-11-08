import {
  type LessonLearningProgress,
  type SectionPendingItem,
  VIDEO_WATCH_THRESHOLD,
  videoWatchedFraction,
} from '@sistemazero/core/learning'
import { ehAtividadeDeSecao, type SplitBlock } from './lesson-split'
import { parseVimeo, youtubeId } from './video-ids'

/**
 * "Assistir ao vídeo antes da atividade" (03/10/2026): a régua de QUANDO a atividade da direita
 * fica trancada. Pura de propósito — quem desenha o aviso é o `LessonSections`, e o que a dona
 * sente na mão (trancou, abriu, voltou a trancar) é decidido aqui, com teste.
 *
 * Não é segurança: o members não confere nada disto. É guia de interface para quem está
 * começando, e a criança que já viu o vídeo uma vez nunca mais encontra a tranca.
 */

export type GateBlock = SplitBlock & { blockRevision?: string }

export type VideoGate = {
  /** A atividade da direita está trancada agora. */
  locked: boolean
  /** O vídeo que destranca (o PRIMEIRO da parte). `null` quando não há tranca possível. */
  videoBlockId: string | null
  /** Quanto do vídeo a criança já viu, de 0 a 1 (só os trechos assistidos de verdade). */
  watchedFraction: number
}

const ABERTA: VideoGate = { locked: false, videoBlockId: null, watchedFraction: 0 }

/**
 * Só o JOGO PRONTO e a EXPERIÊNCIA trancam (decisão da dona, 06/10/2026). Neles o vídeo mostra e
 * explica, e a criança precisa ouvir o porquê antes de brincar ou testar. No Estúdio e no Pinta o
 * vídeo é passo a passo, para montar JUNTO: trancar obrigava a ver tudo uma vez e depois de novo.
 * A prévia de livro e a entrega por galeria moram na direita, mas não são atividade.
 * ⚠️ Numa seção MISTA (editor + cena) a tranca vale e cobre o painel inteiro; hoje nenhum curso tem.
 */
const trancavel = (block: GateBlock): boolean => ehAtividadeDeSecao(block)

/**
 * Um vídeo que o `LessonVideo` desenha COM player (o mesmo critério dele). Um bloco de vídeo sem
 * `src`, ou com um link do YouTube/Vimeo que não se lê, vira o recado "Vídeo indisponível": como
 * "primeiro vídeo da parte" ele trancaria a atividade para sempre e roubaria o flutuante de um
 * vídeo bom logo abaixo (full review de 03/10/2026).
 */
export function isPlayableVideo(block: { kind: string; content?: unknown }): boolean {
  if (block.kind !== 'video' || typeof block.content !== 'object' || block.content === null)
    return false
  const { provider, src } = block.content as { provider?: unknown; src?: unknown }
  if (typeof src !== 'string' || !src) return false
  if (provider === 'youtube') return youtubeId(src) !== null
  if (provider === 'vimeo') return parseVimeo(src) !== null
  return true
}

/** O quanto já foi visto NESTE aparelho, antes de o servidor confirmar (ver `localWatched`). */
export type LocalWatched = Record<string, { revision: string; fraction: number }>

/**
 * A porcentagem do vídeo na faixa do rodapé anda junto com o vídeo (08/11/2026).
 *
 * Relato dela: a faixa dizia "você já viu 0%" o vídeo inteiro e só no fim pulava para concluído.
 * A frase vem do members (`pendingItems`), e a página só relê o progresso do servidor quando o
 * vídeo cruza os 90%: a gravação de 10 em 10 s não atualiza a aula. Aqui a porcentagem da frase
 * passa a ser a maior entre a guardada e a medida neste aparelho (`localWatched`).
 *
 * `videos` são os vídeos OBRIGATÓRIOS da parte, na ordem da aula (a mesma em que o core escreve os
 * itens). Itens e vídeos casam pela posição; se as contagens não batem (o members junta frases
 * iguais, e dois vídeos em 0% viram um item só), a faixa fica como veio do servidor.
 * Sem nada a trocar, devolve a MESMA lista.
 */
export function liveVideoPendingItems({
  items,
  videos,
  learningProgress,
  localWatched,
}: {
  items: readonly SectionPendingItem[]
  videos: readonly { id: string; blockRevision?: string }[]
  learningProgress: LessonLearningProgress | undefined
  localWatched: LocalWatched | undefined
}): readonly SectionPendingItem[] {
  const posicoes = items.flatMap((item, i) => (item.kind === 'VIDEO_GATE_NOT_WATCHED' ? [i] : []))
  if (posicoes.length === 0 || posicoes.length !== videos.length) return items
  let mudou = false
  const saida = items.slice()
  posicoes.forEach((posicao, n) => {
    const video = videos[n]
    const item = items[posicao]
    if (!video?.blockRevision || !item) return
    const saved = learningProgress?.blocks.find(
      (p) => p.blockId === video.id && p.revision === video.blockRevision,
    )
    const local = localWatched?.[video.id]
    const fraction = Math.max(
      saved ? videoWatchedFraction(saved.answers) : 0,
      local && local.revision === video.blockRevision ? local.fraction : 0,
    )
    const agora = Math.min(100, Math.floor(fraction * 100))
    const dito = /(\d+)\s*%/.exec(item.text)
    if (!dito || agora <= Number(dito[1])) return
    saida[posicao] = { ...item, text: item.text.replace(dito[0], `${agora}%`) }
    mudou = true
  })
  return mudou ? saida : items
}

export function videoGateFor({
  blocks,
  learningProgress,
  localWatched,
  enabled,
  sectionCompleted,
}: {
  /** Blocos ATIVOS da parte, na ordem dela. */
  blocks: GateBlock[]
  learningProgress: LessonLearningProgress | undefined
  /**
   * O que o player acabou de medir. Sem isto a tranca só abria quando a GRAVAÇÃO voltava do
   * servidor: com a rede falhando, quem viu o vídeo inteiro ficava trancada (full review). Também
   * é o que faz a pílula "Você já viu N%" andar junto com o vídeo.
   */
  localWatched?: LocalWatched
  /** O curso pediu e há player (a prévia e o ensaio do admin ficam sempre abertos). */
  enabled: boolean
  /**
   * A parte já fechou (ou a aula inteira). Quem terminou antes de a opção ser ligada não volta a
   * encontrar a atividade trancada ao revisitar.
   */
  sectionCompleted: boolean
}): VideoGate {
  if (!enabled || sectionCompleted) return ABERTA
  if (!blocks.some(trancavel)) return ABERTA
  // O primeiro vídeo que o progresso consegue acompanhar: sem revisão, nada é guardado e a
  // tranca nunca abriria.
  const video = blocks.find((b) => isPlayableVideo(b) && Boolean(b.blockRevision))
  if (!video) return ABERTA
  const saved = learningProgress?.blocks.find(
    (p) => p.blockId === video.id && p.revision === video.blockRevision,
  )
  const local = localWatched?.[video.id]
  // ⚠️ Revisão diferente = o vídeo foi trocado pela autora: a tranca volta, como o progresso.
  const watchedFraction = Math.max(
    saved ? videoWatchedFraction(saved.answers) : 0,
    local && local.revision === video.blockRevision ? local.fraction : 0,
  )
  return {
    locked: watchedFraction < VIDEO_WATCH_THRESHOLD,
    videoBlockId: video.id,
    watchedFraction,
  }
}
