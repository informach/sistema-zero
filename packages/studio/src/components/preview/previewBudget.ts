export const PREVIEW_RENDER_INPUT_LIMIT_CHARS = 1_500_000
export const PREVIEW_RENDER_FIXED_OVERHEAD_CHARS = 16_000

export interface PreviewBudgetFile {
  content: string
  language?: 'html' | 'css' | 'javascript'
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
  if (file.language === 'javascript') {
    // buildPreviewDoc embeds JS extras in an import map as base64 data URLs.
    return Math.ceil(file.content.length / 3) * 4 + 128
  }
  return file.content.length
}
