'use client'

import type { SceneAction, SceneCast, SceneId, SceneState } from '@sistemazero/core/learning/scene'
import {
  castText,
  SCENE_LIMITS,
  sceneAreaPercent,
  sceneAreaWidth,
} from '@sistemazero/core/learning/scene'
import { SceneButton } from './exploration-stage'
import { Chave, Escolha, Medida, type MetasDaBancada, metaAberta } from './scene-bench'

/**
 * A bancada do Corre Dino, segunda metade, e dos números (lote 5 do Raio-X, 16/09/2026): `restart`,
 * `score`, `random`, `acceleration`, `hitbox` e `lives`.
 *
 * ⚠️ O GESTO de cada cena é o do jogo: tocar na tela (`restart`), passar de tela (`score`), sortear
 * (`random`) e o relógio de 5 segundos do Estúdio (`acceleration`). A bancada antiga tinha "Enter:
 * começar", "Perto / No meio / Longe", "Aproximar até bater", quatro exemplos fixos de sorteio e dois
 * relógios diferentes; nada disso existia no jogo que a criança monta logo depois.
 * ⚠️ `onRunning` é o ▶ do PLAYER: o gesto que começa a partida solta o tempo, como o pulo faz.
 * ⚠️ O peça-caixa da `score` (Somar ponto em Se jogando) continua em `exploration-pieces.tsx`.
 */
export function DinoNumbersControls({
  scene,
  state,
  dispatch,
  cast,
  goals,
  onRunning,
  pontoPorAcerto = false,
}: {
  scene: SceneId
  state: SceneState
  dispatch: (action: SceneAction) => void
  cast?: SceneCast
  goals: MetasDaBancada
  onRunning: (ligado: boolean) => void
  /** As `lives` do Desafio: o ponto vem do ACERTO do tiro (ver `ExplorationPieces`). */
  pontoPorAcerto?: boolean
}) {
  const nome = (texto: string) => castText(texto, cast)
  const descobriu = metaAberta(goals, state)
  switch (scene) {
    case 'restart': {
      const tela = state.match.screen
      return (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* ⚠️ Fechado JOGANDO, e não escondido: no jogo o toque durante a partida é o pulo, e
                aqui a cena só mostra os cactos chegando. */}
            <SceneButton
              tom="gesto"
              // ⚠️ Recebe o foco quando a partida começa pelo palco (consertos da onda A, T3): fechado,
              // ele diz o motivo a quem ouve.
              data-foco-depois-de-comecar=""
              fechado={tela === 'playing'}
              aria-describedby={tela === 'playing' ? 'restart-toque-nota' : undefined}
              onClick={() => {
                if (tela === 'start') onRunning(true)
                dispatch({ type: 'start', input: 'tap' })
              }}
            >
              <span aria-hidden>👆</span> Tocar na tela
            </SceneButton>
            {tela === 'playing' && (
              <span id="restart-toque-nota" className="text-sm text-muted-foreground">
                {nome('Deixe o tempo passar até um cacto chegar.')}
              </span>
            )}
          </div>
          <Escolha
            label="No fim, o toque faz"
            valor={state.match.restartConnected ? 'reiniciar' : 'inicio'}
            opcoes={[
              { id: 'inicio', label: 'Ir para o início' },
              { id: 'reiniciar', label: 'Reiniciar o jogo' },
            ]}
            onChange={(v) =>
              dispatch({ type: 'connect', port: 'restart', enabled: v === 'reiniciar' })
            }
          />
        </div>
      )
    }
    case 'score': {
      const tela = state.match.screen
      const proxima =
        tela === 'start'
          ? { rotulo: 'Jogando', acao: { type: 'start', input: 'key' } as const }
          : tela === 'playing'
            ? { rotulo: 'Fim', acao: { type: 'collide' } as const }
            : { rotulo: 'Início', acao: { type: 'home' } as const }
      return (
        <div className="flex flex-wrap items-center gap-3">
          {/* ⚠️ Um gesto só para as três telas (lote 5): "Enter: começar", "Voltar ao início" e
              "Aproximar até bater" eram três botões para uma volta que a criança faz em ordem. */}
          <SceneButton
            tom="gesto"
            data-foco-depois-de-comecar=""
            onClick={() => {
              onRunning(true)
              dispatch(proxima.acao)
            }}
          >
            Próxima tela: {proxima.rotulo}
          </SceneButton>
        </div>
      )
    }
    case 'random': {
      const abriu = descobriu('repeat')
      return (
        <div className="flex flex-wrap items-start gap-3">
          <SceneButton
            tom="gesto"
            onClick={() =>
              // ⚠️⚠️ O sorteio é DE VERDADE: o número sai daqui, do navegador, e viaja no gesto. O
              // motor só o transforma em lugar, então o servidor refaz o mesmo mundo.
              dispatch({ type: 'sample', kind: 'position', unit: Math.random(), guided: false })
            }
          >
            <span aria-hidden>🎲</span> Sortear lugar (velocidade fica −5)
          </SceneButton>
          <div className="space-y-2">
            {/* ⚠️ Uma coisa por vez: a velocidade abre depois de o lugar repetir, e a nota diz o
                GESTO que abre, nunca o resultado. */}
            <SceneButton
              fechado={!abriu}
              aria-describedby={abriu ? undefined : 'random-velocidade-nota'}
              onClick={() =>
                dispatch({ type: 'sample', kind: 'velocity', unit: Math.random(), guided: false })
              }
            >
              <span aria-hidden>🎲</span> Sortear velocidade (lugar fica 500)
            </SceneButton>
            {!abriu && (
              <p id="random-velocidade-nota" className="text-sm text-muted-foreground">
                Abre depois de sortear o lugar mais algumas vezes.
              </p>
            )}
          </div>
        </div>
      )
    }
    case 'acceleration': {
      /**
       * ⚠️⚠️ A chave da condição fica FECHADA até o −10 sair com a base parada (consertos do review da onda
       * A do lote 5, A1). Desligar antes leva a base a −10, e religar não a traz de volta (é a condição do
       * Estúdio): `base-limit` e `variation-limit` ficavam impossíveis até Recomeçar, com o pedido de
       * `past-limit` à vista convidando a desligar primeiro. ⚠️ É a exceção consciente ao "nunca fechada
       * LIGADA": ligada é o mundo de FÁBRICA desta cena, e não um caso do professor. Com a condição já
       * desligada (um caso, ou a sessão do lote 4) a chave fica aberta, e só as metas que a atividade
       * COBRA seguram (um caso que só pede `past-limit` abre de cara).
       */
      const antes = ['base-limit', 'variation-limit'].filter((id) => goals.some((g) => g.id === id))
      const aberta = !state.speed.limited || antes.every((id) => descobriu(id))
      return (
        <div className="flex flex-wrap items-start gap-3">
          <SceneButton
            tom="gesto"
            onClick={() =>
              // "Passar 5 segundos": a base anda e UM cacto nasce, com o sorteio de agora.
              dispatch({ type: 'sample', kind: 'velocity', unit: Math.random(), guided: false })
            }
          >
            <span aria-hidden>◷</span> Passar 5 segundos
          </SceneButton>
          <Chave
            label="A condição Se velocidade > −9"
            ligado={state.speed.limited}
            disabled={!aberta}
            // ⚠️ O GESTO que abre, nunca o resultado ("abre quando sair −10" era a previsão).
            nota={
              aberta
                ? undefined
                : 'Abre depois de passar 5 segundos mais algumas vezes com a base parada.'
            }
            onToggle={(enabled) => dispatch({ type: 'connect', port: 'limit', enabled })}
          />
        </div>
      )
    }
    case 'hitbox': {
      // ⚠️⚠️ Em PORCENTAGEM, como o Estúdio (lote 5): "área de colisão 80%". O motor guarda a largura.
      /**
       * ⚠️⚠️ A área também abre quando a de AGORA não consegue mostrar a batida com vão (consertos do
       * review da onda A do lote 5, A4): a sessão do lote 4 reabria com 75%, `contact` pede um vão à vista,
       * e o controle que resolveria só abria com `contact`. Sem saída até Recomeçar. Abaixo de 100% a
       * batida de 10 em 10 já encosta os desenhos.
       */
      const presa = !descobriu('contact') && sceneAreaPercent(state.contact.width) < 100
      const abriu = descobriu('contact') || presa
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <Medida
            // ⚠️ Os rótulos passam pelo elenco: numa turma de nave, "Distância do asteroide".
            label={nome('Distância do cacto')}
            value={state.contact.distance}
            min={SCENE_LIMITS.move.min}
            max={SCENE_LIMITS.move.max}
            passo={10}
            onChange={(distance) => dispatch({ type: 'move', distance })}
          />
          {/* ⭐ Uma variável por vez: a área abre depois do BATEU (fechado não é escondido). */}
          <Medida
            label={nome('Tamanho da área do Dino')}
            value={sceneAreaPercent(state.contact.width)}
            texto={`${sceneAreaPercent(state.contact.width)}%`}
            min={50}
            max={150}
            passo={10}
            tom="text-scene-b-ink"
            disabled={!abriu}
            // ⚠️ A nota diz o GESTO que abre (lote 2), nunca "quando" bate: é a pergunta da previsão.
            nota={
              presa
                ? nome('Aumente a área e aproxime o cacto de novo.')
                : abriu
                  ? undefined
                  : nome('Abre depois que você aproximar o cacto um toque de cada vez.')
            }
            onChange={(pct) => dispatch({ type: 'resize', width: sceneAreaWidth(pct) })}
          />
        </div>
      )
    }
    case 'lives': {
      const semVidas = state.lifeline.lives === 0
      return (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border p-4">
          {/* ⚠️⚠️ O TIRO na bancada quando o ponto vem do acerto (consertos do review da onda A do lote 5):
              o "Agora é sua vez" do Dia 4 não tinha tiro, e a criança não tinha como repetir a causa
              que tinha acabado de ver. */}
          {pontoPorAcerto && (
            <SceneButton
              tom="gesto"
              fechado={semVidas}
              aria-describedby={semVidas ? 'lives-nota' : undefined}
              onClick={() => dispatch({ type: 'shoot' })}
            >
              {nome('Atirar no cacto')}
            </SceneButton>
          )}
          {/* ⚠️ O destaque só com ponto no placar (lote 5): batendo com o placar em 0 não dá para ver
              que as duas contagens são separadas, e o gesto em azul levava a criança para lá.
              ⚠️ `fechado`, e não `disabled` (consertos do review da onda A do lote 5): sem vidas ele saía
              do Tab, ao contrário das outras bancadas, e o motivo não era ouvido. */}
          <SceneButton
            tom={state.lifeline.points > 0 ? 'gesto' : 'ferramenta'}
            fechado={semVidas}
            aria-describedby={semVidas ? 'lives-nota' : undefined}
            onClick={() => dispatch({ type: 'collide' })}
          >
            {nome('Bater no cacto')}
          </SceneButton>
          <span id="lives-nota" className="text-sm text-muted-foreground">
            {semVidas
              ? 'Sem vidas. Use Recomeçar para jogar de novo.'
              : pontoPorAcerto
                ? 'Atire ou bata e olhe o placar e os corações.'
                : // ⚠️ Sem "eles decidem o que a batida faz": puxava a resposta da previsão.
                  'Os fios ficam logo abaixo.'}
          </span>
        </div>
      )
    }
    default:
      return null
  }
}
