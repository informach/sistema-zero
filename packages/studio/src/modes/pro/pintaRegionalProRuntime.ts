import { STUDIO_PRO_BUILD_LIMITS } from '@sistemazero/core/studio/pro-limits'
import { copyStudioProjectJson } from '@sistemazero/core/studio/project-json'
import type { Project, StudioProBuildLimits } from '#core'
import { UNSUPPORTED_PINTA_REGION } from '../../core/pintaRegionalReference'
import { buildProAssetBundle } from '../../core/proAssets'
import { sanitizeProjectAssets } from '../../core/projectAssets'
import { assertProjectContentPreserved } from '../../core/projectDocumentGuards'
import { loadExtensionBootstrapScript } from '../../extensions/runtime'
import { findExtension } from '../../official-extensions'
import {
  isPrivateRegionalProjectScope,
  type ProjectStorageScope,
} from '../../state/projectStorageRuntime'
import type { StudioProRuntimeAdapter } from '../../studio/pro-runtime'

/** Converted JS projects use the existing local Pro planner/iframe. No hosted build fallback. */
export function createPintaRegionalProRuntime(
  scope: ProjectStorageScope,
  limits?: StudioProBuildLimits,
): StudioProRuntimeAdapter {
  if (!isPrivateRegionalProjectScope(scope)) throw new Error(UNSUPPORTED_PINTA_REGION)
  return {
    limits,
    signal: scope.signal,
    async build(input) {
      const start = performance.now()
      const captured = copyStudioProjectJson(input.project) as Project
      const lifetime =
        input.signal && scope.signal
          ? AbortSignal.any([input.signal, scope.signal])
          : (input.signal ?? scope.signal)
      lifetime?.throwIfAborted()
      const [{ planLightProBuild }, { prepareJavaScriptRegionalMaterials }] = await Promise.all([
        import('./lightProBuild'),
        import('../../runtime/javascript/pintaRegionalMaterials'),
      ])
      const regional = await prepareJavaScriptRegionalMaterials(
        captured.assets,
        captured.installedExtensions,
        scope,
        lifetime,
      )
      const projection = regional
        ? await (async () => {
            if (!captured.proMeta?.origin || !captured.tree)
              throw new Error('Abra um jogo 2D convertido para o modo Pro.')
            const extension = findExtension(regional.extensionId)
            const enginePath = `public/sz-ext/${regional.extensionId}.js`
            const source = captured.tree[enginePath]
            if (!extension || source?.kind !== 'file')
              throw new Error('O arquivo do motor deste jogo não foi encontrado no projeto Pro.')
            const [full, minimal] = await Promise.all([
              loadExtensionBootstrapScript(extension),
              loadExtensionBootstrapScript(extension, { code: '' }),
            ])
            if (source.content !== full && source.content !== minimal)
              throw new Error('O arquivo do motor foi editado. A cópia do projeto foi preservada.')
            const assets = sanitizeProjectAssets(captured.assets, {
              regionalMaterials: regional.proof,
            })
            assertProjectContentPreserved(captured, { ...captured, assets })
            const bundle = await buildProAssetBundle(assets, captured.tree, {
              legacyRuntime: true,
              regionalMaterials: regional.proof,
            })
            const assetsPath = 'public/sz-assets.js'
            const assetsScript = bundle.files.get(assetsPath)
            if (!assetsScript) throw new Error(UNSUPPORTED_PINTA_REGION)
            const byId = new Map(assets.map((asset) => [asset.id, asset.dataUrl]))
            const media = new Map<string, string>()
            for (const entry of bundle.manifest.assets) media.set(entry.path, byId.get(entry.id)!)
            const scripts = new Map([
              [enginePath, regional.script],
              [assetsPath, new TextDecoder('utf-8', { fatal: true }).decode(assetsScript)],
            ])
            return { scripts, media, verifiedEnginePath: enginePath }
          })()
        : undefined
      lifetime?.throwIfAborted()
      const plan = planLightProBuild(captured, limits, projection)
      if (plan.kind === 'hosted')
        throw new Error(`Este projeto Pro ainda não abre neste ambiente local (${plan.reason}).`)
      if (plan.html.length > STUDIO_PRO_BUILD_LIMITS.maxOutputChars)
        throw new Error('O documento de execução ficou grande demais para o modo Pro.')
      lifetime?.throwIfAborted()
      return { html: plan.html, durationMs: Math.round(performance.now() - start) }
    },
  }
}
