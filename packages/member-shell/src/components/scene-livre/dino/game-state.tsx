'use client'

import { discoveryGuidance, type SceneState } from '@sistemazero/core/learning/scene'
import { CirclePlay, Home, MessageCircleQuestion, Pause, Play, Sparkles } from 'lucide-react'
import { SceneCenarioProvider } from '../../scene-cenario-context'
import { GameStateStage } from '../../scene-dino-stages'
import { Frame, SceneButton, useDiscovery } from '../../scene-discovery-frame'
import { METAS_DO_ESTADO, proximoGestoDoEstado } from '../game-state'
import { DESCOBRIR, DicaLivre } from '../nave-b-comum'
import { semDino } from './comum'

/**
 * A `game-state` do Corre Dino em exploração livre (Aula 7, 02/11/2026): só a IDEIA, no molde da tela
 * da Nave (`scene-livre/game-state.tsx`) e da pergunta da porta do Farol. A cada toque do relógio, o
 * jogo pode perguntar antes de criar um cacto: a partida já começou? As respostas sim e não só
 * mostram o que fazem depois de a criança testar cada uma. Nada de Se, então, senão, bloco nem o nome
 * do bloco da condição: os blocos ficam para a montagem do Estúdio. O destaque segue a régua da
 * Nave (as falas do Dino são o espelho das dela).
 */

export const OBJETIVOS_DO_ESTADO_DINO = [
  'Sem a pergunta, deixe o tempo passar na tela de início e observe o contador de cactos.',
  'Com a pergunta, deixe o tempo passar na tela de início e compare o contador.',
  'Com a pergunta, comece a partida, deixe o tempo passar e compare o contador.',
]

/** A pergunta do jogo e as duas respostas, reveladas só depois do teste de cada uma. */
function PerguntaDoJogo({
  m,
  visto,
}: {
  m: SceneState['match']
  visto: { sem: boolean; nao: boolean; sim: boolean }
}) {
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
            <small>{visto.sem ? 'Nasce um cacto, até na tela de início.' : DESCOBRIR}</small>
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
          <strong>{visto.sim ? 'Nasce um cacto' : DESCOBRIR}</strong>
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
          <strong>{visto.nao ? 'Nada nasce: o jogo espera' : DESCOBRIR}</strong>
          <small>{estado(false)}</small>
        </div>
      </div>
    </figure>
  )
}

export function LivreGameStateDino() {
  const { activity, state, dispatch, instruction, running, setRunning } = useDiscovery()
  const m = state.match
  const has = (id: string) => state.evidence.discoveries.includes(id)
  const completed = METAS_DO_ESTADO.map(has)
  const g = proximoGestoDoEstado(semDino(discoveryGuidance(activity, state)?.id), m, running)
  const tom = (qual: typeof g) => (g === qual ? 'gesto' : 'ferramenta')
  const inicio = m.screen === 'start'
  return (
    <Frame
      title="A partida já começou?"
      kind="estado"
      activity={activity}
      state={state}
      text={instruction}
      goals={OBJETIVOS_DO_ESTADO_DINO}
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
        Ligar ou desligar a pergunta e voltar à tela de início tiram os cactos da tela e zeram o
        contador; suas descobertas continuam marcadas.
      </p>
      <DicaLivre />
    </Frame>
  )
}
