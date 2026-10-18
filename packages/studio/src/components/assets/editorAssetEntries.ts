import { buildProAssetBundle, type ProAssetManifestEntry } from '../../core/proAssets'
import type { ProjectAsset } from '../../core/project'

/** One materializer per language, shared with execution and export. Never derive a second path. */
export async function editorAssetEntries(
  assets: ProjectAsset[],
  language: 'javascript' | 'python',
  layout: { files: string[]; directories: string[] },
): Promise<ProAssetManifestEntry[]> {
  if (language === 'javascript') return (await buildProAssetBundle(assets)).manifest.assets
  const { buildPythonAssetBundle } = await import('../../core/pythonAssets')
  const bundle = await buildPythonAssetBundle(assets, layout)
  return bundle.manifest.assets.map((entry) => ({ ...entry, url: entry.path }))
}
