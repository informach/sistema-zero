'use client'

import { discoveryGuidance, quantos, type SceneState } from '@sistemazero/core/learning/scene'
import { Home, Pause, Play, Pointer, RotateCcw } from 'lucide-react'
import { useEffect } from 'react'
import { SceneCenarioProvider } from '../../scene-cenario-context'
import { RestartStage } from '../../scene-dino-numbers-stages'
import { Frame, SceneButton, useDiscovery } from '../../scene-discovery-frame'
import { DESCOBRIR, DicaLivre } from '../nave-b-comum'
import { proximoGestoDoRecomeco } from '../restart'
import { semDino } from './comum'

/**
 * A `restart` do Corre Dino em exploração livre (Aula 9, 02/11/2026): só a IDEIA, no molde da tela da
 * Nave (`scene-livre/restart.tsx`), com o TOQUE na tela do Corre Dino no lugar do Enter. No fim da
 * partida, o toque pode só voltar para a tela de início ou começar tudo de novo; o que cada jeito faz
 * com a partida seguinte só aparece depois de a criança testar aquele jeito. Nada dos nomes dos
 * blocos ("Mudar o estado do jogo…", "Reiniciar o jogo"), regra nem estado escrito como código.
 *
 * As metas: `screen-only` e `clean-track`, em qualquer ordem no modo livre (o motor, `tocarNaTela`).
 * O destaque segue a régua da Nave (`proximoGestoDoRecomeco`: o "enter" dela é o "Tocar na tela").
 * ⚠️ O tempo é o ▶ do player: começar a partida o solta, e esta tela o para fora da partida.
 */

export const METAS_DO_RECOMECO_DINO = ['screen-only', 'clean-track'] as const
const OBJETIVOS: Record<string, string> = {
  ended: 'Toque na tela para jogar e deixe o tempo passar até um cacto bater no Dino.',
  'screen-only':
    'Com Só voltar para a tela de início, jogue até bater, comece outra partida e observe os cactos.',
  'clean-track':
    'Com Começar tudo de novo, jogue até bater, comece outra partida e compare a pista.',
}

/** Os dois jeitos de recomeçar, com o que cada um faz revelado só depois do teste daquele jeito. */
function OsDoisJeitos({
  m,
  visto,
}: {
  m: SceneState['match']
  visto: { tela: boolean; tudo: boolean }
}) {
  return (
    <figure className="sz-scene-regra door-rule restart-idea">
      <figcaption className="sz-scene-regra-titulo">No fim da partida, o toque…</figcaption>
      <div className="door-forks">
        <div data-selected={!m.restartConnected} data-muted={m.restartConnected}>
          <span>Só voltar para a tela de início</span>
          {visto.tela ? (
            <Home size={34} />
          ) : (
            <b className="door-fork-unknown" aria-hidden="true">
              ?
            </b>
          )}
          <strong>
            {visto.tela
              ? 'Os cactos da partida anterior ficam na pista, e a partida nova acaba na hora'
              : DESCOBRIR}
          </strong>
          <small>{m.restartConnected ? '' : 'O jeito escolhido'}</small>
        </div>
        <div data-selected={m.restartConnected} data-muted={!m.restartConnected}>
          <span>Começar tudo de novo</span>
          {visto.tudo ? (
            <RotateCcw size={34} />
          ) : (
            <b className="door-fork-unknown" aria-hidden="true">
              ?
            </b>
          )}
          <strong>
            {visto.tudo
              ? 'A pista fica vazia, a abertura volta, e a partida nova começa limpa'
              : DESCOBRIR}
          </strong>
          <small>{m.restartConnected ? 'O jeito escolhido' : ''}</small>
        </div>
      </div>
    </figure>
  )
}

const TELA = { start: 'Tela de início', playing: 'Jogando', end: 'Fim da partida' } as const

export function LivreRestartDino() {
  const { activity, state, dispatch, instruction, running, setRunning } = useDiscovery()
  const m = state.match
  const has = (id: string) => state.evidence.discoveries.includes(id)
  // As metas que o bloco cobra (sem `goals`, as duas do recomeço).
  const metas = activity.setup?.goals?.length
    ? activity.setup.goals.filter((id) => id in OBJETIVOS)
    : [...METAS_DO_RECOMECO_DINO]
  const completed = metas.map(has)
  const g = proximoGestoDoRecomeco(semDino(discoveryGuidance(activity, state)?.id), state, running)
  // Fora da partida nada anda: o tempo para sozinho no fim.
  useEffect(() => {
    if (running && m.screen !== 'playing') setRunning(false)
  }, [running, m.screen, setRunning])
  const jeito = (tudo: boolean) => (
    <SceneButton
      aria-pressed={m.restartConnected === tudo}
      tom={
        g === (tudo ? 'tudo' : 'so-a-tela')
          ? 'gesto'
          : m.restartConnected === tudo
            ? 'ligado'
            : 'ferramenta'
      }
      onClick={() => dispatch({ type: 'connect', port: 'restart', enabled: tudo })}
    >
      {tudo ? 'Começar tudo de novo' : 'Só voltar para a tela de início'}
    </SceneButton>
  )
  const naPista = state.crowd.cacti.filter((c) => c.x <= 480).length
  return (
    <Frame
      title="Jogar outra vez"
      kind="recomeco"
      activity={activity}
      state={state}
      text={instruction}
      goals={metas.map((id) => OBJETIVOS[id] ?? 'Teste e compare o que acontece.')}
      completed={completed}
      done={completed.filter(Boolean).length}
      reset={() => {
        setRunning(false)
        dispatch({ type: 'reset' })
      }}
      hud={
        <div className="walk-hud">
          <strong>{TELA[m.screen]}</strong>
          <span>{quantos(naPista, 'cacto na pista', 'cactos na pista')}</span>
        </div>
      }
      stage={
        <SceneCenarioProvider cenario={activity.cenario}>
          <RestartStage state={state} cast={activity.cast} dispatch={dispatch} />
        </SceneCenarioProvider>
      }
      after={<OsDoisJeitos m={m} visto={{ tela: has('screen-only'), tudo: has('clean-track') }} />}
    >
      <div className="sz-discovery-controls free-controls">
        <SceneButton
          data-foco-depois-de-comecar=""
          tom={g === 'enter' ? 'gesto' : 'ferramenta'}
          fechado={m.screen === 'playing'}
          onClick={() => dispatch({ type: 'start', input: 'tap' })}
        >
          <Pointer size={16} /> Tocar na tela
        </SceneButton>
        {m.screen === 'playing' && (
          <SceneButton
            tom={g === 'tempo' ? 'gesto' : running ? 'ligado' : 'ferramenta'}
            aria-pressed={running}
            onClick={() => setRunning(!running)}
          >
            {running ? <Pause size={16} /> : <Play size={16} />}{' '}
            {running ? 'Pausar o tempo' : 'Deixar o tempo passar'}
          </SceneButton>
        )}
      </div>
      <fieldset className="sz-discovery-choices">
        <legend className="frame-controls-label">No fim da partida, o toque…</legend>
        {jeito(false)}
        {jeito(true)}
      </fieldset>
      <p className="sz-discovery-small">
        {m.screen === 'playing'
          ? 'Jogando, o toque na tela é o pulo: deixe o tempo passar até um cacto bater no Dino.'
          : 'A escolha vale para o toque do fim da partida. Suas descobertas continuam marcadas.'}
      </p>
      <DicaLivre />
    </Frame>
  )
}
