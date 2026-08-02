import {
  assetManifest,
  assetMetaManifest,
  isReservedProjectFileName,
  normalizeExtraFileName,
  normalizeProPath,
  type Project,
  soundManifest,
} from '#core'
import { loadExtensionBootstrapScript } from '#extensions'
import { findExtension } from '#official-extensions'
import { buildAssetsRuntime } from '../preview/assetsBridge'
import { coreImportsForCode } from '../preview/coreImports'
import { rewriteCssAssetUrlsToAssetNames } from '../preview/cssAssets'
import { buildInputRuntime } from '../preview/inputBridge'
import { transpileExtra } from '../preview/transpile'
import type { Minifiers } from './minify'
import { buildProductionIndexHtml } from './productionHtml'
import {
  buildPwaRevision,
  buildServiceWorker,
  buildWebAppManifest,
  PWA_ICON_SVG,
  publicPathToUrl,
} from './pwa'

/** Mapa de arquivos em memória: caminho (com `/`) → conteúdo. Vira ZIP. */
export type ExportFileMap = Record<string, string | Uint8Array>

export interface ClassicFileMapResult {
  files: ExportFileMap
  /** Avisos não-fatais (extra que não compilou, lib 3D via esm.sh, JS 3D inline). */
  warnings: string[]
}

const MODULE_RE = /^\s*(?:import|export)\b/m

/**
 * Monta os arquivos de um projeto CLÁSSICO sob `public/` (site estático). Usa
 * `project.files` (a fonte da verdade que o preview mostra) + extras transpilados
 * em arquivos reais + bootstraps de extensão + importmap, tudo via
 * `buildProductionIndexHtml`. `minifiers` é injetado (identity nos testes).
 *
 * Retorna `{ files, warnings }` (como `buildProFileMap`): falhas não-fatais (um
 * extra `.ts` quebrado, lib 3D via CDN, JS 3D inline ambíguo) viram aviso em vez
 * de quebrar o export silenciosamente.
 */
export async function buildClassicFileMap(
  project: Project,
  minifiers: Minifiers,
): Promise<ClassicFileMapResult> {
  const files: ExportFileMap = {}
  const warnings: string[] = []

  let rawHtml = project.files['index.html'] ?? ''
  const rawCss = project.files['style.css'] ?? ''
  const rawJs = project.files['script.js'] ?? ''

  // Placement inline ⇒ style.css/script.js vêm vazios (o conteúdo já está dentro
  // do index.html). Só emite o arquivo externo quando há conteúdo.
  const hasExternalCss = rawCss.trim().length > 0
  let hasExternalJs = rawJs.trim().length > 0
  let jsIsModule = MODULE_RE.test(rawJs)

  // `url(<asset>)` no CSS aponta o NOME REAL do arquivo exportado (a chave do
  // manifest): `normalizeAssetName` remove pontos, então `url('fundo.png')` de
  // um tutorial referencia o asset `fundopng` — sem a reescrita o site
  // publicado dava 404 no fundo.
  const exportManifest = assetManifest(project.assets)
  const exportCss = (css: string) => rewriteCssAssetUrlsToAssetNames(css, exportManifest)

  if (hasExternalCss) files['public/style.css'] = await minifiers.css(exportCss(rawCss))
  if (hasExternalJs) files['public/script.js'] = await minifiers.js(rawJs, { module: jsIsModule })

  // Runtime core dos blocos "a tecla está apertada?" e "x/y do mouse/dedo".
  // O preview instala o MESMO núcleo; o export precisa carregá-lo antes de
  // qualquer script do aluno, inclusive quando o JS foi escrito inline no HTML.
  const inputScriptSrc = 'sz-input.js'
  files[`public/${inputScriptSrc}`] = await minifiers.js(buildInputRuntime(), { module: false })

  // Extras → arquivos reais. CSS é linkado no <head>; HTML vira fragmento no
  // <body>; JS/TS é transpilado para `.js` real (import explícito com .js resolve).
  const extraCssHrefs: string[] = []
  const extraHtmlFragments: string[] = []
  for (const extra of project.extraFiles ?? []) {
    const name = normalizeExtraFileName(extra.name)
    if (!name || isReservedProjectFileName(name)) continue
    if (extra.language === 'css') {
      // Colisão pelo NOME DE SAÍDA: `isReservedProjectFileName` só barra os nomes
      // EXATOS (style.css), mas dois extras com o mesmo basename — ou um extra que
      // já exista como canônico — colidiriam em `public/<name>`. Pular + avisar em
      // vez de sobrescrever silenciosamente o trabalho do aluno.
      const destPath = `public/${name}`
      if (destPath in files) {
        warnings.push(outputCollisionWarning(name, name))
        continue
      }
      files[destPath] = await minifiers.css(exportCss(extra.content))
      extraCssHrefs.push(name)
    } else if (extra.language === 'html') {
      extraHtmlFragments.push(extractBodyFragment(extra.content))
    } else {
      const jsName = name.replace(/\.(?:tsx?|jsx|mjs|cjs)$/i, '.js')
      // Colisão pelo NOME DE SAÍDA pós-rewrite de extensão: um extra `script.ts`
      // NÃO é reservado (só os nomes exatos são), vira `script.js` e SOBRESCREVERIA
      // o `public/script.js` canônico do aluno — perda silenciosa do código
      // principal no site publicado / no "Virar profissional". `utils.ts` + `utils.js`
      // também colidem entre si. O canônico já foi gravado acima (linha 46), então
      // a checagem `in files` pega ambos os casos: pula + avisa, nunca clobra.
      const destPath = `public/${jsName}`
      if (destPath in files) {
        warnings.push(outputCollisionWarning(name, jsName))
        continue
      }
      // transpileExtra pode LANÇAR (extra .ts/.tsx malformado em algum caminho).
      // No clássico isso virava export quebrado SEM aviso (o ExportDialog só
      // captura throws; o ConvertLegacyPrompt engolia). Isolamos por extra:
      // pula o arquivo e COLETA um aviso para a UI surfar.
      try {
        const transpiled = transpileExtra(name, extra.content)
        files[destPath] = await minifiers.js(transpiled, {
          module: MODULE_RE.test(transpiled),
        })
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error)
        warnings.push(
          `O arquivo "${name}" não pôde ser compilado e ficou de fora do site publicado (${reason}).`,
        )
      }
    }
  }

  // Extensões instaladas: bootstrap vira arquivo real; esmImports vão ao importmap.
  const extensionScriptSrcs: string[] = []
  const importmap: Record<string, string> = {}
  let usesEsmImports = false
  for (const installed of project.installedExtensions) {
    const ext = findExtension(installed.id)
    if (!ext) continue
    const src = `sz-ext/${installed.id}.js`
    files[`public/${src}`] = await minifiers.js(await loadExtensionBootstrapScript(ext), {
      module: Boolean(ext.runtime.esmImports),
    })
    extensionScriptSrcs.push(src)
    if (ext.runtime.esmImports) {
      Object.assign(importmap, ext.runtime.esmImports)
      usesEsmImports = true
    }
  }

  // + o three.js do NÚCLEO (Canvas 3D) se o script do aluno o importa — mesmo
  // canal do preview, para o site exportado ter o importmap do three.
  const coreImports = coreImportsForCode(project.files['script.js'])
  if (Object.keys(coreImports).length > 0) {
    Object.assign(importmap, coreImports)
    usesEsmImports = true
  }

  const needsModules = Object.keys(importmap).length > 0

  // A2: JS canônico INLINE + extensão ESM (precisa module). Um `<script>` clássico
  // inline no body roda no PARSE, antes do module deferido da extensão — então a
  // API da extensão (ex.: window.SZGame3D) fica undefined no site exportado. O
  // preview evita isso externalizando SEMPRE o JS do aluno. Aqui, quando o JS é
  // inline (hasExternalJs=false) e há exatamente UM `<script>` clássico candidato
  // no body, externalizamos: o conteúdo vai para public/script.js e a tag inline
  // vira `<script defer src="script.js">` (roda DEPOIS do module da extensão).
  if (needsModules && !hasExternalJs) {
    const candidates = findInlineClassicScripts(rawHtml)
    if (candidates.length === 1) {
      const candidate = candidates[0]!
      files['public/script.js'] = await minifiers.js(candidate.content, { module: false })
      rawHtml =
        rawHtml.slice(0, candidate.start) +
        '<script defer src="script.js"></script>' +
        rawHtml.slice(candidate.end)
      // Agora o JS é externo e clássico: o buildProductionIndexHtml NÃO precisa
      // reinjetar nem reajustar (a tag já está deferida e correta).
      hasExternalJs = true
      jsIsModule = false
    } else {
      // Detecção ambígua (zero ou vários scripts inline candidatos): não mexemos
      // no HTML do aluno, só avisamos para que ele coloque o JS em script.js — só
      // assim a biblioteca 3D (module) carrega ANTES do código que a usa.
      warnings.push(
        'Para a biblioteca 3D funcionar no site publicado, coloque o seu código JavaScript no arquivo script.js (e não dentro do index.html), para que a biblioteca carregue primeiro.',
      )
    }
  }

  // LOW: dependência esm.sh. Extensões com esmImports (ex.: game-3d → three) são
  // carregadas da internet em tempo de execução do VISITANTE no site estático.
  if (usesEsmImports) {
    warnings.push(
      'A primeira abertura deste projeto 3D precisa de internet para carregar a biblioteca (esm.sh). Depois disso, o PWA prepara os recursos usados para as próximas aberturas offline.',
    )
  }

  // Assets embutidos → arquivo `sz-assets.js` que semeia `window.__SZGAME_ASSETS`.
  // Reusa o MESMO runtime do preview (assetsBridge) para garantir paridade. Não
  // minificamos: é quase só um literal JSON gigante (data: URLs) — terser não ganha
  // nada e gastaria tempo mastigando megabytes de base64.
  const manifest = exportManifest
  const soundsExport = soundManifest(project.assets)
  let assetsScriptSrc: string | undefined
  if (Object.keys(manifest).length > 0 || Object.keys(soundsExport).length > 0) {
    assetsScriptSrc = 'sz-assets.js'
    files['public/sz-assets.js'] = buildAssetsRuntime(
      manifest,
      assetMetaManifest(project.assets),
      soundsExport,
    )
    // Cada asset (imagem OU som) TAMBÉM vira arquivo real `public/<nome>`: um
    // `background: url('background.png')` no CSS do aluno resolve RELATIVO no site
    // publicado/baixado (no preview quem resolve é o rewriteCssAssetUrls).
    // Mesmo padrão pular+avisar das colisões de nome de saída.
    for (const [name, dataUrl] of Object.entries({ ...manifest, ...soundsExport })) {
      if (!name || name.includes('/') || name.includes('\\') || name.includes('..')) continue
      const destPath = `public/${name}`
      if (destPath in files) {
        warnings.push(outputCollisionWarning(name, name))
        continue
      }
      const bytes = dataUrlToBytes(dataUrl)
      if (bytes) files[destPath] = bytes
    }
  }

  const indexHtml = buildProductionIndexHtml({
    html: rawHtml,
    hasExternalCss,
    hasExternalJs,
    jsIsModule,
    importmap,
    extensionScriptSrcs,
    extraCssHrefs,
    extraHtmlFragments,
    assetsScriptSrc,
    inputScriptSrc,
  })
  files['public/index.html'] = minifiers.html(indexHtml)
  files['public/manifest.webmanifest'] = buildWebAppManifest(project.name)
  files['public/icon.svg'] = PWA_ICON_SVG

  const precacheUrls = Object.keys(files)
    .filter((path) => path.startsWith('public/') && path !== 'public/sw.js')
    .map(publicPathToUrl)
  files['public/sw.js'] = buildServiceWorker(precacheUrls, buildPwaRevision(files))

  return { files, warnings }
}

export interface ProFileMapResult {
  files: ExportFileMap
  /** Avisos não-fatais (ex.: package.json sem script de build). */
  warnings: string[]
}

/**
 * Monta os arquivos de um projeto PRO: a árvore inteira como arquivos reais,
 * revalidando cada caminho cru com `normalizeProPath` no limite do ZIP (pula
 * `node_modules`, caminhos absolutos e travessias `..`). Não minifica — o Vite
 * minifica no build do deploy.
 */
export function buildProFileMap(project: Project): ProFileMapResult {
  const files: ExportFileMap = {}
  const warnings: string[] = []
  const tree = project.tree ?? {}
  for (const [path, node] of Object.entries(tree)) {
    if (node.kind !== 'file') continue
    // Zip-slip em profundidade no LIMITE do ZIP: revalida o caminho cru da árvore
    // antes de gravar. `normalizeProPath` já rejeita `node_modules`, caminhos
    // absolutos e `..` (então isto SUBSTITUI o antigo skip de node_modules) e
    // normaliza barras; gravamos só quando o caminho já está canônico (norm === path).
    // Espelha o padrão de "pular + avisar" das colisões de nome de saída acima.
    const norm = normalizeProPath(path)
    if (norm === null || norm !== path) {
      warnings.push(
        `O arquivo "${path}" ficou de fora do pacote de deploy porque o caminho não é seguro para o ZIP.`,
      )
      continue
    }
    files[path] = node.content
  }

  const pkgRaw =
    typeof files['package.json'] === 'string' ? (files['package.json'] as string) : null
  if (!pkgRaw) {
    warnings.push('Este projeto nao tem package.json; o deploy precisa de um build que gere dist/.')
  } else {
    try {
      const pkg = JSON.parse(pkgRaw) as { scripts?: Record<string, string> }
      if (!pkg.scripts?.build) {
        warnings.push(
          'O package.json nao tem o script "build"; o Dockerfile espera que ele gere dist/.',
        )
      }
    } catch {
      warnings.push('O package.json esta invalido (JSON nao pode ser lido).')
    }
  }

  return { files, warnings }
}

/** Aviso de extra descartado por colidir no NOME DE SAÍDA com outro arquivo. */
function outputCollisionWarning(inputName: string, outName: string): string {
  return `O arquivo "${inputName}" ficou de fora do site publicado porque o nome de saída "${outName}" já é usado por outro arquivo do projeto (o conteúdo principal foi preservado).`
}

/** Decodifica um data:URL (base64 ou percent-encoded) em bytes. null = ilegível. */
function dataUrlToBytes(dataUrl: string): Uint8Array | null {
  const match = /^data:[^,]*?(;base64)?,([\s\S]*)$/.exec(dataUrl)
  if (!match) return null
  const [, isBase64, payload = ''] = match
  try {
    if (isBase64) {
      const binary = atob(payload)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
      return bytes
    }
    return new TextEncoder().encode(decodeURIComponent(payload))
  } catch {
    return null
  }
}

/** Extrai o conteúdo do `<body>` de um extra HTML (ou usa o fragmento inteiro). */
function extractBodyFragment(html: string): string {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  if (bodyMatch) return (bodyMatch[1] ?? '').trim()
  if (/<html[\s>]/i.test(html)) {
    return html
      .replace(/<!doctype[^>]*>/gi, '')
      .replace(/<\/?html[^>]*>/gi, '')
      .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
      .trim()
  }
  return html.trim()
}

interface InlineScriptMatch {
  /** Conteúdo (corpo) do `<script>` inline. */
  content: string
  /** Índice de início da tag de abertura no html. */
  start: number
  /** Índice (exclusivo) após o `</script>`. */
  end: number
}

/**
 * Localiza `<script>` INLINE clássicos no `<body>` (sem `src`, sem
 * `type="module"`, e sem outro `type` não-JS). Usado pela externalização A2: só
 * agimos quando há EXATAMENTE um candidato (ambíguo = aviso, não chute).
 */
function findInlineClassicScripts(html: string): InlineScriptMatch[] {
  const bodyStart = bodyContentStart(html)
  const out: InlineScriptMatch[] = []
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi
  let m: RegExpExecArray | null = re.exec(html)
  while (m !== null) {
    const attrs = m[1] ?? ''
    const content = m[2] ?? ''
    const start = m.index
    const isInBody = start >= bodyStart
    const hasSrc = /[\s"']src=/i.test(attrs)
    const typeMatch = attrs.match(/\btype=["']?([^"'\s>]*)/i)
    const type = (typeMatch?.[1] ?? '').toLowerCase()
    // Clássico = sem type ou um type de JS clássico explícito. Module e qualquer
    // type não-JS (json, importmap, text/template…) NÃO são candidatos.
    const isClassic = type === '' || type === 'text/javascript' || type === 'application/javascript'
    if (isInBody && !hasSrc && isClassic && content.trim().length > 0) {
      out.push({ content, start, end: re.lastIndex })
    }
    m = re.exec(html)
  }
  return out
}

/** Índice onde o conteúdo do `<body>` começa (0 se não houver `<body>`). */
function bodyContentStart(html: string): number {
  const m = html.match(/<body[^>]*>/i)
  return m && m.index !== undefined ? m.index + m[0].length : 0
}
