'use client'

import { discoveryGuidance, type SceneState } from '@sistemazero/core/learning/scene'
import { Home, Keyboard, Pause, Play, RotateCcw } from 'lucide-react'
import { useEffect } from 'react'
import { SceneCenarioProvider } from '../scene-cenario-context'
import { RestartStage } from '../scene-dino-numbers-stages'
import { Frame, SceneButton, useDiscovery } from '../scene-discovery-frame'

/**
 * A experiência `restart` em exploração livre (Construtor, Nave contra Asteroides, 02/11/2026): só a
 * IDEIA, no molde da pergunta da porta (`Door`, `scene-discovery-controls.tsx`). No fim da partida, o
 * Enter pode só voltar para a tela de início ou começar tudo de novo; o que cada jeito faz com a
 * partida seguinte só aparece depois de a criança testar aquele jeito. Nada de "Mudar o estado do
 * jogo para inicio", "Reiniciar o jogo", bloco nem regra: os blocos ficam para a montagem do Estúdio.
 *
 * ⚠️ O tempo é o ▶ do player: começar a partida o solta (`sceneGestureRunsClock`), e esta tela o
 * para no fim da partida (o motor não tem parada para a `restart`).
 */

/** As descobertas, na ordem da lista. Os ids são as metas da cena (`catalog.ts`). */
export const METAS_DO_RECOMECO = ['screen-only', 'back-to-menu'] as const
export const OBJETIVOS_DO_RECOMECO = [
  'Com Só voltar para a tela de início, jogue até bater, comece outra partida e observe os asteroides.',
  'Com Começar tudo de novo, jogue até bater, comece outra partida e compare os asteroides e a tela.',
]

/** O botão em destaque é o gesto que a fala do Zappy pede agora (a régua de `proximoGestoDaMemoria`). */
export type GestoDoRecomeco = 'enter' | 'so-a-tela' | 'tudo' | 'tempo' | null
export function proximoGestoDoRecomeco(
  fala: string | undefined,
  s: Pick<SceneState, 'match' | 'crowd'>,
  rodando: boolean,
): GestoDoRecomeco {
  const { match: m, crowd } = s
  /** O jeito pedido: `true` = começar tudo de novo; `false` = só voltar para a tela de início. */
  const jeito = (tudo: boolean): GestoDoRecomeco => {
    if (m.screen === 'playing') return rodando ? null : 'tempo'
    const escolha = tudo ? 'tudo' : 'so-a-tela'
    if (m.screen === 'end') return m.restartConnected === tudo ? 'enter' : escolha
    // Na tela de início: a comparação já está pronta para o próximo Enter?
    if (!tudo && crowd.cacti.length > 0) return 'enter'
    if (tudo && m.cleared > 0) return 'enter'
    return m.restartConnected === tudo ? 'enter' : escolha
  }
  switch (fala) {
    case 'restart-start':
      return jeito(m.restartConnected)
    case 'restart-screen-only':
      return jeito(true)
    case 'restart-everything':
      return jeito(false)
    default:
      return null
  }
}

/** Os dois jeitos de recomeçar, com o que cada um faz revelado só depois do teste daquele jeito. */
function OsDoisJeitos({
  m,
  visto,
}: {
  m: SceneState['match']
  visto: { tela: boolean; tudo: boolean }
}) {
  const descobrir = 'Teste para descobrir'
  return (
    <figure className="sz-scene-regra door-rule restart-idea">
      <figcaption className="sz-scene-regra-titulo">No fim da partida, o Enter…</figcaption>
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
              ? 'Os asteroides da partida anterior ficam na tela, e a partida nova acaba na hora'
              : descobrir}
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
              ? 'Os asteroides saem da tela, a abertura volta, e é preciso outro Enter para jogar'
              : descobrir}
          </strong>
          <small>{m.restartConnected ? 'O jeito escolhido' : ''}</small>
        </div>
      </div>
    </figure>
  )
}

const TELA = { start: 'Tela de início', playing: 'Jogando', end: 'Fim da partida' } as const

export function LivreRestart() {
  const { activity, state, dispatch, instruction, running, setRunning } = useDiscovery()
  const m = state.match
  const has = (id: string) => state.evidence.discoveries.includes(id)
  const completed = METAS_DO_RECOMECO.map(has)
  const g = proximoGestoDoRecomeco(discoveryGuidance(activity, state)?.id, state, running)
  // Fora da partida nada anda (`avancarAPartida`): o tempo para sozinho no fim.
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
  const asteroides = state.crowd.cacti.filter((c) => c.x <= 480).length
  return (
    <Frame
      title="Jogar outra vez"
      kind="recomeco"
      activity={activity}
      state={state}
      text={instruction}
      goals={OBJETIVOS_DO_RECOMECO}
      completed={completed}
      done={completed.filter(Boolean).length}
      reset={() => {
        setRunning(false)
        dispatch({ type: 'reset' })
      }}
      hud={
        <div className="walk-hud">
          <strong>{TELA[m.screen]}</strong>
          <span>
            {asteroides === 1 ? '1 asteroide na tela' : `${asteroides} asteroides na tela`}
          </span>
        </div>
      }
      stage={
        <SceneCenarioProvider cenario={activity.cenario}>
          <RestartStage state={state} cast={activity.cast} dispatch={dispatch} />
        </SceneCenarioProvider>
      }
      after={
        <OsDoisJeitos m={m} visto={{ tela: completed[0] ?? false, tudo: completed[1] ?? false }} />
      }
    >
      <div className="sz-discovery-controls free-controls">
        <SceneButton
          data-foco-depois-de-comecar=""
          tom={g === 'enter' ? 'gesto' : 'ferramenta'}
          fechado={m.screen === 'playing'}
          onClick={() => dispatch({ type: 'start', input: 'key' })}
        >
          <Keyboard size={16} /> Apertar Enter
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
        <legend className="frame-controls-label">No fim da partida, o Enter…</legend>
        {jeito(false)}
        {jeito(true)}
      </fieldset>
      <p className="sz-discovery-small">
        {m.screen === 'playing'
          ? 'Jogando, o Enter não faz nada: deixe o tempo passar até um asteroide bater na nave.'
          : 'A escolha vale para o Enter do fim da partida. Suas descobertas continuam marcadas.'}
      </p>
      <p className="sz-discovery-free-hint">
        Experimente à vontade. Os destaques mostram o próximo teste, e você pode repetir quando
        quiser.
      </p>
    </Frame>
  )
}
