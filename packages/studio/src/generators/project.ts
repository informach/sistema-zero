import type { SZIR } from '#ir'
import { generateCSS, generateCSSWithMap } from './css'
import { generateHTML, generateHTMLWithMap } from './html'
import { generateJS, generateJSWithMap } from './js'
import type { SourceMap } from './sourceMap'

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
  // Quando o CSS/JS é inline, ele vive dentro de index.html; o source map de
  // style.css/script.js apontaria para arquivos vazios, então é omitido
  // (realce cruzado de conteúdo inline é refinamento futuro — ver plano).
  const sourceMap: SourceMap = {
    ...html.map.build(),
    ...(cssPlacement === 'external' ? css.map.build() : {}),
    ...(jsPlacement === 'external' ? js.map.build() : {}),
  }
  return {
    files: {
      'index.html': html.code,
      'style.css': cssPlacement === 'external' ? css.code : '',
      'script.js': jsPlacement === 'external' ? js.code : '',
    },
    sourceMap,
  }
}
