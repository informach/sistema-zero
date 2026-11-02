'use client'

import { discoveryGuidance, type SceneState } from '@sistemazero/core/learning/scene'
import { ExplorationStage } from '../exploration-stage'
import { Frame, SceneButton, useDiscovery } from '../scene-discovery-frame'
import { DicaLivre, IdeiaDoAtelie } from './atelie-comum'

/**
 * A experiência `fill-stroke` em exploração livre (Construtor, 02/11/2026): só a IDEIA, no molde de
 * `Door`, `Memory` (`scene-discovery-controls.tsx`) e dos Poderes (`scene-poder-*.tsx`). O palco é o
 * de sempre (a pedra em vetor); os controles são os do Pinta: Preenchimento e Contorno, cada um com
 * cor ou em Sem cor. O que sobra da pedra só aparece depois de a criança testar cada versão.
 */

/** As descobertas, na ordem da lista. Os ids são as metas da cena (`catalog.ts`). */
export const METAS_DAS_CORES = ['only-fill', 'only-stroke', 'both'] as const
const OBJETIVOS = [
  'Deixe o Contorno em Sem cor e veja o que sobra.',
  'Deixe o Preenchimento em Sem cor e veja o que sobra.',
  'Depois, volte as duas partes com cor e compare as três versões.',
]

/** O botão em destaque é o gesto que a fala do Zappy pede agora (a régua de `proximoGestoDaMemoria`). */
export type GestoDasCores = 'preenchimento' | 'contorno' | null
export function proximoGestoDasCores(
  fala: string | undefined,
  ink: SceneState['ink'],
): GestoDasCores {
  switch (fala) {
    case 'fill-stroke-start':
    case 'fill-stroke-fill-late':
      // Só o Contorno em Sem cor: o Preenchimento precisa estar com cor.
      return !ink.fill ? 'preenchimento' : ink.stroke ? 'contorno' : 'preenchimento'
    case 'fill-stroke-stroke':
      return !ink.stroke ? 'contorno' : ink.fill ? 'preenchimento' : 'contorno'
    case 'fill-stroke-both':
      // A parte que está em Sem cor volta; com as duas já com cor (um Desfazer), o Contorno recomeça.
      return !ink.fill ? 'preenchimento' : 'contorno'
    default:
      return null
  }
}

export function LivreFillStroke() {
  const { activity, state, dispatch, instruction } = useDiscovery()
  const ink = state.ink
  const completed = METAS_DAS_CORES.map((id) => state.evidence.discoveries.includes(id))
  const gesto = proximoGestoDasCores(discoveryGuidance(activity, state)?.id, ink)
  const tom = (qual: GestoDasCores, ligado: boolean) =>
    gesto === qual ? 'gesto' : ligado ? 'ligado' : 'ferramenta'
  return (
    <Frame
      title="A cor de dentro e a linha de fora"
      kind="cores"
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
          titulo="O que sobra da pedra"
          casos={[
            {
              rotulo: 'O Contorno em Sem cor',
              visto: completed[0] ?? false,
              resposta: 'Fica a cor de dentro, sem a linha da borda',
            },
            {
              rotulo: 'O Preenchimento em Sem cor',
              visto: completed[1] ?? false,
              resposta: 'Fica só a linha da borda, vazia por dentro',
            },
            {
              rotulo: 'As duas partes com cor',
              visto: completed[2] ?? false,
              resposta: 'A cor de dentro e a linha da borda juntas',
            },
          ]}
        />
      }
    >
      <div className="grid gap-2">
        <SceneButton
          aria-pressed={ink.fill}
          tom={tom('preenchimento', ink.fill)}
          onClick={() => dispatch({ type: 'ink', part: 'fill', on: !ink.fill })}
        >
          Preenchimento: {ink.fill ? 'com cor' : 'Sem cor'}
        </SceneButton>
        <SceneButton
          aria-pressed={ink.stroke}
          tom={tom('contorno', ink.stroke)}
          onClick={() => dispatch({ type: 'ink', part: 'stroke', on: !ink.stroke })}
        >
          Contorno: {ink.stroke ? 'com cor' : 'Sem cor'}
        </SceneButton>
      </div>
      <p className="sz-discovery-small">
        Cada clique troca aquela parte entre com cor e Sem cor, como no Pinta.
      </p>
      <DicaLivre />
    </Frame>
  )
}
