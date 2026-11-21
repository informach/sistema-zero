import { redactZappySensitiveText } from './zappy-safety'

/**
 * Lote 5 da evolução do Estúdio (seção 15 da missão, 21/11/2026): o Zappy explica a execução e
 * aponta gargalos com o que as abas Investigar e Desempenho mostram, em vez de adivinhar. O Studio
 * só manda quando a criança ligou a aba, lido na hora da pergunta (`readZappyObservation`).
 */

export interface ZappyObservedValue {
  name: string
  text: string
}

export interface ZappyInvestigationInput {
  frame: number | null
  paused: boolean
  values: ZappyObservedValue[]
  stopped?: { frame: number | null; values: ZappyObservedValue[] }
}

export interface ZappyPerformanceInput {
  seconds: number
  fpsNow: number
  fpsMin: number
  slowEpisodes: number
  slowestFrameMs: number
  sprites: number | null
  objects: number | null
  draws: number | null
}

/** A regra que acompanha os dois campos, nas instruções dos três modos (blocos, Pro e Python). */
export const ZAPPY_OBSERVATION_RULE =
  'O campo "oQueOJogoMostra", quando existe, traz os valores que a aba Investigar mostra AGORA, do jeito que a criança vê (nome e valor), e "parouComErro" os valores do momento em que o jogo parou com erro. Use esses valores para explicar o que está acontecendo na execução. O campo "desempenhoMedido", quando existe, traz o que a aba Desempenho mediu nos últimos segundos (quadros por segundo agora e o menor, quantas vezes ficou lento, o quadro mais demorado em ms e quantos sprites, objetos ou desenhos havia). Numa dúvida de lentidão, aponte UMA causa provável sustentada por esses números. Nunca invente valores, medidas ou números que não estejam nesses campos; sem eles, peça para ligar a aba Investigar ou Desempenho e rodar o jogo.'

function values(list: readonly ZappyObservedValue[]) {
  return list.map((value) => ({
    nome: value.name,
    // O valor pode ser um texto que a criança digitou no jogo.
    valor: redactZappySensitiveText(value.text).text,
  }))
}

/** Os dois campos do projeto no pedido ao modelo (vazio quando a criança não ligou as abas). */
export function zappyObservedRuntime(context: {
  investigation?: ZappyInvestigationInput
  performance?: ZappyPerformanceInput
}): {
  oQueOJogoMostra?: {
    quadro: number | null
    pausado: boolean
    valores: Array<{ nome: string; valor: string }>
    parouComErro?: { quadro: number | null; valores: Array<{ nome: string; valor: string }> }
  }
  desempenhoMedido?: {
    segundos: number
    quadrosPorSegundoAgora: number
    menorQuadrosPorSegundo: number
    vezesQueFicouLento: number
    quadroMaisDemoradoMs: number
    sprites: number | null
    objetos: number | null
    desenhos: number | null
  }
} {
  const { investigation, performance } = context
  return {
    ...(investigation
      ? {
          oQueOJogoMostra: {
            quadro: investigation.frame,
            pausado: investigation.paused,
            valores: values(investigation.values),
            ...(investigation.stopped
              ? {
                  parouComErro: {
                    quadro: investigation.stopped.frame,
                    valores: values(investigation.stopped.values),
                  },
                }
              : {}),
          },
        }
      : {}),
    ...(performance
      ? {
          desempenhoMedido: {
            segundos: performance.seconds,
            quadrosPorSegundoAgora: performance.fpsNow,
            menorQuadrosPorSegundo: performance.fpsMin,
            vezesQueFicouLento: performance.slowEpisodes,
            quadroMaisDemoradoMs: performance.slowestFrameMs,
            sprites: performance.sprites,
            objetos: performance.objects,
            desenhos: performance.draws,
          },
        }
      : {}),
  }
}
