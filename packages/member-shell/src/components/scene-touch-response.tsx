'use client'

import type { SceneAction, SceneState } from '@sistemazero/core/learning/scene'
import { jardimSvgUrl } from '@sistemazero/studio/arte'
import { SCENE_VIEW, SceneCanvas, Texto } from './scene-canvas'

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
      titulo={encontrou ? 'O personagem apareceu' : 'O personagem está escondido'}
      descricao={
        encontrou
          ? 'O toque no arbusto revelou o personagem.'
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
              aria-label={encontrou ? 'Personagem encontrado' : 'Tocar no arbusto'}
              disabled={encontrou}
              className="absolute left-[36%] top-[42%] h-[42%] w-[28%] cursor-pointer rounded-[50%] focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-default"
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
      <image href={jardimSvgUrl('coelho')} x="232" y="126" width="96" height="112" />
      {!encontrou && (
        <image href={jardimSvgUrl('arbusto')} x="205" y="129" width="150" height="122" />
      )}
      {encontrou && (
        <Texto x="280" y="58" textAnchor="middle" tamanho={22} fontWeight="700" fill="#173844">
          Achou!
        </Texto>
      )}
    </SceneCanvas>
  )
}
