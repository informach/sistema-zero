import { beforeEach, describe, expect, it } from 'bun:test'
import { createEmptyProject } from '#core'
import { sanitizeProjectForHost, useProjectStore } from './projectStore'

// Épocas da sincronização código⇄blocos da Ponte (`bridgeCodeEditEpoch` ×
// `bridgeBlocksSyncedEpoch`): `code > synced` significa blocos DEFASADOS — a
// trava que impede uma carga de regenerar arquivos a partir deles (corrida de
// trocar p/ Blocos dentro da janela do reverse-parse). Contrato dos testes:
// as estáticas getState/setState operam na store DEFAULT.

function resetStore(): void {
  useProjectStore.setState({
    project: null,
    isDirty: false,
    saveError: null,
    blocksHydration: 'idle',
    bridgeCodeEditEpoch: 0,
    bridgeBlocksSyncedEpoch: 0,
  })
}

describe('épocas da sincronização código⇄blocos (Ponte)', () => {
  beforeEach(resetStore)

  it('editar código na PONTE avança a época; noutros modos não', () => {
    const p = createEmptyProject('p-epoch', 'Projeto')
    useProjectStore.setState({ project: { ...p, mode: 'bridge' } })

    useProjectStore.getState().setFile('script.js', 'a();\n')
    expect(useProjectStore.getState().bridgeCodeEditEpoch).toBe(1)
    expect(useProjectStore.getState().project?.bridgeCodeAhead).toBe(true)
    useProjectStore.getState().setFiles({ 'script.js': 'b();\n' })
    expect(useProjectStore.getState().bridgeCodeEditEpoch).toBe(2)

    // Em Blocos, files só mudam por REGENERAÇÃO (blocos são a fonte) — a época
    // de edição de código não anda.
    const current = useProjectStore.getState().project
    if (!current) throw new Error('projeto sumiu')
    useProjectStore.setState({ project: { ...current, mode: 'blocks' } })
    useProjectStore.getState().setFile('script.js', 'c();\n')
    expect(useProjectStore.getState().bridgeCodeEditEpoch).toBe(2)
  })

  it('markBridgeBlocksSynced é monotônico (nunca anda para trás)', () => {
    useProjectStore.getState().markBridgeBlocksSynced(3)
    expect(useProjectStore.getState().bridgeBlocksSyncedEpoch).toBe(3)
    // Um resultado ATRASADO do worker (época menor) não pode reabrir a trava.
    useProjectStore.getState().markBridgeBlocksSynced(1)
    expect(useProjectStore.getState().bridgeBlocksSyncedEpoch).toBe(3)
  })

  it('só retira a precedência do código quando os blocos alcançam a última edição', () => {
    const p = createEmptyProject('p-authority', 'Projeto')
    useProjectStore.setState({ project: { ...p, mode: 'bridge' } })
    useProjectStore.getState().setFile('script.js', 'primeira();\n')
    useProjectStore.getState().setFile('script.js', 'segunda();\n')

    useProjectStore.getState().markBridgeBlocksSynced(1)
    expect(useProjectStore.getState().project?.bridgeCodeAhead).toBe(true)

    useProjectStore.getState().markBridgeBlocksSynced(2)
    expect(useProjectStore.getState().project?.bridgeCodeAhead).toBeUndefined()
  })

  it('ao atravessar host/servidor, preserva o código novo e descarta derivados antigos', () => {
    const project = createEmptyProject('p-submission', 'Projeto')
    project.mode = 'bridge'
    project.files['script.js'] = 'versaoNova();\n'
    project.bridgeCodeAhead = true

    const snapshot = sanitizeProjectForHost(project)

    expect(snapshot?.files['script.js']).toBe('versaoNova();\n')
    expect(snapshot?.bridgeCodeAhead).toBe(true)
    expect(snapshot?.ir).toBeNull()
    expect(snapshot?.blocksState).toBeNull()
  })

  it('trocar/carregar projeto zera as épocas', () => {
    const p = createEmptyProject('p-reset', 'Projeto')
    useProjectStore.setState({
      project: { ...p, mode: 'bridge' },
      bridgeCodeEditEpoch: 5,
      bridgeBlocksSyncedEpoch: 2,
    })

    useProjectStore.getState().hydrateProject(createEmptyProject('p-outro', 'Outro'))
    expect(useProjectStore.getState().bridgeCodeEditEpoch).toBe(0)
    expect(useProjectStore.getState().bridgeBlocksSyncedEpoch).toBe(0)

    useProjectStore.setState({ bridgeCodeEditEpoch: 4, bridgeBlocksSyncedEpoch: 1 })
    useProjectStore.getState().unloadProject()
    expect(useProjectStore.getState().bridgeCodeEditEpoch).toBe(0)
    expect(useProjectStore.getState().bridgeBlocksSyncedEpoch).toBe(0)
  })
})
