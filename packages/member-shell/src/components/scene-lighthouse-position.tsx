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

/** O nome que o Passo a passo do projeto dá ao lugar, quando a chave está num dos três sugeridos. */
function lugarSugerido(x: number, y: number): string {
  const lugar = FAROL_POSICOES_CHAVE.find((ponto) => ponto.x === x && ponto.y === y)
  return lugar ? `, ${lugar.nome}` : ''
}

const TINTA = '#865900'
const PONTA = { comprimento: 13, meiaLargura: 7.5 } as const
/** A seta mostra a direção e precisa caber entre o lugar anterior e a chave. */
const MENOR_SETA = PONTA.comprimento + 6

/**
 * ⭐ O lugar anterior da chave: o quadrado pontilhado onde ela estava e uma SETA dele até a chave.
 * Revisão de 20/11/2026: uma criança achou confusa a linha pontilhada que ligava os dois lugares
 * (a linha não diz qual ponta é a saída). A seta sai do meio do quadrado e para na beirada da
 * chave, com a ponta encostando nela. ⚠️ A marca mora SÓ aqui: antes, as réguas da experiência
 * livre desenhavam outra por cima, um pouco deslocada (borda dupla e linha em três cores). Marrom
 * com contorno branco continua legível sobre grama, areia e mar. Com o passo do y (40) e a chave de
 * 32, a seta começa dentro do quadrado; num passo curto demais não cabe seta, e fica só o quadrado.
 */
export function MarcaDoLugarAnterior({
  antes,
  agora,
  caixa,
}: {
  antes: { x: number; y: number }
  agora: { x: number; y: number }
  caixa: { w: number; h: number }
}) {
  const de = { x: antes.x + caixa.w / 2, y: antes.y + caixa.h / 2 }
  const vx = agora.x - antes.x
  const vy = agora.y - antes.y
  const distancia = Math.hypot(vx, vy)
  const ux = distancia ? vx / distancia : 0
  const uy = distancia ? vy / distancia : 0
  // Do meio da chave até a beirada dela, na direção do movimento, mais uma folga de 3.
  const meioAteABeirada = Math.min(
    ux ? caixa.w / 2 / Math.abs(ux) : Number.POSITIVE_INFINITY,
    uy ? caixa.h / 2 / Math.abs(uy) : Number.POSITIVE_INFINITY,
  )
  const alcance = distancia - meioAteABeirada - 3
  const ponta = { x: de.x + ux * alcance, y: de.y + uy * alcance }
  const base = { x: ponta.x - ux * PONTA.comprimento, y: ponta.y - uy * PONTA.comprimento }
  const lado = (s: 1 | -1) =>
    `${base.x - s * uy * PONTA.meiaLargura},${base.y + s * ux * PONTA.meiaLargura}`
  const triangulo = `${ponta.x},${ponta.y} ${lado(1)} ${lado(-1)}`
  // A haste termina dentro da ponta, para as duas ficarem emendadas.
  const fim = { x: base.x + ux * 2, y: base.y + uy * 2 }
  return (
    <g data-posicao-anterior="" aria-hidden>
      <rect
        x={antes.x}
        y={antes.y}
        width={caixa.w}
        height={caixa.h}
        rx={6}
        fill="#fff"
        fillOpacity={0.55}
        stroke={TINTA}
        strokeWidth={2.5}
        strokeDasharray="5 4"
      />
      {alcance >= MENOR_SETA && (
        <g data-seta-da-chave="">
          <line
            x1={de.x}
            y1={de.y}
            x2={fim.x}
            y2={fim.y}
            stroke="#fff"
            strokeWidth={8}
            strokeLinecap="round"
          />
          <polygon
            points={triangulo}
            fill="#fff"
            stroke="#fff"
            strokeWidth={4}
            strokeLinejoin="round"
          />
          <line
            x1={de.x}
            y1={de.y}
            x2={fim.x}
            y2={fim.y}
            stroke={TINTA}
            strokeWidth={4}
            strokeLinecap="round"
          />
          <polygon points={triangulo} fill={TINTA} />
        </g>
      )}
    </g>
  )
}

/** A chave conserva a caixa do jogo. Só um eixo muda por gesto; a seta mostra de onde veio. */
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
          ? `A chave mudou de x ${before.x}, y ${before.y} para x ${x}, y ${y}. O quadrado pontilhado marca o lugar anterior, e a seta mostra para onde ela foi. O personagem e o farol continuam nos mesmos lugares.`
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
      {before && <MarcaDoLugarAnterior antes={before} agora={{ x, y }} caixa={chave} />}
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
        Mude um número por vez. O quadrado pontilhado marca o lugar anterior da chave, e a seta
        mostra para onde ela foi.
      </p>
      <SceneButton tom="ferramenta" onClick={() => dispatch({ type: 'restart-key-position' })}>
        Recomeçar
      </SceneButton>
    </div>
  )
}
