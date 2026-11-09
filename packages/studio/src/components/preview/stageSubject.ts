import type { ProStageSubject } from './ProStageState'

/**
 * O que o palco clássico mostra, para o título e o cartão de parado: um JOGO quando o projeto
 * desenha (uma extensão de jogo ou um canvas), uma PÁGINA quando é só HTML e CSS.
 */
export function classicStageSubject(
  project: {
    installedExtensions?: readonly unknown[]
    files?: { readonly 'index.html'?: string; readonly 'script.js'?: string }
  } | null,
): ProStageSubject {
  if (!project) return 'game'
  if ((project.installedExtensions?.length ?? 0) > 0) return 'game'
  const files = project.files ?? {}
  const text = `${files['index.html'] ?? ''}\n${files['script.js'] ?? ''}`
  return /<canvas\b|getContext\(|SZGame|requestAnimationFrame/.test(text) ? 'game' : 'page'
}

const PYTHON_GAME_EXTENSIONS = new Set([
  'python-pgzero',
  'python-pygame',
  'python-raylib-2d',
  'python-raylib-3d',
])

/** Um projeto Python com extensão de jogo é um JOGO; o resto é um PROGRAMA (o Turtle inclusive). */
export function pythonStageSubject(
  project: {
    installedExtensions?: readonly { id: string }[]
  } | null,
): 'game' | 'program' {
  return project?.installedExtensions?.some((extension) => PYTHON_GAME_EXTENSIONS.has(extension.id))
    ? 'game'
    : 'program'
}
