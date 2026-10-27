import { SceneCenarioProvider } from '@sistemazero/member-shell/components/scene-cenario-context'
import { FoundCounterStage } from '@sistemazero/member-shell/components/scene-found-counter'
import { CounterValue } from '@sistemazero/member-shell/components/scene-garden-learning'
import { TwoHidingPlaces } from '@sistemazero/member-shell/components/scene-two-hiding-places'
import { RotateCcw } from 'lucide-react'
import { useReducer } from 'react'
import { items, type Part, source } from './data'
import { type HistoryAction, historyStep, type Model, start } from './model'
import { Frame, Note, SceneButton } from './shared'
import { TouchRule } from './touch-rule'
export function ProposedGarden({ part }: { part: Part }) {
  const [history, dispatch] = useReducer(
    (m: Model[], a: HistoryAction) => historyStep(part, m, a),
    part,
    (p: Part) => [start(p)],
  )
  const model = history[history.length - 1]!
  const { state, seen } = model,
    match = state.match,
    touch = part === 'touch'
  const completed = touch
    ? [!!seen['no-response'], !!seen.responds, !!seen['target-0'] && !!seen['target-1']]
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
  const all = completed.every(Boolean)
  let text: string
  if (touch) {
    const exhausted = (match.gardenFound?.length ?? 0) === 2
    text = all
      ? 'Você comparou os dois modos e os dois esconderijos. Pode esconder os personagens de novo e experimentar outras sequências.'
      : exhausted
        ? 'Os dois personagens apareceram. Use Esconder de novo para preparar outro teste. Você pode mudar a ligação antes ou depois.'
        : !match.touch
          ? 'Escolha um esconderijo e toque nele. A reação está desligada. Você também pode ligá-la primeiro e depois comparar.'
          : !seen['no-response']
            ? 'A reação está ligada. Escolha um esconderijo para testar. Quando quiser comparar, desligue a reação e toque em um esconderijo ainda visível.'
            : 'A reação está ligada. Toque em um esconderijo e veja qual deles fica invisível. Você pode escolher qualquer um.'
  } else {
    const update = match.counterUpdate
    const result =
      update?.kind === 'empty'
        ? `Você tocou no vazio. O valor continuou em ${match.points}.`
        : update?.kind === 'repeat'
          ? `Você repetiu o toque. O valor continuou em ${match.points}.`
          : update?.kind === 'add'
            ? `Um novo personagem apareceu: ${update.before} + 1 = ${update.after}.`
            : update?.kind === 'reset'
              ? 'A busca recomeçou com zero. As comparações já feitas continuam marcadas.'
              : 'Escolha onde tocar no jardim. Você pode procurar personagens, tocar no vazio e recomeçar quando quiser.'
    const hint = all
      ? 'Continue explorando na ordem que quiser.'
      : !seen['first-find']
        ? 'Experimente encontrar um personagem.'
        : !seen['second-find']
          ? 'Outro personagem faz o número mudar?'
          : !seen['no-find']
            ? 'Compare também um toque no espaço vazio.'
            : !seen.repeat
              ? 'Experimente tocar de novo onde um personagem já apareceu.'
              : 'Que valor fica guardado ao recomeçar a busca?'
    text = `${result} ${hint}`
  }
  const item = items.find((i) => i.id === part)!
  return (
    <div className="garden-proposal">
      <Frame
        title={item.title}
        kind={part}
        activity={source(part).activity}
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
            <div className="farol-controls free-controls">
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
            <p className="farol-small">
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
            <div className="farol-controls">
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
        <SceneButton disabled={history.length === 1} onClick={() => dispatch({ type: 'undo' })}>
          Desfazer último teste
        </SceneButton>
        <p className="farol-free-hint">
          Você escolhe a ordem dos testes. As descobertas continuam marcadas ao preparar outra
          tentativa.
        </p>
      </Frame>
    </div>
  )
}
