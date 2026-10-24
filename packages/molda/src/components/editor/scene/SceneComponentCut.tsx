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
      help={{
        title: 'Como cortar',
        content: (
          <p>
            Escolha Livre para marcar pontos na superfície ou Corte em faixa para adicionar linhas
            sem separar a peça.
          </p>
        ),
      }}
      backLabel={COPY.scene.componentModes[selection?.mode ?? 'face']}
      onBack={onBack}
      footer={<ComponentButton onClick={onBack}>Cancelar</ComponentButton>}
    >
      <fieldset className="mld-component-grid" aria-label="Tipo de corte">
        <ComponentButton disabled={blocked} onClick={onKnife}>
          Livre
        </ComponentButton>
        <ComponentButton disabled={blocked} onClick={() => operation.start('ring')}>
          Corte em faixa
        </ComponentButton>
      </fieldset>
    </ComponentPage>
  )
}
