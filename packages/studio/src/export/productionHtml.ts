/**
 * Monta o `index.html` de PRODUÇÃO do export clássico. É o irmão de produção do
 * `preview/bootstrap.ts buildPreviewDoc`, SEM nenhum instrumental de dev (CSP de
 * sandbox, interceptor, loopGuard, permissionGuard, storageBridge, data: URLs).
 *
 * Em vez de reconstruir o documento (o que perderia atributos de `<html>`/`<body>`
 * e o doctype do aluno), faz INJEÇÃO CIRÚRGICA no `index.html` que já é a fonte
 * da verdade: insere importmap + scripts de extensão + links de CSS extra antes
 * de `</head>`, fragmentos de HTML extra antes de `</body>`, e ajusta o
 * `<script src="script.js">` do aluno para a ordem de execução correta.
 *
 * Robustez espelhada do preview (`preview/bootstrap.ts:142,241,255`): o CSS e o
 * JS canônicos SEMPRE são entregues, mesmo quando o aluno removeu o
 * `<link href="style.css">`/`<script src="script.js">` do index.html. O preview
 * reinjeta inline; aqui reinjetamos as referências externas (style.css/script.js
 * vivem como arquivos no ZIP), antes de `</head>`/`</body>` respectivamente.
 */

import { PWA_HEAD_TAGS, PWA_REGISTRATION_SCRIPT } from './pwa'

export interface BuildProductionHtmlInput {
  /** index.html do projeto (já a fonte da verdade; pode vir minificado). */
  html: string
  /** True quando `style.css` foi emitido como arquivo externo (placement external). */
  hasExternalCss: boolean
  /** True quando `script.js` foi emitido como arquivo externo (placement external). */
  hasExternalJs: boolean
  /** O JS canônico do aluno usa import/export (precisa `type="module"`). */
  jsIsModule: boolean
  /** importmap `specifier → URL` das extensões ESM (ex.: three). Vazio = sem ESM. */
  importmap: Record<string, string>
  /** Caminhos dos bootstraps de extensão a injetar (ex.: `sz-ext/game-3d.js`). */
  extensionScriptSrcs: string[]
  /** Hrefs de CSS extra a linkar no `<head>` (ex.: `cores.css`). */
  extraCssHrefs: string[]
  /** Fragmentos de HTML extra a inserir no `<body>`. */
  extraHtmlFragments: string[]
  /**
   * Caminho do arquivo que semeia `window.__SZGAME_ASSETS` (ex.: `sz-assets.js`).
   * Vazio/ausente = projeto sem assets. É um `<script>` CLÁSSICO (sem imports),
   * injetado PRIMEIRO no `<head>` → roda no parse, antes dos bootstraps de
   * extensão (module ou clássico) e do código do aluno, que o consomem.
   */
  assetsScriptSrc?: string
  /** Runtime core de teclado/ponteiro, carregado antes do código do aluno. */
  inputScriptSrc?: string
}

/**
 * Endurecimento MÍNIMO e NÃO-QUEBRA-NADA do site exportado (achado "sem CSP num
 * domínio real"). NÃO é a CSP restritiva do preview de dev (que bloquearia o
 * código inline do aluno, imagens externas e a 3D via CDN). Só duas diretivas
 * inofensivas para um site normal de criança, que ainda assim barram abuso de
 * plugin (`object-src 'none'`) e de `<base>` (`base-uri 'self'`). Para uma
 * proteção mais forte, o README recomenda o host configurar cabeçalhos reais.
 */
const HARDENING_META = `<meta http-equiv="Content-Security-Policy" content="object-src 'none'; base-uri 'self'">`

export function buildProductionIndexHtml(input: BuildProductionHtmlInput): string {
  const needsModules = Object.keys(input.importmap).length > 0

  // O importmap PRECISA vir antes de qualquer <script type="module"> de extensão.
  // Neutraliza só o fechamento literal `</script` (regra do bootstrap): `<\/script`
  // é JSON válido e o tokenizer HTML não fecha o elemento cedo.
  const importmapTag = needsModules
    ? `<script type="importmap">${JSON.stringify({ imports: input.importmap }).replace(
        /<\/script/gi,
        '<\\/script',
      )}</script>`
    : ''

  const extScriptsTag = input.extensionScriptSrcs
    .map(
      (src) => `<script${needsModules ? ' type="module"' : ''} src="${escapeAttr(src)}"></script>`,
    )
    .join('\n')

  const extraCssTags = input.extraCssHrefs
    .map((href) => `<link rel="stylesheet" href="${escapeAttr(href)}" />`)
    .join('\n')

  // Manifesto de assets: script CLÁSSICO standalone, PRIMEIRO no <head>, para que
  // `window.__SZGAME_ASSETS` exista antes de qualquer consumidor (não precisa do
  // importmap por não ser module).
  const assetsScriptTag = input.assetsScriptSrc
    ? `<script src="${escapeAttr(input.assetsScriptSrc)}"></script>`
    : ''

  const inputScriptTag = input.inputScriptSrc
    ? `<script src="${escapeAttr(input.inputScriptSrc)}"></script>`
    : ''

  const earlyHeadBlock = [HARDENING_META, inputScriptTag].filter(Boolean).join('\n')
  const headBlock = [PWA_HEAD_TAGS, assetsScriptTag, importmapTag, extScriptsTag, extraCssTags]
    .filter(Boolean)
    .join('\n')
  const bodyBlock = [...input.extraHtmlFragments.filter(Boolean), PWA_REGISTRATION_SCRIPT].join(
    '\n',
  )

  let out = input.html
  // Endurecimento e entrada vêm logo após `<head>`. Isso também cobre projetos
  // de arquivo único cujo código do aluno está inline no próprio cabeçalho: o
  // runtime precisa executar antes da primeira leitura de `__szInput`.
  out = injectAfterHeadStart(out, earlyHeadBlock)
  if (headBlock) out = injectBeforeHeadEnd(out, headBlock)
  if (bodyBlock) out = injectBeforeBodyEnd(out, bodyBlock)

  // Ordem de execução do script do aluno:
  //  - module: importmap resolve igual; escopo de módulo.
  //  - clássico + needsModules: precisa `defer` para rodar APÓS o module da
  //    extensão (que define p.ex. window.SZGame3D). Sem isso, um script clássico
  //    no body roda no parse, antes do module deferido → API da extensão undefined.
  if (input.hasExternalJs) {
    out = adjustUserScriptTag(out, {
      module: input.jsIsModule,
      defer: needsModules && !input.jsIsModule,
    })
  }

  // Robustez (espelha o preview): se o CSS/JS canônico existe como arquivo
  // externo mas o aluno tirou a referência do index.html, reinjetamos. O preview
  // SEMPRE entrega CSS inline e JS externo; aqui o arquivo já está no ZIP, então
  // só falta a tag que o aponta. Reinjeção idempotente (só quando falta).
  if (input.hasExternalCss && !hasCanonicalCssLink(out)) {
    out = injectBeforeHeadEnd(out, '<link rel="stylesheet" href="style.css" />')
  }
  if (input.hasExternalJs && !hasCanonicalScript(out)) {
    // Mesmo critério de ordem do adjustUserScriptTag: module quando o JS do aluno
    // é module; clássico deferido quando há módulos de extensão (roda depois delas).
    const attrs = input.jsIsModule
      ? ' type="module"'
      : needsModules && !input.jsIsModule
        ? ' defer'
        : ''
    out = injectBeforeBodyEnd(out, `<script${attrs} src="script.js"></script>`)
  }

  return out
}

/** Insere `block` logo APÓS a abertura `<head ...>` (perto do topo). */
function injectAfterHeadStart(html: string, block: string): string {
  // Logo após a abertura <head ...> (preserva atributos do <head> do aluno).
  if (/<head(?=[\s/>])[^>]*>/i.test(html))
    return html.replace(/(<head(?=[\s/>])[^>]*>)/i, `$1\n${block}`)
  // Sem <head>: tenta logo após <html ...>.
  if (/<html[^>]*>/i.test(html)) return html.replace(/(<html[^>]*>)/i, `$1\n${block}`)
  // Documento sem <head> nem <html>: prepende (fallback raro).
  return `${block}\n${html}`
}

function injectBeforeHeadEnd(html: string, block: string): string {
  if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, `${block}\n</head>`)
  // Sem </head>: tenta logo após a abertura <head ...>.
  if (/<head(?=[\s/>])[^>]*>/i.test(html))
    return html.replace(/(<head(?=[\s/>])[^>]*>)/i, `$1\n${block}`)
  // Documento sem <head>: prepende o bloco (fallback raro).
  return `${block}\n${html}`
}

function injectBeforeBodyEnd(html: string, block: string): string {
  if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, `${block}\n</body>`)
  if (/<\/html>/i.test(html)) return html.replace(/<\/html>/i, `${block}\n</html>`)
  return `${html}\n${block}`
}

/** True se o html já referencia o `style.css` canônico num `<link href=...>`. */
function hasCanonicalCssLink(html: string): boolean {
  return /<link\b[^>]*\bhref=["'][^"']*\bstyle\.css["'][^>]*>/i.test(html)
}

/** True se o html já referencia o `script.js` canônico num `<script src=...>`. */
function hasCanonicalScript(html: string): boolean {
  return CANONICAL_SCRIPT_RE.test(html)
}

// Casa o loader REAL do `script.js`: exige um limite de espaço/aspa antes de
// `src=` (evita casar `data-src=`) e aceita atributos com `>` no valor por todo
// o resto da tag (`[\s\S]*?` não-guloso até o fechamento `></script>`). O `\b`
// antes de `script.js` impede casar `meu-script.js`/`xscript.js`.
const CANONICAL_SCRIPT_RE = /<script\b[^>]*[\s"']src=["'][^"']*\bscript\.js["'][\s\S]*?><\/script>/i

function adjustUserScriptTag(html: string, opts: { module: boolean; defer: boolean }): string {
  // Decisão determinística: ajustamos TODOS os loaders reais do `script.js` (o
  // `replaceAll`/flag `g`), não só o primeiro. Um aluno pode referenciar o mesmo
  // arquivo mais de uma vez; o tratamento precisa ser uniforme. O limite
  // `[\s"']src=` garante que casamos o atributo `src` genuíno, nunca `data-src=`,
  // e `[\s\S]*?` tolera valores de atributo que contenham `>`.
  return html.replace(
    /<script\b([^>]*[\s"']src=["'][^"']*\bscript\.js["'][\s\S]*?)><\/script>/gi,
    (_match, attrs: string) => {
      let a = attrs
      if (opts.module && !/\btype=/i.test(a)) a += ' type="module"'
      else if (opts.defer && !/\bdefer\b/i.test(a)) a += ' defer'
      return `<script${a}></script>`
    },
  )
}

function escapeAttr(s: string): string {
  // Defesa em profundidade: escapa `&`, `"`, `<` e `>` (os nomes de arquivo já
  // vêm normalizados, mas mantemos a função consistente com o resto do projeto).
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
