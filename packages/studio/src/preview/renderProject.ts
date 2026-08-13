import {
  asset3DManifest,
  assetManifest,
  assetMetaManifest,
  type Project,
  soundManifest,
} from '#core'
import {
  type ExtensionPermission,
  loadExtensionBootstrapScripts,
  uniqueExtensionIds,
} from '#extensions'
import { findExtension } from '#official-extensions'
import { loadGameUiFont } from '../official-extensions/gameUiFont'
import { resolveGameUiFontId } from '../official-extensions/gameUiFonts/resolve'
import { migrateLegacyBlockProjectSnapshot } from '../projects/compatibility'
import { buildPreviewDoc } from './bootstrap'
import { withCoreImports } from './coreImports'
import type { PreviewSecurityProfile } from './csp'

export interface RenderProjectOptions {
  /** Origem do host (targetOrigin dos interceptors — defesa em profundidade). */
  parentOrigin?: string
  /** Origens liberadas para fetch/XHR (opt-in; raríssimo num player público). */
  fetchAllowedOrigins?: readonly string[]
  /** Perfil da CSP. O player público usa `strict`; chamadas diretas preservam `creative`. */
  securityProfile?: PreviewSecurityProfile
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
export async function renderProjectToPreviewDocAsync(
  project: Project,
  opts: RenderProjectOptions = {},
): Promise<string> {
  const playableProject = migrateLegacyBlockProjectSnapshot(project)
  const files = playableProject.files ?? { 'index.html': '', 'style.css': '', 'script.js': '' }
  const installedExtensions = Array.isArray(playableProject.installedExtensions)
    ? playableProject.installedExtensions
    : []
  const extraFiles = Array.isArray(playableProject.extraFiles)
    ? playableProject.extraFiles
    : undefined
  const assets = Array.isArray(playableProject.assets) ? playableProject.assets : undefined
  const ids = uniqueExtensionIds(
    installedExtensions.flatMap((e) => (e && typeof e.id === 'string' ? [e.id] : [])),
  )
  const extensions = ids.flatMap((id) => {
    const extension = findExtension(id)
    return extension ? [extension] : []
  })
  const extensionScripts = await loadExtensionBootstrapScripts(extensions)
  // A fonte do jogo: só a ESCOLHIDA é carregada e viaja no documento. Um projeto
  // sem extensão de jogo não paga nada por isso.
  const gameUiFont = extensions.length
    ? await loadGameUiFont(resolveGameUiFontId({ ir: playableProject.ir, files }))
    : undefined
  const extensionImports: Record<string, string> = {}
  const permissions = new Set<ExtensionPermission>()
  for (const id of ids) {
    const ext = findExtension(id)
    if (!ext) continue
    if (ext.runtime.esmImports) Object.assign(extensionImports, ext.runtime.esmImports)
    for (const p of ext.manifest.permissions) permissions.add(p)
  }

  return buildPreviewDoc({
    html: files['index.html'] ?? '',
    css: files['style.css'] ?? '',
    js: files['script.js'] ?? '',
    extensionScripts,
    extraFiles,
    assets: assetManifest(assets),
    assetsMeta: assetMetaManifest(assets),
    sounds: soundManifest(assets),
    models3d: asset3DManifest(assets),
    gameUiFont,
    parentOrigin: opts.parentOrigin,
    installedPermissions: Array.from(permissions),
    fetchAllowedOrigins: opts.fetchAllowedOrigins,
    securityProfile: opts.securityProfile,
    loopBudgetMs: opts.loopBudgetMs,
    // + os imports do NÚCLEO (three.js) se o código os usa — lazy: 2D devolve o
    // mesmo objeto, sem importmap.
    extensionImports: withCoreImports(extensionImports, files['script.js']),
  })
}

/**
 * @deprecated A montagem passou a carregar runtimes lazy. Use o nome explícito
 * `renderProjectToPreviewDocAsync` e aguarde a Promise retornada.
 */
export const renderProjectToPreviewDoc = renderProjectToPreviewDocAsync
