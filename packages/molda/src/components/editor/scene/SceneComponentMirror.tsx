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
      help={{
        title: 'Como funciona o espelho',
        content: (
          <>
            <p>Crie o outro lado igualzinho.</p>
            <p>
              O plano do espelho fica fixo. Parar mantém os dois lados e permite editar cada um.
            </p>
          </>
        ),
      }}
      backLabel="Faces"
      onBack={onBack}
    >
      <p className="mld-component-note">
        {symmetry
          ? `Espelho ${['X', 'Y', 'Z'][symmetry.axis]} ativo. Edite o lado fonte; o outro lado acompanha suas mudanças.`
          : 'Escolha faces de um lado da peça para espelhar.'}
      </p>
      {symmetry && (
        <ComponentButton
          onClick={() => {
            if (stop()) onBack()
          }}
        >
          Parar de espelhar
        </ComponentButton>
      )}
      <ComponentButton onClick={onBack}>Voltar</ComponentButton>
    </ComponentPage>
  )
}
