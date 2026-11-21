import { redactZappySensitiveText } from './zappy-safety'

/**
 * Lote 5 da evolução do Estúdio (seção 15 da missão, 21/11/2026): o Zappy explica a execução e
 * aponta gargalos com o que as abas Investigar e Desempenho mostram, em vez de adivinhar. O Studio
 * só manda quando a criança ligou a aba, lido na hora da pergunta (`readZappyObservation`), e só
 * o que a aba está MOSTRANDO.
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

/** Quais abas a criança ligou (aba ligada sem o campo dela = ainda sem leitura). */
export interface ZappyObservedTabsInput {
  investigate: boolean
  performance: boolean
}

/**
 * A regra que acompanha os campos, por modo (revisão do lote 5): o Pro só tem a aba Desempenho
 * ligada a estes campos (a "Investigar" dele é outro painel), então ali a regra não sugere a
 * Investigar. Aba ligada sem leitura pede para rodar, nunca para ligar o que já está ligado.
 */
export function zappyObservationRule(tabs: 'investigate-and-performance' | 'performance'): string {
  const performance =
    'O campo "desempenhoMedido", quando existe, traz o que a aba Desempenho mediu nos últimos segundos (quadros por segundo agora e o menor, quantas vezes ficou lento, o quadro mais demorado em ms e quantos sprites, objetos ou desenhos havia). Numa dúvida de lentidão, aponte UMA causa provável sustentada por esses números.'
  const missing =
    'Nunca invente valores, medidas ou números que não estejam nesses campos. O campo "abasLigadas" diz quais abas a criança ligou: aba ligada cujo campo não veio ainda não tem leitura (o jogo não está rodando, acabou de começar ou a medida não vale para este programa), então peça para rodar o jogo e perguntar de novo.'
  if (tabs === 'performance')
    return `${performance} ${missing} Só peça para ligar a aba Desempenho quando ela não estiver ligada.`
  return `O campo "oQueOJogoMostra", quando existe, traz os valores que a aba Investigar mostra AGORA, do jeito que a criança vê (nome e valor), e "parouComErro" os valores do momento em que o jogo parou com erro. Use esses valores para explicar o que está acontecendo na execução. ${performance} ${missing} Só peça para ligar a aba Investigar ou Desempenho quando ela não estiver ligada.`
}

/**
 * O teto da observação no pedido ao modelo: ela cede antes do código-fonte. Sem ele, 40 valores
 * de até 160 caracteres (≈13 KB em UTF-8) comiam o orçamento do código e, no Python, chegavam a
 * derrubar uma pergunta válida (revisão do lote 5).
 */
export const ZAPPY_OBSERVATION_MAX_CHARS = 3000

type ObservedValues = Array<{ nome: string; valor: string }>

function values(list: readonly ZappyObservedValue[]): ObservedValues {
  return list.map((value) => ({
    nome: value.name,
    // O valor pode ser um texto que a criança digitou no jogo.
    valor: redactZappySensitiveText(value.text).text,
  }))
}

const sameValues = (left: ObservedValues, right: ObservedValues) =>
  left.length === right.length &&
  left.every(
    (value, index) => value.nome === right[index]?.nome && value.valor === right[index]?.valor,
  )

export interface ZappyObservedRuntime {
  oQueOJogoMostra?: {
    quadro: number | null
    pausado: boolean
    valores: ObservedValues
    parouComErro?: { quadro: number | null; valores: ObservedValues }
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
  abasLigadas?: { investigar: boolean; desempenho: boolean }
}

/** Os campos do projeto no pedido ao modelo (vazio quando a criança não ligou as abas). */
export function zappyObservedRuntime(context: {
  investigation?: ZappyInvestigationInput
  performance?: ZappyPerformanceInput
  observing?: ZappyObservedTabsInput
}): ZappyObservedRuntime {
  const { investigation, performance, observing } = context
  const result: ZappyObservedRuntime = {}
  if (observing && (observing.investigate || observing.performance))
    result.abasLigadas = { investigar: observing.investigate, desempenho: observing.performance }
  if (performance)
    result.desempenhoMedido = {
      segundos: performance.seconds,
      quadrosPorSegundoAgora: performance.fpsNow,
      menorQuadrosPorSegundo: performance.fpsMin,
      vezesQueFicouLento: performance.slowEpisodes,
      quadroMaisDemoradoMs: performance.slowestFrameMs,
      sprites: performance.sprites,
      objetos: performance.objects,
      desenhos: performance.draws,
    }
  if (investigation) {
    const now = values(investigation.values)
    const stopped = investigation.stopped ? values(investigation.stopped.values) : null
    const shown: NonNullable<ZappyObservedRuntime['oQueOJogoMostra']> = {
      quadro: investigation.frame,
      pausado: investigation.paused,
      valores: now,
      ...(investigation.stopped
        ? {
            parouComErro: {
              quadro: investigation.stopped.frame,
              // Os mesmos valores duas vezes não dizem nada a mais: vão uma vez só.
              valores: stopped && !sameValues(stopped, now) ? stopped : [],
            },
          }
        : {}),
    }
    result.oQueOJogoMostra = shown
    // O teto: tira primeiro do fim dos valores do erro, depois do fim dos valores de agora.
    while (JSON.stringify(result).length > ZAPPY_OBSERVATION_MAX_CHARS) {
      const fromStopped = shown.parouComErro?.valores
      if (fromStopped?.length) fromStopped.pop()
      else if (shown.valores.length) shown.valores.pop()
      else break
    }
  }
  return result
}
