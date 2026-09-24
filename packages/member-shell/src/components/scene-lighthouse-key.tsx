'use client'

import type { SceneAction, SceneState } from '@sistemazero/core/learning/scene'
import { farolSvgUrl } from '@sistemazero/studio/arte'
import { SceneButton } from './exploration-stage'
import { SCENE_VIEW, SceneCanvas, Texto } from './scene-canvas'

/** Duas tentativas na mesma porta: a troca de chave não é a tentativa. */
export function LighthouseKeyStage({ state }: { state: SceneState }) {
  const { hasKey, door } = state.lighthouse
  const aberta = door === 'open'
  return (
    <SceneCanvas
      view={SCENE_VIEW}
      mundo="farol"
      titulo="A porta do farol"
      descricao={`O personagem está ${hasKey ? 'com' : 'sem'} a chave. A porta está ${aberta ? 'aberta e a luz está acesa' : 'fechada e a luz está apagada'}.`}
    >
      <image
        data-fundo="farol"
        href={farolSvgUrl('cenario')}
        width="560"
        height="300"
        preserveAspectRatio="xMidYMid slice"
      />
      <image href={farolSvgUrl('personagem')} x="175" y="169" width="42" height="50" />
      {!hasKey && <image href={farolSvgUrl('chave')} x="275" y="176" width="40" height="40" />}
      <image
        href={farolSvgUrl(aberta ? 'farol-aceso' : 'farol-apagado')}
        x="398"
        y="57"
        width="100"
        height="155"
      />
      {aberta && <image href={farolSvgUrl('barco')} x="480" y="218" width="65" height="45" />}
      <Texto x="448" y="246" textAnchor="middle" tamanho={16} fill="#283d48" fontWeight="700">
        {aberta ? 'A luz acendeu!' : 'Porta fechada'}
      </Texto>
    </SceneCanvas>
  )
}

export function LighthouseKeyControls({
  state,
  dispatch,
}: {
  state: SceneState
  dispatch: (action: SceneAction) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <SceneButton
        tom={state.lighthouse.hasKey ? 'ligado' : 'ferramenta'}
        aria-pressed={state.lighthouse.hasKey}
        onClick={() => dispatch({ type: 'key-state', hasKey: !state.lighthouse.hasKey })}
      >
        {state.lighthouse.hasKey ? 'Deixar a chave' : 'Levar a chave'}
      </SceneButton>
      <SceneButton tom="gesto" onClick={() => dispatch({ type: 'try-lighthouse-door' })}>
        Testar a porta
      </SceneButton>
    </div>
  )
}
