'use client'

import {
  LIGHTHOUSE_POSITION,
  type SceneAction,
  type SceneState,
} from '@sistemazero/core/learning/scene'
import { FAROL_LAYOUT, FAROL_POSICOES_CHAVE, farolSvgUrl } from '@sistemazero/studio/arte'
import { SceneButton } from './exploration-stage'
import { Medida } from './scene-bench'
import { SceneCanvas } from './scene-canvas'

/** O nome que o Mapa da Aventura dá ao lugar, quando a chave está num dos três sugeridos. */
function lugarSugerido(x: number, y: number): string {
  const lugar = FAROL_POSICOES_CHAVE.find((ponto) => ponto.x === x && ponto.y === y)
  return lugar ? `, ${lugar.nome}` : ''
}

/** A chave conserva a caixa do jogo. Só um eixo muda por gesto; o pontilhado mostra de onde veio. */
export function LighthousePositionStage({ state }: { state: SceneState }) {
  const { x, y, before } = state.keyPosition
  const { palco, chave, farol, personagem } = FAROL_LAYOUT
  return (
    <SceneCanvas
      view={palco}
      mundo="farol"
      titulo="O lugar da chave no mapa do Farol"
      descricao={
        before
          ? `A chave mudou de x ${before.x}, y ${before.y} para x ${x}, y ${y}. O quadrado pontilhado marca o lugar anterior. O personagem e o farol continuam nos mesmos lugares.`
          : `A chave está em x ${x}, y ${y}${lugarSugerido(x, y)}. O personagem espera à esquerda e o farol fica à direita.`
      }
    >
      <image
        data-fundo="farol"
        href={farolSvgUrl('praia-tropical')}
        width={palco.w}
        height={palco.h}
      />
      <image
        data-farol=""
        href={farolSvgUrl('farol-listrado-apagado')}
        x={farol.x}
        y={farol.y}
        width={farol.w}
        height={farol.h}
      />
      <image
        href={farolSvgUrl('aventureiro')}
        x={personagem.x}
        y={personagem.y}
        width={personagem.w}
        height={personagem.h}
      />
      {before && (
        <g data-posicao-anterior="" aria-hidden>
          {/* Tinta escura com borda clara continua legível sobre areia, grama e mar. */}
          <line
            x1={before.x + chave.w / 2}
            y1={before.y + chave.h / 2}
            x2={x + chave.w / 2}
            y2={y + chave.h / 2}
            stroke="#fff"
            strokeWidth={5}
          />
          <line
            x1={before.x + chave.w / 2}
            y1={before.y + chave.h / 2}
            x2={x + chave.w / 2}
            y2={y + chave.h / 2}
            stroke="#143d35"
            strokeWidth={2}
            strokeDasharray="4 4"
          />
          <rect
            x={before.x}
            y={before.y}
            width={chave.w}
            height={chave.h}
            rx={4}
            fill="#fff"
            fillOpacity={0.75}
            stroke="#143d35"
            strokeWidth={2}
            strokeDasharray="4 4"
          />
        </g>
      )}
      <image
        data-chave=""
        href={farolSvgUrl('chave-dourada')}
        x={x}
        y={y}
        width={chave.w}
        height={chave.h}
      />
    </SceneCanvas>
  )
}

export function LighthousePositionControls({
  state,
  dispatch,
}: {
  state: SceneState
  dispatch: (action: SceneAction) => void
}) {
  return (
    <div className="sz-scene-quebra space-y-3">
      <Medida
        label="Posição horizontal x"
        value={state.keyPosition.x}
        min={LIGHTHOUSE_POSITION.x.min}
        max={LIGHTHOUSE_POSITION.x.max}
        passo={20}
        digitavel
        texto={(value) => `x ${value}`}
        onChange={(value) => dispatch({ type: 'key-position', axis: 'x', value })}
      />
      <Medida
        label="Posição vertical y"
        value={state.keyPosition.y}
        min={LIGHTHOUSE_POSITION.y.min}
        max={LIGHTHOUSE_POSITION.y.max}
        passo={20}
        digitavel
        tom="text-scene-b"
        texto={(value) => `y ${value}`}
        onChange={(value) => dispatch({ type: 'key-position', axis: 'y', value })}
      />
      <p className="text-sm text-muted-foreground">
        Mude um número por vez. O quadrado pontilhado marca o lugar anterior da chave.
      </p>
      <SceneButton tom="ferramenta" onClick={() => dispatch({ type: 'restart-key-position' })}>
        Recomeçar
      </SceneButton>
    </div>
  )
}
