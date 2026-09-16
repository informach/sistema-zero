'use client'

import { framesPreviewSlice, type SceneId, type SceneState } from '@sistemazero/core/learning/scene'
import { useEffect, useRef } from 'react'

/**
 * O relógio do navegador que move a cena: soma os quadros do `requestAnimationFrame` até o
 * limiar e entrega os segundos a quem chama. `onTick` devolve `false` para PARAR.
 *
 * ⚠️ Saiu de dentro do player no lote 2 do Raio-X (16/09/2026) porque a bancada do "Agora é sua
 * vez" precisa do MESMO relógio, e duas cópias deste laço já divergiriam no primeiro conserto
 * (a aba escondida, o teto de 0,1 s por quadro, a meia velocidade).
 *
 * ⚠️ `onTick` vive num REF: com ele nas dependências, uma função nova a cada render reiniciaria
 * o laço a cada quadro e o `elapsed` acumulado nunca chegaria ao limiar.
 */
export function useSceneClock({
  ativo,
  limiar,
  exato = false,
  lento,
  onTick,
}: {
  ativo: boolean
  /** Quantos segundos juntar antes de mandar um tique (0,04 normal; 0,2 com menos movimento). */
  limiar: number
  /**
   * Manda EXATAMENTE o limiar e guarda a sobra (`relogioDaCena`: a prévia da `frames` com menos
   * movimento). ⚠️ Sem isso, o tempo medido passa do limiar por até um quadro do navegador, e numa
   * fatia do tamanho de UM quadro da animação duas trocas caíam juntas de vez em quando.
   */
  exato?: boolean
  /** "🐢 Mais devagar": o tempo da cena anda pela metade. */
  lento: boolean
  onTick: (segundos: number) => boolean
}) {
  const tique = useRef(onTick)
  tique.current = onTick
  useEffect(() => {
    if (!ativo) return
    let frame = 0
    let last: number | null = null
    let elapsed = 0
    const tick = (now: number) => {
      // Aba escondida não conta tempo: voltar para ela não pode despejar segundos de uma vez.
      if (document.hidden) {
        last = null
        elapsed = 0
        frame = requestAnimationFrame(tick)
        return
      }
      if (last !== null) elapsed += Math.min((now - last) / 1000, 0.1) * (lento ? 0.5 : 1)
      last = now
      if (elapsed >= limiar - (exato ? 1e-6 : 0)) {
        const continuar = tique.current(exato ? limiar : elapsed)
        // ⚠️ Com `exato`, a sobra fica para a próxima fatia, com teto de UMA fatia: uma aba lenta
        // não despeja várias trocas de uma vez.
        elapsed = exato ? Math.min(Math.max(0, elapsed - limiar), limiar) : 0
        if (!continuar) return
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [ativo, limiar, exato, lento])
}

/**
 * De quanto em quanto tempo o ▶ manda um tique: 0,04 s, ou passos de 0,2 s com menos movimento.
 *
 * ⚠️⚠️ O MESMO em toda cena desde o relógio de quadro fixo (lote 4 do Raio-X). O `draw-loop` tinha
 * uma ponte aqui (um tique a cada 0,25 s) porque o motor contava um quadro por tique; hoje o motor
 * acumula o tempo e conta os quadros no ritmo da cena (`SCENE_FRAME_RATE`, no core), então o tamanho
 * da fatia não muda o mundo. Fatia pequena só deixa o quadro aparecer perto da hora dele. ⚠️ Não
 * volte a escolher o limiar por cena: é o motor que sabe o ritmo, e a cópia aqui divergiria.
 * Uma função só para o player e a bancada do "Agora é sua vez", que já tiveram duas cópias.
 */
export function limiarDoRelogio(menosMovimento: boolean): number {
  return menosMovimento ? 0.2 : 0.04
}

/**
 * O relógio DESTA cena: o limiar comum, e a única exceção.
 *
 * ⚠️⚠️ A `frames` com menos movimento (consertos do review da onda B do lote 5, A1; decisão da
 * orquestração): a prévia É o conteúdo que a criança mandou tocar, e com a fatia de 0,2 s a 8 quadros
 * por segundo o que aparecia era a paridade amostrada (5 trocas em 2 s, igual ao "devagar"). A fatia
 * vira UM quadro da animação (`framesPreviewSlice`, no core), mandada exata: cada fatia mostra um
 * quadro, no ritmo pedido. As outras 44 cenas seguem a régua comum (o motor sabe o ritmo delas).
 */
export function relogioDaCena(
  scene: SceneId,
  state: SceneState,
  menosMovimento: boolean,
): { limiar: number; exato: boolean } {
  if (scene === 'frames' && menosMovimento)
    return { limiar: framesPreviewSlice(state.animation.rate), exato: true }
  return { limiar: limiarDoRelogio(menosMovimento), exato: false }
}

/**
 * O estado como a criança o VÊ: na `frames`, a prévia só toca com o relógio do player andando.
 *
 * ⚠️⚠️ Consertos do review da onda B do lote 5 (MÉDIO-4). A aba escondida, um F5, o vídeo da aula e
 * o Recomeçar param o relógio sem passar pelo motor, e o motor seguia "tocando": a chave dizia
 * "parada", a faixa dizia "prévia: tocando" e a frase "a prévia troca 8 quadros por segundo" sobre um
 * fogo parado. Mandar `play off` nessas horas derrubaria `paused-one` sem a criança ter parado nada,
 * então quem para é o DESENHO: a faixa, o palco, a frase e a bancada leem este estado, e os comandos
 * seguem indo ao motor de verdade (o toque num quadro para a prévia lá, ver o `frame` do core).
 */
export function estadoVistoDaCena(
  scene: SceneId,
  state: SceneState,
  relogioAndando: boolean,
): SceneState {
  if (scene !== 'frames' || relogioAndando || !state.animation.playing) return state
  return { ...state, animation: { ...state.animation, playing: false } }
}

/**
 * Quanto tempo uma legenda fica na tela antes de a parte seguinte tocar sozinha (demonstração
 * `inline`). ⚠️ Sem isso a legenda de uma parte era trocada pela da próxima no mesmo quadro em
 * que aparecia, e ninguém lia nenhuma das duas.
 * ⚠️⚠️ Pelo menos 2,5 s e 0,35 s por palavra, até 5 s (lote 5 do Raio-X, G4): com 1,2 s a `fill-stroke`
 * inline passava inteira em ~4 s e a `shading` em ~5 s, e a criança que lê devagar não terminava a
 * primeira legenda antes de a segunda entrar. As legendas do ateliê têm de 7 a 17 palavras.
 */
export function tempoDeLeitura(texto: string): number {
  const palavras = texto.trim().split(/\s+/).filter(Boolean).length
  return Math.min(5, Math.max(2.5, palavras * 0.35))
}
