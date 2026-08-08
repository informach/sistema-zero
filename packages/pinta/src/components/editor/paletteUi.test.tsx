/**
 * Painel de cores do editor de PIXEL (redesign 08/2026): header com o nome da
 * paleta (dropdown de troca), lixeira (só cores extras, com confirmação) e o
 * "+" (seletor livre). O remap do bitmap em si é coberto pelos testes puros
 * (removeColorIndex/removeExtraColor) — aqui é o comportamento da UI.
 */
import { beforeEach, describe, expect, it } from 'bun:test'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { COPY } from '../../core/copy'
import { clearIdbMock } from '../../testing/idbMock'

const { PintaApp } = await import('../PintaApp')
const { setPintaStorageNamespace } = await import('../../state/persistence')
const { createGalleryStore } = await import('../../state/galleryStore')
const { createPixelBackgroundAsset } = await import('../../core/project')

beforeEach(() => {
  clearIdbMock()
  setPintaStorageNamespace('')
})

async function openPixelEditor(extraColors?: readonly string[]): Promise<HTMLElement> {
  const seed = createGalleryStore()
  if (extraColors) {
    await seed
      .getState()
      .importAssets([
        { ...createPixelBackgroundAsset({ name: 'ceu', width: 16, height: 16 }), extraColors },
      ])
  } else {
    await seed.getState().create({ kind: 'pixel-background', name: 'ceu', width: 16, height: 16 })
  }
  render(<PintaApp />)
  await waitFor(() => {
    expect(screen.getByRole('button', { name: /Abrir ceu/ })).toBeTruthy()
  })
  fireEvent.click(screen.getByRole('button', { name: /Abrir ceu/ }))
  await waitFor(() => {
    expect(screen.getByRole('img', { name: COPY.a11y.drawArea })).toBeTruthy()
  })
  return screen.getByRole('img', { name: COPY.a11y.drawArea })
}

function menuTrigger(paletteName = 'Arcade'): HTMLButtonElement {
  return screen.getByRole('button', {
    name: `${COPY.palette.switchPalette}: ${paletteName}`,
  }) as HTMLButtonElement
}

function trashButton(): HTMLButtonElement {
  return screen.getByRole('button', { name: COPY.palette.deleteColor }) as HTMLButtonElement
}

function undoButton(): HTMLButtonElement {
  return screen.getByRole('button', { name: COPY.editor.undo }) as HTMLButtonElement
}

/** Abre o seletor pelo "+", digita o hex e confirma. */
async function addColor(hex: string): Promise<void> {
  fireEvent.click(screen.getByRole('button', { name: COPY.palette.addColor }))
  const input = await screen.findByLabelText(COPY.colorPicker.hex)
  fireEvent.change(input, { target: { value: hex } })
  fireEvent.click(screen.getByRole('button', { name: COPY.palette.add }))
}

describe('paleta: dropdown de troca', () => {
  it('header mostra a paleta ativa; escolher outra commita (desfazível) e fecha', async () => {
    await openPixelEditor()
    const trigger = menuTrigger()
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('menu')).toBeNull()

    fireEvent.click(trigger)
    await screen.findByRole('menu')
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    const items = screen.getAllByRole('menuitemradio')
    expect(items).toHaveLength(3)
    expect(screen.getByRole('menuitemradio', { name: /Arcade/ }).getAttribute('aria-checked')).toBe(
      'true',
    )

    fireEvent.click(screen.getByRole('menuitemradio', { name: /Doces/ }))
    await waitFor(() => {
      expect(screen.queryByRole('menu')).toBeNull()
    })
    expect(menuTrigger('Doces')).toBeTruthy()
    // Troca de paleta é um commit no asset → o Desfazer acende.
    expect(undoButton().disabled).toBe(false)
  })

  it('Esc fecha e devolve o foco ao acionador; clique-fora fecha', async () => {
    await openPixelEditor()
    fireEvent.click(menuTrigger())
    await screen.findByRole('menu')

    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => {
      expect(screen.queryByRole('menu')).toBeNull()
    })
    expect(document.activeElement).toBe(menuTrigger())

    fireEvent.click(menuTrigger())
    await screen.findByRole('menu')
    fireEvent.pointerDown(document.body)
    await waitFor(() => {
      expect(screen.queryByRole('menu')).toBeNull()
    })
  })
})

describe('paleta: adicionar cor pelo +', () => {
  it('a cor escolhida vira swatch novo e já sai selecionada', async () => {
    await openPixelEditor()
    await addColor('#123456')
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: COPY.a11y.colorLabel(16) }).getAttribute('aria-pressed'),
      ).toBe('true')
    })
  })

  it('abre JÁ na cor selecionada, para criar uma variação a partir dela', async () => {
    // ⚠️ Este caso não existia e o defeito passou: o helper `addColor` SEMPRE
    // digita o hex, então passava igual com o rascunho nascendo num laranja fixo.
    // O que importa aqui é o VALOR INICIAL do campo, antes de digitar nada.
    await openPixelEditor()
    const escolhida = screen.getByRole('button', { name: COPY.a11y.colorLabel(3) })
    fireEvent.click(escolhida)
    // O swatch é pintado por `style.backgroundColor` com o hex da paleta.
    const hexEsperado = escolhida.style.backgroundColor
    expect(hexEsperado).toMatch(/^#[0-9a-f]{6}$/i)

    fireEvent.click(screen.getByRole('button', { name: COPY.palette.addColor }))
    const campo = (await screen.findByLabelText(COPY.colorPicker.hex)) as HTMLInputElement
    expect(campo.value.toLowerCase()).toBe(hexEsperado.toLowerCase())
  })

  it('com a borracha ativa o + não quebra (não há cor de origem)', async () => {
    await openPixelEditor()
    fireEvent.click(screen.getByRole('button', { name: COPY.tools.eraser }))
    fireEvent.click(screen.getByRole('button', { name: COPY.palette.addColor }))
    // Abre normalmente, com um rascunho válido — só não semeia de lugar nenhum.
    const campo = (await screen.findByLabelText(COPY.colorPicker.hex)) as HTMLInputElement
    expect(campo.value).toMatch(/^#[0-9a-f]{6}$/i)
  })

  it('no teto de 48 extras o + avisa e não adiciona', async () => {
    const extras = Array.from(
      { length: 48 },
      (_, i) => `#${(100 + i).toString(16).padStart(2, '0')}33aa`,
    )
    await openPixelEditor(extras)
    await addColor('#010203')
    await screen.findByText(COPY.palette.colorLimit)
    expect(screen.queryByRole('button', { name: COPY.a11y.colorLabel(64) })).toBeNull()
  })
})

describe('paleta: lixeira', () => {
  it('cor BASE selecionada: aviso gentil, sem confirmação', async () => {
    await openPixelEditor()
    fireEvent.click(screen.getByRole('button', { name: COPY.a11y.colorLabel(3) }))
    expect(trashButton().getAttribute('aria-disabled')).toBe('true')

    fireEvent.click(trashButton())
    await screen.findByText(COPY.palette.baseColorLocked)
    expect(screen.queryByText(COPY.palette.deleteColorTitle)).toBeNull()
  })

  it('borracha ativa: "escolha uma cor primeiro"', async () => {
    await openPixelEditor()
    fireEvent.click(screen.getByRole('button', { name: COPY.palette.transparent }))
    fireEvent.click(trashButton())
    await screen.findByText(COPY.palette.pickColorFirst)
  })

  it('excluir a extra: confirmação, swatch some, seleção clampa e o undo desfaz', async () => {
    const canvas = await openPixelEditor()
    await addColor('#123456')
    await waitFor(() => {
      expect(screen.getByRole('button', { name: COPY.a11y.colorLabel(16) })).toBeTruthy()
    })
    // Pinta um ponto com a cor nova (o remap dos pixels é dos testes puros).
    fireEvent.pointerDown(canvas, { isPrimary: true, pointerId: 1, clientX: 8, clientY: 8 })
    fireEvent.pointerUp(canvas, { pointerId: 1, clientX: 8, clientY: 8 })

    expect(trashButton().getAttribute('aria-disabled')).toBe('false')
    fireEvent.click(trashButton())
    await screen.findByText(COPY.palette.deleteColorBody)
    fireEvent.click(screen.getByRole('button', { name: COPY.palette.deleteColorConfirm }))

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: COPY.a11y.colorLabel(16) })).toBeNull()
    })
    // Clamp: a seleção cai na última cor válida (15), nunca na transparente.
    expect(
      screen.getByRole('button', { name: COPY.a11y.colorLabel(15) }).getAttribute('aria-pressed'),
    ).toBe('true')

    fireEvent.click(undoButton())
    await waitFor(() => {
      expect(screen.getByRole('button', { name: COPY.a11y.colorLabel(16) })).toBeTruthy()
    })
  })

  it('cancelar a confirmação não muda nada', async () => {
    await openPixelEditor()
    await addColor('#123456')
    await waitFor(() => {
      expect(screen.getByRole('button', { name: COPY.a11y.colorLabel(16) })).toBeTruthy()
    })

    fireEvent.click(trashButton())
    await screen.findByText(COPY.palette.deleteColorBody)
    fireEvent.click(screen.getByRole('button', { name: COPY.gallery.cancel }))

    await waitFor(() => {
      expect(screen.queryByText(COPY.palette.deleteColorBody)).toBeNull()
    })
    expect(screen.getByRole('button', { name: COPY.a11y.colorLabel(16) })).toBeTruthy()
  })
})
