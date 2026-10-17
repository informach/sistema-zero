import type { SceneMeshSymmetry } from '../../../scene/document'
import { ComponentButton, ComponentPage } from './SceneComponentPanel'

export function SceneComponentMirror({
  symmetry,
  stop,
  onBack,
}: {
  symmetry: SceneMeshSymmetry | null
  stop(): boolean
  onBack(): void
}) {
  return (
    <ComponentPage
      title="Espelhar"
      description="Crie o outro lado igualzinho."
      backLabel="Faces"
      onBack={onBack}
    >
      <p className="mld-component-note">
        {symmetry
          ? `Espelho ${['X', 'Y', 'Z'][symmetry.axis]} ativo. Edite o lado fonte; o outro lado acompanha suas mudanças.`
          : 'Escolha faces de um lado da peça para espelhar.'}
      </p>
      {symmetry && (
        <>
          <p className="mld-component-description">
            O plano do espelho fica fixo. Parar mantém os dois lados na peça e permite editar cada
            um.
          </p>
          <ComponentButton
            onClick={() => {
              if (stop()) onBack()
            }}
          >
            Parar de espelhar
          </ComponentButton>
        </>
      )}
      <ComponentButton onClick={onBack}>Voltar</ComponentButton>
    </ComponentPage>
  )
}
