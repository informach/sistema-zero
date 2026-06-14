/**
 * Dispara o download de um Blob no navegador via `<a download>`. Único ponto do
 * módulo de export que toca o DOM (mesmo padrão do `ProjectCard.downloadAsJSON`).
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
