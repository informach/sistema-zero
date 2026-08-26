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
const { createPintaPersistence, setPintaStorageNamespace } = await import('../../state/persistence')
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

describe('paleta personalizada: criar, escolher da biblioteca e clamp', () => {
  it('"Criar paleta" pelo menu: aplica no desenho, guarda na biblioteca e é desfazível', async () => {
    await openPixelEditor()
    fireEvent.click(menuTrigger())
    await screen.findByRole('menu')
    fireEvent.click(screen.getByRole('menuitem', { name: COPY.palette.createPalette }))

    // O diálogo nasce SEMEADO da paleta ativa (15 slots já pintados).
    const nameInput = await screen.findByLabelText(COPY.palette.paletteNameLabel)
    fireEvent.change(nameInput, { target: { value: 'Lava quente' } })
    fireEvent.click(screen.getByRole('button', { name: COPY.palette.createConfirm }))

    // O título do painel vira o NOME da paleta nova (o asset está em custom).
    await waitFor(() => {
      expect(menuTrigger('Lava quente')).toBeTruthy()
    })
    await screen.findByText(COPY.palette.paletteCreated)

    // Guardou na biblioteca: o menu reaberto lista em "Minhas paletas".
    fireEvent.click(menuTrigger('Lava quente'))
    await screen.findByRole('menu')
    expect(screen.getByRole('menuitemradio', { name: /Lava quente/ })).toBeTruthy()
    fireEvent.keyDown(document, { key: 'Escape' })

    // Um desfazer devolve a paleta de antes (a troca é UM commit).
    fireEvent.click(undoButton())
    await waitFor(() => {
      expect(menuTrigger('Arcade')).toBeTruthy()
    })
  })

  it('o menu MARCA a paleta salva ativa e o foco cai nela (Enter não descarta a custom)', async () => {
    await createPintaPersistence().savePaletteLibrary?.({
      version: 1,
      updatedAt: 1,
      palettes: [
        {
          id: 'p1',
          updatedAt: 1,
          name: 'Festa',
          colors: ['', '#ff8800', ...Array.from({ length: 14 }, () => '')],
        },
      ],
      removed: [],
    })
    await openPixelEditor()
    fireEvent.click(menuTrigger())
    await screen.findByRole('menu')
    fireEvent.click(screen.getByRole('menuitemradio', { name: /Festa/ }))
    await waitFor(() => {
      expect(menuTrigger('Festa')).toBeTruthy()
    })

    // Reabrir: a salva ativa está aria-checked e é quem recebe o FOCO de
    // abertura. Antes NADA ficava marcado com custom ativa: o foco caía no
    // PRIMEIRO item (Arcade) e um Enter descartava a customPalette.
    fireEvent.click(menuTrigger('Festa'))
    await screen.findByRole('menu')
    const saved = screen.getByRole('menuitemradio', { name: /Festa/ })
    expect(saved.getAttribute('aria-checked')).toBe('true')
    expect(screen.getByRole('menuitemradio', { name: /Arcade/ }).getAttribute('aria-checked')).toBe(
      'false',
    )
    await waitFor(() => {
      expect(document.activeElement).toBe(saved)
    })

    // Ativar o item focado (o Enter do teclado) MANTÉM a paleta: no-op + fecha.
    fireEvent.click(saved)
    await waitFor(() => {
      expect(screen.queryByRole('menu')).toBeNull()
    })
    expect(menuTrigger('Festa')).toBeTruthy()
  })

  it('gerenciar: renomeia e exclui da biblioteca (excluir NÃO toca o desenho)', async () => {
    await createPintaPersistence().savePaletteLibrary?.({
      version: 1,
      updatedAt: 1,
      palettes: [
        {
          id: 'p1',
          updatedAt: 1,
          name: 'Céu',
          colors: ['', '#87f2ff', ...Array.from({ length: 14 }, () => '')],
        },
      ],
      removed: [],
    })
    await openPixelEditor()
    // Aplica a paleta salva (o desenho passa a EMBUTI-la).
    fireEvent.click(menuTrigger())
    await screen.findByRole('menu')
    fireEvent.click(screen.getByRole('menuitemradio', { name: /Céu/ }))
    await waitFor(() => {
      expect(menuTrigger('Céu')).toBeTruthy()
    })

    fireEvent.click(menuTrigger('Céu'))
    await screen.findByRole('menu')
    fireEvent.click(screen.getByRole('menuitem', { name: COPY.palette.managePalettes }))
    await screen.findByText(COPY.palette.manageDeleteNote)

    // Renomear.
    fireEvent.click(screen.getByRole('button', { name: COPY.palette.manageRename('Céu') }))
    const input = await screen.findByLabelText(COPY.palette.paletteNameLabel)
    fireEvent.change(input, { target: { value: 'Céu de verão' } })
    fireEvent.click(screen.getByRole('button', { name: COPY.gallery.rename }))
    await screen.findByRole('button', { name: COPY.palette.manageRename('Céu de verão') })

    // Excluir em DOIS toques (1º arma no próprio botão).
    fireEvent.click(screen.getByRole('button', { name: COPY.palette.manageDelete('Céu de verão') }))
    fireEvent.click(
      await screen.findByRole('button', { name: COPY.palette.manageDeleteArm('Céu de verão') }),
    )
    await screen.findByText(COPY.palette.manageEmpty)

    // O desenho segue com a paleta EMBUTIDA (excluir da biblioteca não o toca).
    fireEvent.click(screen.getByRole('button', { name: COPY.a11y.close }))
    await waitFor(() => {
      expect(menuTrigger('Céu')).toBeTruthy()
    })
  })

  it('reabrir o Gerenciar DESARMA a exclusão (a proteção de 2 toques não fura)', async () => {
    await createPintaPersistence().savePaletteLibrary?.({
      version: 1,
      updatedAt: 1,
      palettes: [
        {
          id: 'p1',
          updatedAt: 1,
          name: 'Céu',
          colors: ['', '#87f2ff', ...Array.from({ length: 14 }, () => '')],
        },
      ],
      removed: [],
    })
    await openPixelEditor()
    fireEvent.click(menuTrigger())
    await screen.findByRole('menu')
    fireEvent.click(screen.getByRole('menuitem', { name: COPY.palette.managePalettes }))
    await screen.findByText(COPY.palette.manageDeleteNote)

    // 1º toque ARMA…
    fireEvent.click(screen.getByRole('button', { name: COPY.palette.manageDelete('Céu') }))
    await screen.findByRole('button', { name: COPY.palette.manageDeleteArm('Céu') })
    // …fechar e reabrir NÃO pode manter armado (senão 1 toque apagaria direto).
    fireEvent.click(screen.getByRole('button', { name: COPY.a11y.close }))
    await waitFor(() => {
      expect(screen.queryByText(COPY.palette.manageDeleteNote)).toBeNull()
    })
    fireEvent.click(menuTrigger())
    await screen.findByRole('menu')
    fireEvent.click(screen.getByRole('menuitem', { name: COPY.palette.managePalettes }))
    await screen.findByText(COPY.palette.manageDeleteNote)
    expect(screen.queryByRole('button', { name: COPY.palette.manageDeleteArm('Céu') })).toBeNull()
    expect(screen.getByRole('button', { name: COPY.palette.manageDelete('Céu') })).toBeTruthy()
  })

  it('desfazer/refazer uma troca de paleta RE-CLAMPA a cor da sessão (efeito, não handler)', async () => {
    await createPintaPersistence().savePaletteLibrary?.({
      version: 1,
      updatedAt: 1,
      palettes: [
        {
          id: 'p1',
          updatedAt: 1,
          name: 'Duas cores',
          colors: ['', '#111111', '#222222', ...Array.from({ length: 13 }, () => '')],
        },
      ],
      removed: [],
    })
    await openPixelEditor()
    // Aplica a paleta furada (clamp do handler leva a cor para 1)…
    fireEvent.click(menuTrigger())
    await screen.findByRole('menu')
    fireEvent.click(screen.getByRole('menuitemradio', { name: /Duas cores/ }))
    await waitFor(() => {
      expect(menuTrigger('Duas cores')).toBeTruthy()
    })
    // …desfaz (volta à arcade), escolhe a cor 9…
    fireEvent.click(undoButton())
    await waitFor(() => {
      expect(menuTrigger('Arcade')).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: COPY.a11y.colorLabel(9) }))
    // …e REFAZ a troca: a cor 9 é slot VAZIO na paleta furada — sem o efeito de
    // re-clamp o lápis ficava "não pintando".
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.redo }))
    await waitFor(() => {
      expect(menuTrigger('Duas cores')).toBeTruthy()
    })
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: COPY.a11y.colorLabel(1) }).getAttribute('aria-pressed'),
      ).toBe('true')
    })
  })

  it('reaplicar a paleta custom JÁ ativa é no-op (não grava um desfazer vazio)', async () => {
    await createPintaPersistence().savePaletteLibrary?.({
      version: 1,
      updatedAt: 1,
      palettes: [
        {
          id: 'p1',
          updatedAt: 1,
          name: 'Céu',
          colors: ['', '#87f2ff', ...Array.from({ length: 14 }, () => '')],
        },
      ],
      removed: [],
    })
    await openPixelEditor()
    fireEvent.click(menuTrigger())
    await screen.findByRole('menu')
    fireEvent.click(screen.getByRole('menuitemradio', { name: /Céu/ }))
    await waitFor(() => {
      expect(menuTrigger('Céu')).toBeTruthy()
    })
    // Um desfazer disponível (a aplicação). Reaplicar a MESMA paleta…
    expect(undoButton().disabled).toBe(false)
    fireEvent.click(menuTrigger('Céu'))
    await screen.findByRole('menu')
    fireEvent.click(screen.getByRole('menuitemradio', { name: /Céu/ }))
    await waitFor(() => {
      expect(screen.queryByRole('menu')).toBeNull()
    })
    // …não cria commit novo: UM desfazer volta direto à arcade.
    fireEvent.click(undoButton())
    await waitFor(() => {
      expect(menuTrigger('Arcade')).toBeTruthy()
    })
    expect(undoButton().disabled).toBe(true)
  })

  it('escolher uma paleta SALVA aplica e CLAMPA a cor da sessão para um slot pintável', async () => {
    // Biblioteca pré-semeada com uma paleta de DUAS cores (slots 1 e 2).
    await createPintaPersistence().savePaletteLibrary?.({
      version: 1,
      updatedAt: 1,
      palettes: [
        {
          id: 'p1',
          updatedAt: 1,
          name: 'Céu de verão',
          colors: ['', '#87f2ff', '#003fad', ...Array.from({ length: 13 }, () => '')],
        },
      ],
      removed: [],
    })
    await openPixelEditor()
    // Seleciona a cor 5 da arcade — na paleta nova esse slot é VAZIO.
    fireEvent.click(screen.getByRole('button', { name: COPY.a11y.colorLabel(5) }))

    fireEvent.click(menuTrigger())
    await screen.findByRole('menu')
    fireEvent.click(screen.getByRole('menuitemradio', { name: /Céu de verão/ }))

    await waitFor(() => {
      expect(menuTrigger('Céu de verão')).toBeTruthy()
    })
    // Slots vazios não viram swatch, e a seleção clampou para o 1º pintável.
    expect(screen.queryByRole('button', { name: COPY.a11y.colorLabel(5) })).toBeNull()
    expect(
      screen.getByRole('button', { name: COPY.a11y.colorLabel(1) }).getAttribute('aria-pressed'),
    ).toBe('true')
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
