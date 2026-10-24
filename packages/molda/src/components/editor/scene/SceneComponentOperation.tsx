import { COPY } from '../../../core/copy'
import type { Vec3 } from '../../../core/model'
import {
  ComponentButton,
  ComponentPage,
  ComponentNumberField as NumberField,
} from './SceneComponentPanel'
import type { SceneComponentToolsProps } from './SceneComponentTools'
import { SceneLoopCutControls } from './SceneLoopCutControls'

/** The same contextual panel owns its preview, selection instructions, error and atomic Apply. */
export function SceneComponentOperation({
  operation,
  selection,
  onBack,
  onKnife,
  measurementStep = 1,
}: Pick<SceneComponentToolsProps, 'operation' | 'selection' | 'onKnife' | 'measurementStep'> & {
  onBack(): void
}) {
  const spec = operation.spec
  if (!spec) return null
  const title = {
    mirror: 'Espelhar',
    duplicate: 'Duplicar',
    extrude: 'Puxar',
    create: selection?.mode === 'edge' ? 'Criar face' : COPY.scene.createFaceEdge.label,
    fill: 'Fechar buraco',
    ring: 'Cortar',
  }[spec.kind]
  const back = () => {
    operation.cancel()
    onBack()
  }
  const help = {
    mirror: (
      <>
        <p>Copie as faces para o outro lado ou vire as faces escolhidas.</p>
        <p>O espelho usa o meio da peça e fica fixo enquanto você edita.</p>
        <p>Continuar espelhando mantém os dois lados ligados no projeto.</p>
      </>
    ),
    duplicate: (
      <>
        <p>Crie uma cópia das faces e mova com as setas ou os valores X, Y e Z.</p>
        <p>Aplicar confirma a cópia e o movimento. Cancelar conserva as faces originais.</p>
      </>
    ),
    extrude: (
      <>
        <p>
          {selection?.mode === 'edge'
            ? 'Arraste a linha no modelo, use as setas de Mover ou ajuste os valores.'
            : 'Arraste a face no modelo, use as setas de Mover ou ajuste os valores.'}
        </p>
        <p>Aplicar cria uma parte ligada à peça. Cancelar descarta a prévia.</p>
      </>
    ),
    create: (
      <>
        <p>
          {selection?.mode === 'vertex'
            ? COPY.scene.createFaceEdge.vertexHint
            : COPY.scene.createFaceEdge.edgeHint}
        </p>
        {selection?.mode === 'vertex' && <p>Use Shift para escolher vários pontos.</p>}
        {selection?.mode === 'edge' && (
          <p>Com duas linhas, a nova face usa a pintura da primeira linha escolhida.</p>
        )}
        <p>{COPY.scene.createFaceEdge.preserveHint}</p>
      </>
    ),
    fill: (
      <>
        <p>Escolha as linhas ao redor do buraco. Use Shift para escolher várias.</p>
        <p>O contorno precisa ser plano. A pintura das faces ao redor é preservada.</p>
      </>
    ),
    ring: (
      <>
        <p>Clique em uma linha da peça. A prévia mostra por onde o corte passa.</p>
        <p>Ajuste de 1 a 16 cortes. O corte segue uma faixa de faces com 4 lados.</p>
        <p>Escolha outra linha para mudar a faixa. Na posição, 0% centraliza os cortes.</p>
      </>
    ),
  }[spec.kind]
  return (
    <ComponentPage
      title={title}
      help={{ title: `Como usar ${title}`, content: help }}
      backLabel={
        spec.kind === 'extrude' || spec.kind === 'create'
          ? selection?.mode === 'edge'
            ? 'Linhas'
            : 'Pontos'
          : 'Faces'
      }
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
          </div>
        </>
      )}
      {(spec.kind === 'duplicate' || spec.kind === 'extrude') &&
        (['X', 'Y', 'Z'] as const).map((axis, i) => (
          <NumberField
            key={axis}
            label={`${spec.kind === 'extrude' ? 'Puxar' : 'Mover cópia'} ${axis}`}
            name={`component${spec.kind === 'extrude' ? 'Extrude' : 'Duplicate'}${axis}`}
            value={spec.offset[i]!}
            measurementStep={spec.kind === 'extrude' ? measurementStep : undefined}
            change={(n) => {
              const offset: Vec3 = [...spec.offset]
              offset[i] = n
              operation.configure({ ...spec, offset })
            }}
          />
        ))}
      {(spec.kind === 'fill' || spec.kind === 'create') && (
        <>
          <p className="mld-component-description">
            {selection?.mode === 'vertex'
              ? 'Escolha os pontos.'
              : spec.kind === 'create'
                ? 'Clique em duas linhas da mesma peça.'
                : 'Escolha as linhas.'}
          </p>
          <p role="status">
            {selection?.ids.length ?? 0}{' '}
            {selection?.mode === 'vertex' ? 'pontos escolhidos' : 'linhas escolhidas'}
          </p>
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
              Corte em faixa
            </ComponentButton>
          </fieldset>
          <SceneLoopCutControls
            count={spec.count}
            offset={spec.offset}
            change={(count, offset) => operation.configure({ ...spec, count, offset })}
          />
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
      {operation.error && !(spec.kind === 'create' && (selection?.ids.length ?? 0) < 2) && (
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
