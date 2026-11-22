import {
  loadExtensionBootstrapScript,
  loadExtensionBootstrapScripts,
  uniqueExtensionIds,
} from '../../extensions/runtime'
import type { ExtensionBootstrapContext, ExtensionPermission } from '../../extensions/types'
import { findExtension } from '../../official-extensions'
import { type GameUiFontId, loadGameUiFont } from '../../official-extensions/gameUiFont'
import { type BuildPreviewDocInput, buildPreviewDoc } from '../../preview/bootstrap'
import { withCoreImports } from '../../preview/coreImports'
import { carregarModuloDeCenas3D, type ModuloDeCenas3D } from '../../three/scene3dResources'
import type { JavaScriptRegionalMaterials } from './pintaRegionalMaterials'

/** Host-owned JavaScript catalog metadata; it does not load extension code. */
export function resolveJavaScriptClassicExtensions(ids: readonly string[]) {
  const extensions = uniqueExtensionIds(ids).flatMap((id) => {
    const extension = findExtension(id)
    return extension ? [extension] : []
  })
  const extensionImports: Record<string, string> = {}
  const permissions = new Set<ExtensionPermission>()
  for (const extension of extensions) {
    if (extension.runtime.esmImports) Object.assign(extensionImports, extension.runtime.esmImports)
    for (const permission of extension.manifest.permissions) permissions.add(permission)
  }
  return { extensions, extensionImports, installedPermissions: [...permissions] }
}

export interface JavaScriptClassicResources {
  extensionScripts: string[]
  extensionImports: Record<string, string>
  installedPermissions: readonly ExtensionPermission[]
  gameUiFont?: BuildPreviewDocInput['gameUiFont']
  cenas3d?: ModuloDeCenas3D
}

/**
 * Public player/capture preparation. The editor keeps its existing independent load gates.
 * `bootstrapContext` (from `extensionBootstrapContext`) picks each runtime's variant; without
 * it every runtime loads in full.
 */
export async function loadJavaScriptClassicResources(
  extensionIds: readonly string[],
  fontId: GameUiFontId,
  bootstrapContext?: ExtensionBootstrapContext,
  comCenas3D = false,
  regional?: JavaScriptRegionalMaterials,
): Promise<JavaScriptClassicResources> {
  const context = resolveJavaScriptClassicExtensions(extensionIds)
  const [extensionScripts, gameUiFont, cenas3d] = await Promise.all([
    regional
      ? Promise.all(
          context.extensions.map((extension) =>
            extension.manifest.id === regional.extensionId
              ? regional.script
              : loadExtensionBootstrapScript(extension, bootstrapContext),
          ),
        )
      : loadExtensionBootstrapScripts(context.extensions, bootstrapContext),
    context.extensions.length ? loadGameUiFont(fontId) : undefined,
    comCenas3D ? carregarModuloDeCenas3D() : undefined,
  ])
  return {
    extensionScripts,
    extensionImports: context.extensionImports,
    installedPermissions: context.installedPermissions,
    gameUiFont,
    ...(cenas3d ? { cenas3d } : {}),
  }
}

export interface JavaScriptClassicDocumentInput
  extends Omit<
    BuildPreviewDocInput,
    'extensionScripts' | 'extensionImports' | 'installedPermissions' | 'gameUiFont'
  > {
  resources: JavaScriptClassicResources
  runtimeInspection?: boolean
  /** Approved replacements supplied by the packaging host, never by project source. */
  runtimeImports?: Readonly<Record<string, string>>
}

/** Shared recipe for the editor, public player and capture; lifecycle stays with the host. */
export function buildJavaScriptClassicDocument({
  resources,
  runtimeInspection,
  runtimeImports,
  ...input
}: JavaScriptClassicDocumentInput): string {
  const cena = input.cenas3d ? resources.cenas3d : undefined
  if (input.cenas3d && !cena) throw Error('O carregador do cenário ainda não está pronto.')
  const imports = withCoreImports(
    cena ? { ...resources.extensionImports, ...cena.imports } : resources.extensionImports,
    input.js,
  )
  return buildPreviewDoc({
    ...input,
    extensionScripts: cena
      ? [cena.script, ...resources.extensionScripts]
      : resources.extensionScripts,
    runtimeInspection,
    gameUiFont: resources.gameUiFont,
    installedPermissions: resources.installedPermissions,
    extensionImports: runtimeImports
      ? Object.fromEntries(
          Object.entries(imports).map(([specifier, url]) => [
            specifier,
            runtimeImports[specifier] ?? url,
          ]),
        )
      : imports,
  })
}
