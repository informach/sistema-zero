'use client'

import {
  actorFigure,
  type SceneAction,
  type SceneCast,
  type SceneState,
  sceneNativeCast,
  WEAPON_SWAP,
  type WeaponSwapWeapon,
  weaponSwapFresh,
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
const NAVE = { x: px(WEAPON_SWAP.ship.x), y: py(WEAPON_SWAP.ship.y) } as const
const PEDRA = { x: px(WEAPON_SWAP.ship.x), y: py(WEAPON_SWAP.rockY) } as const
/** O item de plasma, parado à direita da nave até ser pego. */
const ITEM = { x: px(620), y: py(360) } as const
const COR: Record<WeaponSwapWeapon, string> = { laser: '#ff6b6b', plasma: '#38bdf8' }

/**
 * Onde o tiro estava a cada quadro, da ponta da nave até a pedra: o laser sobe muito por quadro (poucas
 * marcas, longe uma da outra), o plasma sobe pouco (muitas marcas, perto uma da outra).
 */
function marcasDoTiro(weapon: WeaponSwapWeapon, frames: number): number[] {
  const { speed } = WEAPON_SWAP.shots[weapon]
  return Array.from({ length: frames }, (_, i) =>
    Math.max(WEAPON_SWAP.rockY, WEAPON_SWAP.ship.y - speed * (i + 1)),
  )
}

/**
 * O palco da troca de arma (`weapon-swap`, Poder "Troca de arma" do Construtor, 28/11/2026), visto de
 * cima: a nave embaixo, no meio, e a pedra parada no alto (o obstáculo do elenco). Enquanto o plasma
 * está trancado, o item de plasma espera ao lado da nave. Depois de "Apertar Espaço", o caminho do
 * último tiro: uma marca por quadro, do tamanho do tiro (o laser fino, o plasma grande), até o clarão
 * na pedra. "Arma: <arma>" fica no canto. O item e os tiros são enfeite do palco.
 */
export function WeaponSwapStage({ state, cast }: { state: SceneState; cast?: SceneCast }) {
  const actors = sceneNativeCast('weapon-swap', cast)
  const mundo = useSceneCenario(actors, 'weapon-swap')
  const w = state.weaponSwap
  const tiro = w.shot
  return (
    <SceneCanvas
      cast={actors}
      mundo={mundo}
      titulo="A troca de arma"
      descricao={`Arma: ${w.weapon}. Plasma ${w.unlocked ? 'liberado' : 'trancado'}.${
        tiro ? ` O último tiro, de ${tiro.weapon}, chegou à pedra em ${tiro.frames} quadros.` : ''
      }`}
    >
      {(palco) => (
        <>
          <FundoDoCenario cenario={mundo} w={560} h={300} detalhe="calmo" />
          <ActorFigure
            figure={actorFigure(actors, 'obstacle')}
            x={PEDRA.x}
            y={PEDRA.y}
            escala={0.7}
          />
          {!w.unlocked && (
            <g data-item-plasma transform={`translate(${ITEM.x} ${ITEM.y})`}>
              <circle r={13} fill="#0c4a6e" stroke={COR.plasma} strokeWidth={3} />
              <circle r={6} fill={COR.plasma} />
              <path d="M -4 -18 l 4 -5 l 4 5" fill="none" stroke={COR.plasma} strokeWidth={2} />
            </g>
          )}
          {tiro && (
            <g data-tiro={tiro.weapon} data-quadros={tiro.frames}>
              {marcasDoTiro(tiro.weapon, tiro.frames).map((y, i, todas) =>
                tiro.weapon === 'laser' ? (
                  <rect
                    key={y}
                    data-marca-do-tiro
                    x={NAVE.x - (WEAPON_SWAP.shots.laser.width * ESCALA) / 2}
                    y={py(y) - 8}
                    width={WEAPON_SWAP.shots.laser.width * ESCALA}
                    height={16}
                    rx={1.5}
                    fill={COR.laser}
                    fillOpacity={i === todas.length - 1 ? 1 : 0.45}
                  />
                ) : (
                  <circle
                    key={y}
                    data-marca-do-tiro
                    cx={NAVE.x}
                    cy={py(y)}
                    r={(WEAPON_SWAP.shots.plasma.width * ESCALA) / 2}
                    fill={COR.plasma}
                    fillOpacity={i === todas.length - 1 ? 0.95 : 0.3}
                  />
                ),
              )}
              <circle
                data-chegou
                cx={PEDRA.x}
                cy={PEDRA.y + 14}
                r={tiro.weapon === 'laser' ? 8 : 15}
                fill="none"
                stroke="#fde047"
                strokeWidth={3}
              />
            </g>
          )}
          <ActorFigure figure={actorFigure(actors, 'hero')} x={NAVE.x} y={NAVE.y} escala={0.75} />
          <Texto
            x={14}
            y={290}
            tamanho={palco.estreito ? 18 : 16}
            fontWeight="800"
            className="fill-scene-ink"
          >
            {`Arma: ${w.weapon}`}
          </Texto>
          {tiro && (
            <Texto
              x={546}
              y={290}
              textAnchor="end"
              tamanho={palco.estreito ? 16 : 14}
              fontWeight="700"
              className="fill-scene-ink"
            >
              {`Chegou em ${tiro.frames} quadros`}
            </Texto>
          )}
        </>
      )}
    </SceneCanvas>
  )
}

/** Os rótulos dos controles, os mesmos da tela livre e das falas do Zappy. */
export const BOTOES_DA_ARMA = {
  pegar: 'Pegar o item de plasma',
  e: 'Apertar E',
  espaco: 'Apertar Espaço',
  nova: 'Nova partida',
} as const

/** A bancada fora da exploração livre (o bloco montado sem `freeExploration`). */
export function WeaponSwapControls({
  state,
  dispatch,
}: {
  state: SceneState
  dispatch: (action: SceneAction) => void
}) {
  const w = state.weaponSwap
  return (
    <div className="flex flex-wrap gap-2">
      <SceneButton fechado={w.unlocked} onClick={() => dispatch({ type: 'weapon-pickup' })}>
        {BOTOES_DA_ARMA.pegar}
      </SceneButton>
      <SceneButton onClick={() => dispatch({ type: 'weapon-key-e' })}>
        {BOTOES_DA_ARMA.e}
      </SceneButton>
      <SceneButton tom="gesto" onClick={() => dispatch({ type: 'weapon-fire' })}>
        {BOTOES_DA_ARMA.espaco}
      </SceneButton>
      <SceneButton
        fechado={weaponSwapFresh(w)}
        onClick={() => dispatch({ type: 'weapon-new-match' })}
      >
        {BOTOES_DA_ARMA.nova}
      </SceneButton>
    </div>
  )
}
