import type { Project } from '#core'
import { generateProjectFiles } from '#generators'
import { normalizeSZIR } from '#ir'

function hasLegacyBehaviorFrame(blocksState: unknown): boolean {
  const blocks = (blocksState as { blocks?: { blocks?: Array<{ type?: unknown }> } } | null)?.blocks
    ?.blocks
  return Array.isArray(blocks) && blocks.some((block) => block?.type === 'sz_frame_behavior')
}

/**
 * Atualiza snapshots antigos do modo Blocos para o ciclo de vida atual sem
 * depender do Blockly. Essa fronteira também pode ser usada pelo player público,
 * cujo bundle não deve carregar o editor visual.
 *
 * Projetos da Ponte ficam intocados: neles os arquivos escritos pela criança são
 * a fonte da verdade e a IR pode estar deliberadamente defasada.
 */
export function migrateLegacyBlockProjectSnapshot(project: Project): Project {
  if (project.kind === 'pro' || project.mode !== 'blocks' || !project.ir) return project
  if ('behavior' in project.ir) return project
  if (!hasLegacyBehaviorFrame(project.blocksState)) return project

  try {
    const ir = normalizeSZIR(project.ir)
    return {
      ...project,
      ir,
      files: generateProjectFiles({ ir, projectName: project.name }),
    }
  } catch {
    // O player público recebe snapshots históricos sem passar pelo importador.
    // Se um deles estiver incompleto, preserva os arquivos publicados em vez de
    // transformar uma compatibilidade opcional em tela vazia.
    return project
  }
}
