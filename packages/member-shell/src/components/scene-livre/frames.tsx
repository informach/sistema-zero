'use client'

import { discoveryGuidance, type SceneState } from '@sistemazero/core/learning/scene'
import { Pause, Play } from 'lucide-react'
import { ExplorationStage } from '../exploration-stage'
import { Frame, SceneButton, useDiscovery } from '../scene-discovery-frame'
import { DicaLivre, FileiraDeNumeros, IdeiaDoAtelie } from './atelie-comum'

/**
 * A experiência `frames` em exploração livre (Construtor, 02/11/2026): só a IDEIA, no molde de `Door`,
 * `Memory` (`scene-discovery-controls.tsx`) e dos Poderes (`scene-poder-*.tsx`). O palco é o de
 * sempre (a nave com o fogo); os controles são os do Pinta: os quadros, a Prévia, a Velocidade e o
 * "Quadro 2 igual ao quadro 1". O que cada caso faz só aparece depois de a criança testá-lo.
 *
 * ⚠️⚠️ A Prévia é o RELÓGIO desta cena, como na bancada antiga (`AtelieSceneControls`): tocar manda o
 * `play` ao motor e liga o ▶ do player (`setRunning`). O estado que chega aqui já é o VISTO
 * (`estadoVistoDaCena`): com o relógio parado por fora (aba escondida, vídeo), a Prévia aparece
 * parada. ⚠️ Com a Prévia tocando, os quadros ficam fechados com o motivo (o destaque pularia no
 * ritmo da animação).
 */

/** As descobertas, na ordem da lista. Os ids são as metas da cena (`catalog.ts`). */
export const METAS_DOS_QUADROS = [
  'two-drawings',
  'movement',
  'paused-one',
  'slow-shows-two',
  'same-frames',
] as const
const OBJETIVOS = [
  'Com a Prévia parada, compare o quadro 1 e o quadro 2.',
  'Toque a Prévia rápida e observe o fogo.',
  'Pare a Prévia rápida e veja o que ficou na tela.',
  'Toque a Prévia devagar e compare.',
  'Deixe os dois quadros iguais e toque a Prévia rápida.',
]
/** As velocidades do Pinta que a tela oferece, em quadros por segundo (a aula anima a 8). */
const VELOCIDADES = [2, 4, 8, 12] as const

/**
 * O botão em destaque é o gesto que a fala do Zappy pede agora (a régua de `proximoGestoDaMemoria`).
 * `null` quando o gesto é OLHAR: a Prévia já toca do jeito que a fala pede.
 */
export type GestoDosQuadros =
  | { gesto: 'quadro'; quadro: 1 | 2 }
  | { gesto: 'velocidade'; valor: number }
  | { gesto: 'tocar' | 'parar' | 'iguais' }
  | null
export function proximoGestoDosQuadros(
  fala: string | undefined,
  a: SceneState['animation'],
): GestoDosQuadros {
  const tocar: GestoDosQuadros = a.playing ? null : { gesto: 'tocar' }
  /** A Prévia rápida com os dois quadros diferentes: o caso de `movement` e `paused-one`. */
  const rapidaDiferente = (): GestoDosQuadros | undefined => {
    if (a.sameFrames) return { gesto: 'iguais' }
    if (a.rate < 6) return { gesto: 'velocidade', valor: 8 }
    if (!a.playing) return { gesto: 'tocar' }
    return undefined
  }
  switch (fala) {
    case 'frames-start':
    case 'frames-start-late':
      return a.playing ? { gesto: 'parar' } : { gesto: 'quadro', quadro: a.frame === 1 ? 2 : 1 }
    case 'frames-fast':
      return rapidaDiferente() ?? null
    case 'frames-pause':
      // Parar só depois de ver o fogo pulsar (as mesmas quatro trocas da meta).
      return rapidaDiferente() ?? (a.swaps >= 4 ? { gesto: 'parar' } : null)
    case 'frames-slow':
      if (a.sameFrames) return { gesto: 'iguais' }
      if (a.rate > 2) return { gesto: 'velocidade', valor: 2 }
      return tocar
    case 'frames-same':
      if (!a.sameFrames) return { gesto: 'iguais' }
      if (a.rate < 6) return { gesto: 'velocidade', valor: 8 }
      return tocar
    default:
      return null
  }
}

export function LivreFrames() {
  const { activity, state, dispatch, instruction, setRunning } = useDiscovery()
  const a = state.animation
  const completed = METAS_DOS_QUADROS.map((id) => state.evidence.discoveries.includes(id))
  const g = proximoGestoDosQuadros(discoveryGuidance(activity, state)?.id, a)
  const tom = (qual: string) => (g?.gesto === qual ? 'gesto' : 'ferramenta')
  const tocando = a.playing
  const previa = (ligar: boolean) => {
    // O motor só recebe o gesto quando o estado da Prévia muda de verdade.
    if (ligar !== a.playing) dispatch({ type: 'play', on: ligar })
    setRunning(ligar)
  }
  const quadro = (index: 1 | 2) => (
    <SceneButton
      className="min-w-11"
      aria-current={!tocando && a.frame === index ? 'true' : undefined}
      tom={
        g?.gesto === 'quadro' && g.quadro === index
          ? 'gesto'
          : !tocando && a.frame === index
            ? 'ligado'
            : 'ferramenta'
      }
      fechado={tocando}
      onClick={() => dispatch({ type: 'frame', index })}
    >
      Quadro {index}
    </SceneButton>
  )
  return (
    <Frame
      title="Dois desenhos viram movimento"
      kind="quadros"
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
              rotulo: 'Os dois quadros, com a Prévia parada',
              visto: completed[0] ?? false,
              resposta: 'Dois desenhos: o corpo igual, só o fogo muda',
            },
            {
              rotulo: 'A Prévia rápida',
              visto: completed[1] ?? false,
              resposta: 'O fogo parece pulsar',
            },
            {
              rotulo: 'Parar a Prévia rápida',
              visto: completed[2] ?? false,
              resposta: 'Fica um quadro só na tela',
            },
            {
              rotulo: 'A Prévia devagar',
              visto: completed[3] ?? false,
              resposta: 'Um quadro, depois o outro',
            },
            {
              rotulo: 'Os dois quadros iguais',
              visto: completed[4] ?? false,
              resposta: 'A Prévia troca, mas nada se mexe',
            },
          ]}
        />
      }
    >
      <fieldset className="rounded-2xl border border-border px-2.5 py-2 text-sm font-semibold">
        <legend className="px-1">Quadro na Prévia</legend>
        <div className="flex flex-wrap gap-2">
          {quadro(1)}
          {quadro(2)}
        </div>
        {tocando ? (
          <p className="mt-2 font-normal text-muted-foreground">
            Pare a Prévia para escolher um quadro.
          </p>
        ) : null}
      </fieldset>
      <div className="sz-discovery-controls free-controls">
        <SceneButton
          aria-pressed={tocando}
          tom={tocando ? (g?.gesto === 'parar' ? 'gesto' : 'ligado') : tom('tocar')}
          onClick={() => previa(!tocando)}
        >
          {tocando ? <Pause size={16} /> : <Play size={16} />}{' '}
          {tocando ? 'Parar a Prévia' : 'Tocar a Prévia'}
        </SceneButton>
      </div>
      <FileiraDeNumeros
        legenda="Velocidade, em quadros por segundo"
        valor={a.rate}
        opcoes={VELOCIDADES}
        destaque={g?.gesto === 'velocidade' ? g.valor : null}
        onChange={(perSecond) => dispatch({ type: 'rate', perSecond })}
      />
      <div className="sz-discovery-controls free-controls">
        <SceneButton
          aria-pressed={Boolean(a.sameFrames)}
          tom={g?.gesto === 'iguais' ? 'gesto' : a.sameFrames ? 'ligado' : 'ferramenta'}
          onClick={() => dispatch({ type: 'same-frames', on: !a.sameFrames })}
        >
          Quadro 2 igual ao quadro 1: {a.sameFrames ? 'ligado' : 'desligado'}
        </SceneButton>
      </div>
      <DicaLivre />
    </Frame>
  )
}
