'use client'

import type {
  SceneAction,
  SceneActivity,
  ScenePort,
  SceneState,
} from '@sistemazero/core/learning/scene'
import { castText } from '@sistemazero/core/learning/scene'
import { ExperienceConnection as Connection } from './experience-connection'
import { SceneButton } from './exploration-stage'
import { CENAS_DO_CORRE_DINO, DinoSceneControls } from './scene-dino-controls'

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
  // ⚠️ O elenco entra AQUI, no helper, e não em cada chamada: os nomes dos fios citam o
  // personagem e o obstáculo ("Dino", "Nascer cacto"), e uma chamada esquecida deixaria um fio
  // falando do Corre Dino no meio de um curso de nave.
  const connection = (
    port: ScenePort,
    source: string,
    target: string,
    enabled: boolean,
    alternative = 'Desligar fio',
    motivo?: string,
  ) => (
    <Connection
      source={castText(source, activity.cast)}
      target={castText(target, activity.cast)}
      alternative={castText(alternative, activity.cast)}
      enabled={enabled}
      motivo={motivo ? castText(motivo, activity.cast) : undefined}
      onConnect={(enabled) => dispatch({ type: 'connect', port, enabled })}
    />
  )
  // ⚠️ O `fechadoAte` e o `descobriu` saíram no lote 5 do Raio-X: os fios que abriam por descoberta
  // (os do Corre Dino) foram para bancadas próprias (`scene-dino-controls` e
  // `scene-dino-numbers-controls`), onde fechado continua não sendo escondido.
  return (
    <div className="space-y-3">
      {m === 'world' && (
        /* ⭐⭐ Lote 5 do Raio-X (16/09/2026): CRIAR e DESENHAR são dois controles independentes e
           sempre à vista. O fio "Desenhar → Tela do jogo" só abria depois de criar, então a outra
           metade do contraste (ligar o desenho sem ninguém criado) não existia, e as duas metas caíam
           nos dois únicos toques possíveis, na única ordem possível. ⚠️ Sem a caixa tracejada em
           volta: ela era uma caixa dentro da moldura da bancada. */
        <div className="flex flex-wrap items-center gap-3">
          {/* ⚠️⚠️ A linha "Bastidores · ainda vazio" SAIU (lote 5). Desde que o palco mostra os
              bastidores e a tela lado a lado, ela era a mesma informação escrita duas vezes na
              mesma tela — e o desenho diz melhor: a caixa ou está vazia, ou tem o Dino dentro. */}
          {/* ⚠️⚠️ É ESTE o botão do print: a ação que MOVE a cena era um botãozinho de ferramenta
              dentro de uma caixa tracejada, enquanto "Ver de novo" era o azul grande do rodapé.
              ⚠️ Depois de criar, o lugar do botão FICA e continua FOCÁVEL (consertos do review da onda
              A do lote 5): virava um `<p>`, e o foco de quem usa teclado caía no `body` no instante do
              toque. Fechado, ele diz o que aconteceu, e um toque duplo não cai na chave ao lado. */}
          <SceneButton
            tom={state.world.created ? 'discreta' : 'gesto'}
            fechado={state.world.created}
            onClick={() => dispatch({ type: 'create' })}
          >
            {castText(state.world.created ? '✓ O Dino foi criado' : '＋ Criar Dino', activity.cast)}
          </SceneButton>
          {/* A chave do desenho, com o ESTADO no rótulo (a régua da `Chave`). ⚠️ Mesma ação de antes
              (`connect draw`): manifestos, roteiros e sessões guardadas seguem valendo. */}
          <SceneButton
            aria-pressed={state.world.drawn}
            tom={state.world.drawn ? 'ligado' : 'ferramenta'}
            onClick={() => dispatch({ type: 'connect', port: 'draw', enabled: !state.world.drawn })}
          >
            {castText('Desenhar o Dino na tela', activity.cast)}:{' '}
            {state.world.drawn ? 'ligado' : 'desligado'}
          </SceneButton>
          {/* ⚠️⚠️ A nota "O Dino continua nos bastidores com o desenho ligado ou desligado." SAIU
              (lote 2 do Raio-X): ela respondia a pergunta extra da cena antes de a criança mexer. */}
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
          {/* ⚠️ Os DOIS fios juntos, e nenhum deles escondido atrás de descoberta: a cena é
            sobre as duas contagens serem independentes, e isso só aparece quando dá para
            ligar e desligar cada uma delas com a outra à vista. */}
          {!pontoPorAcerto &&
            connection(
              'condition',
              '＋ Somar ponto',
              'Enquanto tem vida',
              state.lifeline.scoring,
              'Desligar fio',
            )}
          {connection('life', 'Bateu', '− Perder uma vida', state.lifeline.onHit, 'Desligar fio')}
        </div>
      )}
      {/* ⚠️ `restart`, `random` e `acceleration` saíram daqui no lote 5 do Raio-X: a bancada delas
          mora em `scene-dino-numbers-controls.tsx` (o toque, os sorteios e o relógio de 5 segundos). */}
    </div>
  )
}
