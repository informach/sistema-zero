'use client'

import {
  numberLineAnswer,
  type SceneAction,
  type SceneState,
} from '@sistemazero/core/learning/scene'
import { SceneButton } from './exploration-stage'
import { Escolha, Medida } from './scene-bench'
import { SceneCanvas, Texto } from './scene-canvas'

const xOf = (value: number) => 38 + (value + 12) * 40

export function NumberLineStage({ state }: { state: SceneState }) {
  const line = state.numberLine
  const answer = numberLineAnswer(line)
  return (
    <SceneCanvas
      titulo="A régua dos números negativos"
      descricao={`Régua de -12 a 0. Bandeira fixa em -9. Marcador em ${line.value}. Velocidade ${line.operator} -9: ${answer ? 'sim' : 'não'}. Somar -1 apertado ${line.presses} vezes.`}
    >
      {(palco) => (
        <>
          <rect x={0} y={0} width={560} height={300} className="fill-scene-card" />
          <Texto
            x={22}
            y={35}
            tamanho={palco.estreito ? 17 : 15}
            className="fill-scene-ink"
            fontWeight="700"
          >
            Quanto mais para a esquerda, menor o número
          </Texto>
          <path
            d="M38 130H518"
            className="stroke-scene-line"
            strokeWidth={4}
            strokeLinecap="round"
          />
          {Array.from({ length: 13 }, (_, index) => index - 12).map((value) => (
            <g key={value}>
              <path d={`M${xOf(value)} 120v20`} className="stroke-scene-line" strokeWidth={2} />
              {(!palco.estreito || [-12, -9, -5, 0].includes(value)) && (
                <Texto
                  x={xOf(value)}
                  y={162}
                  tamanho={palco.estreito ? 16 : 13}
                  textAnchor="middle"
                  className="fill-scene-ink"
                >
                  {value}
                </Texto>
              )}
            </g>
          ))}
          <path d={`M${xOf(-9)} 75v43`} className="stroke-scene-b" strokeWidth={3} />
          <path d={`M${xOf(-9)} 75l31 10-31 10z`} className="fill-scene-b" />
          <Texto
            x={xOf(-9) + 36}
            y={91}
            tamanho={palco.estreito ? 16 : 13}
            className="fill-scene-ink"
          >
            limite -9
          </Texto>
          <circle cx={xOf(line.value)} cy={130} r={13} className="fill-scene-a" />
          <Texto
            x={xOf(line.value)}
            y={109}
            tamanho={palco.estreito ? 18 : 15}
            textAnchor="middle"
            className="fill-scene-a-ink"
            fontWeight="700"
          >
            {line.value}
          </Texto>
          <rect
            x={35}
            y={188}
            width={490}
            height={82}
            rx={14}
            className="fill-scene-card stroke-scene-line"
          />
          <Texto
            x={55}
            y={219}
            tamanho={palco.estreito ? 18 : 17}
            className="fill-scene-ink"
            fontWeight="700"
          >
            {`velocidade ${line.operator} -9`}
          </Texto>
          <Texto
            x={palco.estreito ? 55 : 350}
            y={palco.estreito ? 251 : 219}
            tamanho={palco.estreito ? 18 : 17}
            className={answer ? 'fill-scene-a-ink' : 'fill-scene-alert'}
            fontWeight="700"
          >
            {`resposta: ${answer ? 'sim ✓' : 'não ✕'}`}
          </Texto>
          {!palco.estreito && (
            <Texto
              x={55}
              y={250}
              tamanho={13}
              className="fill-scene-ink"
            >{`Somar -1: ${line.presses} vezes`}</Texto>
          )}
        </>
      )}
    </SceneCanvas>
  )
}

export function NumberLineControls({
  state,
  dispatch,
}: {
  state: SceneState
  dispatch: (action: SceneAction) => void
}) {
  const line = state.numberLine
  return (
    <div className="space-y-3">
      <Medida
        label="valor da base"
        value={line.value}
        min={-12}
        max={0}
        step={1}
        onChange={(value) => dispatch({ type: 'step-value', value })}
      />
      <Escolha
        label="Sinal da pergunta"
        valor={line.operator}
        opcoes={[
          { id: '>', label: '> maior que' },
          { id: '=', label: '= igual a' },
          { id: '<', label: '< menor que' },
        ]}
        onChange={(operator) => dispatch({ type: 'compare-op', operator })}
      />
      <div className="flex flex-wrap gap-2">
        <SceneButton
          tom="gesto"
          fechado={line.value <= -12}
          onClick={() => dispatch({ type: 'sum-minus-one' })}
        >
          Somar -1
        </SceneButton>
        <SceneButton onClick={() => dispatch({ type: 'reset' })}>Voltar ao começo</SceneButton>
      </div>
      <p className="text-sm text-muted-foreground">Somar -1 foi apertado {line.presses} vezes.</p>
    </div>
  )
}
