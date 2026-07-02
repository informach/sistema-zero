import { beforeEach, describe, expect, it } from 'bun:test'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { COPY } from '../core/copy'
import { clearIdbMock } from '../testing/idbMock'

const { PintaApp } = await import('./PintaApp')
const { setPintaStorageNamespace } = await import('../state/persistence')
const { createGalleryStore } = await import('../state/galleryStore')

beforeEach(() => {
  clearIdbMock()
  setPintaStorageNamespace('')
})

describe('PintaApp — galeria', () => {
  it('aplica o tema no root (default light; host pode fixar dark)', async () => {
    const { container, unmount } = render(<PintaApp />)
    expect(container.querySelector('[data-pinta-theme="light"]')).toBeTruthy()
    await waitFor(() => {
      expect(screen.getByText(COPY.gallery.empty)).toBeTruthy()
    })
    unmount()

    const { container: dark } = render(<PintaApp adapter={{ theme: 'dark' }} />)
    expect(dark.querySelector('[data-pinta-theme="dark"]')).toBeTruthy()
    await waitFor(() => {
      expect(screen.getByText(COPY.gallery.empty)).toBeTruthy()
    })
  })

  it('cria um personagem em 3 passos e abre o editor; voltar mostra o card', async () => {
    render(<PintaApp />)
    await waitFor(() => {
      expect(screen.getByText(COPY.gallery.empty)).toBeTruthy()
    })

    // Passo 1: tipo.
    fireEvent.click(screen.getByRole('button', { name: new RegExp(COPY.gallery.create) }))
    expect(screen.getByText(COPY.newAsset.title)).toBeTruthy()
    fireEvent.click(
      screen.getByRole('button', { name: new RegExp(COPY.kinds['pixel-sprite'].title) }),
    )

    // Passo 2: tamanho (o primeiro já vem selecionado).
    expect(screen.getByText(COPY.newAsset.sizeTitle)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: COPY.newAsset.next }))

    // Passo 3: nome.
    const input = screen.getByPlaceholderText(COPY.newAsset.namePlaceholder)
    fireEvent.change(input, { target: { value: 'Meu Herói' } })
    fireEvent.click(screen.getByRole('button', { name: COPY.newAsset.createButton }))

    // Editor aberto com o nome normalizado + ferramentas.
    await waitFor(() => {
      expect(screen.getByText('meu-heroi')).toBeTruthy()
    })
    expect(screen.getByRole('toolbar', { name: 'Ferramentas' })).toBeTruthy()
    expect(screen.getByText(COPY.editor.saved)).toBeTruthy()

    // Voltar → galeria com o card.
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.back }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Abrir meu-heroi' })).toBeTruthy()
    })
  })

  it('mapa fica desabilitado sem peças do cenário', async () => {
    render(<PintaApp />)
    await waitFor(() => {
      expect(screen.getByText(COPY.gallery.empty)).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: new RegExp(COPY.gallery.create) }))
    const tilemapCard = screen.getByRole('button', {
      name: new RegExp(COPY.kinds.tilemap.title),
    }) as HTMLButtonElement
    expect(tilemapCard.disabled).toBe(true)
    expect(screen.getByText(COPY.newAsset.needTileset)).toBeTruthy()
  })

  it('apagar pede confirmação e remove o card', async () => {
    // Semeia um asset direto no "disco" antes de montar.
    const seed = createGalleryStore()
    await seed.getState().create({ kind: 'pixel-sprite', name: 'apagavel', frameSize: 8 })

    render(<PintaApp />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Abrir apagavel' })).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('button', { name: `${COPY.gallery.remove} apagavel` }))
    expect(screen.getByText(COPY.gallery.removeConfirmTitle)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: COPY.gallery.removeConfirm }))
    // O update vem de store zustand FORA de act — flush explícito (waitFor pena
    // com o scheduler do React no happy-dom nesse caminho).
    await act(async () => {
      await Bun.sleep(0)
    })
    expect(screen.queryByRole('button', { name: 'Abrir apagavel' })).toBeNull()
  })

  it('botão "Usar no Estúdio" só aparece com o callback do host', async () => {
    const seed = createGalleryStore()
    await seed.getState().create({ kind: 'pixel-background', name: 'ceu', width: 8, height: 8 })

    const { unmount } = render(<PintaApp />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Abrir ceu' })).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: 'Abrir ceu' }))
    await waitFor(() => {
      expect(screen.getByText('ceu')).toBeTruthy()
    })
    expect(screen.queryByText(new RegExp(COPY.editor.sendToStudio))).toBeNull()
    unmount()

    render(<PintaApp adapter={{ sendToStudio: async () => ({ ok: true }) }} />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Abrir ceu' })).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: 'Abrir ceu' }))
    await waitFor(() => {
      expect(screen.getByText(new RegExp(COPY.editor.sendToStudio))).toBeTruthy()
    })
  })
})
