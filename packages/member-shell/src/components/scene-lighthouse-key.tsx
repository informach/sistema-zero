'use client'

import type { SceneAction, SceneState } from '@sistemazero/core/learning/scene'
import { FAROL_LAYOUT, farolSvgUrl } from '@sistemazero/studio/arte'
import { SceneButton } from './exploration-stage'
import { SceneCanvas } from './scene-canvas'
import { AVISOS_DO_FAROL, AvisoDoFarol, PalavraDoBloco, RegraDoJogo } from './scene-farol'

/**
 * O aviso que o jogo mostraria agora. Antes de testar, o do caminho até a porta; depois, o do ramo
 * que a porta escolheu (as mesmas frases do `então` e do `senão` que a criança monta no Dia 3).
 */
function avisoDaPorta({ hasKey, door, checkedKey }: SceneState['lighthouse']) {
  if (door === 'open') return AVISOS_DO_FAROL.acendeu
  if (checkedKey === false) return AVISOS_DO_FAROL.faltaChave
  return hasKey ? AVISOS_DO_FAROL.coleta : AVISOS_DO_FAROL.inicio
}

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
      {/* O barco entra deslizando pela direita quando a luz acende (`.sz-scene-anda`). */}
      <g
        className="sz-scene-anda"
        style={{
          transform: `translate(${aberta ? FAROL_LAYOUT.chegadaBarcoX - FAROL_LAYOUT.barco.x : 0}px, 0px)`,
        }}
      >
        <image
          href={farolSvgUrl('barco')}
          x={FAROL_LAYOUT.barco.x}
          y={FAROL_LAYOUT.barco.y}
          width={FAROL_LAYOUT.barco.w}
          height={FAROL_LAYOUT.barco.h}
        />
      </g>
      <AvisoDoFarol texto={avisoDaPorta(state.lighthouse)} />
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
  const { hasKey, checkedKey } = state.lighthouse
  // A marca vem da TENTATIVA: trocar a chave limpa `checkedKey`, e as duas respostas voltam neutras.
  const ramo = (valor: boolean) =>
    checkedKey == null ? undefined : checkedKey === valor ? 'escolhido' : 'ignorado'
  return (
    <div className="space-y-3">
      <RegraDoJogo
        titulo="A regra da porta"
        passos={[
          { id: 'evento', bloco: 'evento', texto: 'Quando o personagem encostar no farol' },
          {
            id: 'se',
            bloco: 'programa',
            nivel: 1,
            texto: (
              <>
                <PalavraDoBloco>se</PalavraDoBloco> temChave for verdadeiro
              </>
            ),
          },
          {
            id: 'entao',
            bloco: 'jogo',
            nivel: 2,
            estado: ramo(true),
            texto: (
              <>
                <PalavraDoBloco>então</PalavraDoBloco> acender o farol
              </>
            ),
          },
          {
            id: 'senao',
            bloco: 'programa',
            nivel: 2,
            estado: ramo(false),
            texto: (
              <>
                <PalavraDoBloco>senão</PalavraDoBloco> avisar que falta a chave
              </>
            ),
          },
        ]}
      />
      <div className="flex flex-wrap items-center gap-2">
        {/* Sem `aria-pressed`: o rótulo já diz a próxima ação, e somar o estado faria o leitor dizer
            "Deixar a chave, pressionado". */}
        <SceneButton
          tom={hasKey ? 'ligado' : 'ferramenta'}
          onClick={() => dispatch({ type: 'key-state', hasKey: !hasKey })}
        >
          {hasKey ? 'Deixar a chave' : 'Levar a chave'}
        </SceneButton>
        <SceneButton tom="gesto" onClick={() => dispatch({ type: 'try-lighthouse-door' })}>
          Testar a porta
        </SceneButton>
      </div>
    </div>
  )
}
