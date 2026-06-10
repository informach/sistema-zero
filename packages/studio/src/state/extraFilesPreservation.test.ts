import { beforeEach, describe, expect, it } from 'bun:test'
import type { Project } from '#core'
import type { SZIR } from '#ir'
import { useProjectStore } from './projectStore'

/**
 * Regressão da decisão "degradação graciosa": ao alternar Código→Ponte→Código,
 * os arquivos extras (além dos 3 canônicos) NUNCA podem sumir. A geração por
 * blocos só escreve os 3 canônicos (`setFiles`) e o reverse-parse só atualiza
 * IR/blocksState (`applyProjectState`); ambos devem manter `extraFiles` e os
 * arquivos não tocados.
 */
function makeProject(): Project {
  return {
    id: 'p1',
    name: 'Proj',
    createdAt: 0,
    updatedAt: 0,
    mode: 'code',
    files: {
      'index.html':
        '<link rel="stylesheet" href="cores.css" /><h1>Oi</h1><script src="utils.js"></script>',
      'style.css': '',
      'script.js': '',
    },
    extraFiles: [
      { name: 'cores.css', language: 'css', content: 'body { margin: 0; }' },
      { name: 'utils.js', language: 'javascript', content: 'export const x = 1;' },
    ],
    ir: null,
    blocksState: null,
    installedExtensions: [],
  }
}

describe('preservação de arquivos extras (Código→Ponte→Código)', () => {
  beforeEach(() => {
    useProjectStore.setState({ project: null, isDirty: false, saveError: null })
  })

  it('setFiles (geração por blocos) não apaga extraFiles', () => {
    useProjectStore.getState().setProject(makeProject())
    useProjectStore.getState().setFiles({
      'index.html': '<h1>Editado</h1>',
      'style.css': 'h1 { color: red; }',
      'script.js': 'console.log(1);',
    })

    const extras = useProjectStore.getState().project?.extraFiles ?? []
    expect(extras.map((f) => f.name)).toEqual(['cores.css', 'utils.js'])
  })

  it('applyProjectState (reverse-parse) preserva extraFiles e arquivos não tocados', () => {
    useProjectStore.getState().setProject(makeProject())
    const ir: SZIR = { html: [], css: [], js: [], extensions: [] }
    useProjectStore.getState().applyProjectState({ ir, blocksState: null })

    const project = useProjectStore.getState().project
    expect(project?.extraFiles?.map((f) => f.name)).toEqual(['cores.css', 'utils.js'])
    expect(project?.files['index.html']).toContain('Oi')
    expect(project?.ir).toEqual(ir)
  })
})
