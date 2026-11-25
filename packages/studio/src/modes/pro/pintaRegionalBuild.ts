import { hasRegionalPintaReference } from '../../core/pintaRegionalReference'
import type { Project } from '../../core/project'
import { regionalJavaScriptEngine } from '../../runtime/javascript/pintaRegionalMaterials'
import { proRegionalEngineCopy } from './pintaRegionalProRuntime'

/** A compilation projection replaces only a verified current platform copy.
 * The authored tree, history and source snapshot retain their original bytes.
 */
export async function regionalProBuildFiles(project: Project) {
  if (!project.assets?.some(hasRegionalPintaReference)) return undefined
  const engine = regionalJavaScriptEngine(project.installedExtensions)
  if (
    !engine ||
    !project.proMeta?.origin ||
    (await proRegionalEngineCopy(project.tree, engine.id)) !== 'current'
  )
    throw new Error(
      'Este cenário precisa de um projeto Pro convertido com uma cópia atual e intacta do Jogo 2D ou Jogo 2D Avançado.',
    )
  const { mapTwoDRegionalEngineBootstrap } = await import(
    '../../official-extensions/map-2d/regionBootstrap'
  )
  return {
    path: `public/sz-ext/${engine.id}.js`,
    script: await mapTwoDRegionalEngineBootstrap(engine.id === 'game-2d' ? 'g2d' : 'gk'),
  }
}
