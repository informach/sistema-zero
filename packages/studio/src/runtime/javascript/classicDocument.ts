import { loadExtensionBootstrapScripts, uniqueExtensionIds } from '../../extensions/runtime'
import type { ExtensionPermission } from '../../extensions/types'
import { findExtension } from '../../official-extensions'
import { type GameUiFontId, loadGameUiFont } from '../../official-extensions/gameUiFont'
import { type BuildPreviewDocInput, buildPreviewDoc } from '../../preview/bootstrap'
import { withCoreImports } from '../../preview/coreImports'

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
}

/** Public player/capture preparation. The editor keeps its existing independent load gates. */
export async function loadJavaScriptClassicResources(
  extensionIds: readonly string[],
  fontId: GameUiFontId,
): Promise<JavaScriptClassicResources> {
  const context = resolveJavaScriptClassicExtensions(extensionIds)
  const [extensionScripts, gameUiFont] = await Promise.all([
    loadExtensionBootstrapScripts(context.extensions),
    context.extensions.length ? loadGameUiFont(fontId) : undefined,
  ])
  return {
    extensionScripts,
    extensionImports: context.extensionImports,
    installedPermissions: context.installedPermissions,
    gameUiFont,
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
  const imports = withCoreImports(resources.extensionImports, input.js)
  return buildPreviewDoc({
    ...input,
    extensionScripts: resources.extensionScripts,
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
