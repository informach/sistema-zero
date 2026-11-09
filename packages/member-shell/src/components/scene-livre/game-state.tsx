'use client'

import { discoveryGuidance, type SceneState } from '@sistemazero/core/learning/scene'
import { CirclePlay, Home, MessageCircleQuestion, Pause, Play, Sparkles } from 'lucide-react'
import { SceneCenarioProvider } from '../scene-cenario-context'
import { GameStateStage } from '../scene-dino-stages'
import { Frame, SceneButton, useDiscovery } from '../scene-discovery-frame'

/**
 * A experiência `game-state` em exploração livre (Construtor, Nave contra Asteroides, 02/11/2026):
 * só a IDEIA, no molde da pergunta da porta (`Door`, `scene-discovery-controls.tsx`). A cada toque
 * do relógio, o jogo pode perguntar antes de criar um asteroide: a partida já começou? As respostas
 * sim e não só mostram o que fazem depois de a criança testar cada uma. Nada de Se, então, senão,
 * bloco nem "estado do jogo é jogando": os blocos ficam para a montagem do Estúdio.
 *
 * ⚠️ O tempo é o ▶ do player (`running`/`setRunning`), o mesmo relógio de quadro fixo de toda cena.
 */

/** As descobertas, na ordem da lista. Os ids são as metas da cena (`catalog.ts`). */
export const METAS_DO_ESTADO = ['outside', 'waiting', 'playing'] as const
export const OBJETIVOS_DO_ESTADO = [
  'Sem a pergunta, deixe o tempo passar na tela de início e observe o contador.',
  'Com a pergunta, deixe o tempo passar na tela de início e compare o contador.',
  'Com a pergunta, comece a partida, deixe o tempo passar e compare o contador.',
]

/** O botão em destaque é o gesto que a fala do Zappy pede agora (a régua de `proximoGestoDaMemoria`). */
export type GestoDoEstado = 'pergunta' | 'tempo' | 'comecar' | 'inicio' | null
export function proximoGestoDoEstado(
  fala: string | undefined,
  m: SceneState['match'],
  rodando: boolean,
): GestoDoEstado {
  const tempo = rodando ? null : 'tempo'
  /** O caso pedido: a pergunta ligada ou desligada, e a tela de início ou a partida. */
  const caso = (pergunta: boolean, tela: 'start' | 'playing'): GestoDoEstado => {
    if (m.guarded !== pergunta) return 'pergunta'
    if (m.screen !== tela) return tela === 'start' ? 'inicio' : 'comecar'
    return tempo
  }
  switch (fala) {
    case 'game-state-start':
    case 'game-state-without':
      return caso(false, 'start')
    case 'game-state-start-question':
    case 'game-state-outside':
    case 'game-state-playing-first':
      return caso(true, 'start')
    case 'game-state-waiting':
      return caso(true, 'playing')
    default:
      return null
  }
}

/** A pergunta do jogo e as duas respostas, reveladas só depois do teste de cada uma. */
function PerguntaDoJogo({
  m,
  visto,
}: {
  m: SceneState['match']
  visto: { sem: boolean; nao: boolean; sim: boolean }
}) {
  const descobrir = 'Teste para descobrir'
  const resposta = m.guarded ? m.screen === 'playing' : null
  const estado = (escolhido: boolean) =>
    resposta === escolhido ? 'A resposta de agora' : resposta === null ? 'Pergunta desligada' : ''
  return (
    <figure className="sz-scene-regra door-rule game-state-idea">
      <figcaption className="sz-scene-regra-titulo">A pergunta do jogo</figcaption>
      <div className="memory-actions">
        <div data-lit={visto.sem}>
          <Sparkles size={20} />
          <span>
            Sem a pergunta, a cada toque do relógio
            <small>{visto.sem ? 'Nasce um asteroide, até na tela de início.' : descobrir}</small>
          </span>
        </div>
      </div>
      <div className="door-question">
        <MessageCircleQuestion size={20} />
        <strong>
          Com a pergunta: a partida já começou?{' '}
          {m.guarded ? '(pergunta ligada)' : '(pergunta desligada)'}
        </strong>
      </div>
      <div className="door-forks">
        <div data-selected={resposta === true} data-muted={resposta === false}>
          <span>Sim</span>
          {visto.sim ? (
            <Sparkles size={34} />
          ) : (
            <b className="door-fork-unknown" aria-hidden="true">
              ?
            </b>
          )}
          <strong>{visto.sim ? 'Nasce um asteroide' : descobrir}</strong>
          <small>{estado(true)}</small>
        </div>
        <div data-selected={resposta === false} data-muted={resposta === true}>
          <span>Não</span>
          {visto.nao ? (
            <Pause size={34} />
          ) : (
            <b className="door-fork-unknown" aria-hidden="true">
              ?
            </b>
          )}
          <strong>{visto.nao ? 'Nada nasce: o jogo espera' : descobrir}</strong>
          <small>{estado(false)}</small>
        </div>
      </div>
    </figure>
  )
}

export function LivreGameState() {
  const { activity, state, dispatch, instruction, running, setRunning } = useDiscovery()
  const m = state.match
  const has = (id: string) => state.evidence.discoveries.includes(id)
  const completed = METAS_DO_ESTADO.map(has)
  const g = proximoGestoDoEstado(discoveryGuidance(activity, state)?.id, m, running)
  const tom = (qual: GestoDoEstado) => (g === qual ? 'gesto' : 'ferramenta')
  const inicio = m.screen === 'start'
  return (
    <Frame
      title="A partida já começou?"
      kind="estado"
      activity={activity}
      state={state}
      text={instruction}
      goals={OBJETIVOS_DO_ESTADO}
      completed={completed}
      done={completed.filter(Boolean).length}
      reset={() => {
        setRunning(false)
        dispatch({ type: 'reset' })
      }}
      hud={
        <div className="walk-hud">
          <strong>{inicio ? 'Tela de início' : 'Jogando'}</strong>
          <span>Pergunta {m.guarded ? 'ligada' : 'desligada'}</span>
        </div>
      }
      stage={
        <SceneCenarioProvider cenario={activity.cenario}>
          <GameStateStage state={state} cast={activity.cast} preset={activity.setup?.preset} />
        </SceneCenarioProvider>
      }
      after={
        <PerguntaDoJogo
          m={m}
          visto={{
            sem: completed[0] ?? false,
            nao: completed[1] ?? false,
            sim: completed[2] ?? false,
          }}
        />
      }
    >
      <div className="sz-discovery-controls free-controls">
        <SceneButton
          aria-pressed={m.guarded}
          tom={g === 'pergunta' ? 'gesto' : m.guarded ? 'ligado' : 'ferramenta'}
          onClick={() => dispatch({ type: 'connect', port: 'condition', enabled: !m.guarded })}
        >
          <MessageCircleQuestion size={16} />{' '}
          {m.guarded ? 'Desligar a pergunta' : 'Ligar a pergunta'}
        </SceneButton>
      </div>
      <div className="sz-discovery-controls free-controls">
        <SceneButton
          tom={g === 'tempo' ? 'gesto' : running ? 'ligado' : 'ferramenta'}
          aria-pressed={running}
          onClick={() => setRunning(!running)}
        >
          {running ? <Pause size={16} /> : <Play size={16} />}{' '}
          {running ? 'Pausar o tempo' : 'Deixar o tempo passar'}
        </SceneButton>
        <SceneButton
          tom={tom('comecar')}
          disabled={!inicio}
          onClick={() => dispatch({ type: 'start', input: 'tap' })}
        >
          <CirclePlay size={16} /> Começar a partida
        </SceneButton>
        <SceneButton
          tom={tom('inicio')}
          disabled={inicio}
          onClick={() => dispatch({ type: 'home' })}
        >
          <Home size={16} /> Voltar à tela de início
        </SceneButton>
      </div>
      <p className="sz-discovery-small">
        Ligar ou desligar a pergunta e voltar à tela de início tiram os asteroides da tela e zeram o
        contador; suas descobertas continuam marcadas.
      </p>
      <p className="sz-discovery-free-hint">
        Experimente à vontade. Os destaques mostram o próximo teste, e você pode repetir quando
        quiser.
      </p>
    </Frame>
  )
}
