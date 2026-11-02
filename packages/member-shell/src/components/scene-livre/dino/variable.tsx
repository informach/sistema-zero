'use client'

import { discoveryGuidance, type SceneState } from '@sistemazero/core/learning/scene'
import { Eye, EyeOff, NotebookPen, Star } from 'lucide-react'
import { SceneCenarioProvider } from '../../scene-cenario-context'
import { VariableStage } from '../../scene-core-stages'
import { Frame, SceneButton, useDiscovery } from '../../scene-discovery-frame'
import { DESCOBRIR, DicaLivre } from '../nave-b-comum'
import { METAS_DA_VARIAVEL, proximoGestoDaVariavel } from '../variable'
import { semDino } from './comum'

/**
 * A `variable` do Corre Dino em exploração livre (Aula 11, 02/11/2026): só a IDEIA, no molde da tela
 * da Nave (`scene-livre/variable.tsx`). Guardar um número (a caixa pontos) é uma coisa; mostrar o
 * número na tela (um recado para quem joga) é outra; cada ponto que o Dino ganha muda o número
 * guardado, apareça ele ou não. Os blocos (criar a variável, somar, mostrar o placar) ficam para a
 * montagem do Estúdio. O destaque segue a régua da Nave (o "acertar" dela é o "Ganhar 1 ponto").
 */

export const OBJETIVOS_DA_VARIAVEL_DINO = [
  'Guarde um número e compare a caixa pontos com a tela do jogo.',
  'Com o número fora da tela, ganhe um ponto e compare a caixa com a tela.',
  'Mostre o número na tela e compare com o que estava guardado.',
]

/** Os três gestos e o que cada um faz, revelado só depois do teste daquele gesto. */
function IdeiaDaVariavel({
  box,
  visto,
}: {
  box: SceneState['box']
  visto: { guardou: boolean; escondido: boolean; mostrou: boolean }
}) {
  return (
    <figure className="sz-scene-regra door-rule variable-idea">
      <figcaption className="sz-scene-regra-titulo">
        Guardar é uma coisa, mostrar é outra
      </figcaption>
      <div className="door-question">
        <NotebookPen size={20} />
        <strong>
          A caixa pontos {box.created ? `guarda ${box.value}` : 'ainda não guarda nada'} · a tela{' '}
          {box.shown ? 'mostra o número' : 'está sem número'}
        </strong>
      </div>
      <div className="memory-actions">
        <div data-lit={visto.guardou}>
          <NotebookPen size={20} />
          <span>
            Guardar um número
            <small>
              {visto.guardou ? 'O número fica na caixa pontos, mesmo sem aparecer.' : DESCOBRIR}
            </small>
          </span>
        </div>
        <div data-lit={visto.escondido}>
          <Star size={20} />
          <span>
            Ganhar um ponto com o número fora da tela
            <small>
              {visto.escondido ? 'Pontos muda, e a tela continua sem número.' : DESCOBRIR}
            </small>
          </span>
        </div>
        <div data-lit={visto.mostrou}>
          <Eye size={20} />
          <span>
            Mostrar o número na tela
            <small>
              {visto.mostrou
                ? 'A tela mostra o mesmo número guardado, como um recado: pontos não muda.'
                : DESCOBRIR}
            </small>
          </span>
        </div>
      </div>
    </figure>
  )
}

export function LivreVariableDino() {
  const { activity, state, dispatch, instruction } = useDiscovery()
  const box = state.box
  const has = (id: string) => state.evidence.discoveries.includes(id)
  const completed = METAS_DA_VARIAVEL.map(has)
  const g = proximoGestoDaVariavel(semDino(discoveryGuidance(activity, state)?.id), box)
  const tom = (qual: typeof g) => (g === qual ? 'gesto' : 'ferramenta')
  return (
    <Frame
      title="Guardar e mostrar um número"
      kind="variavel"
      activity={activity}
      state={state}
      text={instruction}
      goals={OBJETIVOS_DA_VARIAVEL_DINO}
      completed={completed}
      done={completed.filter(Boolean).length}
      reset={() => dispatch({ type: 'reset' })}
      stage={
        <SceneCenarioProvider cenario={activity.cenario}>
          <VariableStage state={state} cast={activity.cast} semBlocos />
        </SceneCenarioProvider>
      }
      after={
        <IdeiaDaVariavel
          box={box}
          visto={{
            guardou: completed[0] ?? false,
            escondido: completed[1] ?? false,
            mostrou: completed[2] ?? false,
          }}
        />
      }
    >
      <div className="sz-discovery-controls free-controls">
        <SceneButton tom={tom('guardar')} onClick={() => dispatch({ type: 'store', value: 0 })}>
          <NotebookPen size={16} /> Guardar o número 0
        </SceneButton>
        <SceneButton
          tom={tom('acertar')}
          disabled={!box.created}
          onClick={() => dispatch({ type: 'change', by: 1 })}
        >
          <Star size={16} /> Ganhar 1 ponto
        </SceneButton>
        <SceneButton
          aria-pressed={box.shown}
          tom={g === 'mostrar' || g === 'tirar' ? 'gesto' : box.shown ? 'ligado' : 'ferramenta'}
          onClick={() => dispatch({ type: 'show', on: !box.shown })}
        >
          {box.shown ? <EyeOff size={16} /> : <Eye size={16} />}{' '}
          {box.shown ? 'Tirar o número da tela' : 'Mostrar o número na tela'}
        </SceneButton>
      </div>
      <p className="sz-discovery-small">
        {box.created
          ? 'Cada ponto ganho muda o número guardado. Guardar o número 0 de novo volta a caixa para 0; suas descobertas continuam marcadas.'
          : 'Primeiro guarde um número: sem número guardado, o ponto não tem o que mudar.'}
      </p>
      <DicaLivre />
    </Frame>
  )
}
