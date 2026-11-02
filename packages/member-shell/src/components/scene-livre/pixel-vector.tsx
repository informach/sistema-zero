'use client'

import { discoveryGuidance, quantos, SCENE_LIMITS } from '@sistemazero/core/learning/scene'
import { ExplorationStage } from '../exploration-stage'
import { Frame, SceneButton, useDiscovery } from '../scene-discovery-frame'
import { DicaLivre, IdeiaDoAtelie } from './atelie-comum'

/**
 * A experiência `pixel-vector` em exploração livre (Construtor, 02/11/2026): só a IDEIA, no molde de
 * `Door`, `Memory` (`scene-discovery-controls.tsx`) e dos Poderes (`scene-poder-*.tsx`). O palco é o
 * de sempre (as duas pedras sob UMA lupa); a Lupa anda um degrau por clique ("Aproximar" e
 * "Afastar"), para a criança ver em que momento as bordas mudam. O que a borda de cada pedra faz só
 * aparece depois de ela aproximar.
 */

/** As descobertas, na ordem da lista. Os ids são as metas da cena (`catalog.ts`). */
export const METAS_DA_LUPA = ['stairs', 'smooth', 'alike'] as const
const OBJETIVOS = [
  'Aproxime as duas pedras e compare as bordas.',
  'Chegue ainda mais perto e observe a borda da pedra de vetor.',
  'Depois de aproximar, volte para longe e compare as duas de novo.',
]

/** O botão em destaque é o gesto que a fala do Zappy pede agora (a régua de `proximoGestoDaMemoria`). */
export type GestoDaLupa = 'aproximar' | 'afastar' | null
export function proximoGestoDaLupa(fala: string | undefined, zoom: number): GestoDaLupa {
  const aproximar = zoom < SCENE_LIMITS.zoom.max ? 'aproximar' : null
  switch (fala) {
    case 'pixel-vector-start':
    case 'pixel-vector-stairs':
    case 'pixel-vector-close-late':
      return aproximar
    case 'pixel-vector-far':
      return zoom > SCENE_LIMITS.zoom.min ? 'afastar' : null
    default:
      return null
  }
}

export function LivrePixelVector() {
  const { activity, state, dispatch, instruction } = useDiscovery()
  const zoom = state.pixels.zoom
  const completed = METAS_DA_LUPA.map((id) => state.evidence.discoveries.includes(id))
  const gesto = proximoGestoDaLupa(discoveryGuidance(activity, state)?.id, zoom)
  const lupa = (valor: number) =>
    dispatch({ type: 'inspect', kind: state.pixels.kind, zoom: valor })
  return (
    <Frame
      title="De perto, a borda conta"
      kind="lupa"
      activity={activity}
      state={state}
      text={instruction}
      goals={OBJETIVOS}
      completed={completed}
      done={completed.filter(Boolean).length}
      reset={() => dispatch({ type: 'reset' })}
      stage={<ExplorationStage activity={activity} state={state} dispatch={dispatch} />}
      after={
        <IdeiaDoAtelie
          titulo="O que a Lupa mostra"
          casos={[
            {
              rotulo: 'A pedra de pixel, de perto',
              visto: completed[0] ?? false,
              resposta: 'A borda vira degraus de quadradinhos',
            },
            {
              rotulo: 'A pedra de vetor, bem de perto',
              visto: completed[1] ?? false,
              resposta: 'A borda continua lisa, com os pontos da curva',
            },
            {
              rotulo: 'As duas, de longe outra vez',
              visto: completed[2] ?? false,
              resposta: 'Parecem a mesma pedra',
            },
          ]}
        />
      }
    >
      <fieldset className="rounded-2xl border border-border px-2.5 py-2 text-sm font-semibold">
        <legend className="px-1">Lupa: {quantos(zoom, 'vez', 'vezes')}</legend>
        <div className="flex flex-wrap gap-2">
          <SceneButton
            tom={gesto === 'aproximar' ? 'gesto' : 'ferramenta'}
            fechado={zoom >= SCENE_LIMITS.zoom.max}
            onClick={() => lupa(zoom + 1)}
          >
            Aproximar
          </SceneButton>
          <SceneButton
            tom={gesto === 'afastar' ? 'gesto' : 'ferramenta'}
            fechado={zoom <= SCENE_LIMITS.zoom.min}
            onClick={() => lupa(zoom - 1)}
          >
            Afastar
          </SceneButton>
        </div>
      </fieldset>
      <p className="sz-discovery-small">
        A Lupa aproxima as duas pedras juntas, um degrau por clique. Suas descobertas continuam
        marcadas quando você afasta.
      </p>
      <DicaLivre />
    </Frame>
  )
}
