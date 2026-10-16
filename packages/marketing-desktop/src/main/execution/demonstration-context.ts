import type { ExecutionRun } from '@sistemazero/marketing-contracts'
import { demonstrationCandidates } from '@sistemazero/marketing-production/data'
import { downloadAsset } from '../sync/asset-download'
import type { ExecutionResources } from './supervisor'

export async function demonstrationImages(
  run: ExecutionRun,
  resources: ExecutionResources,
  signal: AbortSignal,
) {
  const files: string[] = []
  if (run.request.videoTarget?.part === 'text') return files
  for (const source of demonstrationCandidates(run.context, run.request.videoTarget?.clipId)) {
    signal.throwIfAborted()
    const asset = await downloadAsset(
      run.request.projectId,
      source.assetId,
      resources.assets,
      resources.transport,
      signal,
    )
    if (asset.sha256 !== source.sha256)
      throw new Error('A imagem de demonstração diverge da fonte confirmada')
    files.push((await resources.assets.verify(asset.id)).path)
  }
  return files
}
