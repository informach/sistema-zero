'use client'

import { discoveryGuidance, type SceneState } from '@sistemazero/core/learning/scene'
import { ExplorationStage } from '../exploration-stage'
import { Frame, SceneButton, useDiscovery } from '../scene-discovery-frame'
import { DicaLivre, IdeiaDoAtelie } from './atelie-comum'

/**
 * A experiência `shading` em exploração livre (Construtor, 02/11/2026): só a IDEIA, no molde de
 * `Door`, `Memory` (`scene-discovery-controls.tsx`) e dos Poderes (`scene-poder-*.tsx`). O palco é o
 * de sempre (a bola azul em pixels); os controles são os do Pinta: "A sombra e a luz" e "O sol". O
 * que os tons e o sol fazem só aparece depois de a criança testar.
 */

/** As descobertas, na ordem da lista. Os ids são as metas da cena (`catalog.ts`). */
export const METAS_DA_LUZ = ['volume', 'flat', 'side'] as const
const OBJETIVOS = [
  'Ligue A sombra e a luz e observe a bola.',
  'Desligue A sombra e a luz e compare.',
  'Com A sombra e a luz ligadas, troque o sol de lado e compare.',
]
const LADO = { left: 'na esquerda', right: 'na direita' } as const

/** O botão em destaque é o gesto que a fala do Zappy pede agora (a régua de `proximoGestoDaMemoria`). */
export type GestoDaLuz = 'sombra' | 'sol' | null
export function proximoGestoDaLuz(fala: string | undefined, l: SceneState['light']): GestoDaLuz {
  switch (fala) {
    // Ligar, e depois desligar para comparar (desligar só conta depois de ter ligado).
    case 'shading-start':
    case 'shading-flat':
    case 'shading-flat-late':
      return 'sombra'
    case 'shading-side':
      return l.shade ? 'sol' : 'sombra'
    default:
      return null
  }
}

export function LivreShading() {
  const { activity, state, dispatch, instruction } = useDiscovery()
  const l = state.light
  const completed = METAS_DA_LUZ.map((id) => state.evidence.discoveries.includes(id))
  const gesto = proximoGestoDaLuz(discoveryGuidance(activity, state)?.id, l)
  return (
    <Frame
      title="A luz dá volume"
      kind="luz"
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
          titulo="O que a luz faz com a bola"
          casos={[
            {
              rotulo: 'A sombra e a luz ligadas',
              visto: completed[0] ?? false,
              resposta: 'Três tons de azul: a bola parece redonda',
            },
            {
              rotulo: 'A sombra e a luz desligadas de novo',
              visto: completed[1] ?? false,
              resposta: 'Um tom só: a bola fica chapada',
            },
            {
              rotulo: 'O sol do outro lado',
              visto: completed[2] ?? false,
              resposta: 'O azul claro e o escuro trocam de lado',
            },
          ]}
        />
      }
    >
      <div className="grid gap-2">
        <SceneButton
          aria-pressed={l.shade}
          tom={gesto === 'sombra' ? 'gesto' : l.shade ? 'ligado' : 'ferramenta'}
          onClick={() => dispatch({ type: 'shade', on: !l.shade })}
        >
          A sombra e a luz: {l.shade ? 'ligadas' : 'desligadas'}
        </SceneButton>
        {/* ⚠️ Sem `aria-pressed`: o sol tem dois LUGARES, e não ligado e desligado (a régua da `Chave`
            com `seletor`). */}
        <SceneButton
          tom={gesto === 'sol' ? 'gesto' : 'ferramenta'}
          onClick={() => dispatch({ type: 'light', side: l.side === 'left' ? 'right' : 'left' })}
        >
          O sol: {LADO[l.side]}
        </SceneButton>
      </div>
      <p className="sz-discovery-small">Cada clique em O sol leva o sol para o outro lado.</p>
      <DicaLivre />
    </Frame>
  )
}
