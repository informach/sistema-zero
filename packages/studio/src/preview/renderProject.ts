import { assetManifest, type Project } from '#core'
import type { ExtensionPermission } from '#extensions'
import { findExtension } from '#official-extensions'
import { buildPreviewDoc } from './bootstrap'

export interface RenderProjectOptions {
  /** Origem do host (targetOrigin dos interceptors — defesa em profundidade). */
  parentOrigin?: string
  /** Origens liberadas para fetch/XHR (opt-in; raríssimo num player público). */
  fetchAllowedOrigins?: readonly string[]
  /** Orçamento síncrono do loopGuard (ms). */
  loopBudgetMs?: number
}

/**
 * Monta o `srcdoc` COMPLETO e AUTO-SUFICIENTE que RODA o jogo de um projeto — a
 * MESMA receita do preview do editor e da captura de capa (extensões instaladas
 * → bootstrap scripts + imports ESM + permissões; assets embutidos →
 * manifesto; `buildPreviewDoc`), porém SEM editor/console/harness.
 *
 * Para a página PÚBLICA de jogar (sem login), renderizada FORA do Studio pelo
 * community-kids. Toda a segurança (CSP + loopGuard + permissionGuard +
 * modalGuard) viaja DENTRO do doc, independente do host. Projetos são
 * auto-suficientes (assets são data URLs) — nenhuma chamada externa é necessária.
 */
export function renderProjectToPreviewDoc(
  project: Project,
  opts: RenderProjectOptions = {},
): string {
  const ids = project.installedExtensions.map((e) => e.id)
  const extensionScripts: string[] = []
  const extensionImports: Record<string, string> = {}
  const permissions = new Set<ExtensionPermission>()
  for (const id of ids) {
    const ext = findExtension(id)
    if (!ext) continue
    if (ext.runtime.bootstrapScript) extensionScripts.push(ext.runtime.bootstrapScript)
    if (ext.runtime.esmImports) Object.assign(extensionImports, ext.runtime.esmImports)
    for (const p of ext.manifest.permissions) permissions.add(p)
  }

  return buildPreviewDoc({
    html: project.files['index.html'] ?? '',
    css: project.files['style.css'] ?? '',
    js: project.files['script.js'] ?? '',
    extensionScripts,
    extraFiles: project.extraFiles,
    assets: assetManifest(project.assets),
    parentOrigin: opts.parentOrigin,
    installedPermissions: Array.from(permissions),
    fetchAllowedOrigins: opts.fetchAllowedOrigins,
    loopBudgetMs: opts.loopBudgetMs,
    extensionImports,
  })
}
