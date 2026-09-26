'use client'

import type { SceneAction, SceneState } from '@sistemazero/core/learning/scene'
import {
  JARDIM_BASE_ESCONDERIJOS,
  JARDIM_BASE_PERSONAGENS,
  JARDIM_PARES,
  jardimSpriteRect,
  jardimSvgUrl,
} from '@sistemazero/studio/arte'
import { SceneButton } from './exploration-stage'
import { SCENE_VIEW, SceneCanvas, Texto } from './scene-canvas'

/** Um único valor atual, ligado às descobertas desta busca — não uma pilha de números. */
export function FoundCounterStage({
  state,
  dispatch,
}: {
  state: SceneState
  dispatch?: (action: SceneAction) => void
}) {
  const found = state.match.points
  const foundIds = state.match.foundIds ?? []
  const visibleNames = JARDIM_PARES.flatMap((par, index) =>
    foundIds.includes(index) ? [par.personagem] : [],
  )
  // O fundo de 640 × 360 usa "slice" no palco de 560 × 300: escala 0,875 e perde 7,5 px em cima.
  const scale = 0.875
  const offsetY = -7.5
  return (
    <SceneCanvas
      className="relative"
      view={SCENE_VIEW}
      mundo="jardim"
      titulo={`Jardim: ${found} ${found === 1 ? 'personagem encontrado' : 'personagens encontrados'}`}
      descricao={`Achados está em ${found}. ${visibleNames.length ? `Personagens visíveis: ${visibleNames.join(', ')}.` : 'Os três personagens estão escondidos.'}`}
      overlay={
        dispatch ? (
          <div
            className="absolute inset-x-0 top-0"
            style={{ aspectRatio: `${SCENE_VIEW.w} / ${SCENE_VIEW.h}` }}
          >
            <button
              type="button"
              aria-label="Procurar em um espaço vazio do jardim"
              className="absolute inset-0 cursor-pointer focus-visible:-outline-offset-4 focus-visible:outline-4 focus-visible:outline-primary"
              onClick={() => dispatch({ type: 'look-around' })}
            >
              <span className="pointer-events-none absolute left-[3%] top-[30%] rounded-lg border border-[#2d6655] bg-[#fff9df] px-2 py-1 text-xs font-bold text-[#173844] shadow-sm">
                Procurar aqui
              </span>
            </button>
            {JARDIM_PARES.map((par, index) => {
              const cover = jardimSpriteRect(par.esconderijo, par.centroX, JARDIM_BASE_ESCONDERIJOS)
              const names = ['arbusto', 'pedras', 'flores'] as const
              const visible = foundIds.includes(index)
              return (
                <button
                  key={par.personagem}
                  type="button"
                  aria-label={
                    visible
                      ? `Tocar de novo ${index === 0 ? 'no' : 'na'} ${par.personagem}`
                      : `Tocar ${index === 0 ? 'no' : 'nas'} ${names[index]}`
                  }
                  className="absolute cursor-pointer rounded-2xl focus-visible:outline-4 focus-visible:outline-primary"
                  style={{
                    left: `${((cover.x * scale) / SCENE_VIEW.w) * 100}%`,
                    top: `${((cover.y * scale + offsetY) / SCENE_VIEW.h) * 100}%`,
                    width: `${((cover.w * scale) / SCENE_VIEW.w) * 100}%`,
                    height: `${((cover.h * scale) / SCENE_VIEW.h) * 100}%`,
                  }}
                  onClick={() => dispatch({ type: 'find-character', id: index as 0 | 1 | 2 })}
                />
              )
            })}
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
      {JARDIM_PARES.map((par, index) => {
        const visible = foundIds.includes(index)
        const character = jardimSpriteRect(par.personagem, par.centroX, JARDIM_BASE_PERSONAGENS)
        const cover = jardimSpriteRect(par.esconderijo, par.centroX, JARDIM_BASE_ESCONDERIJOS)
        return visible ? (
          <image
            key={par.personagem}
            href={jardimSvgUrl(par.personagem)}
            x={character.x * scale}
            y={character.y * scale + offsetY}
            width={character.w * scale}
            height={character.h * scale}
          />
        ) : (
          <image
            key={par.personagem}
            href={jardimSvgUrl(par.esconderijo)}
            x={cover.x * scale}
            y={cover.y * scale + offsetY}
            width={cover.w * scale}
            height={cover.h * scale}
          />
        )
      })}
      <rect
        x="190"
        y="12"
        width="180"
        height="75"
        rx="18"
        fill="#fff9df"
        stroke="#2d6655"
        strokeWidth="3"
      />
      <Texto x="280" y="38" textAnchor="middle" tamanho={18} fontWeight="700" fill="#173844">
        Achados
      </Texto>
      <Texto x="280" y="72" textAnchor="middle" tamanho={32} fontWeight="800" fill="#173844">
        {found}
      </Texto>
    </SceneCanvas>
  )
}

export function FoundCounterControls({ dispatch }: { dispatch: (action: SceneAction) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      <SceneButton tom="ferramenta" onClick={() => dispatch({ type: 'restart-search' })}>
        Recomeçar a busca
      </SceneButton>
    </div>
  )
}
