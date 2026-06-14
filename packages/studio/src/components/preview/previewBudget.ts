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
  let total =
    PREVIEW_RENDER_FIXED_OVERHEAD_CHARS + input.html.length + input.css.length + input.js.length
  for (const script of input.extensionScripts ?? []) total += script.length
  for (const file of input.extraFiles ?? []) total += estimateExtraFileChars(file)
  return total
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
    return Math.ceil(file.content.length / 3) * 4 + 128
  }
  return file.content.length
}
