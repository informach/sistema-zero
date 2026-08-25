/**
 * Modo de seleção do PACK na galeria: "Selecionar" liga o modo (miniatura vira
 * alternador, ações do card desabilitam), o contador acompanha, Esc/Cancelar
 * saem limpando, e "Baixar seleção" gera um `pack-pinta.zip` restaurável pelo
 * "Trazer de volta" — com o tileset de um mapa marcado incluído SOZINHO.
 */
import { beforeEach, describe, expect, it } from 'bun:test'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { COPY } from '../../core/copy'
import {
  createPixelSpriteAsset,
  createTilemapAsset,
  createTilesetAsset,
} from '../../core/projectConfig'
import { clearIdbMock } from '../../testing/idbMock'

const { PintaApp } = await import('../PintaApp')
const { setPintaStorageNamespace } = await import('../../state/persistence')
const { createGalleryStore } = await import('../../state/galleryStore')
const { readPintaBackupFile } = await import('../../export/backupFile')
const { importPintaJson } = await import('../../export/projectJson')

beforeEach(() => {
  clearIdbMock()
  setPintaStorageNamespace('')
  localStorage.clear()
})

async function seedGallery(): Promise<void> {
  const seed = createGalleryStore()
  const tileset = createTilesetAsset({ name: 'pecas', tileSize: 8 })
  await seed
    .getState()
    .importAssets([
      createPixelSpriteAsset({ name: 'heroi', frameSize: 8 }),
      tileset,
      createTilemapAsset({ name: 'fase', tilesetId: tileset.id, cols: 2, rows: 2 }),
    ])
}

async function openSelectionMode(): Promise<void> {
  await waitFor(() => {
    expect(screen.getByRole('button', { name: /Abrir heroi/ })).toBeTruthy()
  })
  fireEvent.click(screen.getByRole('button', { name: COPY.gallery.select }))
  await screen.findByRole('button', { name: COPY.gallery.selectionMark('heroi') })
}

const button = (name: string | RegExp) => screen.getByRole('button', { name }) as HTMLButtonElement

describe('modo de seleção da galeria (pack)', () => {
  it('marca e desmarca pela miniatura, conta, desabilita as ações e Cancelar limpa', async () => {
    await seedGallery()
    render(<PintaApp />)
    await openSelectionMode()

    // As três ações do card ficam desligadas (o card NÃO muda de altura).
    expect(button(`${COPY.gallery.rename} heroi`).disabled).toBe(true)
    expect(button(`${COPY.gallery.duplicate} heroi`).disabled).toBe(true)
    expect(button(`${COPY.gallery.remove} heroi`).disabled).toBe(true)
    expect(screen.getByText(COPY.gallery.selectionCount(0))).toBeTruthy()

    fireEvent.click(button(COPY.gallery.selectionMark('heroi')))
    const unmark = await screen.findByRole('button', {
      name: COPY.gallery.selectionUnmark('heroi'),
    })
    expect(unmark.getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByText(COPY.gallery.selectionCount(1))).toBeTruthy()

    fireEvent.click(unmark)
    await screen.findByRole('button', { name: COPY.gallery.selectionMark('heroi') })
    expect(screen.getByText(COPY.gallery.selectionCount(0))).toBeTruthy()

    // Cancelar sai do modo, e a marcação NÃO sobrevive à reentrada.
    fireEvent.click(button(COPY.gallery.selectionMark('heroi')))
    fireEvent.click(button(COPY.gallery.cancel))
    await screen.findByRole('button', { name: /Abrir heroi/ })
    expect(screen.queryByRole('button', { name: COPY.gallery.downloadSelection })).toBeNull()
    fireEvent.click(button(COPY.gallery.select))
    await screen.findByRole('button', { name: COPY.gallery.selectionMark('heroi') })
    expect(screen.getByText(COPY.gallery.selectionCount(0))).toBeTruthy()
  })

  it('Esc sai do modo, mas o Esc do campo de busca só limpa a busca', async () => {
    await seedGallery()
    render(<PintaApp />)
    await openSelectionMode()

    const search = screen.getByRole('searchbox', {
      name: COPY.gallery.search,
    }) as HTMLInputElement
    fireEvent.change(search, { target: { value: 'heroi' } })
    fireEvent.keyDown(search, { key: 'Escape' })
    await waitFor(() => {
      expect(search.value).toBe('')
    })
    expect(screen.getByRole('button', { name: COPY.gallery.downloadSelection })).toBeTruthy()

    fireEvent.keyDown(window, { key: 'Escape' })
    await screen.findByRole('button', { name: /Abrir heroi/ })
    expect(screen.queryByRole('button', { name: COPY.gallery.downloadSelection })).toBeNull()
  })

  it('baixa pack-pinta.zip restaurável com o tileset do mapa incluído sozinho', async () => {
    const createDescriptor = Object.getOwnPropertyDescriptor(URL, 'createObjectURL')
    const revokeDescriptor = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL')
    const clickDescriptor = Object.getOwnPropertyDescriptor(HTMLAnchorElement.prototype, 'click')
    const downloads: Blob[] = []
    const names: string[] = []
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: (blob: Blob) => {
        downloads.push(blob)
        return 'blob:pinta-pack-test'
      },
    })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: () => undefined })
    Object.defineProperty(HTMLAnchorElement.prototype, 'click', {
      configurable: true,
      value(this: HTMLAnchorElement) {
        names.push(this.download)
      },
    })

    try {
      await seedGallery()
      render(<PintaApp />)
      await openSelectionMode()

      // Marca SÓ o mapa; as peças entram sozinhas no pack.
      fireEvent.click(button(COPY.gallery.selectionMark('fase')))
      fireEvent.click(button(COPY.gallery.downloadSelection))
      await waitFor(() => expect(downloads).toHaveLength(1))
      expect(names[0]).toBe('pack-pinta.zip')
      await screen.findByText(
        `${COPY.toast.downloadReady} ${COPY.gallery.selectionTilesetIncluded}`,
      )

      // O pack restaura pelo fluxo existente: peças PRIMEIRO, mapa junto, e
      // NADA do desenho que ficou de fora.
      const file = new File([await (downloads[0] as Blob).arrayBuffer()], 'pack-pinta.zip', {
        type: 'application/zip',
      })
      const read = await readPintaBackupFile(file)
      if (!read.ok) throw new Error(`pack ilegível: ${read.reason}`)
      const result = importPintaJson(read.text)
      expect(result.warnings).toEqual([])
      expect(result.assets.map((asset) => [asset.kind, asset.name])).toEqual([
        ['tileset', 'pecas'],
        ['tilemap', 'fase'],
      ])

      // Pack baixado = tarefa concluída: o modo fecha sozinho.
      await screen.findByRole('button', { name: /Abrir fase/ })
      expect(screen.queryByRole('button', { name: COPY.gallery.downloadSelection })).toBeNull()
    } finally {
      if (createDescriptor) Object.defineProperty(URL, 'createObjectURL', createDescriptor)
      else Reflect.deleteProperty(URL, 'createObjectURL')
      if (revokeDescriptor) Object.defineProperty(URL, 'revokeObjectURL', revokeDescriptor)
      else Reflect.deleteProperty(URL, 'revokeObjectURL')
      if (clickDescriptor)
        Object.defineProperty(HTMLAnchorElement.prototype, 'click', clickDescriptor)
      else Reflect.deleteProperty(HTMLAnchorElement.prototype, 'click')
    }
  })
})
