/**
 * Modo de seleção do PACK na galeria: "Selecionar" liga o modo (miniatura vira
 * alternador, ações do card desabilitam), o contador acompanha, Esc/Cancelar
 * saem limpando, e "Baixar seleção" gera um `pack-pinta.zip` restaurável pelo
 * "Trazer de volta" — com o tileset de um mapa marcado incluído SOZINHO.
 */
import { beforeEach, describe, expect, it } from 'bun:test'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { COPY } from '../../core/copy'
import type { PintaAsset } from '../../core/project'
import {
  createPixelSpriteAsset,
  createTilemapAsset,
  createTilesetAsset,
} from '../../core/projectConfig'
import type { PintaPersistence, PintaPersistenceEvent } from '../../state/persistence'
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

/** Captura os downloads do `triggerDownload` (happy-dom não baixa nada de verdade). */
async function withDownloadCapture(
  run: (captured: { downloads: Blob[]; names: string[] }) => Promise<void>,
): Promise<void> {
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
    await run({ downloads, names })
  } finally {
    if (createDescriptor) Object.defineProperty(URL, 'createObjectURL', createDescriptor)
    else Reflect.deleteProperty(URL, 'createObjectURL')
    if (revokeDescriptor) Object.defineProperty(URL, 'revokeObjectURL', revokeDescriptor)
    else Reflect.deleteProperty(URL, 'revokeObjectURL')
    if (clickDescriptor)
      Object.defineProperty(HTMLAnchorElement.prototype, 'click', clickDescriptor)
    else Reflect.deleteProperty(HTMLAnchorElement.prototype, 'click')
  }
}

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
    // O espaçador que ASSENTA a barra no rodapé sem rolagem (happy-dom não faz
    // layout — a classe É o mecanismo, mesma régua do width/height do palco).
    expect(
      document.querySelector('[data-pin-scroll-root] > .mt-auto[aria-hidden="true"]'),
    ).toBeTruthy()

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
    // Fora do modo o espaçador desmonta junto (nada de mt-auto solto no fluxo).
    expect(document.querySelector('[data-pin-scroll-root] > .mt-auto')).toBeNull()
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

    // Busca VAZIA não tem o que limpar: o Esc no campo SAI do modo (antes a
    // tecla morria sem efeito nenhum — full review 25/08).
    fireEvent.keyDown(search, { key: 'Escape' })
    await screen.findByRole('button', { name: /Abrir heroi/ })
    expect(screen.queryByRole('button', { name: COPY.gallery.downloadSelection })).toBeNull()

    // E fora do campo o Esc segue saindo do modo.
    fireEvent.click(button(COPY.gallery.select))
    await screen.findByRole('button', { name: COPY.gallery.selectionMark('heroi') })
    fireEvent.keyDown(window, { key: 'Escape' })
    await screen.findByRole('button', { name: /Abrir heroi/ })
    expect(screen.queryByRole('button', { name: COPY.gallery.downloadSelection })).toBeNull()
  })

  it('"Baixar tudo" some no modo seleção e volta ao sair', async () => {
    // Ele deslizava para a posição do "Selecionar" recém-desmontado (mesmo
    // ícone, mesmo toast) e baixava a galeria INTEIRA ignorando a marcação —
    // era o "exportar selecionado não exporta os selecionados".
    await seedGallery()
    render(<PintaApp />)
    await screen.findByRole('button', { name: COPY.gallery.downloadAll })
    await openSelectionMode()
    expect(screen.queryByRole('button', { name: COPY.gallery.downloadAll })).toBeNull()
    fireEvent.click(button(COPY.gallery.cancel))
    await screen.findByRole('button', { name: COPY.gallery.downloadAll })
  })

  it('Limpar desmarca tudo e PERMANECE no modo', async () => {
    await seedGallery()
    render(<PintaApp />)
    await openSelectionMode()

    expect(button(COPY.gallery.selectionClear).disabled).toBe(true)
    fireEvent.click(button(COPY.gallery.selectionMark('heroi')))
    fireEvent.click(button(COPY.gallery.selectionMark('pecas')))
    await screen.findByText(COPY.gallery.selectionCount(2))
    expect(button(COPY.gallery.selectionClear).disabled).toBe(false)

    fireEvent.click(button(COPY.gallery.selectionClear))
    await screen.findByText(COPY.gallery.selectionCount(0))
    // Continua no modo: alternadores na tela, baixar desabilitado de novo.
    expect(screen.getByRole('button', { name: COPY.gallery.selectionMark('heroi') })).toBeTruthy()
    expect(button(COPY.gallery.downloadSelection).disabled).toBe(true)
    // O Limpar vira disabled com 0: o foco tem que ter ido ao Cancelar (senão
    // morre no body e a criança de teclado recomeça do topo).
    expect(document.activeElement).toBe(button(COPY.gallery.cancel))
  })

  it('"Trazer de volta" e "Trazer uma foto" saem do modo seleção', async () => {
    // Importar muda a galeria por baixo das marcas (mesma régua do "Criar
    // novo"). O .click() do input de arquivo é inerte em happy-dom.
    await seedGallery()
    render(<PintaApp />)

    await openSelectionMode()
    fireEvent.click(button(COPY.gallery.restore))
    await screen.findByRole('button', { name: /Abrir heroi/ })
    expect(screen.queryByRole('button', { name: COPY.gallery.downloadSelection })).toBeNull()

    fireEvent.click(button(COPY.gallery.select))
    await screen.findByRole('button', { name: COPY.gallery.selectionMark('heroi') })
    fireEvent.click(button(COPY.gallery.importImage))
    await screen.findByRole('button', { name: /Abrir heroi/ })
    expect(screen.queryByRole('button', { name: COPY.gallery.downloadSelection })).toBeNull()
  })

  it('desenho que saiu e voltou pela nuvem (mesmo id) NÃO volta marcado', async () => {
    // A descida da nuvem preserva o id ao regravar: sem a poda de selectedIds,
    // um desenho removido e re-baixado reaparecia JÁ marcado.
    const heroi = createPixelSpriteAsset({ name: 'heroi', frameSize: 8 })
    const outro = createPixelSpriteAsset({ name: 'outro', frameSize: 8 })
    const assets = new Map<string, PintaAsset>([
      [heroi.id, heroi],
      [outro.id, outro],
    ])
    const listeners = new Set<(event: PintaPersistenceEvent) => void>()
    const fake: PintaPersistence = {
      persistAsset: async (asset) => {
        assets.set(asset.id, asset)
      },
      persistAssets: async (list) => {
        for (const asset of list) assets.set(asset.id, asset)
      },
      deleteAsset: async (id) => {
        assets.delete(id)
      },
      loadAssetById: async (id) => assets.get(id) ?? null,
      listAllAssets: async () => [...assets.values()],
      subscribe: (listener) => {
        listeners.add(listener)
        return () => listeners.delete(listener)
      },
    }
    // O ciclo COMPLETO da nuvem (como o wrapper do host): o `sync-end` relê a
    // galeria na hora — o `changed` sozinho espera o coalesce de 250ms, que o
    // waitFor do happy-dom transforma em minutos.
    const emitSync = async () => {
      await act(async () => {
        for (const listener of listeners) listener({ type: 'sync-start' })
        for (const listener of listeners) listener({ type: 'changed' })
        for (const listener of listeners) listener({ type: 'sync-end' })
        await Bun.sleep(0)
      })
    }

    render(<PintaApp persistence={fake} />)
    await openSelectionMode()
    fireEvent.click(button(COPY.gallery.selectionMark('heroi')))
    await screen.findByText(COPY.gallery.selectionCount(1))

    // A nuvem remove o desenho marcado…
    assets.delete(heroi.id)
    await emitSync()
    await screen.findByText(COPY.gallery.selectionCount(0))
    expect(screen.queryByRole('button', { name: COPY.gallery.selectionUnmark('heroi') })).toBeNull()

    // …e o traz de volta com o MESMO id: tem que voltar DESMARCADO.
    assets.set(heroi.id, heroi)
    await emitSync()
    await screen.findByRole('button', { name: COPY.gallery.selectionMark('heroi') })
    expect(screen.getByText(COPY.gallery.selectionCount(0))).toBeTruthy()
  })

  it('marca DOIS desenhos e o pack sai com os dois, toast com a contagem', async () => {
    await withDownloadCapture(async ({ downloads, names }) => {
      await seedGallery()
      render(<PintaApp />)
      await openSelectionMode()

      fireEvent.click(button(COPY.gallery.selectionMark('heroi')))
      fireEvent.click(button(COPY.gallery.selectionMark('pecas')))
      fireEvent.click(button(COPY.gallery.downloadSelection))
      await waitFor(() => expect(downloads).toHaveLength(1))
      expect(names[0]).toBe('pack-pinta.zip')
      // SEM o sufixo do tileset: nenhum mapa marcado.
      await screen.findByText(COPY.gallery.downloadedSelection(2))

      const file = new File([await (downloads[0] as Blob).arrayBuffer()], 'pack-pinta.zip', {
        type: 'application/zip',
      })
      const read = await readPintaBackupFile(file)
      if (!read.ok) throw new Error(`pack ilegível: ${read.reason}`)
      const result = importPintaJson(read.text)
      expect(result.warnings).toEqual([])
      expect(result.assets.map((asset) => asset.name).sort()).toEqual(['heroi', 'pecas'])
    })
  })

  it('baixa pack-pinta.zip restaurável com o tileset do mapa incluído sozinho', async () => {
    await withDownloadCapture(async ({ downloads, names }) => {
      await seedGallery()
      render(<PintaApp />)
      await openSelectionMode()

      // Marca SÓ o mapa; as peças entram sozinhas no pack.
      fireEvent.click(button(COPY.gallery.selectionMark('fase')))
      fireEvent.click(button(COPY.gallery.downloadSelection))
      await waitFor(() => expect(downloads).toHaveLength(1))
      expect(names[0]).toBe('pack-pinta.zip')
      // A contagem é do que FOI para o zip (mapa + peças auto-incluídas).
      await screen.findByText(
        `${COPY.gallery.downloadedSelection(2)} ${COPY.gallery.selectionTilesetIncluded}`,
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
    })
  })
})
