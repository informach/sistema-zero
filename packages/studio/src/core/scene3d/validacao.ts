import type { ProjectAsset } from '../projectAssets'
import { assertScene3DReferences, pacoteDeCena3D } from './referencias'

/** Uses the canonical compiler preflight, including exact hashes, geometry and physical terrain. */
export async function assertScene3DAssets(
  assets: readonly ProjectAsset[],
  signal?: AbortSignal,
): Promise<void> {
  signal?.throwIfAborted()
  assertScene3DReferences(assets)
  // Capture exact bytes before the first await; later editor changes cannot alter this validation.
  const cenas = assets.filter((a) => a.kind === 'scene3d').map((a) => pacoteDeCena3D(a, assets))
  if (!cenas.length) return
  const { conferirConteudoCompilado } = await import('@sistemazero/molda-cenarios-motor/conteudo')
  for (const pacote of cenas) {
    signal?.throwIfAborted()
    await conferirConteudoCompilado(pacote.cena, pacote.arquivos, signal)
  }
}
