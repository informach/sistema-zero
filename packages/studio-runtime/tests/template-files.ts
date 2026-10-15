import { loadProTemplate } from '../../studio/src/components/code/pro-templates'
import { buildProAssetBundle } from '../../studio/src/core/proAssets'

/** Tests consume the same source + material projection as project creation and remote build. */
export async function materializeTestTemplate(id: string) {
  const template = await loadProTemplate(id)
  const files = Object.fromEntries(
    Object.entries(template.tree).flatMap(([path, node]) =>
      node.kind === 'file' ? [[path, node.content]] : [],
    ),
  )
  const bundle = await buildProAssetBundle(template.assets, template.tree)
  const binaries: Record<string, { base64: string; sha256: string }> = {}
  for (const [path, bytes] of bundle.files) {
    const digest = await crypto.subtle.digest('SHA-256', new Uint8Array(bytes))
    binaries[path] = {
      base64: Buffer.from(bytes).toString('base64'),
      sha256: Buffer.from(digest).toString('hex'),
    }
  }
  return { template, files, binaries, allFiles: { ...files, ...Object.fromEntries(bundle.files) } }
}
