'use client'

import type { SceneAction, SceneState } from '@sistemazero/core/learning/scene'
import { FAROL_LAYOUT, farolSvgUrl } from '@sistemazero/studio/arte'
import { SceneButton } from './exploration-stage'
import { SceneCanvas, Texto } from './scene-canvas'

/** Duas tentativas na mesma porta: a troca de chave não é a tentativa. */
export function LighthouseKeyStage({ state }: { state: SceneState }) {
  const { hasKey, door } = state.lighthouse
  const aberta = door === 'open'
  return (
    <SceneCanvas
      view={FAROL_LAYOUT.palco}
      mundo="farol"
      titulo="A porta do farol"
      descricao={`O personagem está ${hasKey ? 'com' : 'sem'} a chave. A porta está ${aberta ? 'aberta e a luz está acesa' : 'fechada e a luz está apagada'}.`}
    >
      <image
        data-fundo="farol"
        href={farolSvgUrl('cenario')}
        width={FAROL_LAYOUT.palco.w}
        height={FAROL_LAYOUT.palco.h}
      />
      {!hasKey && (
        <image
          href={farolSvgUrl('chave')}
          x={FAROL_LAYOUT.chave.x}
          y={FAROL_LAYOUT.chave.y}
          width={FAROL_LAYOUT.chave.w}
          height={FAROL_LAYOUT.chave.h}
        />
      )}
      <image
        href={farolSvgUrl(aberta ? 'farol-aceso' : 'farol-apagado')}
        x={FAROL_LAYOUT.farol.x}
        y={FAROL_LAYOUT.farol.y}
        width={FAROL_LAYOUT.farol.w}
        height={FAROL_LAYOUT.farol.h}
      />
      <image
        href={farolSvgUrl('personagem')}
        x={FAROL_LAYOUT.personagemNaPorta.x}
        y={FAROL_LAYOUT.personagemNaPorta.y}
        width={FAROL_LAYOUT.personagemNaPorta.w}
        height={FAROL_LAYOUT.personagemNaPorta.h}
      />
      {aberta && (
        <image
          href={farolSvgUrl('barco')}
          x={FAROL_LAYOUT.chegadaBarcoX}
          y={FAROL_LAYOUT.barco.y}
          width={FAROL_LAYOUT.barco.w}
          height={FAROL_LAYOUT.barco.h}
        />
      )}
      <rect x="8" y="8" width="464" height="30" rx="8" fill="#143d35" />
      <Texto x="240" y="29" textAnchor="middle" tamanho={16} fill="#ffffff" fontWeight="700">
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
