import type { SZIR } from '#ir'
import { generateCSS, generateCSSWithMap } from './css'
import { generateHTML, generateHTMLWithMap } from './html'
import { generateJS, generateJSWithMap } from './js'
import type { SourceMap, SourceMappedFile } from './sourceMap'

export interface ProjectGenerationInput {
  ir: SZIR
  projectName: string
  /** JS header (comment / banner). */
  jsHeader?: string
}

export interface GeneratedFiles {
  'index.html': string
  'style.css': string
  'script.js': string
}

export interface ProjectGenerationWithMap {
  files: GeneratedFiles
  sourceMap: SourceMap
}

export function generateProjectFiles(input: ProjectGenerationInput): GeneratedFiles {
  const cssPlacement = input.ir.htmlShell?.cssPlacement ?? 'external'
  const jsPlacement = input.ir.htmlShell?.jsPlacement ?? 'external'
  const cssCode = generateCSS(input.ir.css)
  const jsCode = generateJS({ statements: input.ir.js, header: input.jsHeader })
  return {
    'index.html': generateHTML({
      title: input.projectName,
      body: input.ir.html,
      shell: input.ir.htmlShell,
      cssCode,
      jsCode,
    }),
    // Inline ⇒ o conteúdo foi para dentro do index.html; o arquivo externo
    // fica vazio (mas continua existindo como arquivo canônico).
    'style.css': cssPlacement === 'external' ? cssCode : '',
    'script.js': jsPlacement === 'external' ? jsCode : '',
  }
}

/**
 * Gera os três arquivos + um source map combinado: para cada nó da IR com
 * `__id`, mapeia em qual arquivo e linha o trecho foi escrito.
 *
 * CSS/JS externos mapeiam para `style.css`/`script.js`. Quando são INLINE (vivem
 * dentro do index.html), as entradas são REMAPEADAS para `index.html`, deslocando
 * as linhas para onde o `<style>`/`<script>` foi embutido — sem isso, selecionar
 * um bloco JS/CSS num projeto de arquivo único não realçava nada (o map não tinha
 * a chave). O deslocamento vem de `cssInlineStartLine`/`jsInlineStartLine`, que o
 * gerador de HTML calcula a partir da posição real do bloco inline.
 */
export function generateProjectFilesWithMap(
  input: ProjectGenerationInput,
): ProjectGenerationWithMap {
  const cssPlacement = input.ir.htmlShell?.cssPlacement ?? 'external'
  const jsPlacement = input.ir.htmlShell?.jsPlacement ?? 'external'
  const css = generateCSSWithMap(input.ir.css)
  const js = generateJSWithMap({ statements: input.ir.js, header: input.jsHeader })
  const html = generateHTMLWithMap({
    title: input.projectName,
    body: input.ir.html,
    shell: input.ir.htmlShell,
    cssCode: css.code,
    jsCode: js.code,
  })

  const sourceMap: SourceMap = { ...html.map.build() }
  Object.assign(
    sourceMap,
    cssPlacement === 'external'
      ? css.map.build()
      : remapToInlineHost(css.map.build(), html.cssInlineStartLine),
  )
  Object.assign(
    sourceMap,
    jsPlacement === 'external'
      ? js.map.build()
      : remapToInlineHost(js.map.build(), html.jsInlineStartLine),
  )

  return {
    files: {
      'index.html': html.code,
      'style.css': cssPlacement === 'external' ? css.code : '',
      'script.js': jsPlacement === 'external' ? js.code : '',
    },
    sourceMap,
  }
}

/**
 * Reaponta as entradas de um source map de CSS/JS inline para `index.html`,
 * somando o offset de linha onde o corpo do `<style>`/`<script>` começa no
 * documento. `startLine` 1-based do corpo → offset = startLine - 1. Quando o
 * início é desconhecido (sem bloco inline, p.ex. arquivo vazio), devolve `{}` —
 * não há trecho para realçar. As colunas ficam relativas ao código não-indentado
 * (a indentação inline desloca +6); como o realce do Monaco é por LINHA INTEIRA,
 * isso não afeta o destaque, e a Ponte não usa a direção reversa.
 */
function remapToInlineHost(map: SourceMap, bodyStartLine: number | undefined): SourceMap {
  if (bodyStartLine === undefined) return {}
  const offset = bodyStartLine - 1
  const out: SourceMap = {}
  for (const [id, entry] of Object.entries(map)) {
    const file: SourceMappedFile = 'index.html'
    out[id] = {
      file,
      startLine: entry.startLine + offset,
      endLine: entry.endLine + offset,
      startColumn: entry.startColumn,
      endColumn: entry.endColumn,
    }
  }
  return out
}
