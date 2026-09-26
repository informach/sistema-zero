'use client'

import type { SceneAction, SceneState } from '@sistemazero/core/learning/scene'
import { jardimSpriteRect, jardimSvgUrl } from '@sistemazero/studio/arte'
import { SCENE_VIEW, SceneCanvas, Texto } from './scene-canvas'

const coelho = jardimSpriteRect('coelho', 280, 238)
const arbusto = jardimSpriteRect('arbusto', 280, 251)

/** Um toque no mesmo esconderijo, antes e depois de ligar a ação. */
export function TouchResponseStage({
  state,
  dispatch,
}: {
  state: SceneState
  dispatch?: (action: SceneAction) => void
}) {
  const encontrou = state.match.screen === 'playing'
  return (
    <SceneCanvas
      className="relative"
      view={SCENE_VIEW}
      mundo="jardim"
      titulo={encontrou ? 'O coelho apareceu' : 'O personagem está escondido'}
      descricao={
        encontrou
          ? 'O arbusto ficou invisível e o coelho apareceu.'
          : 'Um arbusto esconde um personagem. O toque pode ou não fazer o jogo responder.'
      }
      overlay={
        dispatch ? (
          <div
            className="absolute inset-x-0 top-0"
            style={{ aspectRatio: `${SCENE_VIEW.w} / ${SCENE_VIEW.h}` }}
          >
            <button
              type="button"
              aria-label={encontrou ? 'Coelho encontrado' : 'Tocar no arbusto'}
              disabled={encontrou}
              className="absolute cursor-pointer rounded-[50%] focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-default"
              style={{
                left: `${(arbusto.x / SCENE_VIEW.w) * 100}%`,
                top: `${(arbusto.y / SCENE_VIEW.h) * 100}%`,
                width: `${(arbusto.w / SCENE_VIEW.w) * 100}%`,
                height: `${(arbusto.h / SCENE_VIEW.h) * 100}%`,
              }}
              onClick={() => dispatch({ type: 'start', input: 'tap' })}
            />
          </div>
        ) : undefined
      }
    >
      <image
        data-fundo="jardim"
        href={jardimSvgUrl('jardim')}
        width="560"
        height="300"
        preserveAspectRatio="xMidYMid slice"
      />
      <image
        href={jardimSvgUrl('coelho')}
        x={coelho.x}
        y={coelho.y}
        width={coelho.w}
        height={coelho.h}
      />
      {!encontrou && (
        <image
          href={jardimSvgUrl('arbusto')}
          x={arbusto.x}
          y={arbusto.y}
          width={arbusto.w}
          height={arbusto.h}
        />
      )}
      {encontrou && (
        <Texto x="280" y="58" textAnchor="middle" tamanho={22} fontWeight="700" fill="#173844">
          Achou!
        </Texto>
      )}
    </SceneCanvas>
  )
}
