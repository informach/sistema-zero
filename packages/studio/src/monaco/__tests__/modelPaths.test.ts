import { describe, expect, it, mock } from 'bun:test'
import {
  buildMonacoModelPath,
  type DisposableMonacoModel,
  disposeModelsForPathPrefix,
  getMonacoModelPath,
  isModelInPathPrefix,
  resolveModelPathPrefix,
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
    // Prefixo só com espaços é tratado como vazio (não vira ` /script.js`).
    expect(buildMonacoModelPath('   ', 'script.js')).toBe('script.js')
  })

  it('salga o prefixo com o id por instância SEM `:` (não vira esquema de URI)', () => {
    // O `useId()` pode conter `:` (ex.: `:r0:`). O Monaco cria o model via
    // `monaco.Uri.parse(path)`, que trata TUDO antes do 1º `:` como ESQUEMA — o
    // projectId sumia de `uri.path` e o realce/seleção bloco↔código nunca casava.
    // Saneamos `:` → `_`, então o prefixo NUNCA tem `:`.
    const a = resolveModelPathPrefix('project-1', ':r0:')
    const b = resolveModelPathPrefix('project-1', ':r1:')
    expect(a).not.toContain(':')
    expect(a.startsWith('project-1')).toBe(true)
    // Dois <Studio> no MESMO projectId precisam de prefixos DISTINTOS.
    expect(a).not.toBe(b)
  })

  it('nunca devolve prefixo vazio: projectId em branco cai no id por instância', () => {
    // Sem isso, um project.id vazio vazaria/colidiria models entre instâncias.
    // O id é saneado (`:` → `_`) para o path não ganhar um esquema de URI.
    expect(resolveModelPathPrefix(undefined, ':r0:')).toBe('_r0_')
    expect(resolveModelPathPrefix('', ':r0:')).toBe('_r0_')
    expect(resolveModelPathPrefix('   ', ':r0:')).toBe('_r0_')
    // E o caminho resultante carrega sempre um discriminador não-vazio e sem `:`.
    const prefix = resolveModelPathPrefix('', ':r2:')
    const path = buildMonacoModelPath(prefix, 'script.js')
    expect(path).toBe('_r2_/script.js')
    expect(path).not.toContain(':')
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

  it('duas instâncias no mesmo projeto não descartam os models uma da outra', () => {
    // Reproduz a rota /dual: mesmo projectId, ids de instância distintos.
    const projectId = 'project-1'
    const prefixA = resolveModelPathPrefix(projectId, ':r0:')
    const prefixB = resolveModelPathPrefix(projectId, ':r1:')
    const a = model(buildMonacoModelPath(prefixA, 'script.js'))
    const b = model(buildMonacoModelPath(prefixB, 'script.js'))
    const registry = { getModels: () => [a, b] }

    // Desmontar a instância A só pode descartar os models DELA.
    const disposed = disposeModelsForPathPrefix(prefixA, registry)
    expect(disposed).toBe(1)
    expect(a.dispose).toHaveBeenCalledTimes(1)
    expect(b.dispose).not.toHaveBeenCalled()
  })
})
