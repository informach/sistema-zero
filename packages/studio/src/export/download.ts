import type { Project } from '#core'

/**
 * Dispara o download de um Blob no navegador via `<a download>`. Único ponto do
 * módulo de export que toca o DOM.
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

/** Nome de arquivo seguro a partir do nome do projeto (kebab; fallback "projeto"). */
function safeFileBase(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'projeto'
  )
}

/**
 * Baixa o projeto inteiro como `.szproject.json` — o MESMO formato que a listagem
 * importa via `importProjectFromJSON` (files/ir/blocksState/assets/extensões/tree).
 * Reusado pela listagem (ProjectCard) E pelo menu ⋯ do editor ("Exportar para o
 * Estúdio"), para a criança levar o projeto da aula para o Estúdio Completo.
 */
export function downloadProjectAsJSON(project: Project): void {
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' })
  triggerDownload(blob, `${safeFileBase(project.name)}.szproject.json`)
}
