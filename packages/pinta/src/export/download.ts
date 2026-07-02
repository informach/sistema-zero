/**
 * Download no navegador via `<a download>` + `URL.createObjectURL` (o
 * `img-src`/`blob:` da CSP do kids cobre; nunca navegamos para `data:`).
 * Único ponto do export que toca o DOM do documento.
 */
export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
