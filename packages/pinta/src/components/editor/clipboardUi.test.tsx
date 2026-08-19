/**
 * Copiar num desenho e colar em OUTRO (área de transferência do aplicativo):
 * pixel → pixel com remapeamento de cores entre paletas, Ctrl+A do pixel,
 * vetor → vetor entre documentos de tamanhos diferentes, e as recusas gentis
 * (vetor dentro do pixel; pixel como figura sem canvas).
 *
 * happy-dom não faz layout: `getBoundingClientRect` devolve zeros, então
 * clientX/clientY caem direto em pixel do desenho (÷ zoom).
 */
import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { COPY } from '../../core/copy'
import { createPixelBackgroundAsset, createVectorBackgroundAsset } from '../../core/project'
import { clearIdbMock } from '../../testing/idbMock'
import type { VectorShape } from '../../vector/model'

const { PintaApp } = await import('../PintaApp')
const { setPintaStorageNamespace } = await import('../../state/persistence')
const { createGalleryStore } = await import('../../state/galleryStore')
const { createClipboardStore } = await import('../../state/clipboardStore')

beforeEach(() => {
  clearIdbMock()
  setPintaStorageNamespace('')
  // O espelho da área de transferência é o localStorage da página: cada teste começa limpo.
  localStorage.clear()
})

// Desmonta e deixa o autosave pendente do editor assentar ANTES do próximo arquivo: um
// autosave atrasado caía no IndexedDB do perfil depois do `clearIdbMock()` do arquivo seguinte
// (`injectedPersistenceUi`) e sujava a conferência "o disco do perfil não foi tocado".
afterEach(async () => {
  cleanup()
  await new Promise((resolve) => setTimeout(resolve, 30))
})

async function openAsset(name: string): Promise<void> {
  await waitFor(() => {
    expect(screen.getByRole('button', { name: new RegExp(`Abrir ${name}`) })).toBeTruthy()
  })
  fireEvent.click(screen.getByRole('button', { name: new RegExp(`Abrir ${name}`) }))
  await waitFor(() => {
    expect(screen.getByRole('img', { name: COPY.a11y.drawArea })).toBeTruthy()
  })
}

/**
 * Volta à galeria e espera o card do desenho seguinte APARECER. ⚠️ Esperar o botão
 * "Voltar" SUMIR custa ~8 s neste ambiente (waitFor + happy-dom); esperar algo
 * aparecer resolve em milissegundos. Mesma lição do `PintaApp.test.tsx`.
 */
async function backToGallery(nextName: string): Promise<void> {
  fireEvent.click(screen.getByRole('button', { name: COPY.editor.back }))
  await waitFor(() => {
    expect(screen.getByRole('button', { name: new RegExp(`Abrir ${nextName}`) })).toBeTruthy()
  })
}

function drawArea(): HTMLElement {
  return screen.getByRole('img', { name: COPY.a11y.drawArea })
}

/** Rabisca com o lápis (zoom 8 → 1 pixel do desenho = 8px de tela). */
function paint(canvas: HTMLElement): void {
  fireEvent.click(screen.getByRole('button', { name: COPY.tools.pencil }))
  fireEvent.pointerDown(canvas, { isPrimary: true, pointerId: 1, clientX: 8, clientY: 8 })
  fireEvent.pointerMove(canvas, { pointerId: 1, clientX: 24, clientY: 24 })
  fireEvent.pointerUp(canvas, { pointerId: 1, clientX: 24, clientY: 24 })
}

function selectionBar(): HTMLElement | null {
  return screen.queryByRole('toolbar', { name: COPY.selection.bar })
}

async function readAssets() {
  const store = createGalleryStore()
  await store.getState().load()
  return store.getState().assets
}

describe('copiar num desenho e colar em outro (pixel)', () => {
  it('Ctrl+A + Ctrl+C no desenho A; Ctrl+V no desenho B de OUTRA paleta remapeia as cores', async () => {
    const seed = createGalleryStore()
    await seed.getState().create({ kind: 'pixel-background', name: 'ceu', width: 16, height: 16 })
    // O destino usa a paleta Doces: o branco arcade (#ffffff) não existe nela.
    await seed
      .getState()
      .importAssets([
        createPixelBackgroundAsset({ name: 'doce', width: 16, height: 16, paletteId: 'pastel' }),
      ])
    render(<PintaApp />)

    await openAsset('ceu')
    paint(drawArea())
    // Ctrl+A seleciona o desenho pintado (a barra do pedaço aparece).
    fireEvent.keyDown(document.body, { key: 'a', ctrlKey: true })
    await waitFor(() => {
      expect(selectionBar()).toBeTruthy()
    })
    fireEvent.keyDown(document.body, { key: 'c', ctrlKey: true })
    // Soltar a seleção (Ctrl+Shift+A) e voltar à galeria NÃO esvazia a área de transferência.
    fireEvent.keyDown(document.body, { key: 'a', ctrlKey: true, shiftKey: true })
    await waitFor(() => {
      expect(selectionBar()).toBeNull()
    })
    await backToGallery('doce')

    await openAsset('doce')
    fireEvent.keyDown(document.body, { key: 'v', ctrlKey: true })
    await waitFor(() => {
      expect(selectionBar()).toBeTruthy()
    })
    // Carimba (desseleciona) para o colado virar desenho salvo.
    fireEvent.keyDown(document.body, { key: 'a', ctrlKey: true, shiftKey: true })
    await waitFor(() => {
      expect(selectionBar()).toBeNull()
    })

    // Quem diz a verdade é o disco (autosave debounced): o branco arcade entrou como cor
    // EXTRA (índice 16) do desenho de destino, e os pixels colados apontam para ela.
    await waitFor(
      async () => {
        const doce = (await readAssets()).find((a) => a.name === 'doce')
        expect(doce?.kind).toBe('pixel-background')
        if (doce?.kind !== 'pixel-background') return
        expect(doce.extraColors).toEqual(['#ffffff'])
        expect(Array.from(doce.cels[0]?.data ?? []).some((index) => index === 16)).toBe(true)
      },
      { timeout: 4000 },
    )
  })

  it('as cores extras do pedaço colado só entram no desenho JUNTO do carimbo: Ctrl+Z antes de carimbar não deixa nada; depois, UM Ctrl+Z desfaz pedaço e cores', async () => {
    const seed = createGalleryStore()
    await seed.getState().create({ kind: 'pixel-background', name: 'ceu', width: 16, height: 16 })
    await seed
      .getState()
      .importAssets([
        createPixelBackgroundAsset({ name: 'doce', width: 16, height: 16, paletteId: 'pastel' }),
      ])
    render(<PintaApp />)
    await openAsset('ceu')
    paint(drawArea())
    fireEvent.keyDown(document.body, { key: 'a', ctrlKey: true })
    await waitFor(() => {
      expect(selectionBar()).toBeTruthy()
    })
    fireEvent.keyDown(document.body, { key: 'c', ctrlKey: true })
    fireEvent.keyDown(document.body, { key: 'a', ctrlKey: true, shiftKey: true })
    await backToGallery('doce')
    await openAsset('doce')
    fireEvent.keyDown(document.body, { key: 'v', ctrlKey: true })
    await waitFor(() => {
      expect(selectionBar()).toBeTruthy()
    })
    // Enquanto flutua, NADA foi commitado: nem cores extras, nem pixels.
    // (O desfazer segue desabilitado — não há entrada para desfazer.)
    expect(
      (screen.getByRole('button', { name: COPY.editor.undo }) as HTMLButtonElement).disabled,
    ).toBe(true)
    // Carimba: pedaço + cores num commit só.
    fireEvent.keyDown(document.body, { key: 'a', ctrlKey: true, shiftKey: true })
    await waitFor(() => {
      expect(selectionBar()).toBeNull()
    })
    await waitFor(() => {
      expect(
        (screen.getByRole('button', { name: COPY.editor.undo }) as HTMLButtonElement).disabled,
      ).toBe(false)
    })
    // UM desfazer devolve o desenho ao estado anterior (sem extras, sem pixels colados).
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
    await waitFor(
      async () => {
        const doce = (await readAssets()).find((a) => a.name === 'doce')
        expect(doce?.kind).toBe('pixel-background')
        if (doce?.kind !== 'pixel-background') return
        expect(doce.extraColors ?? []).toEqual([])
        expect(Array.from(doce.cels[0]?.data ?? []).every((index) => index === 0)).toBe(true)
      },
      { timeout: 4000 },
    )
  })

  it('colar DUAS vezes sem carimbar (e duplicar o pedaço colado) não duplica as cores extras: o remapeamento é no carimbo', async () => {
    const seed = createGalleryStore()
    await seed.getState().create({ kind: 'pixel-background', name: 'ceu', width: 16, height: 16 })
    await seed
      .getState()
      .importAssets([
        createPixelBackgroundAsset({ name: 'doce', width: 16, height: 16, paletteId: 'pastel' }),
      ])
    render(<PintaApp />)
    await openAsset('ceu')
    paint(drawArea())
    fireEvent.keyDown(document.body, { key: 'a', ctrlKey: true })
    await waitFor(() => {
      expect(selectionBar()).toBeTruthy()
    })
    fireEvent.keyDown(document.body, { key: 'c', ctrlKey: true })
    fireEvent.keyDown(document.body, { key: 'a', ctrlKey: true, shiftKey: true })
    await backToGallery('doce')
    await openAsset('doce')
    // Cola, cola de novo (o 1º carimba com o branco novo), duplica o 2º (carimba o 2º) e
    // carimba a cópia: três carimbos do mesmo branco.
    fireEvent.keyDown(document.body, { key: 'v', ctrlKey: true })
    fireEvent.keyDown(document.body, { key: 'v', ctrlKey: true })
    fireEvent.keyDown(document.body, { key: 'd', ctrlKey: true })
    fireEvent.keyDown(document.body, { key: 'a', ctrlKey: true, shiftKey: true })
    await waitFor(() => {
      expect(selectionBar()).toBeNull()
    })
    await waitFor(
      async () => {
        const doce = (await readAssets()).find((a) => a.name === 'doce')
        expect(doce?.kind).toBe('pixel-background')
        if (doce?.kind !== 'pixel-background') return
        // UMA cor extra (não três) e os pixels colados apontam para ela.
        expect(doce.extraColors).toEqual(['#ffffff'])
        expect(Array.from(doce.cels[0]?.data ?? []).some((index) => index === 16)).toBe(true)
        expect(Array.from(doce.cels[0]?.data ?? []).every((index) => index <= 16)).toBe(true)
      },
      { timeout: 4000 },
    )
  })

  it('Ctrl+C de um pedaço colado de OUTRO desenho (ainda flutuando) guarda as cores de ORIGEM dele', async () => {
    const seed = createGalleryStore()
    await seed.getState().create({ kind: 'pixel-background', name: 'ceu', width: 16, height: 16 })
    await seed
      .getState()
      .importAssets([
        createPixelBackgroundAsset({ name: 'doce', width: 16, height: 16, paletteId: 'pastel' }),
      ])
    render(<PintaApp />)
    await openAsset('ceu')
    paint(drawArea())
    fireEvent.keyDown(document.body, { key: 'a', ctrlKey: true })
    await waitFor(() => {
      expect(selectionBar()).toBeTruthy()
    })
    fireEvent.keyDown(document.body, { key: 'c', ctrlKey: true })
    const fromCeu = localStorage.getItem('pinta:clipboard')
    fireEvent.keyDown(document.body, { key: 'a', ctrlKey: true, shiftKey: true })
    await backToGallery('doce')
    await openAsset('doce')
    fireEvent.keyDown(document.body, { key: 'v', ctrlKey: true })
    await waitFor(() => {
      expect(selectionBar()).toBeTruthy()
    })
    // Copiar o pedaço flutuante: as cores gravadas são as do céu (o branco arcade existe
    // nelas), não a paleta Doces — senão o branco viraria transparente ao colar de novo.
    fireEvent.keyDown(document.body, { key: 'c', ctrlKey: true })
    const again = JSON.parse(localStorage.getItem('pinta:clipboard') ?? 'null') as {
      colors?: string[]
    } | null
    const original = JSON.parse(fromCeu ?? 'null') as { colors?: string[] } | null
    expect(again?.colors).toEqual(original?.colors)
    expect(again?.colors).toContain('#ffffff')
  })

  it('Ctrl+D duplica o pedaço SEM mexer na área de transferência do aplicativo', async () => {
    const seed = createGalleryStore()
    await seed.getState().create({ kind: 'pixel-background', name: 'ceu', width: 16, height: 16 })
    render(<PintaApp />)
    await openAsset('ceu')
    paint(drawArea())
    fireEvent.keyDown(document.body, { key: 'a', ctrlKey: true })
    await waitFor(() => {
      expect(selectionBar()).toBeTruthy()
    })
    // A área de transferência guarda outra coisa (um pedaço vindo de outro desenho).
    const before = localStorage.getItem('pinta:clipboard')
    fireEvent.keyDown(document.body, { key: 'd', ctrlKey: true })
    await waitFor(() => {
      expect(selectionBar()).toBeTruthy()
    })
    expect(localStorage.getItem('pinta:clipboard')).toBe(before)
  })

  it('Ctrl+A num desenho vazio avisa em vez de selecionar o fundo', async () => {
    const seed = createGalleryStore()
    await seed.getState().create({ kind: 'pixel-background', name: 'ceu', width: 16, height: 16 })
    render(<PintaApp />)
    await openAsset('ceu')
    fireEvent.keyDown(document.body, { key: 'a', ctrlKey: true })
    await waitFor(() => {
      expect(screen.getByText(COPY.clipboard.nothingToSelect)).toBeTruthy()
    })
    expect(selectionBar()).toBeNull()
  })

  it('formas de vetor coladas na pixel art só avisam (não viram pixel)', async () => {
    // Outra aba copiou formas: o espelho (localStorage) já tem o item.
    createClipboardStore()
      .getState()
      .set({
        kind: 'shapes',
        shapes: [
          {
            id: 'r1',
            type: 'rect',
            x: 0,
            y: 0,
            w: 10,
            h: 10,
            rx: 0,
            fill: '#ff2121',
            stroke: null,
            opacity: 1,
            rotation: 0,
          },
        ],
        width: 480,
        height: 360,
      })
    const seed = createGalleryStore()
    await seed.getState().create({ kind: 'pixel-background', name: 'ceu', width: 16, height: 16 })
    render(<PintaApp />)
    await openAsset('ceu')
    fireEvent.keyDown(document.body, { key: 'v', ctrlKey: true })
    await waitFor(() => {
      expect(screen.getByText(COPY.clipboard.vectorIntoPixel)).toBeTruthy()
    })
    expect(selectionBar()).toBeNull()
  })
})

describe('copiar num desenho e colar em outro (vetor)', () => {
  const RECTS: VectorShape[] = [
    {
      id: 'a1',
      type: 'rect',
      x: 10,
      y: 10,
      w: 100,
      h: 50,
      rx: 0,
      fill: '#ff2121',
      stroke: null,
      opacity: 1,
      rotation: 0,
    },
    {
      id: 'a2',
      type: 'rect',
      x: 200,
      y: 100,
      w: 100,
      h: 50,
      rx: 0,
      fill: '#ff2121',
      stroke: null,
      opacity: 1,
      rotation: 0,
    },
  ]

  it('Ctrl+A + Ctrl+C num cenário 480×360; Ctrl+V num personagem 48×48 cabe e centraliza', async () => {
    const seed = createGalleryStore()
    // `importAssets` (e não `absorb`) porque só ele PERSISTE: o PintaApp monta uma
    // galeria própria e relê do disco.
    const livre = createVectorBackgroundAsset({ name: 'livre', width: 480, height: 360 })
    await seed.getState().importAssets([{ ...livre, shapes: RECTS }])
    await seed.getState().create({ kind: 'vector-sprite', name: 'mini', frameSize: 48 })
    render(<PintaApp />)

    await openAsset('livre')
    fireEvent.keyDown(document.body, { key: 'a', ctrlKey: true })
    fireEvent.keyDown(document.body, { key: 'c', ctrlKey: true })
    await backToGallery('mini')

    await openAsset('mini')
    const stage = screen.getByRole('img', { name: 'Área de desenho' })
    expect(stage.querySelectorAll('rect[fill="#ff2121"]').length).toBe(0)
    fireEvent.keyDown(document.body, { key: 'v', ctrlKey: true })
    await waitFor(() => {
      expect(stage.querySelectorAll('rect[fill="#ff2121"]').length).toBe(2)
    })
    // Encolheu para caber (a união original mede 290×140 num quadro de 48) e ficou
    // dentro do documento; grupos/ids são novos (não colide com a1/a2).
    const rects = [...stage.querySelectorAll('rect[fill="#ff2121"]')]
    for (const r of rects) {
      const x = Number(r.getAttribute('x'))
      const y = Number(r.getAttribute('y'))
      const w = Number(r.getAttribute('width'))
      const h = Number(r.getAttribute('height'))
      expect(x).toBeGreaterThanOrEqual(0)
      expect(y).toBeGreaterThanOrEqual(0)
      expect(x + w).toBeLessThanOrEqual(48.01)
      expect(y + h).toBeLessThanOrEqual(48.01)
    }
    // Um desfazer devolve o quadro vazio (uma entrada só).
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
    await waitFor(() => {
      expect(stage.querySelectorAll('rect[fill="#ff2121"]').length).toBe(0)
    })
  })

  it('pixel art colada num vetor vira FIGURA — sem canvas (happy-dom) recusa em vez de inserir vazio', async () => {
    createClipboardStore()
      .getState()
      .set({
        kind: 'pixel',
        bitmap: { width: 2, height: 2, data: Uint8Array.from([1, 1, 0, 1]) },
        colors: ['', '#ffffff'],
      })
    const seed = createGalleryStore()
    await seed
      .getState()
      .create({ kind: 'vector-background', name: 'livre', width: 480, height: 360 })
    render(<PintaApp />)
    await openAsset('livre')
    const stage = screen.getByRole('img', { name: 'Área de desenho' })
    fireEvent.keyDown(document.body, { key: 'v', ctrlKey: true })
    await waitFor(() => {
      expect(screen.getByText(COPY.clipboard.figureUnavailable)).toBeTruthy()
    })
    expect(stage.querySelectorAll('image').length).toBe(0)
  })
})
