import { copyStudioProjectJson } from '@sistemazero/core/studio/project-json'
import {
  asset3DManifest,
  assetManifest,
  assetMetaManifest,
  type JavaScriptProjectDocument,
  type Project,
  preloadCourseModels,
  soundManifest,
} from '#core'
import { isDocumentRecord } from '../core/projectDocument'
import { extensionBootstrapContext } from '../extensions/runtime'
import { resolveGameUiFontId } from '../official-extensions/gameUiFonts/resolve'
import {
  buildJavaScriptClassicDocument,
  loadJavaScriptClassicResources,
} from '../runtime/javascript/classicDocument'
import { prepareProjectForHost } from '../state/projectValidation'
import type { PreviewSecurityProfile } from './csp'

export interface RenderProjectOptions {
  /** Opt-in host diagnostics. Inspectors return snapshots; the public game API is unchanged. */
  runtimeInspection?: boolean
  /** Origem do host (targetOrigin dos interceptors — defesa em profundidade). */
  parentOrigin?: string
  /** Origens liberadas para fetch/XHR (opt-in; raríssimo num player público). */
  fetchAllowedOrigins?: readonly string[]
  /** Perfil da CSP. O player público usa `strict`; chamadas diretas preservam `creative`. */
  securityProfile?: PreviewSecurityProfile
  /** Orçamento síncrono do loopGuard (ms). */
  loopBudgetMs?: number
  /** Host-owned packaged replacements for existing official ESM imports (e.g. offline desktop). */
  runtimeImports?: Readonly<Record<string, string>>
  /**
   * Troca o `script.js` DEPOIS de o projeto ser preparado (o teste dos objetivos injeta o leitor
   * de variáveis aqui, `check/instrumentCheckScript.ts`). Antes da preparação ele seria refeito.
   */
  transformScript?: (script: string) => string
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
  project: Project | JavaScriptProjectDocument,
  options: RenderProjectOptions = {},
): Promise<string> {
  const captured = copyStudioProjectJson(project)
  if (!isDocumentRecord(captured)) throw new Error('Não foi possível preparar este jogo.')
  const opts = {
    ...options,
    fetchAllowedOrigins: options.fetchAllowedOrigins ? [...options.fetchAllowedOrigins] : undefined,
    runtimeImports: options.runtimeImports ? { ...options.runtimeImports } : undefined,
  }
  if (captured.kind === 'pro')
    throw new Error('Projetos Pro precisam de um artefato compilado para jogar ou capturar.')
  const playableProject =
    captured.formatVersion === 3
      ? (await import('../state/javaScriptProjectValidation')).refineJavaScriptProjectDocument(
          captured,
        )
      : await prepareProjectForHost(captured)
  if (!playableProject) throw new Error('Não foi possível preparar este jogo.')
  const prepared = playableProject.files ?? { 'index.html': '', 'style.css': '', 'script.js': '' }
  const files = opts.transformScript
    ? { ...prepared, 'script.js': opts.transformScript(prepared['script.js'] ?? '') }
    : prepared
  const installedExtensions = Array.isArray(playableProject.installedExtensions)
    ? playableProject.installedExtensions
    : []
  const extraFiles = Array.isArray(playableProject.extraFiles)
    ? playableProject.extraFiles
    : undefined
  const assets = Array.isArray(playableProject.assets) ? playableProject.assets : undefined
  // Modelos da biblioteca dos cursos: o projeto guarda a referência, o jogo precisa do arquivo.
  await preloadCourseModels(assets, files['script.js'])
  const resources = await loadJavaScriptClassicResources(
    installedExtensions.flatMap((e) => (e && typeof e.id === 'string' ? [e.id] : [])),
    resolveGameUiFontId({ ir: playableProject.ir, files }),
    // O MESMO contexto do preview, da capa e do export (o código que vai para o documento).
    extensionBootstrapContext({
      html: files['index.html'],
      js: files['script.js'],
      extraFiles,
    }),
  )

  return buildJavaScriptClassicDocument({
    html: files['index.html'] ?? '',
    css: files['style.css'] ?? '',
    js: files['script.js'] ?? '',
    resources,
    extraFiles,
    assets: assetManifest(assets),
    assetsMeta: assetMetaManifest(assets),
    sounds: soundManifest(assets),
    models3d: asset3DManifest(assets),
    parentOrigin: opts.parentOrigin,
    fetchAllowedOrigins: opts.fetchAllowedOrigins,
    securityProfile: opts.securityProfile,
    loopBudgetMs: opts.loopBudgetMs,
    runtimeInspection: opts.runtimeInspection,
    runtimeImports: opts.runtimeImports,
  })
}

/**
 * @deprecated A montagem passou a carregar runtimes lazy. Use o nome explícito
 * `renderProjectToPreviewDocAsync` e aguarde a Promise retornada.
 */
export const renderProjectToPreviewDoc = renderProjectToPreviewDocAsync
