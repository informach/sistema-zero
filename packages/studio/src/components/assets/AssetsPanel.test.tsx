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

/**
 * A janela "Materiais do jogo" em abas (18/09/2026). Antes era uma rolagem só, com
 * as seções de som e de 3D aparecendo apenas QUANDO JÁ HAVIA arquivo daquele tipo
 * — quem não tinha nenhum não via nada sobre eles em lugar nenhum, e o caminho
 * para importar um som era clicar em "Imagens".
 */
describe('Materiais do jogo — as abas', () => {
  /** Abre a janela e vai para a aba pedida pelo GESTO (clicando nela). */
  function abrir(tab?: 'Sons' | 'Modelos 3D') {
    const view = render(<AssetsPanel open onClose={() => {}} />)
    if (tab) fireEvent.click(screen.getByRole('tab', { name: tab }))
    return view
  }

  it('imagens e sons têm aba SEMPRE; a de 3D só com quem consuma 3D', () => {
    seedProject()
    abrir()
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['🖼️Imagens', '🔊Sons'])
  })

  it('a aba de som ensina o próximo passo mesmo sem nenhum som (era o buraco)', () => {
    seedProject()
    abrir('Sons')
    expect(screen.getByText('🔊 Enviar som')).not.toBeNull()
    expect(screen.getByText(/Nenhum som ainda/)).not.toBeNull()
    // E diz QUAL bloco usa o que ela acabou de enviar.
    expect(screen.getByText(/Carregar o som/)).not.toBeNull()
  })

  it('o som fica na aba dele, e não na de imagens', () => {
    seedProject()
    useProjectStore.getState().addAsset({
      name: 'pulo',
      dataUrl: 'data:audio/mpeg;base64,//uQx',
      kind: 'audio',
      source: 'upload',
    })
    abrir()
    expect(screen.queryByLabelText('Nome do som pulo')).toBeNull()
    fireEvent.click(screen.getByRole('tab', { name: 'Sons' }))
    expect(screen.getByLabelText('Nome do som pulo')).not.toBeNull()
  })

  it('a aba ativa é a única com aria-selected, e o painel aponta para ela', () => {
    seedProject()
    abrir('Sons')
    const sons = screen.getByRole('tab', { name: 'Sons' })
    expect(sons.getAttribute('aria-selected')).toBe('true')
    expect(screen.getByRole('tab', { name: 'Imagens' }).getAttribute('aria-selected')).toBe('false')
    const painel = screen.getByRole('tabpanel')
    expect(painel.getAttribute('aria-labelledby')).toBe(sons.id)
  })

  it('a cota do projeto fica FORA das abas (ela é do projeto, não de um tipo)', () => {
    seedProject()
    abrir('Sons')
    expect(screen.getByText(/0\/128 arquivos/)).not.toBeNull()
  })
})

describe('Materiais do jogo — a aba "Modelos 3D"', () => {
  function abrir3D() {
    render(<AssetsPanel open onClose={() => {}} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Modelos 3D' }))
  }

  it('mostra o botão de upload 3D, lista o modelo FORA da grade de imagens e renomeia', () => {
    seedProject({ with3DExtension: true })
    useProjectStore.getState().addAsset({
      name: 'nave',
      dataUrl: GLB_OK,
      kind: 'model3d',
      originalFileName: 'nave.glb',
      source: 'upload',
    })
    abrir3D()

    expect(screen.getByText('📦 Enviar modelo 3D')).not.toBeNull()
    expect(screen.getByText('nave.glb')).not.toBeNull()
    // NÃO vira <img> quebrado na grade de imagens (a grade usa alt={name}).
    expect(screen.queryByAltText('nave')).toBeNull()

    const input = screen.getByLabelText('Nome do modelo 3D nave') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'nave-mae' } })
    fireEvent.blur(input)
    expect(useProjectStore.getState().project?.assets?.[0]?.name).toBe('nave-mae')
  })

  it('com a extensão e sem arquivo nenhum, a aba existe e ensina o caminho', () => {
    seedProject({ with3DExtension: true })
    abrir3D()
    expect(screen.getByText(/Nenhum modelo 3D ainda/)).not.toBeNull()
  })

  it('SEM quem consuma 3D e sem arquivo 3D, a aba nem existe (curadoria)', () => {
    seedProject()
    render(<AssetsPanel open onClose={() => {}} />)
    expect(screen.queryByRole('tab', { name: 'Modelos 3D' })).toBeNull()
    // A de imagens segue inteira.
    expect(screen.getByText('Enviar imagem')).not.toBeNull()
  })

  it('o kit Jogo 3D (iniciante) também consome .glb/.hdr desde os blocos do Molda', () => {
    const project = createEmptyProject('p1', 'Meu Jogo')
    project.installedExtensions = [{ id: 'game-3d', version: '0.30.0', installedAt: 0 }]
    useProjectStore.setState({ project, isDirty: false, saveError: null })
    abrir3D()
    expect(screen.getByText('📦 Enviar modelo 3D')).not.toBeNull()
  })

  it('asset 3D ÓRFÃO mantém a aba viva, sem a porta de entrada, e dá para excluir', () => {
    // O gate é só da porta de ENTRADA: sem a aba, o órfão ficaria invisível
    // comendo a cota, e a criança não teria como excluí-lo.
    seedProject()
    useProjectStore.getState().addAsset({
      name: 'orfao',
      dataUrl: GLB_OK,
      kind: 'model3d',
      originalFileName: 'orfao.glb',
      source: 'upload',
    })
    abrir3D()
    expect(screen.queryByText('📦 Enviar modelo 3D')).toBeNull()
    expect(screen.getByText('orfao.glb')).not.toBeNull()
    fireEvent.click(screen.getByText('Excluir'))
    expect(useProjectStore.getState().project?.assets ?? []).toHaveLength(1)
    const confirmation = screen.getByRole('dialog', { name: 'Excluir do projeto?' })
    fireEvent.click(within(confirmation).getByRole('button', { name: 'Excluir' }))
    expect(useProjectStore.getState().project?.assets ?? []).toHaveLength(0)
  })
})
