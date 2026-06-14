export const PREVIEW_RENDER_INPUT_LIMIT_CHARS = 1_500_000
// Overhead fixo do documento: interceptor + meta CSP + permissionGuard +
// loopGuard + boilerplate do srcdoc. Generoso para não subestimar o tamanho.
export const PREVIEW_RENDER_FIXED_OVERHEAD_CHARS = 20_000

export interface PreviewBudgetFile {
  content: string
  language?: 'html' | 'css' | 'javascript' | 'typescript'
}

export interface PreviewBudgetInput {
  html: string
  css: string
  js: string
  extensionScripts?: readonly string[]
  extraFiles?: readonly PreviewBudgetFile[]
}

export function estimatePreviewInputChars(input: PreviewBudgetInput): number {
  // O JS canônico do aluno é embutido como `data:text/javascript;base64,…`
  // (igual aos extras de script), não inline — contamos a expansão base64 para
  // não subestimar o documento gerado (paridade com estimateExtraFileChars).
  let total =
    PREVIEW_RENDER_FIXED_OVERHEAD_CHARS +
    input.html.length +
    input.css.length +
    base64InflatedChars(input.js.length)
  for (const script of input.extensionScripts ?? []) total += script.length
  for (const file of input.extraFiles ?? []) total += estimateExtraFileChars(file)
  return total
}

/**
 * Tamanho aproximado de `n` chars de fonte após embutir como data: URL base64.
 * Vazio → 0: sem código não há `<script>`/data: URL emitido (paridade com
 * buildPreviewDoc, que pula o script quando o JS é vazio).
 */
function base64InflatedChars(n: number): number {
  if (n === 0) return 0
  return Math.ceil(n / 3) * 4 + 128
}

export function shouldPausePreviewRender(
  input: PreviewBudgetInput,
  limit = PREVIEW_RENDER_INPUT_LIMIT_CHARS,
): boolean {
  return estimatePreviewInputChars(input) > limit
}

function estimateExtraFileChars(file: PreviewBudgetFile): number {
  if (file.language === 'javascript' || file.language === 'typescript') {
    // buildPreviewDoc embute extras de script em import map como data URLs base64
    // (TS é transpilado antes; a estimativa pelo tamanho do fonte é aproximada).
    return base64InflatedChars(file.content.length)
  }
  return file.content.length
}
