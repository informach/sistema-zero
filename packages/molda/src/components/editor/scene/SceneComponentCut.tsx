import { COPY } from '../../../core/copy'
import { ComponentButton, ComponentPage } from './SceneComponentPanel'
import type { SceneComponentToolsProps } from './SceneComponentTools'

export function SceneComponentCut({
  selection,
  blocked,
  operation,
  onKnife,
  onBack,
}: SceneComponentToolsProps & { onBack(): void }) {
  return (
    <ComponentPage
      title="Cortar"
      description="Adicione linhas sem separar a peça."
      backLabel={COPY.scene.componentModes[selection?.mode ?? 'face']}
      onBack={onBack}
      footer={<ComponentButton onClick={onBack}>Cancelar</ComponentButton>}
    >
      <fieldset className="mld-component-grid" aria-label="Tipo de corte">
        <ComponentButton disabled={blocked} onClick={onKnife}>
          Livre
        </ComponentButton>
        <ComponentButton disabled={blocked} onClick={() => operation.start('ring')}>
          Em volta
        </ComponentButton>
      </fieldset>
      <p className="mld-component-note">
        Escolha Livre para marcar pontos na superfície ou Em volta para cortar uma faixa de faces.
      </p>
    </ComponentPage>
  )
}
