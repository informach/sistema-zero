/**
 * Busca e filtros da galeria: o campo filtra os cards (nome/tipo/jogo), os chips de estilo e
 * de tipo se combinam com a busca, o contador diz quantos sobraram, o vazio tem "limpar", e
 * as seções por jogo somem quando nada nelas casa. Sem teto de quantidade: 80 desenhos abrem.
 */
import { beforeEach, describe, expect, it } from 'bun:test'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { COPY } from '../../core/copy'
import {
  createPixelBackgroundAsset,
  createPixelSpriteAsset,
  createVectorSpriteAsset,
} from '../../core/project'
import { clearIdbMock } from '../../testing/idbMock'

const { PintaApp } = await import('../PintaApp')
const { setPintaStorageNamespace } = await import('../../state/persistence')
const { createGalleryStore } = await import('../../state/galleryStore')

beforeEach(() => {
  clearIdbMock()
  setPintaStorageNamespace('')
  localStorage.clear()
})

const openButtons = () =>
  screen.queryAllByRole('button', { name: /^Abrir / }).map((b) => b.getAttribute('aria-label'))

async function seedGallery(): Promise<void> {
  const seed = createGalleryStore()
  await seed.getState().importAssets([
    createPixelSpriteAsset({ name: 'heroi-azul', frameSize: 16 }),
    {
      ...createVectorSpriteAsset({ name: 'nave-2', frameSize: 32 }),
      projectRef: { id: 'p1', name: 'Jogo da Nave' },
    },
    createPixelBackgroundAsset({ name: 'ceu-noturno', width: 16, height: 16 }),
  ])
}

async function waitGallery(): Promise<void> {
  await waitFor(() => {
    expect(screen.getByRole('button', { name: /Abrir heroi-azul/ })).toBeTruthy()
  })
}

describe('busca e filtros da galeria', () => {
  it('a busca filtra por nome, tipo e jogo, mostra o contador e limpa pelo X', async () => {
    await seedGallery()
    render(<PintaApp />)
    await waitGallery()
    const search = screen.getByRole('searchbox', { name: COPY.gallery.search })
    fireEvent.change(search, { target: { value: 'nave' } })
    await waitFor(() => {
      expect(openButtons()).toEqual([expect.stringContaining('nave-2')])
    })
    expect(screen.getByRole('status').textContent).toBe(COPY.gallery.searchCount(1, 3))
    // Pelo TIPO (com acento) e pelo JOGO do Pensa.
    fireEvent.change(search, { target: { value: 'cenário' } })
    await waitFor(() => {
      expect(openButtons()).toEqual([expect.stringContaining('ceu-noturno')])
    })
    fireEvent.change(search, { target: { value: 'jogo da nave' } })
    await waitFor(() => {
      expect(openButtons()).toEqual([expect.stringContaining('nave-2')])
    })
    // Nada casa: vazio com "limpar".
    fireEvent.change(search, { target: { value: 'zzz' } })
    await waitFor(() => {
      expect(screen.getByText(COPY.gallery.searchEmpty)).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: COPY.gallery.searchClearAll }))
    await waitFor(() => {
      expect(openButtons()).toHaveLength(3)
    })
    // O X do campo também limpa.
    fireEvent.change(search, { target: { value: 'heroi' } })
    await waitFor(() => {
      expect(openButtons()).toHaveLength(1)
    })
    fireEvent.click(screen.getByRole('button', { name: COPY.gallery.searchClear }))
    await waitFor(() => {
      expect(openButtons()).toHaveLength(3)
    })
  })

  it('os chips de estilo e de tipo filtram e se combinam com a busca; a seção do jogo some quando nada casa', async () => {
    await seedGallery()
    render(<PintaApp />)
    await waitGallery()
    const style = screen.getByRole('group', { name: COPY.gallery.filterStyle })
    const role = screen.getByRole('group', { name: COPY.gallery.filterRole })
    // Só vetor: sobra a nave (e a seção "Jogo da Nave"); os pixels somem.
    fireEvent.click(within(style).getByRole('button', { name: COPY.gallery.filterAria.vector }))
    await waitFor(() => {
      expect(openButtons()).toEqual([expect.stringContaining('nave-2')])
    })
    expect(
      within(style)
        .getByRole('button', { name: COPY.gallery.filterAria.vector })
        .getAttribute('aria-pressed'),
    ).toBe('true')
    // Vetor + Cenário: nada — e a seção do jogo some.
    fireEvent.click(within(role).getByRole('button', { name: COPY.gallery.filterAria.background }))
    await waitFor(() => {
      expect(screen.getByText(COPY.gallery.searchEmpty)).toBeTruthy()
    })
    expect(screen.queryByRole('region', { name: 'Jogo da Nave' })).toBeNull()
    // Todos os estilos + Cenário: o céu.
    fireEvent.click(within(style).getByRole('button', { name: COPY.gallery.filterAria.allStyles }))
    await waitFor(() => {
      expect(openButtons()).toEqual([expect.stringContaining('ceu-noturno')])
    })
    // Personagem + busca "azul": só o herói.
    fireEvent.click(within(role).getByRole('button', { name: COPY.gallery.filterAria.sprite }))
    fireEvent.change(screen.getByRole('searchbox', { name: COPY.gallery.search }), {
      target: { value: 'azul' },
    })
    await waitFor(() => {
      expect(openButtons()).toEqual([expect.stringContaining('heroi-azul')])
    })
  })

  it('sem teto de quantidade: uma galeria com 80 desenhos abre inteira e a busca acha um deles', async () => {
    const seed = createGalleryStore()
    await seed
      .getState()
      .importAssets(
        Array.from({ length: 80 }, (_, i) =>
          createPixelSpriteAsset({ name: `d-${i}`, frameSize: 8 }),
        ),
      )
    render(<PintaApp />)
    await waitFor(() => {
      expect(openButtons()).toHaveLength(80)
    })
    fireEvent.change(screen.getByRole('searchbox', { name: COPY.gallery.search }), {
      target: { value: 'd-77' },
    })
    await waitFor(() => {
      expect(openButtons()).toEqual([expect.stringContaining('d-77')])
    })
  })
})
