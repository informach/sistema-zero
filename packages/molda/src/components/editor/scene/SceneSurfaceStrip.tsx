/**
 * A FAIXA DE BAIXO do Modelar (a tela-modelo põe ali os materiais): o acabamento e as cores da
 * peça escolhida. Fica SEMPRE montada, com uma dica quando não há peça, e com a altura fixa: se
 * ela aparecesse e sumisse, o palco mudaria de tamanho a cada toque e o 3D redesenharia.
 */
import { SCENE_SHELL_COPY } from '../../../core/sceneShellCopy'
import { useMoldaToolAccess } from '../../toolAccess'
import { ScenePieceFinish } from './ScenePieceFinish'
import type { useSceneWorkshop } from './useSceneWorkshop'

export function SceneSurfaceStrip({ workshop }: { workshop: ReturnType<typeof useSceneWorkshop> }) {
  const { can } = useMoldaToolAccess()
  if (!can('model.finish')) return null
  return (
    <section
      aria-label={SCENE_SHELL_COPY.surface}
      className="mld-bar mld-scroll-x flex h-28 shrink-0 items-center overflow-x-auto border-t px-4"
    >
      {workshop.primary?.kind === 'mesh' ? (
        <ScenePieceFinish workshop={workshop} />
      ) : (
        <p className="text-sm text-mld-muted">{SCENE_SHELL_COPY.surfaceHint}</p>
      )}
    </section>
  )
}
