import { RotateCcw } from 'lucide-react'
import { SceneCenarioProvider } from './scene-cenario-context'
import { Frame, Note, SceneButton, useDiscovery } from './scene-discovery-frame'
import { FoundCounterStage } from './scene-found-counter'
import { CounterValue, TouchRule } from './scene-garden-learning'
import { TwoHidingPlaces } from './scene-two-hiding-places'
export function ProposedGarden({ part }: { part: 'touch' | 'count' }) {
  const context = useDiscovery(),
    { state, activity } = context
  const dispatch = (
    action: Parameters<typeof context.dispatch>[0] | { type: 'new-trial' } | { type: 'reset-all' },
  ) =>
    context.dispatch(
      action.type === 'new-trial'
        ? { type: 'restart-hiding-places' }
        : action.type === 'reset-all'
          ? { type: 'reset' }
          : action,
    )
  const seen = Object.fromEntries(state.evidence.discoveries.map((id) => [id, true]))
  const match = state.match,
    touch = part === 'touch'
  const completed = touch
    ? [!!seen['no-response'], !!seen.responds, !!seen['second-target']]
    : ['first-find', 'second-find', 'no-find', 'repeat', 'back-to-zero'].map((id) => !!seen[id])
  const goals = touch
    ? [
        'Compare um toque com a reação desligada.',
        'Compare um toque com a reação ligada.',
        'Teste a reação nos dois esconderijos.',
      ]
    : [
        'Observe o valor depois do primeiro achado.',
        'Encontre outro personagem e compare o valor.',
        'Toque no vazio e observe o valor.',
        'Toque de novo em um personagem encontrado.',
        'Recomece uma busca depois de encontrar alguém.',
      ]
  const text = context.instruction
  return (
    <div className="garden-proposal">
      <Frame
        title={part === 'touch' ? 'O toque faz o jogo responder' : 'Um número acompanha a busca'}
        kind={part}
        activity={activity}
        state={state}
        text={text}
        goals={goals}
        completed={completed}
        done={completed.filter(Boolean).length}
        reset={() => dispatch({ type: 'reset-all' })}
        hud={
          <div className="walk-hud">
            <strong>{touch ? 'Escolha onde tocar' : 'Cada novo achado soma 1'}</strong>
          </div>
        }
        stage={
          <SceneCenarioProvider cenario="jardim">
            {touch ? (
              <TwoHidingPlaces state={state} dispatch={dispatch} />
            ) : (
              <FoundCounterStage state={state} dispatch={dispatch} />
            )}
          </SceneCenarioProvider>
        }
        after={
          touch ? (
            <Note label="Último teste" tone="blue">
              {state.caption || 'Arbusto e pedras estão prontos. Você escolhe qual testar.'}
            </Note>
          ) : undefined
        }
      >
        {touch ? (
          <>
            <TouchRule
              enabled={match.touch}
              chosen={
                match.gardenChosen === undefined
                  ? null
                  : match.gardenChosen === 0
                    ? 'arbusto'
                    : 'pedras'
              }
            />
            <div className="sz-discovery-controls free-controls">
              <SceneButton
                tom={!match.touch && !seen.responds ? 'gesto' : 'ferramenta'}
                aria-pressed={match.touch}
                onClick={() => dispatch({ type: 'connect', port: 'touch', enabled: !match.touch })}
              >
                {match.touch ? 'Desligar a reação ao toque' : 'Ligar a reação ao toque'}
              </SceneButton>
              <SceneButton
                tom={(match.gardenFound?.length ?? 0) > 0 ? 'gesto' : 'ferramenta'}
                onClick={() => dispatch({ type: 'new-trial' })}
              >
                <RotateCcw size={16} />
                Esconder de novo
              </SceneButton>
            </div>
            <p className="sz-discovery-small">
              Ligar ou desligar muda a regra para os próximos toques. Esconder de novo prepara outro
              teste e mantém a ligação como você deixou.
            </p>
          </>
        ) : (
          <>
            <CounterValue
              value={match.points}
              update={match.counterUpdate ?? { before: 0, after: 0, kind: 'initial' }}
              trace={state.caption}
            />
            <div className="sz-discovery-controls">
              <SceneButton
                tom={!seen['back-to-zero'] && match.points > 0 ? 'gesto' : 'ferramenta'}
                onClick={() => dispatch({ type: 'restart-search' })}
              >
                <RotateCcw size={16} />
                Recomeçar a busca
              </SceneButton>
            </div>
          </>
        )}
        <p className="sz-discovery-free-hint">
          Você escolhe a ordem dos testes. As descobertas continuam marcadas ao preparar outra
          tentativa.
        </p>
      </Frame>
    </div>
  )
}
