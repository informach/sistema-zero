import { beforeEach, describe, expect, it } from 'bun:test'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { COPY } from '../../core/copy'
import { clearIdbMock } from '../../testing/idbMock'

const { PintaApp } = await import('../PintaApp')
const { setPintaStorageNamespace } = await import('../../state/persistence')
const { createGalleryStore } = await import('../../state/galleryStore')

beforeEach(() => {
  clearIdbMock()
  setPintaStorageNamespace('')
})

async function openVectorEditor(projectPalette?: readonly string[]): Promise<void> {
  const seed = createGalleryStore()
  await seed.getState().create({
    kind: 'vector-background',
    name: 'livre',
    width: 480,
    height: 360,
    ...(projectPalette
      ? { projectRef: { id: 'jogo', name: 'Meu jogo', palette: [...projectPalette] } }
      : {}),
  })
  render(<PintaApp />)
  await waitFor(() => {
    expect(screen.getByRole('button', { name: /Abrir livre/ })).toBeTruthy()
  })
  fireEvent.click(screen.getByRole('button', { name: /Abrir livre/ }))
  await waitFor(() => {
    expect(screen.getByText('livre')).toBeTruthy()
  })
}

/** happy-dom não faz layout: dá medida REAL ao palco p/ converter cliques. */
function measureStage(): HTMLElement {
  const stage = screen.getByRole('img', { name: 'Área de desenho' })
  ;(stage as unknown as { getBoundingClientRect: () => DOMRect }).getBoundingClientRect = () =>
    ({
      left: 0,
      top: 0,
      width: 480,
      height: 360,
      right: 480,
      bottom: 360,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }) as DOMRect
  return stage
}

/** Desenha um retângulo pelo gesto (a ferramenta Retângulo precisa estar ativa). */
function drawRect(stage: HTMLElement, from: [number, number], to: [number, number]): void {
  fireEvent.pointerDown(stage, {
    isPrimary: true,
    pointerId: 1,
    clientX: from[0],
    clientY: from[1],
  })
  fireEvent.pointerMove(stage, { pointerId: 1, clientX: to[0], clientY: to[1] })
  fireEvent.pointerUp(stage, { pointerId: 1 })
}

describe('UI vetorial (F5)', () => {
  it('abre com as ferramentas e os painéis de estilo', async () => {
    await openVectorEditor()
    expect(screen.getByRole('button', { name: COPY.vector.select })).toBeTruthy()
    expect(screen.getByRole('button', { name: COPY.vector.brush })).toBeTruthy()
    expect(screen.getByRole('button', { name: COPY.vector.star })).toBeTruthy()
    // Quem diz o canal são os dois quadradinhos da CAIXA (o painel de cores não
    // repete mais isso em chips).
    expect(screen.getAllByRole('button', { name: /^Preenchimento:/ }).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /^Contorno:/ })).toBeTruthy()
    expect(screen.getByRole('img', { name: 'Área de desenho' })).toBeTruthy()
  })

  it('ferramenta de texto abre o diálogo e adiciona o shape', async () => {
    await openVectorEditor()
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.text }))
    fireEvent.pointerDown(screen.getByRole('img', { name: 'Área de desenho' }), {
      isPrimary: true,
      clientX: 10,
      clientY: 10,
    })
    await waitFor(() => {
      expect(screen.getByText(COPY.vector.textPrompt)).toBeTruthy()
    })
    fireEvent.change(screen.getByPlaceholderText(COPY.vector.textPlaceholder), {
      target: { value: 'Olá!' },
    })
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.add }))
    await waitFor(() => {
      // Aparece no palco E na miniatura do painel Camadas.
      expect(screen.getAllByText('Olá!').length).toBeGreaterThan(0)
    })
    // Shape criado fica SELECIONADO: a faixa de ações aparece.
    expect(screen.getByRole('button', { name: COPY.vector.selRemove })).toBeTruthy()
  })

  it('caixa de ferramentas: espessuras no topo, grade e os dois slots de cor no pé', async () => {
    await openVectorEditor()
    // Presets de espessura (espelho dos tamanhos de pincel do pixel).
    expect(screen.getByRole('button', { name: `${COPY.vector.strokeWidth}: 4` })).toBeTruthy()
    // Toggle da grade de apoio (mesmo botão do pixel).
    expect(screen.getByRole('button', { name: COPY.tools.grid })).toBeTruthy()
    // Slots: preenchimento (verde default) na frente + o swatch verde da grade
    // de cores compartilham o rótulo; contorno preto só existe no slot.
    expect(
      screen.getAllByRole('button', { name: `${COPY.vector.fill}: verde` }).length,
    ).toBeGreaterThanOrEqual(2)
    expect(screen.getByRole('button', { name: `${COPY.vector.stroke}: preto` })).toBeTruthy()
    expect(screen.getByRole('button', { name: COPY.vector.swapFillStroke })).toBeTruthy()
  })

  it('trocar preenchimento e contorno inverte os slots', async () => {
    await openVectorEditor()
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.swapFillStroke }))
    await waitFor(() => {
      // O contorno herda o verde do preenchimento (rótulo único: os swatches da
      // grade seguem no canal de preenchimento).
      expect(screen.getByRole('button', { name: `${COPY.vector.stroke}: verde` })).toBeTruthy()
    })
  })

  it('o painel de cores pinta o CANAL ativo (quadradinho do contorno)', async () => {
    await openVectorEditor()
    // Escolher o quadradinho do CONTORNO na caixa muda o canal: a grade
    // re-rotula os swatches (é o controle único, sem chips no painel).
    fireEvent.click(screen.getByRole('button', { name: `${COPY.vector.stroke}: preto` }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: `${COPY.vector.stroke}: vermelho` })).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: `${COPY.vector.stroke}: vermelho` }))
    await waitFor(() => {
      // Agora o SLOT do contorno também mostra vermelho (2 botões com o rótulo).
      expect(
        screen.getAllByRole('button', { name: `${COPY.vector.stroke}: vermelho` }).length,
      ).toBe(2)
    })
  })

  it('a cor livre só entra na paleta ao confirmar e cancelar não deixa rastros', async () => {
    await openVectorEditor()
    fireEvent.click(screen.getByRole('button', { name: COPY.palette.addColor }))
    const input = await screen.findByLabelText(COPY.colorPicker.hex)
    fireEvent.change(input, { target: { value: '#111111' } })
    fireEvent.change(input, { target: { value: '#222222' } })
    expect(screen.queryByRole('button', { name: `${COPY.vector.fill}: #222222` })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: COPY.gallery.cancel }))
    expect(screen.queryByRole('button', { name: `${COPY.vector.fill}: #222222` })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: COPY.palette.addColor }))
    fireEvent.change(await screen.findByLabelText(COPY.colorPicker.hex), {
      target: { value: '#222222' },
    })
    fireEvent.click(screen.getByRole('button', { name: COPY.palette.add }))
    // Um é o swatch do painel; o outro é o slot ativo na caixa de ferramentas.
    expect(screen.getAllByRole('button', { name: `${COPY.vector.fill}: #222222` })).toHaveLength(2)
  })

  it('paleta do projeto não renderiza boxes nem keys duplicadas', async () => {
    await openVectorEditor(['#123456', '#123456', '#abcdef'])
    expect(screen.getAllByRole('button', { name: `${COPY.vector.fill}: #123456` })).toHaveLength(1)
  })

  it('os cards da direita abrem e fecham de forma independente', async () => {
    await openVectorEditor()
    const collapse = screen.getByRole('button', {
      name: COPY.panel.collapse(COPY.palette.title),
    })
    expect(collapse.getAttribute('aria-expanded')).toBe('true')
    fireEvent.click(collapse)
    expect(screen.queryByRole('button', { name: `${COPY.vector.fill}: vermelho` })).toBeNull()
    expect(screen.getByRole('button', { name: COPY.vector.gradient })).toBeTruthy()

    const expand = screen.getByRole('button', { name: COPY.panel.expand(COPY.palette.title) })
    expect(expand.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(expand)
    expect(screen.getByRole('button', { name: `${COPY.vector.fill}: vermelho` })).toBeTruthy()
  })

  it('a grade nasce DESLIGADA no vetor e liga/desliga pelo botão', async () => {
    await openVectorEditor()
    expect(document.querySelector('#pin-editor-grid')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: COPY.tools.grid }))
    await waitFor(() => {
      expect(document.querySelector('#pin-editor-grid')).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: COPY.tools.grid }))
    await waitFor(() => {
      expect(document.querySelector('#pin-editor-grid')).toBeNull()
    })
  })

  it('com a grade LIGADA, desenhar uma forma encaixa nos cruzamentos', async () => {
    await openVectorEditor()
    const stage = measureStage()
    fireEvent.click(screen.getByRole('button', { name: COPY.tools.rect }))
    fireEvent.click(screen.getByRole('button', { name: COPY.tools.grid }))
    // 480×360 → grade de 16: (30,30)→(32,32) e (93,61)→(96,64).
    drawRect(stage, [30, 30], [93, 61])
    await waitFor(() => {
      const rect = stage.querySelector('rect[fill="#78dc52"]')
      expect(rect?.getAttribute('x')).toBe('32')
      expect(rect?.getAttribute('y')).toBe('32')
      expect(rect?.getAttribute('width')).toBe('64')
      expect(rect?.getAttribute('height')).toBe('32')
    })
  })

  it('sem a grade, o desenho fica LIVRE (sem encaixe)', async () => {
    await openVectorEditor()
    const stage = measureStage()
    fireEvent.click(screen.getByRole('button', { name: COPY.tools.rect }))
    drawRect(stage, [30, 30], [93, 61])
    await waitFor(() => {
      const rect = stage.querySelector('rect[fill="#78dc52"]')
      expect(rect?.getAttribute('x')).toBe('30')
      expect(rect?.getAttribute('width')).toBe('63')
    })
  })

  it('laço seleciona 2 formas e a alça da UNIÃO redimensiona as duas juntas', async () => {
    await openVectorEditor()
    const stage = measureStage()
    fireEvent.click(screen.getByRole('button', { name: COPY.tools.rect }))
    drawRect(stage, [16, 16], [48, 48])
    drawRect(stage, [112, 16], [176, 80])
    await waitFor(() => {
      expect(stage.querySelectorAll('rect[fill="#78dc52"]').length).toBe(2)
    })
    // Laço com a ferramenta Selecionar, do (8,8) ao (200,100): pega as duas.
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.select }))
    fireEvent.pointerDown(stage, { isPrimary: true, pointerId: 1, clientX: 8, clientY: 8 })
    fireEvent.pointerMove(stage, { pointerId: 1, clientX: 200, clientY: 100 })
    fireEvent.pointerUp(stage, { pointerId: 1 })
    await waitFor(() => {
      // Barra flutuante com "Agrupar a seleção" = 2+ selecionadas.
      expect(screen.getByRole('toolbar', { name: COPY.vector.selectionBar })).toBeTruthy()
      expect(screen.getByRole('button', { name: COPY.vector.selGroup })).toBeTruthy()
    })
    // As 8 alças da caixa da UNIÃO (14px em zoom 1; escopo no PALCO — ícones
    // lucide também têm <rect width="14">). Arrasta a SE (índice 4):
    // âncora (16,16), fatores ×2 → A vira 64 de largura, B começa em 208.
    const handles = stage.querySelectorAll('rect[width="14"]')
    expect(handles.length).toBe(8)
    const se = handles[4] as SVGRectElement
    fireEvent.pointerDown(se, { isPrimary: true, pointerId: 2, clientX: 176, clientY: 80 })
    fireEvent.pointerMove(stage, { pointerId: 2, clientX: 336, clientY: 144 })
    fireEvent.pointerUp(stage, { pointerId: 2 })
    await waitFor(() => {
      const rects = stage.querySelectorAll('rect[fill="#78dc52"]')
      expect(rects[0]?.getAttribute('width')).toBe('64')
      expect(rects[1]?.getAttribute('x')).toBe('208')
      expect(rects[1]?.getAttribute('width')).toBe('128')
    })
  })

  it('a faixa da seleção duplica a forma', async () => {
    await openVectorEditor()
    const stage = measureStage()
    fireEvent.click(screen.getByRole('button', { name: COPY.tools.rect }))
    drawRect(stage, [16, 16], [48, 48])
    await waitFor(() => {
      expect(screen.getByRole('toolbar', { name: COPY.vector.selectionBar })).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.selDuplicate }))
    await waitFor(() => {
      expect(stage.querySelectorAll('rect[fill="#78dc52"]').length).toBe(2)
    })
  })

  it('duplicar um grupo cria outro grupo independente', async () => {
    await openVectorEditor()
    const stage = measureStage()
    fireEvent.click(screen.getByRole('button', { name: COPY.tools.rect }))
    drawRect(stage, [16, 16], [48, 48])
    drawRect(stage, [112, 16], [144, 48])
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.select }))
    fireEvent.pointerDown(stage, { isPrimary: true, pointerId: 20, clientX: 8, clientY: 8 })
    fireEvent.pointerMove(stage, { pointerId: 20, clientX: 160, clientY: 64 })
    fireEvent.pointerUp(stage, { pointerId: 20 })
    await waitFor(() => {
      expect(screen.getByRole('button', { name: COPY.vector.selGroup })).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.selGroup }))
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.selDuplicate }))
    await waitFor(() => {
      expect(stage.querySelectorAll('rect[fill="#78dc52"]').length).toBe(4)
    })

    // Escolher um ORIGINAL deve pegar só o grupo original. Se a duplicação
    // reutilizar o groupId, o botão Apagar levará também as duas cópias.
    const original = stage.querySelector('rect[fill="#78dc52"]')
    if (!original) throw new Error('retângulo original esperado')
    fireEvent.pointerDown(original, {
      isPrimary: true,
      pointerId: 21,
      clientX: 20,
      clientY: 20,
    })
    fireEvent.pointerUp(stage, { pointerId: 21, clientX: 20, clientY: 20 })
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.selRemove }))
    await waitFor(() => {
      expect(stage.querySelectorAll('rect[fill="#78dc52"]').length).toBe(2)
    })
  })

  it('alinhar: uma forma sozinha centraliza na TELA', async () => {
    await openVectorEditor()
    const stage = measureStage()
    fireEvent.click(screen.getByRole('button', { name: COPY.tools.rect }))
    drawRect(stage, [16, 16], [48, 48])
    await waitFor(() => {
      expect(screen.getByRole('button', { name: COPY.vector.alignCenterH })).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.alignCenterH }))
    await waitFor(() => {
      // (480 - 32) / 2 = 224.
      const rect = stage.querySelector('rect[fill="#78dc52"]')
      expect(rect?.getAttribute('x')).toBe('224')
    })
  })

  it('slider de cantos arredondados aplica o raio no retângulo selecionado', async () => {
    await openVectorEditor()
    const stage = measureStage()
    fireEvent.click(screen.getByRole('button', { name: COPY.tools.rect }))
    drawRect(stage, [16, 16], [80, 80])
    await waitFor(() => {
      expect(document.querySelector('input[name="vector-rect-radius"]')).toBeTruthy()
    })
    const slider = document.querySelector('input[name="vector-rect-radius"]')
    if (!slider) throw new Error('slider esperado')
    fireEvent.change(slider, { target: { value: '8' } })
    await waitFor(() => {
      const rect = stage.querySelector('rect[fill="#78dc52"]')
      expect(rect?.getAttribute('rx')).toBe('8')
    })
  })

  it('duplo clique no texto reabre o diálogo; salvar troca o conteúdo e o tamanho', async () => {
    await openVectorEditor()
    const stage = measureStage()
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.text }))
    fireEvent.pointerDown(stage, { isPrimary: true, pointerId: 1, clientX: 40, clientY: 40 })
    await waitFor(() => {
      expect(screen.getByText(COPY.vector.textPrompt)).toBeTruthy()
    })
    fireEvent.change(screen.getByPlaceholderText(COPY.vector.textPlaceholder), {
      target: { value: 'Oi' },
    })
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.add }))
    await waitFor(() => {
      expect(stage.querySelector('text')?.textContent).toBe('Oi')
    })
    // Duplo clique (a ferramenta já voltou p/ Selecionar) reabre para editar.
    const textEl = stage.querySelector('text')
    if (!textEl) throw new Error('texto esperado')
    fireEvent.doubleClick(textEl)
    await waitFor(() => {
      expect(screen.getByText(COPY.vector.editText)).toBeTruthy()
    })
    fireEvent.change(screen.getByPlaceholderText(COPY.vector.textPlaceholder), {
      target: { value: 'Tchau' },
    })
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.saveText }))
    await waitFor(() => {
      expect(stage.querySelector('text')?.textContent).toBe('Tchau')
    })
    // Com o texto selecionado, o slider de tamanho da letra aparece e aplica.
    const slider = document.querySelector('input[name="vector-font-size"]')
    if (!slider) throw new Error('slider de tamanho esperado')
    fireEvent.change(slider, { target: { value: '48' } })
    await waitFor(() => {
      expect(stage.querySelector('text')?.getAttribute('font-size')).toBe('48')
    })
  })

  it('Caneta: 3 cliques + Enter viram um polígono; Esc descarta os pontos', async () => {
    await openVectorEditor()
    const stage = measureStage()
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.pen }))
    for (const [x, y] of [
      [16, 16],
      [96, 16],
      [56, 80],
    ] as const) {
      fireEvent.pointerDown(stage, { isPrimary: true, pointerId: 1, clientX: x, clientY: y })
      fireEvent.pointerUp(stage, { pointerId: 1 })
    }
    fireEvent.keyDown(window, { key: 'Enter' })
    await waitFor(() => {
      const poly = stage.querySelector('polygon[fill="#78dc52"]')
      expect(poly?.getAttribute('points')).toBe('16,16 96,16 56,80')
    })
    // Esc no meio de uma nova forma descarta os pontos pendentes.
    fireEvent.pointerDown(stage, { isPrimary: true, pointerId: 1, clientX: 120, clientY: 120 })
    fireEvent.pointerUp(stage, { pointerId: 1 })
    fireEvent.keyDown(window, { key: 'Escape' })
    fireEvent.keyDown(window, { key: 'Enter' })
    await waitFor(() => {
      expect(stage.querySelectorAll('polygon[fill="#78dc52"]').length).toBe(1)
    })
  })

  it('segurar ESPAÇO vira a Mão: arrastar com o pincel não desenha', async () => {
    await openVectorEditor()
    const stage = measureStage()
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.brush }))
    fireEvent.keyDown(window, { key: ' ' })
    fireEvent.pointerDown(stage, { isPrimary: true, pointerId: 1, clientX: 30, clientY: 30 })
    fireEvent.pointerMove(stage, { pointerId: 1, clientX: 90, clientY: 90 })
    fireEvent.pointerUp(stage, { pointerId: 1 })
    fireEvent.keyUp(window, { key: ' ' })
    await waitFor(() => {
      expect(stage.querySelectorAll('path').length).toBe(0)
    })
  })

  it('apagar a seleção remove o shape', async () => {
    await openVectorEditor()
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.text }))
    fireEvent.pointerDown(screen.getByRole('img', { name: 'Área de desenho' }), {
      isPrimary: true,
    })
    await waitFor(() => {
      expect(screen.getByText(COPY.vector.textPrompt)).toBeTruthy()
    })
    fireEvent.change(screen.getByPlaceholderText(COPY.vector.textPlaceholder), {
      target: { value: 'some' },
    })
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.add }))
    await waitFor(() => {
      expect(screen.getAllByText('some').length).toBeGreaterThan(0)
    })
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.selRemove }))
    await waitFor(() => {
      expect(screen.queryByText('some')).toBeNull()
    })
  })

  it('a faixa da seleção só existe com algo selecionado (e traz alinhar + apagar)', async () => {
    await openVectorEditor()
    const stage = measureStage()
    expect(screen.queryByRole('toolbar', { name: COPY.vector.selectionBar })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: COPY.tools.rect }))
    drawRect(stage, [16, 16], [48, 48])
    await waitFor(() => {
      expect(screen.getByRole('toolbar', { name: COPY.vector.selectionBar })).toBeTruthy()
    })
    // Alinhar e apagar moravam no fim da coluna da direita; agora vivem na faixa.
    const bar = screen.getByRole('toolbar', { name: COPY.vector.selectionBar })
    expect(bar.contains(screen.getByRole('button', { name: COPY.vector.alignLeft }))).toBe(true)
    expect(bar.contains(screen.getByRole('button', { name: COPY.vector.selRemove }))).toBe(true)
    // Desselecionar (laço vazio com a ferramenta Selecionar) → a faixa some.
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.select }))
    drawRect(stage, [400, 300], [420, 320])
    await waitFor(() => {
      expect(screen.queryByRole('toolbar', { name: COPY.vector.selectionBar })).toBeNull()
    })
  })

  it('degradê fica atrás de um botão; "tirar o degradê" volta para cor sólida', async () => {
    await openVectorEditor()
    // Fechado: nenhum controle de degradê na árvore (aberto no painel, era o
    // que convertia o preenchimento em degradê sem querer).
    expect(screen.queryByRole('button', { name: COPY.vector.gradientH })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.gradient }))
    fireEvent.click(await screen.findByRole('button', { name: COPY.vector.gradientV }))
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: `${COPY.vector.fill}: ${COPY.vector.gradient}` }),
      ).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.gradientOff }))
    await waitFor(() => {
      expect(
        screen.getAllByRole('button', { name: `${COPY.vector.fill}: verde` }).length,
      ).toBeGreaterThan(0)
    })
  })

  it('editar uma ponta do degradê cria uma única entrada de undo', async () => {
    await openVectorEditor()
    const stage = measureStage()
    fireEvent.click(screen.getByRole('button', { name: COPY.tools.rect }))
    drawRect(stage, [16, 16], [64, 64])
    await waitFor(() => {
      expect(screen.getByRole('toolbar', { name: COPY.vector.selectionBar })).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('button', { name: COPY.vector.gradient }))
    fireEvent.click(await screen.findByRole('button', { name: COPY.vector.gradientV }))
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.gradientFrom }))
    const input = await screen.findByLabelText(COPY.colorPicker.hex)
    fireEvent.change(input, { target: { value: '#111111' } })
    fireEvent.change(input, { target: { value: '#222222' } })
    fireEvent.click(screen.getByRole('button', { name: COPY.colorPicker.apply }))
    fireEvent.click(screen.getByRole('button', { name: COPY.a11y.close }))

    fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.gradient }))
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.gradientFrom }))
    const restoredInput = (await screen.findByLabelText(COPY.colorPicker.hex)) as HTMLInputElement
    await waitFor(() => {
      expect(restoredInput.value).toBe('#78dc52')
    })
  })

  it('trocar a paleta troca as cores sugeridas da grade', async () => {
    await openVectorEditor()
    // Arcade (padrão) tem vermelho; Doces não.
    expect(screen.getByRole('button', { name: `${COPY.vector.fill}: vermelho` })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: `${COPY.palette.switchPalette}: Arcade` }))
    fireEvent.click(await screen.findByRole('menuitemradio', { name: /Doces/ }))
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: `${COPY.vector.fill}: vermelho` })).toBeNull()
    })
  })
})

/**
 * Edicao de PONTOS. A ferramenta ja existia (arrastar um no), mas nao tinha
 * nenhum teste de UI: escolher varios, acrescentar, apagar e fechar sao novos.
 */
describe('editar os pontos do vetor', () => {
  /** Quatro pontos exatos pela CANETA: da coordenadas previsiveis aos nos. */
  async function drawQuad(stage: HTMLElement): Promise<SVGPolygonElement> {
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.pen }))
    for (const [x, y] of [
      [100, 100],
      [300, 100],
      [300, 250],
      [100, 250],
    ]) {
      fireEvent.pointerDown(stage, { isPrimary: true, pointerId: 1, clientX: x, clientY: y })
    }
    fireEvent.keyDown(window, { key: 'Enter' })
    return await waitFor(() => {
      const polygon = stage.querySelector('polygon')
      if (!polygon) throw new Error('o poligono da caneta nao apareceu')
      return polygon as SVGPolygonElement
    })
  }

  /**
   * Liga a ferramenta de pontos. A caneta ja deixa a forma SELECIONADA, entao
   * basta trocar de ferramenta. Tocar no miolo dela abriria um laco de nos.
   */
  function startNodeEditing(): void {
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.reshape }))
  }

  /** Toque completo num no (sem o solto, o gesto fica aberto e trava o proximo). */
  function tapNode(node: Element, pointerId: number, at: [number, number]): void {
    fireEvent.pointerDown(node, { isPrimary: true, pointerId, clientX: at[0], clientY: at[1] })
    fireEvent.pointerUp(node, { pointerId })
  }

  // ⚠️ Mirar `[data-node]`: as ALÇAS de bézier também são <circle> no palco.
  const nodeCircles = (stage: HTMLElement): SVGCircleElement[] =>
    [...stage.querySelectorAll('circle[data-node]')] as SVGCircleElement[]
  const handleCircles = (stage: HTMLElement): SVGCircleElement[] =>
    [...stage.querySelectorAll('circle[data-handle]')] as SVGCircleElement[]
  const chosenNodes = (stage: HTMLElement): SVGCircleElement[] =>
    nodeCircles(stage).filter((c) => c.getAttribute('fill') === '#00a0c8')

  it('mostra um no por ponto e a caixa de selecao escolhe VARIOS', async () => {
    await openVectorEditor()
    const stage = measureStage()
    await drawQuad(stage)
    startNodeEditing()
    await waitFor(() => {
      expect(nodeCircles(stage).length).toBe(4)
    })
    expect(chosenNodes(stage).length).toBe(0)

    // Caixa de (50,50) a (320,150): pega os dois nos de CIMA, nao os de baixo.
    fireEvent.pointerDown(stage, { isPrimary: true, pointerId: 2, clientX: 50, clientY: 50 })
    fireEvent.pointerMove(stage, { pointerId: 2, clientX: 320, clientY: 150 })
    fireEvent.pointerUp(stage, { pointerId: 2 })

    await waitFor(() => {
      expect(chosenNodes(stage).length).toBe(2)
    })
  })

  it('tocar no traco acrescenta um ponto sem mexer no resto', async () => {
    await openVectorEditor()
    const stage = measureStage()
    const quad = await drawQuad(stage)
    startNodeEditing()
    await waitFor(() => {
      expect(nodeCircles(stage).length).toBe(4)
    })

    // (200,100) esta em cima do lado de cima, entre (100,100) e (300,100).
    fireEvent.pointerDown(quad, { isPrimary: true, pointerId: 3, clientX: 200, clientY: 100 })

    await waitFor(() => {
      expect(nodeCircles(stage).length).toBe(5)
    })
    // Continua sendo poligono: acrescentar ponto reto nao cria curva.
    expect(stage.querySelector('polygon')).toBeTruthy()
    // E o ponto novo ja nasce escolhido (quem criou quer arrastar).
    expect(chosenNodes(stage).length).toBe(1)
  })

  it('desfazer a insercao limpa o indice do ponto que deixou de existir', async () => {
    await openVectorEditor()
    const stage = measureStage()
    const quad = await drawQuad(stage)
    startNodeEditing()
    await waitFor(() => {
      expect(nodeCircles(stage).length).toBe(4)
    })

    fireEvent.pointerDown(quad, { isPrimary: true, pointerId: 30, clientX: 200, clientY: 100 })
    await waitFor(() => {
      expect(nodeCircles(stage).length).toBe(5)
      expect(chosenNodes(stage).length).toBe(1)
    })
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
    await waitFor(() => {
      expect(nodeCircles(stage).length).toBe(4)
      expect(chosenNodes(stage).length).toBe(0)
    })

    // Sem ponto escolhido, Delete volta a apagar a forma inteira.
    fireEvent.keyDown(window, { key: 'Delete' })
    await waitFor(() => {
      expect(stage.querySelector('polygon')).toBeNull()
    })
  })

  /**
   * O caso que trava a colisao de teclado: o Delete ja estava ligado a "apagar a
   * forma inteira" num listener de window. Com NOS escolhidos ele tem que apagar
   * o PONTO; sem nenhum, a forma.
   */
  it('Delete apaga o PONTO escolhido, e sem ponto escolhido apaga a FORMA', async () => {
    await openVectorEditor()
    const stage = measureStage()
    await drawQuad(stage)
    startNodeEditing()
    await waitFor(() => {
      expect(nodeCircles(stage).length).toBe(4)
    })

    const first = nodeCircles(stage)[0]
    if (!first) throw new Error('sem no para escolher')
    tapNode(first, 4, [100, 100])
    await waitFor(() => {
      expect(chosenNodes(stage).length).toBe(1)
    })

    fireEvent.keyDown(window, { key: 'Delete' })
    await waitFor(() => {
      expect(nodeCircles(stage).length).toBe(3)
    })
    // A forma continua viva.
    expect(stage.querySelector('polygon')).toBeTruthy()

    // Agora SEM no escolhido: o Delete volta a valer para a forma inteira.
    fireEvent.keyDown(window, { key: 'Delete' })
    await waitFor(() => {
      expect(stage.querySelector('polygon')).toBeNull()
    })
  })

  it('nao deixa o poligono ficar com menos de 3 pontos', async () => {
    await openVectorEditor()
    const stage = measureStage()
    await drawQuad(stage)
    startNodeEditing()
    await waitFor(() => {
      expect(nodeCircles(stage).length).toBe(4)
    })

    // Caixa que pega os dois de cima e depois os dois de baixo = todos os 4.
    fireEvent.pointerDown(stage, { isPrimary: true, pointerId: 5, clientX: 40, clientY: 40 })
    fireEvent.pointerMove(stage, { pointerId: 5, clientX: 400, clientY: 300 })
    fireEvent.pointerUp(stage, { pointerId: 5 })
    await waitFor(() => {
      expect(chosenNodes(stage).length).toBe(4)
    })

    fireEvent.keyDown(window, { key: 'Delete' })
    // Recusado: os 4 nos continuam la e a forma nao sumiu.
    await waitFor(() => {
      expect(screen.getByText(COPY.vector.nodeFloor(3))).toBeTruthy()
    })
    expect(nodeCircles(stage).length).toBe(4)
  })

  it('a faixa de cima troca para as acoes de PONTO e fecha o caminho', async () => {
    await openVectorEditor()
    const stage = measureStage()
    await drawQuad(stage)

    // Com a Selecionar, a faixa e a de formas.
    expect(screen.getByRole('toolbar', { name: COPY.vector.selectionBar })).toBeTruthy()

    startNodeEditing()
    await waitFor(() => {
      expect(screen.getByRole('toolbar', { name: COPY.vector.nodeBar })).toBeTruthy()
    })
    expect(screen.queryByRole('toolbar', { name: COPY.vector.selectionBar })).toBeNull()
    // Poligono nasce FECHADO, entao o botao oferece ABRIR.
    const abrir = screen.getByRole('button', { name: COPY.vector.nodeOpen })

    fireEvent.click(abrir)
    await waitFor(() => {
      // Abrir converte em traco (poligono e sempre fechado) e o d nao tem Z.
      const path = stage.querySelector('path')
      expect(path?.getAttribute('d')?.includes('Z')).toBe(false)
    })
    expect(screen.getByRole('button', { name: COPY.vector.nodeClose })).toBeTruthy()
  })

  it('as ALCAS aparecem so no no escolhido, e so quando ha curva', async () => {
    await openVectorEditor()
    const stage = measureStage()
    await drawQuad(stage)
    startNodeEditing()
    await waitFor(() => {
      expect(nodeCircles(stage).length).toBe(4)
    })
    // Poligono e todo de quinas: nenhuma alca, mesmo escolhendo um no.
    const first = nodeCircles(stage)[0]
    if (!first) throw new Error('sem no')
    tapNode(first, 10, [100, 100])
    await waitFor(() => {
      expect(chosenNodes(stage).length).toBe(1)
    })
    expect(handleCircles(stage).length).toBe(0)

    const nodeHits = [...stage.querySelectorAll('circle[data-node-hit]')]
    expect(nodeHits).toHaveLength(4)
    for (const hit of nodeHits) {
      expect(Number(hit.getAttribute('r')) * 2).toBeGreaterThanOrEqual(44)
    }

    // "Ponto suave" arredonda a quina: as duas alcas do no aparecem.
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.nodeSmooth }))
    await waitFor(() => {
      expect(handleCircles(stage).length).toBe(2)
    })
    const handleHits = [...stage.querySelectorAll('circle[data-handle-hit]')]
    expect(handleHits).toHaveLength(2)
    for (const hit of handleHits) {
      expect(Number(hit.getAttribute('r')) * 2).toBeGreaterThanOrEqual(44)
    }
    // Vira traco (poligono nao guarda curva) e continua com 4 pontos.
    expect(stage.querySelector('path')).toBeTruthy()
    expect(nodeCircles(stage).length).toBe(4)

    // "Ponto de canto" desfaz a curvatura daquele no.
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.nodeCorner }))
    await waitFor(() => {
      expect(handleCircles(stage).length).toBe(0)
    })
  })

  it('curva e reta trocam a curvatura do TRECHO entre os pontos', async () => {
    await openVectorEditor()
    const stage = measureStage()
    await drawQuad(stage)
    startNodeEditing()
    await waitFor(() => {
      expect(nodeCircles(stage).length).toBe(4)
    })
    // Escolhe os dois de cima: o trecho entre eles e o alvo.
    fireEvent.pointerDown(stage, { isPrimary: true, pointerId: 11, clientX: 40, clientY: 40 })
    fireEvent.pointerMove(stage, { pointerId: 11, clientX: 320, clientY: 150 })
    fireEvent.pointerUp(stage, { pointerId: 11 })
    await waitFor(() => {
      expect(chosenNodes(stage).length).toBe(2)
    })

    fireEvent.click(screen.getByRole('button', { name: COPY.vector.nodeToCurve }))
    await waitFor(() => {
      const path = stage.querySelector('path')
      // Um C no d = o trecho virou curva; o resto segue reto (L).
      expect(path?.getAttribute('d')?.includes('C')).toBe(true)
    })
    // A curva nasce em cima da reta, entao o desenho NAO se mexe: os controles
    // ficam em 1/3 e 2/3 do trecho de (100,100) a (300,100).
    expect(stage.querySelector('path')?.getAttribute('d')).toContain(
      'C 166.67 100 233.33 100 300 100',
    )

    fireEvent.click(screen.getByRole('button', { name: COPY.vector.nodeToLine }))
    await waitFor(() => {
      // Some a curvatura. ⚠️ A forma NAO volta a ser poligono: a conversao e de
      // mao unica (o caminho de volta e o Ctrl+Z), entao o que se confere e o
      // `d` sem nenhum C.
      expect(stage.querySelector('path')?.getAttribute('d')?.includes('C')).toBe(false)
    })
  })

  it('suavizar o traco pode ser apertado de novo e vai tirando pontos', async () => {
    await openVectorEditor()
    const stage = measureStage()
    await drawQuad(stage)
    startNodeEditing()
    await waitFor(() => {
      expect(nodeCircles(stage).length).toBe(4)
    })

    // 1o toque: arredonda os 4 cantos sem tirar ponto.
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.nodeSimplify }))
    await waitFor(() => {
      expect(stage.querySelector('path')).toBeTruthy()
    })
    expect(nodeCircles(stage).length).toBe(4)

    // 2o toque: agora aperta a regua e o traco perde ponto.
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.nodeSimplify }))
    await waitFor(() => {
      expect(nodeCircles(stage).length).toBeLessThan(4)
    })
  })

  it('na tela estreita oferece todas as acoes de pontos da faixa desktop', async () => {
    const originalMatchMedia = window.matchMedia
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => undefined,
        removeListener: () => undefined,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => true,
      }),
    })
    try {
      await openVectorEditor()
      const stage = measureStage()
      await drawQuad(stage)
      startNodeEditing()
      await waitFor(() => {
        expect(screen.getByRole('toolbar', { name: COPY.vector.nodeBar })).toBeTruthy()
      })
      for (const label of [
        COPY.vector.nodeOpen,
        COPY.vector.nodeRemove,
        COPY.vector.nodeToCurve,
        COPY.vector.nodeToLine,
        COPY.vector.nodeSmooth,
        COPY.vector.nodeCorner,
        COPY.vector.nodeSimplify,
      ]) {
        expect(screen.getByRole('button', { name: label })).toBeTruthy()
      }
    } finally {
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        value: originalMatchMedia,
      })
    }
  })
})
