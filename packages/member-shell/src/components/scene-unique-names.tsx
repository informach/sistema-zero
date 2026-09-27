'use client'

import {
  type SceneAction,
  type SceneState,
  UNIQUE_NAME_WARNINGS,
  uniqueNamesWarning,
} from '@sistemazero/core/learning/scene'
import { SceneButton } from './exploration-stage'
import { Escolha } from './scene-bench'
import { SceneCanvas, Texto } from './scene-canvas'

export function UniqueNamesStage({ state }: { state: SceneState }) {
  const names = state.uniqueNames
  const warning = uniqueNamesWarning(names)
  return (
    <div className="space-y-2">
      <SceneCanvas
        titulo="O nome que os blocos procuram"
        descricao={`${names.topPresent ? 'O bloco de cima cria nave' : 'O bloco de cima foi retirado'}. A folha se chama ${names.bottomName || 'nada'}. ${warning ? UNIQUE_NAME_WARNINGS[warning] : 'Sem avisos'}. A prévia ${warning ? 'segura a última versão que funcionava' : 'mostra a nave voando'}.`}
      >
        {(palco) => (
          <>
            <rect x={0} y={0} width={560} height={300} className="fill-scene-card" />
            <Texto
              x={20}
              y={28}
              tamanho={palco.estreito ? 16 : 14}
              className="fill-scene-ink"
              fontWeight="700"
            >
              Criadores
            </Texto>
            <Texto
              x={318}
              y={28}
              tamanho={palco.estreito ? 16 : 14}
              className="fill-scene-ink"
              fontWeight="700"
            >
              Blocos que procuram nave
            </Texto>
            <rect
              x={16}
              y={40}
              width={252}
              height={58}
              rx={12}
              className="fill-scene-a stroke-scene-line"
            />
            <Texto
              x={28}
              y={64}
              tamanho={palco.estreito ? 16 : 14}
              className="fill-scene-ink"
              fontWeight="700"
            >
              {names.topPresent ? 'Criar sprite: nave' : 'Bloco retirado'}
            </Texto>
            <Texto x={28} y={86} tamanho={palco.estreito ? 14 : 12} className="fill-scene-ink">
              bloco de cima
            </Texto>
            <rect
              x={16}
              y={106}
              width={252}
              height={58}
              rx={12}
              className="fill-scene-b stroke-scene-line"
            />
            <Texto
              x={28}
              y={130}
              tamanho={palco.estreito ? 16 : 14}
              className="fill-scene-ink"
              fontWeight="700"
            >
              {`Criar folha: ${names.bottomName || '(sem nome)'}`}
            </Texto>
            <Texto x={28} y={151} tamanho={palco.estreito ? 14 : 12} className="fill-scene-ink">
              bloco de baixo
            </Texto>
            {['Mover nave', 'Desenhar nave', 'Ler nave'].map((label, index) => (
              <g key={label}>
                <rect
                  x={310}
                  y={42 + index * 47}
                  width={230}
                  height={40}
                  rx={10}
                  className="fill-scene-card stroke-scene-line"
                />
                <Texto
                  x={322}
                  y={68 + index * 47}
                  tamanho={palco.estreito ? 15 : 13}
                  className="fill-scene-ink"
                >
                  {label}
                </Texto>
                {warning === 'missing' && (
                  <Texto
                    x={516}
                    y={69 + index * 47}
                    tamanho={palco.estreito ? 17 : 15}
                    className="fill-scene-alert"
                    fontWeight="700"
                  >
                    !
                  </Texto>
                )}
              </g>
            ))}
            {warning === 'clash' && (
              <Texto
                x={247}
                y={129}
                tamanho={palco.estreito ? 18 : 16}
                className="fill-scene-alert"
                fontWeight="700"
              >
                !
              </Texto>
            )}
            <rect
              x={16}
              y={205}
              width={524}
              height={79}
              rx={12}
              className="fill-scene-card stroke-scene-line"
            />
            <Texto
              x={28}
              y={229}
              tamanho={palco.estreito ? 16 : 14}
              className="fill-scene-ink"
              fontWeight="700"
            >
              {warning ? 'Prévia: última versão que funcionava' : 'Prévia: nave voando'}
            </Texto>
            <path
              d={`M${names.previewX} 257l-18 10 18-4 18 4z`}
              className="fill-scene-a stroke-scene-line"
              strokeWidth={2}
            />
            <Texto
              x={340}
              y={270}
              tamanho={palco.estreito ? 14 : 12}
              className="fill-scene-ink"
            >{`posição ${names.previewX}`}</Texto>
          </>
        )}
      </SceneCanvas>
      <div
        role="status"
        aria-live="polite"
        className={`rounded-xl border px-3 py-2 text-sm ${warning ? 'border-destructive/40 bg-destructive/5 text-foreground' : 'border-border text-muted-foreground'}`}
      >
        {warning ? UNIQUE_NAME_WARNINGS[warning] : 'Sem avisos. A prévia mostra o jogo atual.'}
      </div>
    </div>
  )
}

export function UniqueNamesControls({
  state,
  dispatch,
}: {
  state: SceneState
  dispatch: (action: SceneAction) => void
}) {
  const names = state.uniqueNames
  return (
    <div className="space-y-3">
      <SceneButton
        tom={names.topPresent ? 'ferramenta' : 'ligado'}
        onClick={() => dispatch({ type: 'toggle-block', present: !names.topPresent })}
      >
        {names.topPresent ? 'Tirar este bloco' : 'Pôr de volta'}
      </SceneButton>
      <Escolha
        label="Nome do bloco de baixo"
        valor={names.bottomName}
        opcoes={[
          { id: '', label: 'Sem nome' },
          { id: 'nave', label: 'nave' },
          { id: 'folha-nave', label: 'folha-nave' },
          { id: 'nave2', label: 'nave2' },
        ]}
        onChange={(name) => dispatch({ type: 'name-field', name })}
      />
    </div>
  )
}
