import type { PintaExportedAsset } from '@sistemazero/pinta'
import { savePintaStudioBundle } from './save-pinta-studio-bundle'

/** One captured profile owns the library, game creation and final navigation. */
export async function sendPintaGameToStudio(
  asset: PintaExportedAsset,
  {
    namespace,
    signal,
    navigate,
  }: {
    namespace: string
    signal?: AbortSignal
    navigate: (path: string) => void
  },
) {
  signal?.throwIfAborted()
  if (!asset.tilemap && !asset.scene && !asset.regional) return { ok: false as const }
  const saved = await savePintaStudioBundle(asset, namespace, signal)
  signal?.throwIfAborted()
  if (!saved.ok) return { ok: false as const, error: saved.error }
  const studio = await import('@sistemazero/studio/pinta-game')
  signal?.throwIfAborted()
  const project = await studio.buildTilemapGameProject(saved.asset, { namespace, signal })
  signal?.throwIfAborted()
  if (!project) return { ok: false as const }
  navigate(`/estudio?projeto=${encodeURIComponent(project.id)}`)
  return { ok: true as const }
}
