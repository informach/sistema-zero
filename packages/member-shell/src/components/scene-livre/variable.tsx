'use client'

import { discoveryGuidance, type SceneState } from '@sistemazero/core/learning/scene'
import { Eye, EyeOff, NotebookPen, Target } from 'lucide-react'
import { SceneCenarioProvider } from '../scene-cenario-context'
import { VariableStage } from '../scene-core-stages'
import { Frame, SceneButton, useDiscovery } from '../scene-discovery-frame'

/**
 * A experiência `variable` em exploração livre (Construtor, Nave contra Asteroides, 02/11/2026): só a
 * IDEIA, no molde de `Door`, `Memory` (`scene-discovery-controls.tsx`) e dos Poderes
 * (`scene-poder-*.tsx`). Guardar um número (a caixa pontos) é uma coisa; mostrar o número na tela (o
 * placar, um recado para quem joga) é outra. Os blocos (criar a variável, somar, mostrar o placar)
 * ficam para a montagem do Estúdio. O que cada gesto faz só aparece depois de a criança testá-lo.
 */

/** As descobertas, na ordem da lista. Os ids são as metas da cena (`catalog.ts`). */
export const METAS_DA_VARIAVEL = ['stored', 'changed-hidden', 'shown'] as const
export const OBJETIVOS_DA_VARIAVEL = [
  'Guarde um número e compare a caixa pontos com a tela do jogo.',
  'Com o número fora da tela, acerte um asteroide e compare a caixa com a tela.',
  'Mostre o número na tela e compare com o que estava guardado.',
]

/** O botão em destaque é o gesto que a fala do Zappy pede agora (a régua de `proximoGestoDaMemoria`). */
export type GestoDaVariavel = 'guardar' | 'acertar' | 'mostrar' | 'tirar' | null
export function proximoGestoDaVariavel(
  fala: string | undefined,
  box: SceneState['box'],
): GestoDaVariavel {
  switch (fala) {
    case 'variable-start':
      return 'guardar'
    // Acertar com o número FORA da tela: com ele à vista, primeiro tirar da tela.
    case 'variable-stored':
    case 'variable-shown-hidden':
    case 'variable-hide':
    case 'variable-shown':
      return box.shown ? 'tirar' : 'acertar'
    case 'variable-hidden':
      return box.shown ? 'tirar' : 'mostrar'
    default:
      return null
  }
}

/** Os três gestos e o que cada um faz, revelado só depois do teste daquele gesto. */
function IdeiaDaVariavel({
  box,
  visto,
}: {
  box: SceneState['box']
  visto: { guardou: boolean; escondido: boolean; mostrou: boolean }
}) {
  const descobrir = 'Teste para descobrir'
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
              {visto.guardou ? 'O número fica na caixa pontos, mesmo sem aparecer.' : descobrir}
            </small>
          </span>
        </div>
        <div data-lit={visto.escondido}>
          <Target size={20} />
          <span>
            Acertar um asteroide com o número fora da tela
            <small>
              {visto.escondido ? 'Pontos muda, e a tela continua sem número.' : descobrir}
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
                : descobrir}
            </small>
          </span>
        </div>
      </div>
    </figure>
  )
}

export function LivreVariable() {
  const { activity, state, dispatch, instruction } = useDiscovery()
  const box = state.box
  const has = (id: string) => state.evidence.discoveries.includes(id)
  const completed = METAS_DA_VARIAVEL.map(has)
  const g = proximoGestoDaVariavel(discoveryGuidance(activity, state)?.id, box)
  const tom = (qual: GestoDaVariavel) => (g === qual ? 'gesto' : 'ferramenta')
  return (
    <Frame
      title="Guardar e mostrar um número"
      kind="variavel"
      activity={activity}
      state={state}
      text={instruction}
      goals={OBJETIVOS_DA_VARIAVEL}
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
          <Target size={16} /> Acertar um asteroide
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
          ? 'Cada acerto muda o número guardado. Guardar o número 0 de novo volta a caixa para 0; suas descobertas continuam marcadas.'
          : 'Primeiro guarde um número: sem número guardado, o acerto não tem o que mudar.'}
      </p>
      <p className="sz-discovery-free-hint">
        Experimente à vontade. Os destaques mostram o próximo teste, e você pode repetir quando
        quiser.
      </p>
    </Frame>
  )
}
