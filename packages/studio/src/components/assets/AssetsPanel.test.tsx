import { afterEach, describe, expect, it } from 'bun:test'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { createEmptyProject } from '#core'
import { useProjectStore } from '../../state/projectStore'
import { AssetsPanel } from './AssetsPanel'

/**
 * Upload de binários 3D (modelo .glb / céu .hdr) — a porta que faltava: o motor
 * do Jogo 3D Avançado consumia os kinds `model3d`/`environment3d` e as docs
 * prometiam o recurso, mas o painel só enviava imagem e som. O painel é
 * renderizado FORA de um <Studio>, então lê a store DEFAULT (getState/setState).
 */

function base64DataUrl(mime: string, bytes: readonly number[]): string {
  const binary = String.fromCharCode(...bytes)
  return `data:${mime};base64,${btoa(binary)}`
}

// `glTF` + versão 2 (uint32 LE) — a assinatura que o core exige.
const GLB_OK = base64DataUrl(
  'model/gltf-binary',
  [0x67, 0x6c, 0x54, 0x46, 0x02, 0x00, 0x00, 0x00, 0x0c, 0x00, 0x00, 0x00],
)
// MIME/extensão de GLB com BYTES de HDR — o renomeado que a validação recusa.
const GLB_BYTES_ERRADOS = base64DataUrl(
  'model/gltf-binary',
  Array.from(new TextEncoder().encode('#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n')),
)
const HDR_OK = base64DataUrl(
  'image/vnd.radiance',
  Array.from(new TextEncoder().encode('#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n')),
)

function seedProject(opts: { with3DExtension?: boolean } = {}): void {
  const project = createEmptyProject('p1', 'Meu Jogo')
  if (opts.with3DExtension) {
    project.installedExtensions = [{ id: 'game-3d-advanced', version: '0.7.0', installedAt: 0 }]
  }
  useProjectStore.setState({ project, isDirty: false, saveError: null })
}

afterEach(() => {
  cleanup()
  useProjectStore.setState({ project: null, isDirty: false, saveError: null })
})

describe('addAsset — kinds 3D (model3d/environment3d)', () => {
  it('grava o .glb com o kind certo e preserva o nome do arquivo original', () => {
    seedProject()
    const err = useProjectStore.getState().addAsset({
      name: 'nave',
      dataUrl: GLB_OK,
      kind: 'model3d',
      originalFileName: 'Nave Legal.glb',
      source: 'upload',
    })
    expect(err).toBeNull()
    const asset = useProjectStore.getState().project?.assets?.[0]
    expect(asset?.kind).toBe('model3d')
    expect(asset?.name).toBe('nave')
    expect(asset?.originalFileName).toBe('Nave Legal.glb')
  })

  it('grava o .hdr como environment3d', () => {
    seedProject()
    const err = useProjectStore.getState().addAsset({
      name: 'ceu',
      dataUrl: HDR_OK,
      kind: 'environment3d',
      originalFileName: 'por-do-sol.hdr',
      source: 'upload',
    })
    expect(err).toBeNull()
    expect(useProjectStore.getState().project?.assets?.[0]?.kind).toBe('environment3d')
  })

  it('recusa .glb com bytes que não batem (arquivo renomeado) com erro legível', () => {
    seedProject()
    const err = useProjectStore.getState().addAsset({
      name: 'falso',
      dataUrl: GLB_BYTES_ERRADOS,
      kind: 'model3d',
      originalFileName: 'falso.glb',
      source: 'upload',
    })
    expect(err).toBe('modelo 3D inválido ou grande demais.')
    expect(useProjectStore.getState().project?.assets ?? []).toHaveLength(0)
  })

  it('recusa 3D SEM o nome do arquivo (a extensão faz parte do contrato)', () => {
    seedProject()
    const err = useProjectStore.getState().addAsset({
      name: 'sem-arquivo',
      dataUrl: GLB_OK,
      kind: 'model3d',
      source: 'upload',
    })
    expect(err).toBe('modelo 3D inválido ou grande demais.')
  })

  it('3D nunca carrega metadados de imagem (sprite/tileset) nem width/height', () => {
    seedProject()
    useProjectStore.getState().addAsset({
      name: 'nave',
      dataUrl: GLB_OK,
      kind: 'model3d',
      originalFileName: 'nave.glb',
      source: 'upload',
      width: 64,
      height: 64,
      sprite: { frameW: 8, frameH: 8, animations: [] },
    })
    const asset = useProjectStore.getState().project?.assets?.[0]
    expect(asset?.width).toBeUndefined()
    expect(asset?.sprite).toBeUndefined()
  })
})

describe('AssetsPanel — seção "Modelos 3D"', () => {
  it('mostra o botão de upload 3D, lista o modelo FORA da grade de imagens e renomeia', () => {
    seedProject({ with3DExtension: true })
    useProjectStore.getState().addAsset({
      name: 'nave',
      dataUrl: GLB_OK,
      kind: 'model3d',
      originalFileName: 'nave.glb',
      source: 'upload',
    })
    render(<AssetsPanel open onClose={() => {}} />)

    expect(screen.getByText('📦 Enviar modelo 3D')).not.toBeNull()
    expect(screen.getByText('Modelos 3D')).not.toBeNull()
    expect(screen.getByText('nave.glb')).not.toBeNull()
    // NÃO vira <img> quebrado na grade de imagens (a grade usa alt={name}).
    expect(screen.queryByAltText('nave')).toBeNull()

    const input = screen.getByLabelText('Nome do modelo 3D nave') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'nave-mae' } })
    fireEvent.blur(input)
    expect(useProjectStore.getState().project?.assets?.[0]?.name).toBe('nave-mae')
  })

  it('sem assets 3D a seção não aparece', () => {
    seedProject({ with3DExtension: true })
    render(<AssetsPanel open onClose={() => {}} />)
    expect(screen.queryByText('Modelos 3D')).toBeNull()
  })

  it('SEM a extensão Jogo 3D Avançado o botão de upload 3D não existe (curadoria)', () => {
    seedProject()
    render(<AssetsPanel open onClose={() => {}} />)
    expect(screen.getByText('Enviar imagem')).not.toBeNull() // os demais seguem
    expect(screen.queryByText('📦 Enviar modelo 3D')).toBeNull()
  })

  it('o kit Jogo 3D (iniciante) também consome .glb/.hdr desde os blocos do Molda: botão presente', () => {
    const project = createEmptyProject('p1', 'Meu Jogo')
    project.installedExtensions = [{ id: 'game-3d', version: '0.30.0', installedAt: 0 }]
    useProjectStore.setState({ project, isDirty: false, saveError: null })
    render(<AssetsPanel open onClose={() => {}} />)
    expect(screen.getByText('📦 Enviar modelo 3D')).not.toBeNull()
  })

  it('asset 3D ÓRFÃO continua listado e só é excluído após confirmação', () => {
    // O gate é só da porta de ENTRADA: esconder a seção criaria um órfão
    // invisível comendo a cota, sem como a criança excluir.
    seedProject()
    useProjectStore.getState().addAsset({
      name: 'orfao',
      dataUrl: GLB_OK,
      kind: 'model3d',
      originalFileName: 'orfao.glb',
      source: 'upload',
    })
    render(<AssetsPanel open onClose={() => {}} />)
    expect(screen.queryByText('📦 Enviar modelo 3D')).toBeNull()
    expect(screen.getByText('Modelos 3D')).not.toBeNull()
    fireEvent.click(screen.getByText('Excluir'))
    expect(useProjectStore.getState().project?.assets ?? []).toHaveLength(1)
    const confirmation = screen.getByRole('dialog', { name: 'Excluir do projeto?' })
    fireEvent.click(within(confirmation).getByRole('button', { name: 'Excluir' }))
    expect(useProjectStore.getState().project?.assets ?? []).toHaveLength(0)
  })
})
