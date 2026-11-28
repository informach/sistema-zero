import { STUDIO_PRO_BUILD_LIMITS } from '@sistemazero/core/studio/pro-limits'
import { copyStudioProjectJson } from '@sistemazero/core/studio/project-json'
import type { Project, StudioProBuildLimits } from '#core'
import { UNSUPPORTED_PINTA_REGION } from '../../core/pintaRegionalReference'
import { buildProAssetBundle } from '../../core/proAssets'
import { sanitizeProjectAssets } from '../../core/projectAssets'
import { isDocumentRecord } from '../../core/projectDocument'
import { assertProjectContentPreserved } from '../../core/projectDocumentGuards'
import {
  isPrivateRegionalProjectScope,
  isRegionalProjectScope,
  type ProjectStorageScope,
} from '../../state/projectStorageRuntime'
import type { StudioProRuntimeAdapter } from '../../studio/pro-runtime'
import { classifyProEngineCopy, PRO_ENGINE_EXTENSION_IDS } from './proEngineCopies'

const proRegionalEnginePath = (extensionId: string) => `public/sz-ext/${extensionId}.js`

/**
 * The regional build replaces the converted engine copy, so it may only do that while the copy is
 * still the current engine (full or minimal variant), including its attested browser serialization.
 * A changed implementation is the student's (or an older engine's) and stays untouched.
 */
export async function proRegionalEngineCopy(
  tree: Readonly<Record<string, unknown>> | undefined,
  extensionId: string,
): Promise<'missing' | 'changed' | 'current'> {
  const id = PRO_ENGINE_EXTENSION_IDS.find((candidate) => candidate === extensionId)
  const source = tree?.[proRegionalEnginePath(extensionId)]
  if (
    !id ||
    !isDocumentRecord(source) ||
    source.kind !== 'file' ||
    typeof source.content !== 'string'
  )
    return 'missing'
  return (await classifyProEngineCopy(id, source.content)).kind === 'current'
    ? 'current'
    : 'changed'
}

/** Local planning preserves source; public account projects keep their configured hosted fallback. */
export function createPintaRegionalProRuntime(
  scope: ProjectStorageScope,
  limits?: StudioProBuildLimits,
  configuredHost?: StudioProRuntimeAdapter,
): StudioProRuntimeAdapter {
  if (!isRegionalProjectScope(scope)) throw new Error(UNSUPPORTED_PINTA_REGION)
  const hosted = isPrivateRegionalProjectScope(scope) ? undefined : configuredHost
  const buildLimits = limits ?? hosted?.limits
  const signal =
    scope.signal && hosted?.signal
      ? AbortSignal.any([scope.signal, hosted.signal])
      : (scope.signal ?? hosted?.signal)
  return {
    limits: buildLimits,
    signal,
    ...(hosted?.prepareDependencies ? { prepareDependencies: hosted.prepareDependencies } : {}),
    async build(input) {
      const start = performance.now()
      const captured = copyStudioProjectJson(input.project) as Project
      const lifetime =
        input.signal && signal ? AbortSignal.any([input.signal, signal]) : (input.signal ?? signal)
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
            const enginePath = proRegionalEnginePath(regional.extensionId)
            const copy = await proRegionalEngineCopy(captured.tree, regional.extensionId)
            if (copy === 'missing')
              throw new Error('O arquivo do motor deste jogo não foi encontrado no projeto Pro.')
            if (copy === 'changed')
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
      const plan = planLightProBuild(captured, buildLimits, projection)
      if (plan.kind === 'hosted') {
        if (hosted) {
          const result = await hosted.build({ ...input, project: captured, signal: lifetime })
          lifetime?.throwIfAborted()
          return result
        }
        throw new Error(`Este projeto Pro ainda não abre neste ambiente local (${plan.reason}).`)
      }
      if (plan.html.length > STUDIO_PRO_BUILD_LIMITS.maxOutputChars)
        throw new Error('O documento de execução ficou grande demais para o modo Pro.')
      lifetime?.throwIfAborted()
      return { html: plan.html, durationMs: Math.round(performance.now() - start) }
    },
  }
}
