import { describe, expect, it, mock } from 'bun:test'
import {
  buildMonacoModelPath,
  type DisposableMonacoModel,
  disposeModelsForPathPrefix,
  getMonacoModelPath,
  isModelInPathPrefix,
} from '../modelPaths'

function model(path: string): DisposableMonacoModel {
  return {
    uri: {
      path,
      toString: () => path,
    },
    dispose: mock(),
  }
}

describe('Monaco model paths', () => {
  it('prefixa models por projeto', () => {
    expect(buildMonacoModelPath('project-1', 'script.js')).toBe('project-1/script.js')
    expect(buildMonacoModelPath(undefined, 'script.js')).toBe('script.js')
  })

  it('normaliza path de URI para comparar prefixo', () => {
    expect(getMonacoModelPath(model('/project-1/index.html'))).toBe('project-1/index.html')
    expect(isModelInPathPrefix(model('/project-1/index.html'), 'project-1')).toBe(true)
    expect(isModelInPathPrefix(model('/project-10/index.html'), 'project-1')).toBe(false)
  })

  it('descarta apenas models do projeto informado', () => {
    const mine = model('/project-1/index.html')
    const alsoMine = model('project-1/script.js')
    const other = model('/project-2/index.html')

    const disposed = disposeModelsForPathPrefix('project-1', {
      getModels: () => [mine, alsoMine, other],
    })

    expect(disposed).toBe(2)
    expect(mine.dispose).toHaveBeenCalledTimes(1)
    expect(alsoMine.dispose).toHaveBeenCalledTimes(1)
    expect(other.dispose).not.toHaveBeenCalled()
  })
})
