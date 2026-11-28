'use client'

import {
  actorFigure,
  ENEMY_FIRE,
  ENEMY_FIRE_SHIP_XS,
  type EnemyFireShipX,
  enemyFireOver,
  enemyFireX,
  quantos,
  type SceneAction,
  type SceneCast,
  type SceneState,
  sceneNativeCast,
} from '@sistemazero/core/learning/scene'
import { SceneButton } from './exploration-stage'
import { FundoDoCenario } from './scene-arte'
import { SceneCanvas, Texto } from './scene-canvas'
import { useSceneCenario } from './scene-cenario-context'
import { ActorFigure } from './scene-figures'

/**
 * A tela do jogo (800 por 480, vista de cima) dentro do palco de 560 por 300: a mesma escala nos
 * dois eixos.
 */
const ESCALA = 0.6
const px = (x: number) => 40 + x * ESCALA
const py = (y: number) => 10 + y * ESCALA
const COR_DA_INIMIGA = '#b04cff'
const COR_DO_TIRO = '#ff4d6d'
/** As pedras que passam ao longe, nas beiradas: o mundo da Nave contra Asteroides, fora do caminho. */
const PEDRAS_AO_LONGE = [
  { x: 70, y: 250, escala: 0.45 },
  { x: 735, y: 190, escala: 0.4 },
] as const

/** A nave inimiga: um disco com cúpula e canhão embaixo (enfeite do palco, não papel do elenco). */
function NaveInimiga({ x }: { x: number }) {
  return (
    <g data-inimiga={x} transform={`translate(${px(x)} ${py(ENEMY_FIRE.enemyY)})`}>
      <ellipse cx={0} cy={-6} rx={11} ry={9} fill="#e9d5ff" stroke="#3b0764" strokeWidth={2} />
      <ellipse
        cx={0}
        cy={2}
        rx={26}
        ry={9}
        fill={COR_DA_INIMIGA}
        stroke="#3b0764"
        strokeWidth={2}
      />
      <rect x={-3} y={8} width={6} height={8} rx={2} fill="#3b0764" />
      <circle cx={-14} cy={3} r={2.5} fill="#fde047" />
      <circle cx={0} cy={5} r={2.5} fill="#fde047" />
      <circle cx={14} cy={3} r={2.5} fill="#fde047" />
    </g>
  )
}

/**
 * O palco do inimigo que atira (`enemy-fire`, Poder "Inimigo que atira" do Construtor, 28/11/2026),
 * visto de cima: a nave inimiga patrulha o alto pelo caminho tracejado, os tiros dela descem, e a
 * nave da criança fica embaixo, à esquerda, no meio ou à direita. Um losango marca a ORIGEM do
 * próximo tiro (no meio da tela, ou embaixo da inimiga). A nave e as pedras ao longe são o elenco; a
 * inimiga e os tiros dela são enfeite do palco.
 */
export function EnemyFireStage({ state, cast }: { state: SceneState; cast?: SceneCast }) {
  const actors = sceneNativeCast('enemy-fire', cast)
  const mundo = useSceneCenario(actors, 'enemy-fire')
  const f = state.enemyFire
  const inimiga = enemyFireX(f.tick)
  const origemX = f.origin === 'middle' ? ENEMY_FIRE.middle : inimiga
  const acabou = enemyFireOver(f)
  const origem = f.origin === 'middle' ? 'no meio' : 'na inimiga'
  return (
    <SceneCanvas
      cast={actors}
      mundo={mundo}
      titulo="A inimiga que atira"
      descricao={`Origem do tiro ${origem}. ${quantos(f.shots.length, 'tiro', 'tiros')} no ar. ${quantos(f.lives, 'vida', 'vidas')}.${
        acabou ? ' A partida acabou.' : ''
      }`}
    >
      {(palco) => (
        <>
          <FundoDoCenario cenario={mundo} w={560} h={300} detalhe="calmo" />
          {PEDRAS_AO_LONGE.map((pedra) => (
            <ActorFigure
              key={`pedra-${pedra.x}`}
              figure={actorFigure(actors, 'obstacle')}
              x={px(pedra.x)}
              y={py(pedra.y)}
              escala={pedra.escala}
            />
          ))}
          <line
            data-caminho-da-inimiga
            x1={px(Math.min(...ENEMY_FIRE.path))}
            y1={py(ENEMY_FIRE.enemyY)}
            x2={px(Math.max(...ENEMY_FIRE.path))}
            y2={py(ENEMY_FIRE.enemyY)}
            stroke={COR_DA_INIMIGA}
            strokeOpacity={0.45}
            strokeWidth={2}
            strokeDasharray="5 6"
          />
          <NaveInimiga x={inimiga} />
          <path
            data-origem={f.origin === 'middle' ? 'meio' : 'inimiga'}
            d={`M ${px(origemX)} ${py(ENEMY_FIRE.enemyY) + 14} l 7 9 l -7 9 l -7 -9 Z`}
            fill="none"
            stroke="#fde047"
            strokeWidth={2.5}
          />
          {f.shots.map((shot) => (
            <rect
              key={`tiro-${shot.from}-${shot.origin}-${shot.y}`}
              data-tiro-inimigo={shot.origin}
              x={px(shot.x) - 3}
              y={py(shot.y) - 9}
              width={6}
              height={18}
              rx={3}
              fill={COR_DO_TIRO}
              stroke="#7f1d1d"
              strokeWidth={1}
            />
          ))}
          <ActorFigure
            figure={actorFigure(actors, 'hero')}
            x={px(f.shipX)}
            y={py(ENEMY_FIRE.shipY)}
            escala={0.75}
          />
          {f.last === 'hit' && (
            <circle
              data-encostou
              cx={px(f.shipX)}
              cy={py(ENEMY_FIRE.shipY)}
              r={28}
              fill="none"
              stroke={COR_DO_TIRO}
              strokeWidth={3}
              strokeDasharray="5 4"
            />
          )}
          <Texto
            x={14}
            y={290}
            tamanho={palco.estreito ? 16 : 14}
            fontWeight="700"
            className="fill-scene-ink"
          >
            {`Vidas ${f.lives} · origem ${origem}`}
          </Texto>
          {acabou && (
            <Texto
              x={280}
              y={160}
              textAnchor="middle"
              tamanho={palco.estreito ? 22 : 20}
              fontWeight="800"
              className="fill-scene-ink"
            >
              Fim da partida
            </Texto>
          )}
        </>
      )}
    </SceneCanvas>
  )
}

/** Os rótulos dos controles, os mesmos da tela livre e das falas do Zappy. */
export const BOTOES_DO_INIMIGO = {
  origem: 'Origem do tiro',
  meio: 'No meio',
  inimiga: 'Na inimiga',
  nave: {
    200: 'Nave à esquerda',
    400: 'Nave no meio',
    600: 'Nave à direita',
  } satisfies Record<EnemyFireShipX, string>,
  meioSegundo: 'Avançar meio segundo',
  proximoTiro: 'Avançar até o próximo tiro',
  recomecar: 'Recomeçar a partida',
} as const

/** A bancada fora da exploração livre (o bloco montado sem `freeExploration`). */
export function EnemyFireControls({
  state,
  dispatch,
}: {
  state: SceneState
  dispatch: (action: SceneAction) => void
}) {
  const f = state.enemyFire
  const acabou = enemyFireOver(f)
  return (
    <div className="flex flex-wrap gap-2">
      <SceneButton
        aria-pressed={f.origin === 'middle'}
        tom={f.origin === 'middle' ? 'ligado' : 'ferramenta'}
        onClick={() => dispatch({ type: 'enemy-origin', origin: 'middle' })}
      >
        {BOTOES_DO_INIMIGO.meio}
      </SceneButton>
      <SceneButton
        aria-pressed={f.origin === 'enemy'}
        tom={f.origin === 'enemy' ? 'ligado' : 'ferramenta'}
        onClick={() => dispatch({ type: 'enemy-origin', origin: 'enemy' })}
      >
        {BOTOES_DO_INIMIGO.inimiga}
      </SceneButton>
      {ENEMY_FIRE_SHIP_XS.map((x) => (
        <SceneButton
          key={x}
          aria-pressed={f.shipX === x}
          tom={f.shipX === x ? 'ligado' : 'ferramenta'}
          onClick={() => dispatch({ type: 'enemy-ship', x })}
        >
          {BOTOES_DO_INIMIGO.nave[x]}
        </SceneButton>
      ))}
      <SceneButton fechado={acabou} onClick={() => dispatch({ type: 'enemy-tick' })}>
        {BOTOES_DO_INIMIGO.meioSegundo}
      </SceneButton>
      <SceneButton
        tom="gesto"
        fechado={acabou}
        onClick={() => dispatch({ type: 'enemy-next-shot' })}
      >
        {BOTOES_DO_INIMIGO.proximoTiro}
      </SceneButton>
      <SceneButton fechado={f.tick === 0} onClick={() => dispatch({ type: 'enemy-restart' })}>
        {BOTOES_DO_INIMIGO.recomecar}
      </SceneButton>
    </div>
  )
}
