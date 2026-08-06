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

  it('cria um personagem (estilo → tipo → tamanho → nome) e abre o editor; voltar mostra o card', async () => {
    render(<PintaApp />)
    await waitFor(() => {
      expect(screen.getByText(COPY.gallery.empty)).toBeTruthy()
    })

    // Passo 1: ESTILO (pixel art | vetor).
    fireEvent.click(screen.getByRole('button', { name: new RegExp(COPY.gallery.create) }))
    expect(screen.getByText(COPY.newAsset.styleTitle)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: new RegExp(COPY.styles.pixel.title) }))

    // Passo 2: tipo.
    expect(screen.getByText(COPY.newAsset.title)).toBeTruthy()
    fireEvent.click(
      screen.getByRole('button', { name: new RegExp(COPY.kinds['pixel-sprite'].title) }),
    )

    // Passo 3: tamanho (o primeiro já vem selecionado).
    expect(screen.getByText(COPY.newAsset.sizeTitle)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: COPY.newAsset.next }))

    // Passo 4: nome.
    const input = screen.getByPlaceholderText(COPY.newAsset.namePlaceholder)
    fireEvent.change(input, { target: { value: 'Meu Herói' } })
    fireEvent.click(screen.getByRole('button', { name: COPY.newAsset.createButton }))

    // Editor aberto com o nome normalizado + ferramentas.
    await waitFor(() => {
      expect(screen.getByText('meu-heroi')).toBeTruthy()
    })
    expect(screen.getByRole('toolbar', { name: 'Ferramentas' })).toBeTruthy()
    expect(screen.getByText(COPY.editor.saved).getAttribute('role')).toBe('status')

    // Voltar → galeria com o card.
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.back }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Abrir meu-heroi/ })).toBeTruthy()
    })
  })

  it('cria a partir de um MODELO PRONTO (estilo → modelos → escolher → nome) e abre o editor', async () => {
    render(<PintaApp />)
    await waitFor(() => {
      expect(screen.getByText(COPY.gallery.empty)).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('button', { name: new RegExp(COPY.gallery.create) }))
    // 3º cartão do passo de estilo: Modelos prontos.
    fireEvent.click(
      screen.getByRole('button', { name: new RegExp(COPY.templates.styleCard.title) }),
    )
    // Passo de modelos: os títulos aparecem.
    expect(screen.getByText(COPY.templates.stepTitle)).toBeTruthy()
    expect(screen.getByText(COPY.templates.items.heroi.title)).toBeTruthy()
    fireEvent.click(
      screen.getByRole('button', { name: new RegExp(COPY.templates.items.heroi.title) }),
    )

    // Nome já pré-preenchido; criar.
    fireEvent.click(screen.getByRole('button', { name: COPY.newAsset.createButton }))
    await waitFor(() => {
      expect(screen.getByText('heroi')).toBeTruthy()
    })
    expect(screen.getByRole('toolbar', { name: 'Ferramentas' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: COPY.editor.back }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Abrir heroi/ })).toBeTruthy()
    })
  })

  it('mapa fica desabilitado sem peças do cenário (nos dois estilos)', async () => {
    render(<PintaApp />)
    await waitFor(() => {
      expect(screen.getByText(COPY.gallery.empty)).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: new RegExp(COPY.gallery.create) }))
    fireEvent.click(screen.getByRole('button', { name: new RegExp(COPY.styles.vector.title) }))
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
      expect(screen.getByRole('button', { name: /Abrir apagavel/ })).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('button', { name: `${COPY.gallery.remove} apagavel` }))
    expect(screen.getByText(COPY.gallery.removeConfirmTitle)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: COPY.gallery.removeConfirm }))
    // O update vem de store zustand FORA de act — flush explícito (waitFor pena
    // com o scheduler do React no happy-dom nesse caminho).
    await act(async () => {
      await Bun.sleep(0)
    })
    expect(screen.queryByRole('button', { name: /Abrir apagavel/ })).toBeNull()
  })

  it('botão "Usar no Estúdio" exige o callback do host E desenho de um jogo do Pensa', async () => {
    // Desenho AVULSO e desenho vinculado a um jogo do Pensa (projectRef): o
    // foguete só existe no segundo — avulso chega ao Estúdio pelo "Trazer do
    // Pinta" de lá (decisão da dona, 08/2026).
    const seed = createGalleryStore()
    await seed.getState().create({ kind: 'pixel-background', name: 'ceu', width: 8, height: 8 })
    await seed.getState().create({
      kind: 'pixel-background',
      name: 'ceu-do-jogo',
      width: 8,
      height: 8,
      projectRef: { id: 'jogo-1', name: 'meu-jogo' },
    })

    // Sem callback: nada, nem no desenho do jogo.
    const { unmount } = render(<PintaApp />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Abrir ceu-do-jogo/ })).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: /Abrir ceu-do-jogo/ }))
    await waitFor(() => {
      expect(screen.getByText('ceu-do-jogo')).toBeTruthy()
    })
    expect(screen.queryByText(new RegExp(COPY.editor.sendToStudio))).toBeNull()
    unmount()

    // Com callback, desenho AVULSO: o foguete continua fora. (O "(" do nome
    // acessível separa "ceu (" de "ceu-do-jogo (".)
    const { unmount: unmountAvulso } = render(
      <PintaApp adapter={{ sendToStudio: async () => ({ ok: true }) }} />,
    )
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Abrir ceu \(/ })).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: /Abrir ceu \(/ }))
    await waitFor(() => {
      expect(screen.getByText('ceu')).toBeTruthy()
    })
    expect(screen.queryByText(new RegExp(COPY.editor.sendToStudio))).toBeNull()
    unmountAvulso()

    // Com callback, desenho DE JOGO: aparece.
    render(<PintaApp adapter={{ sendToStudio: async () => ({ ok: true }) }} />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Abrir ceu-do-jogo/ })).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: /Abrir ceu-do-jogo/ }))
    await waitFor(() => {
      expect(screen.getByText(new RegExp(COPY.editor.sendToStudio))).toBeTruthy()
    })
  })
})
