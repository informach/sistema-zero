'use client'

import { discoveryGuidance, type SceneState } from '@sistemazero/core/learning/scene'
import { Pause, Play } from 'lucide-react'
import { useEffect } from 'react'
import { ExplorationStage } from '../exploration-stage'
import { Frame, SceneButton, useDiscovery } from '../scene-discovery-frame'
import { DicaLivre, FileiraDeNumeros, IdeiaDoAtelie } from './atelie-comum'

/**
 * A experiência `motion-amount` em exploração livre (Construtor, 02/11/2026): só a IDEIA, no molde de
 * `Door`, `Memory` (`scene-discovery-controls.tsx`) e dos Poderes (`scene-poder-*.tsx`). O palco é o
 * de sempre (a pedra com as crateras, os dois desenhos da Prévia); os controles são os da bancada
 * antiga ("O tanto que a cratera anda", "O tanto que a pedra inteira anda" e a Prévia), com os
 * números em botões para o destaque poder apontar o caso que a fala pede.
 *
 * ⚠️⚠️ No modo livre a Prévia ABRE PARADA (`openScene` do core): tocando de fábrica, o relógio fechava
 * "os dois desenhos iguais" sem a criança ter feito nada. A Prévia é o relógio desta cena, como na
 * bancada antiga (`MotionAmountControls`): o ▶ do player acompanha o `motionAmount.playing`.
 */

/** As descobertas, na ordem da lista. Os ids são as metas da cena (`catalog.ts`). */
export const METAS_DO_TANTO = ['no-change', 'local-move', 'too-much'] as const
const OBJETIVOS = [
  'Com os dois controles em 0, toque a Prévia e observe a pedra.',
  'Com só a cratera andando um pouco, observe a Prévia.',
  'Com a pedra inteira andando muito, observe a Prévia.',
]
/** Os números de 0 a 12 que a tela oferece: dá para comparar um pouco, o bastante e muito. */
const TANTOS = [0, 1, 2, 4, 6, 10, 12] as const

/**
 * O botão em destaque é o gesto que a fala do Zappy pede agora (a régua de `proximoGestoDaMemoria`).
 * `null` quando o gesto é OLHAR: a Prévia já toca com o caso que a fala pede.
 */
export type GestoDoTanto = { gesto: 'cratera' | 'pedra'; valor: number } | { gesto: 'tocar' } | null
export function proximoGestoDoTanto(
  fala: string | undefined,
  m: SceneState['motionAmount'],
): GestoDoTanto {
  const tocar: GestoDoTanto = m.playing ? null : { gesto: 'tocar' }
  switch (fala) {
    case 'motion-amount-start':
    case 'motion-amount-still-late':
      if (m.crater !== 0) return { gesto: 'cratera', valor: 0 }
      if (m.body !== 0) return { gesto: 'pedra', valor: 0 }
      return tocar
    case 'motion-amount-local':
      if (m.body !== 0) return { gesto: 'pedra', valor: 0 }
      if (m.crater < 3 || m.crater > 6) return { gesto: 'cratera', valor: 4 }
      return tocar
    case 'motion-amount-much':
      if (m.body < 10) return { gesto: 'pedra', valor: 10 }
      return tocar
    default:
      return null
  }
}

export function LivreMotionAmount() {
  const { activity, state, dispatch, instruction, running, setRunning } = useDiscovery()
  const m = state.motionAmount
  /**
   * A Prévia tocando de VERDADE: no motor e com o relógio do player andando. A aba escondida para o
   * relógio por fora, e a tela não pode dizer que a pedra está trocando de desenho.
   */
  const tocando = m.playing && running
  const completed = METAS_DO_TANTO.map((id) => state.evidence.discoveries.includes(id))
  const g = proximoGestoDoTanto(discoveryGuidance(activity, state)?.id, { ...m, playing: tocando })
  // A Prévia é o relógio: tocando no motor, o ▶ do player anda; parada, ele para.
  useEffect(() => {
    setRunning(m.playing)
  }, [m.playing, setRunning])
  useEffect(() => () => setRunning(false), [setRunning])
  return (
    <Frame
      title="O tanto que muda"
      kind="tanto"
      activity={activity}
      state={state}
      text={instruction}
      goals={OBJETIVOS}
      completed={completed}
      done={completed.filter(Boolean).length}
      reset={() => {
        setRunning(false)
        dispatch({ type: 'reset' })
      }}
      stage={<ExplorationStage activity={activity} state={state} dispatch={dispatch} />}
      after={
        <IdeiaDoAtelie
          titulo="O que a Prévia mostra"
          casos={[
            {
              rotulo: 'Os dois desenhos iguais',
              visto: completed[0] ?? false,
              resposta: 'A Prévia troca, mas a pedra fica parada',
            },
            {
              rotulo: 'Só a cratera andando um pouco',
              visto: completed[1] ?? false,
              resposta: 'A pedra parece girar',
            },
            {
              rotulo: 'A pedra inteira andando muito',
              visto: completed[2] ?? false,
              resposta: 'O desenho pula em vez de girar',
            },
          ]}
        />
      }
    >
      <FileiraDeNumeros
        legenda="O tanto que a cratera anda"
        valor={m.crater}
        opcoes={TANTOS}
        destaque={g?.gesto === 'cratera' ? g.valor : null}
        onChange={(amount) => dispatch({ type: 'nudge', piece: 'crater', amount })}
      />
      <FileiraDeNumeros
        legenda="O tanto que a pedra inteira anda"
        valor={m.body}
        opcoes={TANTOS}
        destaque={g?.gesto === 'pedra' ? g.valor : null}
        onChange={(amount) => dispatch({ type: 'nudge', piece: 'body', amount })}
      />
      <div className="sz-discovery-controls free-controls">
        <SceneButton
          aria-pressed={tocando}
          tom={g?.gesto === 'tocar' ? 'gesto' : tocando ? 'ligado' : 'ferramenta'}
          onClick={() => {
            // Tocando no motor com o relógio parado por fora: basta soltar o relógio de novo.
            if (!tocando && m.playing) setRunning(true)
            else dispatch({ type: 'play', on: !tocando })
          }}
        >
          {tocando ? <Pause size={16} /> : <Play size={16} />}{' '}
          {tocando ? 'Parar a Prévia' : 'Tocar a Prévia'}
        </SceneButton>
      </div>
      <p className="sz-discovery-small">
        Os números dizem o quanto aquela parte anda no segundo desenho. Com a Prévia tocando, olhe a
        pedra por um instante depois de cada mudança.
      </p>
      <DicaLivre />
    </Frame>
  )
}
