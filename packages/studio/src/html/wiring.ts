export type CanonicalHTMLAsset = 'style.css' | 'script.js'

/** Reconhece somente a referência ao arquivo canônico na raiz do projeto. */
export function pointsToCanonicalHTMLAsset(ref: string, file: CanonicalHTMLAsset): boolean {
  const cleaned = (ref.trim().split(/[?#]/)[0] ?? '').replace(/^\.?\//, '')
  return cleaned === file
}

/**
 * Detecta o wiring canônico já preservado no conteúdo de `<head>`. O gerador
 * usa esta informação para não emitir uma segunda referência no corpo.
 */
export function headContainsCanonicalScript(head: string | undefined): boolean {
  if (!head) return false
  const scriptPattern = /<script\b[^>]*\bsrc\s*=\s*(["'])(.*?)\1[^>]*>/giu
  for (const match of head.matchAll(scriptPattern)) {
    const src = match[2]
    if (src && pointsToCanonicalHTMLAsset(src, 'script.js')) return true
  }
  return false
}
