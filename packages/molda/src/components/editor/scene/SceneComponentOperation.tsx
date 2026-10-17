import { type Ref, useRef } from 'react'
import type { Vec3 } from '../../../core/model'
import { ComponentButton, ComponentPage } from './SceneComponentPanel'
import type { SceneComponentToolsProps } from './SceneComponentTools'

function NumberField({
  label,
  name,
  value,
  change,
  inputRef,
}: {
  label: string
  name: string
  value: number
  change(value: number): void
  inputRef?: Ref<HTMLInputElement>
}) {
  return (
    <label className="mld-component-field">
      {label}
      <input
        ref={inputRef}
        name={name}
        aria-label={label}
        type="number"
        step="0.1"
        className="min-h-11 w-full rounded-lg border border-mld-border bg-mld-bg px-3 text-mld-text focus-visible:outline-2 focus-visible:outline-mld-accent"
        value={Number.isFinite(value) ? Number(value.toPrecision(12)) : ''}
        onChange={(e) => change(e.target.value.trim() ? Number(e.target.value) : Number.NaN)}
      />
    </label>
  )
}

/** The same contextual panel owns its preview, selection instructions, error and atomic Apply. */
export function SceneComponentOperation({
  operation,
  selection,
  onBack,
  onKnife,
}: Pick<SceneComponentToolsProps, 'operation' | 'selection' | 'onKnife'> & { onBack(): void }) {
  const positionInput = useRef<HTMLInputElement>(null)
  const spec = operation.spec
  if (!spec) return null
  const title = {
    mirror: 'Espelhar',
    duplicate: 'Duplicar',
    fill: 'Fechar buraco',
    ring: 'Cortar',
  }[spec.kind]
  const back = () => {
    operation.cancel()
    onBack()
  }
  return (
    <ComponentPage
      title={title}
      description={
        spec.kind === 'mirror'
          ? 'Crie o outro lado igualzinho.'
          : spec.kind === 'duplicate'
            ? 'Crie uma cópia das faces na mesma peça.'
            : spec.kind === 'ring'
              ? 'Adicione linhas sem separar a peça.'
              : 'Crie uma face no contorno escolhido.'
      }
      backLabel="Faces"
      onBack={back}
      footer={
        <div className="mld-component-grid">
          <ComponentButton onClick={back}>Cancelar</ComponentButton>
          <ComponentButton
            tone="primary"
            disabled={!operation.canConfirm}
            onClick={() => {
              if (operation.confirm()) onBack()
            }}
          >
            {spec.kind === 'ring' ? 'Aplicar corte' : 'Aplicar'}
          </ComponentButton>
        </div>
      }
    >
      {spec.kind === 'mirror' && (
        <>
          <h4>O que você quer fazer?</h4>
          <ComponentButton
            tone={spec.copy ? 'primary' : 'neutral'}
            aria-pressed={spec.copy}
            onClick={() => operation.configure({ ...spec, copy: true })}
          >
            Copiar para o outro lado
          </ComponentButton>
          <ComponentButton
            tone={!spec.copy ? 'primary' : 'neutral'}
            aria-pressed={!spec.copy}
            onClick={() => operation.configure({ ...spec, copy: false, continuous: false })}
          >
            Virar as faces escolhidas
          </ComponentButton>
          <div className="mld-component-divider" />
          <h4>Para qual lado?</h4>
          {(['X · Esquerda ↔ direita', 'Y · Cima ↔ baixo', 'Z · Frente ↔ trás'] as const).map(
            (label, axis) => (
              <ComponentButton
                key={label}
                tone={spec.axis === axis ? 'primary' : 'neutral'}
                aria-pressed={spec.axis === axis}
                onClick={() => operation.configure({ ...spec, axis: axis as 0 | 1 | 2 })}
              >
                {label}
              </ComponentButton>
            ),
          )}
          <p className="mld-component-description">
            Usar o meio da peça como espelho. O plano fica fixo enquanto você edita.
          </p>
          <div className="mld-component-note">
            <label className="flex min-h-11 items-center gap-2 font-bold">
              <input
                name="componentMirrorLive"
                className="size-5 accent-mld-accent"
                type="checkbox"
                checked={spec.continuous}
                disabled={!spec.copy}
                onChange={(e) => operation.configure({ ...spec, continuous: e.target.checked })}
              />
              Continuar espelhando
            </label>
            <p>
              {spec.copy
                ? 'Ao mudar um lado, o outro muda junto. O vínculo fica salvo no projeto.'
                : 'Continuar espelhando está disponível ao copiar para o outro lado.'}
            </p>
          </div>
        </>
      )}
      {spec.kind === 'duplicate' && (
        <>
          <div className="mld-component-note">
            Mova a cópia para outro lugar. Arraste as setas de Mover ou ajuste os valores abaixo.
          </div>
          {(['X', 'Y', 'Z'] as const).map((axis, i) => (
            <NumberField
              key={axis}
              label={`Mover cópia ${axis}`}
              name={`componentDuplicate${axis}`}
              value={spec.offset[i]!}
              change={(n) => {
                const offset: Vec3 = [...spec.offset]
                offset[i] = n
                operation.configure({ ...spec, offset })
              }}
            />
          ))}
          <p className="mld-component-description">
            Aplicar confirma a cópia e o movimento juntos. Cancelar conserva as faces originais.
          </p>
        </>
      )}
      {spec.kind === 'fill' && (
        <>
          <div className="mld-component-note">
            <strong>Escolha as linhas ao redor do buraco.</strong>
            <p>Use Shift para somar as linhas de um único contorno fechado.</p>
          </div>
          <p role="status">{selection?.ids.length ?? 0} linhas escolhidas</p>
          {operation.materials.length > 1 && (
            <label className="mld-component-field">
              Pintura da nova face
              <select
                name="componentFillMaterial"
                aria-label="Pintura da nova face"
                className="min-h-11 w-full rounded-lg border border-mld-border bg-mld-bg px-3 text-mld-text focus-visible:outline-2 focus-visible:outline-mld-accent"
                value={spec.material ?? '__choose'}
                onChange={(e) => operation.configure({ ...spec, material: e.target.value })}
              >
                <option value="__choose" disabled>
                  Escolha uma pintura
                </option>
                {operation.materials.map((id) => (
                  <option key={id} value={id}>
                    {id
                      ? (operation.owner?.source.materials.find((m) => m.id === id)?.name ?? id)
                      : 'Pintura da peça'}
                  </option>
                ))}
              </select>
            </label>
          )}
          <p className="mld-component-description">
            O contorno precisa ser plano. A pintura das faces ao redor é preservada.
          </p>
        </>
      )}
      {spec.kind === 'ring' && (
        <>
          <fieldset className="mld-component-grid" aria-label="Tipo de corte">
            <ComponentButton
              onClick={() => {
                operation.cancel()
                onKnife()
              }}
            >
              Livre
            </ComponentButton>
            <ComponentButton tone="primary" aria-pressed>
              Em volta
            </ComponentButton>
          </fieldset>
          <div className="mld-component-note">
            <strong>1. Clique em uma linha da peça.</strong>
            <p>2. Ajuste onde cortar.</p>
            <p>A prévia mostra por onde o corte passa.</p>
          </div>
          <div className="mld-component-field">
            Quantidade de cortes
            <div className="mld-component-selection">
              <ComponentButton
                aria-label="Diminuir quantidade de cortes"
                disabled={spec.count <= 1}
                onClick={() => operation.configure({ ...spec, count: spec.count - 1, offset: 0 })}
              >
                −
              </ComponentButton>
              <output aria-label="Quantidade de cortes" className="mld-component-value">
                {spec.count}
              </output>
              <ComponentButton
                aria-label="Aumentar quantidade de cortes"
                disabled={spec.count >= 16}
                onClick={() => operation.configure({ ...spec, count: spec.count + 1, offset: 0 })}
              >
                +
              </ComponentButton>
            </div>
          </div>
          <h4>Onde cortar</h4>
          <div className="mld-component-grid">
            <ComponentButton
              tone={spec.offset === 0 ? 'primary' : 'neutral'}
              aria-pressed={spec.offset === 0}
              onClick={() => operation.configure({ ...spec, offset: 0 })}
            >
              No meio
            </ComponentButton>
            <ComponentButton onClick={() => positionInput.current?.focus()}>
              Ajustar
            </ComponentButton>
          </div>
          <NumberField
            inputRef={positionInput}
            label="Posição do conjunto (%)"
            name="componentRingOffset"
            value={spec.offset * 100}
            change={(offset) => operation.configure({ ...spec, offset: offset / 100 })}
          />
          <p className="mld-component-description">
            De 1 a 16 cortes. O corte em volta segue uma faixa de faces com 4 lados. Marque uma
            linha diferente para mudar a faixa.
          </p>
        </>
      )}
      <label className="flex min-h-11 items-center gap-2 text-sm font-bold">
        <input
          name="componentOperationPreview"
          className="size-5 accent-mld-accent"
          type="checkbox"
          checked={operation.showPreview}
          onChange={(e) => operation.setShowPreview(e.target.checked)}
        />
        Mostrar o resultado antes de aplicar
      </label>
      {operation.error && (
        <p
          role={operation.owner?.targets.length ? 'alert' : 'status'}
          className="mld-component-description"
        >
          {operation.error}
        </p>
      )}
    </ComponentPage>
  )
}
