'use client'

import { discoveryGuidance, type SceneState } from '@sistemazero/core/learning/scene'
import { Frame, SceneButton, useDiscovery } from '../scene-discovery-frame'
import { ScoreGoalStage, SINAIS_DA_META } from '../scene-score-goal'
import { DicaLivre } from './atelie-comum'

/**
 * A meta do jogo (`score-goal`, Nave contra Asteroides, Dia 5, 02/11/2026) em exploração livre: só a
 * IDEIA. O placar sobe a cada acerto, a placa da meta é uma constante (26) e o sinal decide se chegar
 * a 26 já vale. Em que acerto veio a vitória com cada sinal, e o que acontece ao tentar mudar a placa,
 * só aparecem na figura "O que você já viu" DEPOIS de testados. Falas: `guia-livre/score-goal.ts`.
 */
const DESCOBERTAS: Record<string, string> = {
  'igual-conta': 'Com maior ou igual, acerte até a vitória e veja em que número ela vem.',
  'maior-pula': 'Com maior que, acerte até a vitória e veja em que número ela vem.',
  'placa-fixa': 'No meio de uma partida, tente mudar a placa da meta.',
}

/** O gesto que a fala do Zappy pede agora: é o botão em destaque. */
export type GestoDaMeta = '>' | '>=' | 'acertar' | 'jogar' | 'placa' | null
export function proximoGestoDaMeta(
  fala: string | undefined,
  g: Pick<SceneState['scoreGoal'], 'won' | 'hits'>,
): GestoDaMeta {
  switch (fala) {
    case 'score-goal-start':
    case 'score-goal-try':
    case 'score-goal-running':
    case 'score-goal-placa-seen':
      return 'acertar'
    case 'score-goal-running-placa':
      return 'placa'
    case 'score-goal-equal':
      return '>'
    case 'score-goal-greater':
      return '>='
    case 'score-goal-placa':
      // A sequência da fala: Jogar de novo, Acertar uma pedra e, no meio da partida, a placa.
      return g.won ? 'jogar' : g.hits === 0 ? 'acertar' : 'placa'
    default:
      return null
  }
}

export function LivreScoreGoal() {
  const context = useDiscovery()
  const { state, dispatch, activity } = context
  const g = state.scoreGoal
  const seen = new Set(state.evidence.discoveries)
  const metas = (activity.setup?.goals ?? []).filter((id) => id in DESCOBERTAS)
  const lista = metas.length ? metas : Object.keys(DESCOBERTAS)
  const completed = lista.map((id) => seen.has(id))
  const gesto = proximoGestoDaMeta(discoveryGuidance(activity, state).id, g)
  return (
    <Frame
      title="A meta do jogo"
      kind="meta"
      activity={activity}
      state={state}
      text={context.instruction}
      goals={lista.map((id) => DESCOBERTAS[id] ?? id)}
      completed={completed}
      done={completed.filter(Boolean).length}
      reset={() => dispatch({ type: 'reset' })}
      hud={
        <div className="walk-hud" data-meta-hud="">
          <strong>Placar {g.points}</strong>
          <span>Meta {g.goal}</span>
        </div>
      }
      stage={<ScoreGoalStage state={state} />}
    >
      <figure className="sz-scene-regra door-rule" data-meta-vista="">
        <figcaption className="sz-scene-regra-titulo">O que você já viu</figcaption>
        <div className="memory-actions">
          <div data-lit={seen.has('igual-conta')}>
            <span>
              Maior ou igual (≥)
              <small>
                {seen.has('igual-conta') ? 'A vitória veio no 26.' : 'Teste para descobrir'}
              </small>
            </span>
          </div>
          <div data-lit={seen.has('maior-pula')}>
            <span>
              Maior que (&gt;)
              <small>
                {seen.has('maior-pula')
                  ? 'O 26 não deu a vitória. Ela veio no 27.'
                  : 'Teste para descobrir'}
              </small>
            </span>
          </div>
          <div data-lit={seen.has('placa-fixa')}>
            <span>
              Mudar a placa no meio da partida
              <small>
                {seen.has('placa-fixa') ? 'A placa continuou 26.' : 'Teste para descobrir'}
              </small>
            </span>
          </div>
        </div>
      </figure>
      <div className="slow-ritmo-label">O sinal da vitória</div>
      <div
        className="sz-discovery-controls free-controls"
        role="group"
        aria-label="O sinal da vitória"
      >
        {SINAIS_DA_META.map((s) => {
          const atual = g.op === s.op
          return (
            <SceneButton
              key={s.op}
              tom={gesto === s.op ? 'gesto' : atual ? 'ligado' : 'ferramenta'}
              aria-current={atual ? 'true' : undefined}
              onClick={() => {
                // Trocar o sinal recomeça a partida (motor); o mesmo sinal não faz nada.
                if (!atual) dispatch({ type: 'goal-op', op: s.op })
              }}
            >
              {s.rotulo}
            </SceneButton>
          )
        })}
      </div>
      <div className="sz-discovery-controls free-controls" role="group" aria-label="A partida">
        <SceneButton
          tom={gesto === 'acertar' ? 'gesto' : 'ferramenta'}
          onClick={() => dispatch({ type: 'goal-hit' })}
        >
          Acertar uma pedra
        </SceneButton>
        <SceneButton
          tom={gesto === 'jogar' ? 'gesto' : 'ferramenta'}
          onClick={() => dispatch({ type: 'goal-restart' })}
        >
          Jogar de novo
        </SceneButton>
        <SceneButton
          tom={gesto === 'placa' ? 'gesto' : 'ferramenta'}
          onClick={() => dispatch({ type: 'goal-edit' })}
        >
          Tentar mudar a placa
        </SceneButton>
      </div>
      {state.caption && (
        <p className="sz-discovery-small" aria-live="polite">
          {state.caption}
        </p>
      )}
      <DicaLivre />
    </Frame>
  )
}
