'use client'

import {
  discoveryGuidance,
  mirrorAxes,
  mirrorModeFor,
  type SceneState,
} from '@sistemazero/core/learning/scene'
import { useId } from 'react'
import { ExplorationStage } from '../exploration-stage'
import { Frame, SceneButton, useDiscovery } from '../scene-discovery-frame'
import { DicaLivre, IdeiaDoAtelie } from './atelie-comum'

/**
 * A experiência `symmetry` em exploração livre (Construtor, 02/11/2026): só a IDEIA, no molde de
 * `Door`, `Memory` (`scene-discovery-controls.tsx`) e dos Poderes (`scene-poder-*.tsx`). O palco é o
 * de sempre (a grade 16 × 16 da nave, que também aceita toque num quadradinho); os controles são os
 * do Pinta: os DOIS espelhos como chaves independentes, os traços prontos e o Balde de tinta.
 *
 * ⚠️ O Espelho de cima e de baixo abre depois do lado a lado (o motor só conta `axis-decides` depois
 * de `two-sides`, e a bancada antiga fazia o mesmo): fechado com o motivo, nunca escondido, e nunca
 * fechado LIGADO.
 */

/** As descobertas, na ordem da lista. Os ids são as metas da cena (`catalog.ts`). */
export const METAS_DO_ESPELHO = [
  'one-side',
  'two-sides',
  'axis-decides',
  'fill-ignores-mirror',
] as const
const OBJETIVOS = [
  'Com os dois espelhos desligados, pinte a asa.',
  'Com só o Espelho lado a lado, pinte a asa e compare.',
  'Com só o Espelho de cima e de baixo, pinte a asa e compare.',
  'Com o Espelho lado a lado, use o Balde de tinta na asa.',
]

/** O botão em destaque é o gesto que a fala do Zappy pede agora (a régua de `proximoGestoDaMemoria`). */
export type GestoDoEspelho = 'lado' | 'cima' | 'asa' | 'balde' | null
export function proximoGestoDoEspelho(
  fala: string | undefined,
  m: SceneState['mirror'],
): GestoDoEspelho {
  const { x, y } = mirrorAxes(m.on, m.axis)
  switch (fala) {
    case 'symmetry-start':
    case 'symmetry-off-late':
      return x ? 'lado' : y ? 'cima' : 'asa'
    case 'symmetry-mirror':
      return y ? 'cima' : !x ? 'lado' : 'asa'
    case 'symmetry-axis':
      return x ? 'lado' : !y ? 'cima' : 'asa'
    case 'symmetry-fill':
      return y ? 'cima' : !x ? 'lado' : 'balde'
    default:
      return null
  }
}

export function LivreSymmetry() {
  const { activity, state, dispatch, instruction } = useDiscovery()
  const nota = useId()
  const m = state.mirror
  const espelhos = mirrorAxes(m.on, m.axis)
  const completed = METAS_DO_ESPELHO.map((id) => state.evidence.discoveries.includes(id))
  const gesto = proximoGestoDoEspelho(discoveryGuidance(activity, state)?.id, m)
  const tom = (qual: GestoDoEspelho) => (gesto === qual ? 'gesto' : 'ferramenta')
  const cimaEBaixoAberto = (completed[1] ?? false) || espelhos.y
  const chave = (qual: 'lado' | 'cima', ligado: boolean) =>
    gesto === qual ? 'gesto' : ligado ? 'ligado' : 'ferramenta'
  return (
    <Frame
      title="O que o espelho faz com o seu traço?"
      kind="espelho"
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
          titulo="Onde o traço aparece"
          casos={[
            {
              rotulo: 'Espelhos desligados',
              visto: completed[0] ?? false,
              resposta: 'A asa fica só onde você pintou',
            },
            {
              rotulo: 'Espelho lado a lado',
              visto: completed[1] ?? false,
              resposta: 'Uma cópia do outro lado da linha do meio, em pé',
            },
            {
              rotulo: 'Espelho de cima e de baixo',
              visto: completed[2] ?? false,
              resposta: 'Uma cópia do outro lado da linha do meio, deitada',
            },
            {
              rotulo: 'Balde de tinta com o espelho ligado',
              visto: completed[3] ?? false,
              resposta: 'Enche só a asa em que você clicou',
            },
          ]}
        />
      }
    >
      <div className="grid gap-2">
        <SceneButton
          aria-pressed={espelhos.x}
          tom={chave('lado', espelhos.x)}
          onClick={() =>
            dispatch({ type: 'mirror-mode', mode: mirrorModeFor(!espelhos.x, espelhos.y) })
          }
        >
          Espelho lado a lado: {espelhos.x ? 'ligado' : 'desligado'}
        </SceneButton>
        <SceneButton
          aria-pressed={espelhos.y}
          aria-describedby={cimaEBaixoAberto ? undefined : nota}
          tom={chave('cima', espelhos.y)}
          fechado={!cimaEBaixoAberto}
          onClick={() =>
            dispatch({ type: 'mirror-mode', mode: mirrorModeFor(espelhos.x, !espelhos.y) })
          }
        >
          Espelho de cima e de baixo: {espelhos.y ? 'ligado' : 'desligado'}
        </SceneButton>
        {cimaEBaixoAberto ? null : (
          <p id={nota} className="sz-discovery-small">
            Abre depois que você pintar a asa com o Espelho lado a lado.
          </p>
        )}
      </div>
      <div className="sz-discovery-controls free-controls">
        <SceneButton tom={tom('asa')} onClick={() => dispatch({ type: 'trace', piece: 'asa' })}>
          Pintar a asa
        </SceneButton>
        <SceneButton onClick={() => dispatch({ type: 'trace', piece: 'ponta' })}>
          Pintar a ponta
        </SceneButton>
        <SceneButton onClick={() => dispatch({ type: 'trace', piece: 'cabine' })}>
          Pintar a cabine
        </SceneButton>
        <SceneButton tom={tom('balde')} onClick={() => dispatch({ type: 'fill' })}>
          Balde de tinta: encher a asa
        </SceneButton>
        <SceneButton tom="discreta" onClick={() => dispatch({ type: 'clear-paper' })}>
          Apagar o papel
        </SceneButton>
      </div>
      <p className="sz-discovery-small">
        Apagar o papel deixa a grade em branco; suas descobertas continuam marcadas.
      </p>
      <DicaLivre />
    </Frame>
  )
}
