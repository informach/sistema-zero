'use client'

import type { SceneAction, SceneState } from '@sistemazero/core/learning/scene'
import { FAROL_LAYOUT, farolSvgUrl } from '@sistemazero/studio/arte'
import { SceneButton } from './exploration-stage'
import { Chave } from './scene-bench'
import { SceneCanvas } from './scene-canvas'
import { AVISOS_DO_FAROL, AvisoDoFarol, RegraDoJogo } from './scene-farol'

/**
 * Onde o personagem fica em cada momento da partida. A chave do Farol mora em (211, 53): perto é um
 * passo antes dela, encostando é por cima, e afastado é a volta à praia.
 */
function lugarDoPersonagem(position: SceneState['collection']['position']) {
  const hero = FAROL_LAYOUT.personagem
  const key = FAROL_LAYOUT.chave
  if (position === 'near') return { x: key.x - 96, y: key.y }
  if (position === 'touching') return { x: key.x - 24, y: key.y }
  return { x: hero.x + 60, y: hero.y }
}

/**
 * O palco é o JOGO, e só o jogo: a chave, o personagem e a faixa do aviso, como o projeto da criança
 * os desenha. temChave e a chave moram nos ladrilhos do console, logo acima (`sceneReadout`); um
 * cartão aqui embaixo repetia os dois e ficava sob o aviso "Descoberta N de M".
 *
 * ⚠️ O personagem e a chave ANDAM por transição de CSS (`.sz-scene-anda`, que a preferência por
 * menos movimento desliga). A chave não sai do DOM: ela sobe e some, para o sumiço se ver.
 */
export function CollectionMemoryStage({ state }: { state: SceneState }) {
  const { keyPresent, hasKey, position } = state.collection
  const hero = FAROL_LAYOUT.personagem
  const key = FAROL_LAYOUT.chave
  const lugar = lugarDoPersonagem(position)
  const aviso = keyPresent ? AVISOS_DO_FAROL.inicio : AVISOS_DO_FAROL.coleta
  return (
    <SceneCanvas
      view={FAROL_LAYOUT.palco}
      mundo="farol"
      titulo="A coleta da chave"
      descricao={`A chave está ${keyPresent ? 'no chão' : 'fora da tela'}. O personagem está ${position === 'away' ? 'afastado' : 'perto do lugar da chave'}. temChave guarda ${hasKey ? 'verdadeiro' : 'falso'}. O aviso do jogo diz: ${aviso}`}
    >
      <image
        data-fundo="farol"
        href={farolSvgUrl('praia-tropical')}
        width={FAROL_LAYOUT.palco.w}
        height={FAROL_LAYOUT.palco.h}
      />
      <image
        href={farolSvgUrl('farol-listrado-apagado')}
        x={FAROL_LAYOUT.farol.x}
        y={FAROL_LAYOUT.farol.y}
        width={FAROL_LAYOUT.farol.w}
        height={FAROL_LAYOUT.farol.h}
      />
      <g
        className="sz-scene-anda"
        data-chave={keyPresent ? 'no-chao' : 'coletada'}
        style={{
          opacity: keyPresent ? 1 : 0,
          transform: keyPresent ? 'translate(0px, 0px)' : 'translate(0px, -18px)',
        }}
      >
        <image
          href={farolSvgUrl('chave-dourada')}
          x={key.x}
          y={key.y}
          width={key.w}
          height={key.h}
        />
      </g>
      <g
        className="sz-scene-anda"
        data-personagem={position}
        style={{ transform: `translate(${lugar.x}px, ${lugar.y}px)` }}
      >
        <image href={farolSvgUrl('aventureiro')} width={hero.w} height={hero.h} />
      </g>
      <AvisoDoFarol texto={aviso} />
    </SceneCanvas>
  )
}

/** A ação que leva a partida adiante agora: é ela que ganha o azul cheio. */
function proximoGesto({ keyPresent, position }: SceneState['collection']) {
  if (keyPresent) return 'encostar'
  return position === 'touching' ? 'afastar' : 'recomecar'
}

export function CollectionMemoryControls({
  state,
  dispatch,
}: {
  state: SceneState
  dispatch: (action: SceneAction) => void
}) {
  const { keyPresent, remember, position } = state.collection
  const proximo = proximoGesto(state.collection)
  return (
    <div className="space-y-3">
      {/* A regra que a cena executa, na ORDEM dos blocos que a criança monta no Dia 2: destruir a
          chave, guardar a coleta, e só depois o aviso. A linha de guardar entra e sai com "Guardar
          a coleta"; as outras são iguais nos dois modos. */}
      <RegraDoJogo
        titulo="A regra da coleta"
        passos={[
          { id: 'evento', bloco: 'evento', texto: 'Quando o personagem encostar na chave' },
          { id: 'destruir', bloco: 'jogo', nivel: 1, texto: 'Destruir o sprite chave' },
          {
            id: 'guardar',
            bloco: 'programa',
            nivel: 1,
            texto: 'Alterar temChave para verdadeiro',
            estado: remember ? undefined : 'fora',
          },
          {
            id: 'aviso',
            bloco: 'programa',
            nivel: 1,
            texto: `Alterar aviso para "${AVISOS_DO_FAROL.coleta}"`,
          },
        ]}
      />
      <Chave
        label="Guardar a coleta"
        ligado={remember}
        ligadoTexto="ligado"
        desligadoTexto="desligado"
        disabled={!keyPresent}
        nota={keyPresent ? undefined : 'Recomece a partida para mudar essa regra.'}
        onToggle={(enabled) => dispatch({ type: 'remember-collection', enabled })}
      />
      <div className="flex flex-wrap gap-2">
        <SceneButton
          tom={proximo === 'encostar' ? 'gesto' : 'ferramenta'}
          fechado={!keyPresent}
          onClick={() => dispatch({ type: 'collect-key' })}
        >
          Encostar na chave
        </SceneButton>
        <SceneButton
          tom={proximo === 'afastar' ? 'gesto' : 'ferramenta'}
          fechado={position !== 'touching'}
          onClick={() => dispatch({ type: 'leave-key' })}
        >
          Afastar
        </SceneButton>
        <SceneButton
          tom={proximo === 'recomecar' ? 'gesto' : 'ferramenta'}
          onClick={() => dispatch({ type: 'restart-collection' })}
        >
          Recomeçar a partida
        </SceneButton>
      </div>
    </div>
  )
}
