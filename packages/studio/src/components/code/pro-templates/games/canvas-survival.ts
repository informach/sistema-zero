import type { ProjectAsset } from '../../../../core/project'
import type { ProjectTree } from '../../../../core/proProject'
import {
  CANVAS_SURVIVAL_ASSETS,
  CANVAS_SURVIVAL_SOURCES,
} from './canvas-survival.sources.generated'
import { SHARED_SOURCES } from './shared'

/** O template contém o mesmo documento completo usado por build, exportação e playtest. */
export function createCanvasSurvivalTemplate(): { tree: ProjectTree; assets: ProjectAsset[] } {
  const tree: ProjectTree = {}
  const names = new Set<string>()
  for (const layer of [SHARED_SOURCES, CANVAS_SURVIVAL_SOURCES]) {
    for (const [path, content] of Object.entries(layer)) {
      const lower = path.toLowerCase()
      if (names.has(lower)) throw new Error(`Fontes da arena colidem: ${path}`)
      names.add(lower)
      const parts = path.split('/')
      for (let index = 1; index < parts.length; index++) {
        const parent = parts.slice(0, index).join('/')
        if (tree[parent]?.kind === 'file') throw new Error(`Arquivo ocupa uma pasta: ${parent}`)
        tree[parent] = { kind: 'dir' }
      }
      if (tree[path]) throw new Error(`Caminho já ocupado: ${path}`)
      tree[path] = { kind: 'file', content }
    }
  }
  return { tree, assets: structuredClone([...CANVAS_SURVIVAL_ASSETS]) }
}
