/**
 * Cor e acabamento da peça no painel direito, sem alterar a área do palco.
 */
import { SCENE_SHELL_COPY } from '../../../core/sceneShellCopy'
import { useMoldaToolAccess } from '../../toolAccess'
import { ScenePieceFinish } from './ScenePieceFinish'
import type { useSceneWorkshop } from './useSceneWorkshop'

export function SceneSurfaceStrip({ workshop }: { workshop: ReturnType<typeof useSceneWorkshop> }) {
  const { can } = useMoldaToolAccess()
  if (!can('model.finish')) return null
  return (
    <section aria-label={SCENE_SHELL_COPY.surface} className="border-t border-mld-border pt-3">
      {workshop.primary?.kind === 'mesh' ? (
        <ScenePieceFinish workshop={workshop} />
      ) : (
        <p className="text-sm text-mld-muted">{SCENE_SHELL_COPY.surfaceHint}</p>
      )}
    </section>
  )
}
