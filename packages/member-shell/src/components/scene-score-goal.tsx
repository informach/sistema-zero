'use client'

import type { SceneAction, SceneState } from '@sistemazero/core/learning/scene'
import { SceneButton } from './exploration-stage'
import { FundoDoCenario } from './scene-arte'
import { Escolha } from './scene-bench'
import { SceneCanvas } from './scene-canvas'

/**
 * O palco da meta do jogo (`score-goal`, Nave contra Asteroides, Dia 5, 02/11/2026): o placar à
 * esquerda, a placa da meta à direita (uma constante, presa no chão por um poste) e, entre os dois,
 * o sinal da vitória. Com a vitória, a faixa "Vitória!" aparece. Sem bloco nem Se: só a ideia.
 */
const VIEW = { x: 0, y: 0, w: 480, h: 270 } as const

export function ScoreGoalStage({ state }: { state: SceneState }) {
  const g = state.scoreGoal
  const sinal = g.op === '>' ? '>' : '≥'
  return (
    <SceneCanvas
      view={VIEW}
      mundo="nave"
      titulo="O placar e a placa da meta"
      descricao={`O placar está em ${g.points}. A placa da meta diz ${g.goal}. A vitória vem com o placar ${g.op === '>' ? 'maior que a' : 'maior ou igual à'} meta.${g.won ? ' Vitória!' : ''}`}
    >
      <FundoDoCenario cenario="nave" w={VIEW.w} h={VIEW.h} chao={VIEW.h} detalhe="calmo" />
      <g data-placar={g.points}>
        <rect x={40} y={70} width={140} height={110} rx={14} fill="#16224a" stroke="#e3edff" />
        <text x={110} y={100} textAnchor="middle" fontSize="20" fontWeight="700" fill="#e3edff">
          Placar
        </text>
        <text x={110} y={158} textAnchor="middle" fontSize="54" fontWeight="800" fill="#ffd166">
          {g.points}
        </text>
      </g>
      <text
        data-sinal={g.op}
        x={240}
        y={140}
        textAnchor="middle"
        fontSize="48"
        fontWeight="800"
        fill="#e3edff"
      >
        {sinal}
      </text>
      <g data-placa={g.goal}>
        <rect x={355} y={150} width={10} height={90} fill="#8a96b8" />
        <rect x={300} y={70} width={120} height={90} rx={10} fill="#f4f1e8" stroke="#3b2f1e" />
        <text x={360} y={96} textAnchor="middle" fontSize="20" fontWeight="700" fill="#3b2f1e">
          Meta
        </text>
        <text x={360} y={145} textAnchor="middle" fontSize="44" fontWeight="800" fill="#3b2f1e">
          {g.goal}
        </text>
      </g>
      {g.won && (
        <g data-vitoria="">
          <rect x={150} y={200} width={180} height={44} rx={22} fill="#2a9d55" />
          <text x={240} y={229} textAnchor="middle" fontSize="22" fontWeight="800" fill="#ffffff">
            Vitória!
          </text>
        </g>
      )}
    </SceneCanvas>
  )
}

/** Os rótulos dos dois sinais, os mesmos da tela livre. */
export const SINAIS_DA_META = [
  { op: '>', rotulo: 'Maior que (>)' },
  { op: '>=', rotulo: 'Maior ou igual (≥)' },
] as const

/** A bancada da meta fora da exploração livre (o bloco montado sem `freeExploration`). */
export function ScoreGoalControls({
  state,
  dispatch,
}: {
  state: SceneState
  dispatch: (action: SceneAction) => void
}) {
  const g = state.scoreGoal
  return (
    <div className="space-y-3">
      <Escolha
        label="O sinal da vitória"
        valor={g.op}
        opcoes={SINAIS_DA_META.map((s) => ({ id: s.op, label: s.rotulo }))}
        onChange={(op) => dispatch({ type: 'goal-op', op })}
      />
      <div className="flex flex-wrap gap-2">
        <SceneButton tom="gesto" fechado={g.won} onClick={() => dispatch({ type: 'goal-hit' })}>
          Acertar uma pedra
        </SceneButton>
        <SceneButton onClick={() => dispatch({ type: 'goal-restart' })}>Jogar de novo</SceneButton>
        <SceneButton onClick={() => dispatch({ type: 'goal-edit' })}>
          Tentar mudar a placa
        </SceneButton>
      </div>
    </div>
  )
}
