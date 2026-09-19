'use client'

import type { SceneAction, SceneActivity, SceneState } from '@sistemazero/core/learning/scene'
import { castText } from '@sistemazero/core/learning/scene'
import { SceneButton } from './exploration-stage'
import { CENAS_DO_CORRE_DINO, DinoSceneControls, PecaQueMudaDeCaixa } from './scene-dino-controls'

/**
 * ⚠️ A `ConditionPiece` e o `usePieceDrag` SAÍRAM (consertos do review da onda A do lote 5): a `score`
 * era a última cena com a peça antiga ("Colocar aqui" `disabled` nativo, fora do Tab e sem o nome da
 * peça e da caixa). Ela passou para a `PecaQueMudaDeCaixa` de `scene-dino-controls.tsx`, a mesma da
 * `game-state`, com o toque que escolhe, o arrasto e o teclado levando ao mesmo lugar.
 */
export function ExplorationPieces({
  activity,
  state,
  dispatch,
  more,
  travada = false,
  pontoPorAcerto = false,
}: {
  activity: SceneActivity
  state: SceneState
  dispatch: (action: SceneAction) => void
  more: boolean
  /** A montagem travada da demonstração (`MontagemTravada`): a peça não convida a arrastar. */
  travada?: boolean
  /**
   * ⚠️⚠️ As `lives` do Desafio contam ponto pelo ACERTO do tiro (consertos do review da onda A do lote
   * 5): no "Agora é sua vez" o fio "Somar ponto → Enquanto tem vida" ensinava o ponto por TEMPO, a
   * causa do Corre Dino, logo depois de a criança ver a do jogo dela. Com o roteiro atirando, ele sai.
   */
  pontoPorAcerto?: boolean
}) {
  const m = activity.scene
  // ⚠️ O helper `connection` (o fio) SAIU (full review de experiência, M8): as `lives` eram as últimas
  // cenas com fio aqui, e viraram a peça que muda de caixa. O fio vive na `gravity` (`scene-dino-controls`).
  // ⚠️ O `fechadoAte` e o `descobriu` saíram no lote 5 do Raio-X: os fios que abriam por descoberta
  // (os do Corre Dino) foram para bancadas próprias (`scene-dino-controls` e
  // `scene-dino-numbers-controls`), onde fechado continua não sendo escondido.
  return (
    <div className="space-y-3">
      {m === 'world' && (
        <div className="sz-scene-pecas">
          <section
            role="group"
            aria-label="Nos bastidores"
            className="space-y-2 rounded-2xl border border-border bg-muted/20 p-3"
          >
            <p className="text-sm font-bold text-foreground">Nos bastidores</p>
            <SceneButton
              tom="gesto"
              fechado={state.world.created}
              onClick={() => dispatch({ type: 'create' })}
            >
              {castText(
                state.world.created ? '✓ Dino nos bastidores' : 'Criar o Dino',
                activity.cast,
              )}
            </SceneButton>
            {state.world.created && (
              <p className="text-sm text-muted-foreground">
                {castText('O Dino já existe nos bastidores.', activity.cast)}
              </p>
            )}
          </section>
          <section
            role="group"
            aria-label="Na tela do jogo"
            className="space-y-2 rounded-2xl border border-border bg-muted/20 p-3"
          >
            <p className="text-sm font-bold text-foreground">Na tela do jogo</p>
            <SceneButton
              tom={state.world.drawn ? 'ligado' : 'ferramenta'}
              fechado={!state.world.created}
              aria-describedby="world-tela-do-jogo-nota"
              onClick={() =>
                dispatch({ type: 'connect', port: 'draw', enabled: !state.world.drawn })
              }
            >
              {castText(
                state.world.drawn ? 'Tirar o Dino da tela' : 'Mostrar o Dino na tela',
                activity.cast,
              )}
            </SceneButton>
            <p id="world-tela-do-jogo-nota" className="text-sm text-muted-foreground">
              {!state.world.created
                ? castText('Primeiro, crie o Dino nos bastidores.', activity.cast)
                : state.world.drawn
                  ? castText(
                      'O Dino apareceu na tela do jogo. Agora, tire o Dino da tela para comparar.',
                      activity.cast,
                    )
                  : castText(
                      'O Dino está nos bastidores. Agora, mostre o Dino na tela do jogo.',
                      activity.cast,
                    )}
            </p>
          </section>
        </div>
      )}
      {/* ⭐⭐ As oito cenas do Corre Dino, primeira metade, têm bancada própria (lote 5 do Raio-X):
          a ordem de desenhar em pilha, o fio da gravidade, as marcas do impulso e a PEÇA QUE MUDA
          DE CAIXA no lugar dos fios de som, nascimento, condição e toque. */}
      {(CENAS_DO_CORRE_DINO as readonly string[]).includes(m) && (
        <DinoSceneControls
          activity={activity}
          state={state}
          dispatch={dispatch}
          more={more}
          travada={travada}
        />
      )}
      {m === 'lives' && (
        <div className="space-y-3">
          {/* ⚠️ As DUAS peças juntas, e nenhuma delas escondida atrás de descoberta: a cena é sobre as
              duas contagens serem independentes, e isso só aparece quando dá para mexer em cada uma com a
              outra à vista.
              ⭐⭐ A PEÇA QUE MUDA DE CAIXA, e não o fio (full review de experiência, M8): no Dia 3 do Desafio
              a criança move "Criar asteroide" para dentro do relógio, o gesto do Estúdio, e no dia seguinte
              o "Agora é sua vez" das vidas voltava ao fio ("● Bateu ─── ● − Perder uma vida", "Desligar
              fio"). No Estúdio os dois são blocos dentro de eventos. ⚠️ As ações são as MESMAS
              (`connect life` e `connect condition`): roteiro, metas e manifesto não mudam. */}
          {pontoPorAcerto ? (
            /* No Desafio o ponto vem do acerto do tiro, que não é gesto da bancada: a caixa fica à vista,
               com a peça dentro, para a criança ver as duas regras lado a lado. */
            <div
              role="group"
              aria-label="Quando o tiro acertar"
              data-caixa="acerto"
              className="space-y-2 rounded-2xl border-2 border-primary/60 bg-primary/5 p-3"
            >
              <p className="text-sm font-semibold">Quando o tiro acertar</p>
              <p className="w-fit rounded-xl border-2 border-primary/40 bg-background px-4 py-2 text-sm font-semibold">
                <span aria-hidden>＋</span> Somar ponto
              </p>
            </div>
          ) : (
            <PecaQueMudaDeCaixa
              legenda="Onde está Somar ponto"
              peca="＋ Somar ponto"
              caixas={[
                { id: 'fora', titulo: 'Fora dos eventos' },
                { id: 'vida', titulo: 'Enquanto tem vida' },
              ]}
              atual={state.lifeline.scoring ? 'vida' : 'fora'}
              travada={travada}
              onMover={(caixa) =>
                dispatch({ type: 'connect', port: 'condition', enabled: caixa === 'vida' })
              }
            />
          )}
          <PecaQueMudaDeCaixa
            legenda="Onde está Perder uma vida"
            peca="− Perder uma vida"
            caixas={[
              { id: 'fora', titulo: 'Fora dos eventos' },
              { id: 'bater', titulo: 'Quando bater' },
            ]}
            atual={state.lifeline.onHit ? 'bater' : 'fora'}
            travada={travada}
            onMover={(caixa) =>
              dispatch({ type: 'connect', port: 'life', enabled: caixa === 'bater' })
            }
          />
        </div>
      )}
      {/* ⚠️ `restart`, `random` e `acceleration` saíram daqui no lote 5 do Raio-X: a bancada delas
          mora em `scene-dino-numbers-controls.tsx` (o toque, os sorteios e o relógio de 5 segundos). */}
    </div>
  )
}
