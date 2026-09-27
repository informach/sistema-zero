import { afterEach, describe, expect, it } from 'bun:test'
import { createEmptyProject } from '#core'
import { useProjectStore } from './projectStore'

/**
 * A capa ESCOLHIDA (26/09/2026): `setCoverAsset` guarda só o NOME da imagem no projeto e
 * bumpa o `updatedAt` (é assim que ela sobe pela nuvem). Apagar a imagem escolhida limpa a
 * escolha; renomear a segue. A store DEFAULT serve aqui (como no `AssetsPanel.test`).
 */
function seed(): void {
  useProjectStore.setState({
    project: createEmptyProject('p1', 'Meu Jogo'),
    isDirty: false,
    saveError: null,
  })
}

function addImage(name: string): string {
  const err = useProjectStore.getState().addAsset({
    name,
    dataUrl: 'data:image/png;base64,AAA',
    kind: 'image',
    source: 'upload',
  })
  expect(err).toBeNull()
  const asset = useProjectStore.getState().project?.assets?.find((a) => a.name === name)
  if (!asset) throw new Error('asset não criado')
  return asset.id
}

afterEach(() => {
  useProjectStore.setState({ project: null, isDirty: false, saveError: null })
})

describe('setCoverAsset', () => {
  it('grava o nome da imagem e bumpa o updatedAt; escolher de novo a mesma não mexe', () => {
    seed()
    const id = addImage('tela-inicial')
    const antes = useProjectStore.getState().project?.updatedAt ?? 0
    expect(useProjectStore.getState().setCoverAsset(id)).toBeNull()
    const depois = useProjectStore.getState().project
    expect(depois?.coverAssetName).toBe('tela-inicial')
    expect(depois?.updatedAt ?? 0).toBeGreaterThanOrEqual(antes)
    expect(useProjectStore.getState().isDirty).toBe(true)
    const ref = useProjectStore.getState().project
    expect(useProjectStore.getState().setCoverAsset(id)).toBeNull()
    expect(useProjectStore.getState().project).toBe(ref)
  })

  it('recusa o que não é imagem e o que não existe, com erro legível', () => {
    seed()
    const som = useProjectStore.getState().addAsset({
      name: 'musica',
      dataUrl: 'data:audio/mpeg;base64,AAA',
      kind: 'audio',
      source: 'upload',
    })
    expect(som).toBeNull()
    const somId = useProjectStore.getState().project?.assets?.[0]?.id ?? ''
    expect(useProjectStore.getState().setCoverAsset(somId)).toBe(
      'Só uma imagem pode ser a capa do jogo.',
    )
    expect(useProjectStore.getState().setCoverAsset('nada')).toBe('Imagem não encontrada.')
    expect(useProjectStore.getState().project?.coverAssetName).toBeUndefined()
  })

  it('`null` remove a CHAVE (projeto sem capa fica byte-idêntico ao de antes)', () => {
    seed()
    const id = addImage('tela-inicial')
    useProjectStore.getState().setCoverAsset(id)
    expect(useProjectStore.getState().setCoverAsset(null)).toBeNull()
    const project = useProjectStore.getState().project
    expect(project && 'coverAssetName' in project).toBe(false)
    // Sem capa, limpar de novo não mexe.
    const ref = useProjectStore.getState().project
    expect(useProjectStore.getState().setCoverAsset(null)).toBeNull()
    expect(useProjectStore.getState().project).toBe(ref)
  })

  it('apagar a imagem escolhida limpa a capa; apagar outra imagem não', () => {
    seed()
    const capa = addImage('tela-inicial')
    const outra = addImage('heroi')
    useProjectStore.getState().setCoverAsset(capa)
    useProjectStore.getState().removeAsset(outra)
    expect(useProjectStore.getState().project?.coverAssetName).toBe('tela-inicial')
    useProjectStore.getState().removeAsset(capa)
    const project = useProjectStore.getState().project
    expect(project && 'coverAssetName' in project).toBe(false)
  })

  it('renomear a imagem escolhida leva a capa junto', () => {
    seed()
    const capa = addImage('tela-inicial')
    useProjectStore.getState().setCoverAsset(capa)
    expect(useProjectStore.getState().renameAsset(capa, 'abertura')).toBeNull()
    expect(useProjectStore.getState().project?.coverAssetName).toBe('abertura')
  })
})
