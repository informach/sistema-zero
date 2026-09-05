import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { COPY } from '../../core/copy'
import { clearIdbMock } from '../../testing/idbMock'
import { rightColumn, stubColumn } from '../../testing/rightColumnStub'

const { PintaApp } = await import('../PintaApp')
const { setPintaStorageNamespace } = await import('../../state/persistence')
const { createGalleryStore } = await import('../../state/galleryStore')

beforeEach(() => {
  clearIdbMock()
  setPintaStorageNamespace('')
  // O espelho da área de transferência é o localStorage da página (o teste do
  // personagem pequeno copia): cada teste começa limpo, e nada vaza para o
  // arquivo seguinte (o bun não isola módulos e o CI enumera noutra ordem).
  localStorage.clear()
})

// Deixa o autosave pendente do editor assentar ANTES do próximo arquivo (régua
// do `clipboardUi.test.tsx`): um autosave atrasado caía no IndexedDB do perfil
// depois do `clearIdbMock()` do arquivo seguinte.
afterEach(async () => {
  await new Promise((resolve) => setTimeout(resolve, 30))
})

async function openVectorEditor(
  projectPalette?: readonly string[],
  seedExtra?: (store: ReturnType<typeof createGalleryStore>) => Promise<void>,
  openName = 'livre',
): Promise<void> {
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
  if (seedExtra) await seedExtra(seed)
  render(<PintaApp />)
  const openLabel = new RegExp(`Abrir ${openName}`)
  await waitFor(() => {
    expect(screen.getByRole('button', { name: openLabel })).toBeTruthy()
  })
  fireEvent.click(screen.getByRole('button', { name: openLabel }))
  await waitFor(() => {
    expect(screen.getByText(openName)).toBeTruthy()
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

  /** Abre o diálogo de texto pela ferramenta e escreve o conteúdo. */
  async function typeText(conteudo: string): Promise<HTMLTextAreaElement> {
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.text }))
    fireEvent.pointerDown(screen.getByRole('img', { name: 'Área de desenho' }), {
      isPrimary: true,
      clientX: 40,
      clientY: 40,
    })
    const campo = (await screen.findByPlaceholderText(
      COPY.vector.textPlaceholder,
    )) as HTMLTextAreaElement
    fireEvent.change(campo, { target: { value: conteudo } })
    return campo
  }

  it('texto de VÁRIAS linhas vira um tspan por linha', async () => {
    await openVectorEditor()
    const stage = measureStage()
    await typeText('um\ndois\ntrês')
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.add }))
    await waitFor(() => {
      expect(stage.querySelectorAll('text tspan').length).toBe(3)
    })
    expect(stage.querySelector('text tspan')?.getAttribute('dy')).toBe('0')
  })

  it('Enter quebra a linha (não salva); Ctrl+Enter salva', async () => {
    await openVectorEditor()
    const stage = measureStage()
    const campo = await typeText('um\ndois')
    // Enter cru: o diálogo CONTINUA aberto (happy-dom não insere o caractere,
    // então o que se afere é o não-envio).
    fireEvent.keyDown(campo, { key: 'Enter' })
    expect(screen.getByText(COPY.vector.textPrompt)).toBeTruthy()
    expect(stage.querySelectorAll('text').length).toBe(0)

    fireEvent.keyDown(campo, { key: 'Enter', ctrlKey: true })
    await waitFor(() => {
      expect(stage.querySelectorAll('text').length).toBe(1)
    })
    expect(screen.queryByText(COPY.vector.textPrompt)).toBeNull()
  })

  it('os 3 botões alinham o texto selecionado sem tirá-lo do lugar', async () => {
    await openVectorEditor()
    const stage = measureStage()
    await typeText('abcd')
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.add }))
    const alvo = await waitFor(() => {
      const found = stage.querySelector('text')
      if (!found) throw new Error('sem texto')
      return found
    })
    expect(alvo.getAttribute('text-anchor')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: COPY.vector.textAlignCenter }))
    await waitFor(() => {
      expect(stage.querySelector('text')?.getAttribute('text-anchor')).toBe('middle')
    })
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.textAlignRight }))
    await waitFor(() => {
      expect(stage.querySelector('text')?.getAttribute('text-anchor')).toBe('end')
    })
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.textAlignLeft }))
    await waitFor(() => {
      expect(stage.querySelector('text')?.getAttribute('text-anchor')).toBeNull()
    })
  })

  it('oferece as cinco fontes e aplica a escolha na criação e na seleção', async () => {
    await openVectorEditor()
    const stage = measureStage()
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.text }))
    const fontSelect = screen.getByRole('combobox', { name: COPY.vector.fontFamily })
    expect(
      Array.from((fontSelect as HTMLSelectElement).options).map((option) => option.text),
    ).toEqual(['Baloo 2', 'Nunito', 'Press Start 2P', 'Bungee', 'Fredoka One'])
    fireEvent.change(fontSelect, { target: { value: 'bungee' } })
    fireEvent.pointerDown(stage, { isPrimary: true, clientX: 40, clientY: 40 })
    fireEvent.change(await screen.findByPlaceholderText(COPY.vector.textPlaceholder), {
      target: { value: 'Jogar' },
    })
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.add }))

    await waitFor(() => {
      expect(stage.querySelector('text')?.getAttribute('font-family')).toBe("'Bungee'")
    })
    fireEvent.change(screen.getByRole('combobox', { name: COPY.vector.fontFamily }), {
      target: { value: 'fredoka' },
    })
    await waitFor(() => {
      // ⚠️ ENTRE ASPAS: sem elas o navegador descarta a declaração em nomes com um
      // token que começa por dígito ("Press Start 2P", "Baloo 2"). Ver fontFamilyCss.
      expect(stage.querySelector('text')?.getAttribute('font-family')).toBe("'Fredoka One'")
    })
  })

  it('sem outro desenho, o seletor "Trazer um desenho" avisa que não há nada', async () => {
    await openVectorEditor()
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.insertAsset }))
    await waitFor(() => {
      expect(screen.getByText(COPY.vector.insertTitle)).toBeTruthy()
    })
    expect(screen.getByText(COPY.vector.insertNothing)).toBeTruthy()
  })

  it('trazer um desenho de VETOR insere as formas agrupadas', async () => {
    await openVectorEditor(undefined, async (seed) => {
      // `importAssets` (e não `absorb`) porque só ele PERSISTE: o PintaApp
      // monta uma galeria própria e relê do disco.
      const { createVectorBackgroundAsset } = await import('../../core/project')
      const outro = createVectorBackgroundAsset({ name: 'castelo', width: 200, height: 200 })
      await seed.getState().importAssets([
        {
          ...outro,
          shapes: [
            {
              id: 'c1',
              type: 'rect',
              x: 0,
              y: 0,
              w: 50,
              h: 50,
              rx: 0,
              fill: '#ff2121',
              stroke: null,
              opacity: 1,
              rotation: 0,
            },
            {
              id: 'c2',
              type: 'rect',
              x: 100,
              y: 100,
              w: 50,
              h: 50,
              rx: 0,
              fill: '#ff2121',
              stroke: null,
              opacity: 1,
              rotation: 0,
            },
          ],
        },
      ])
    })
    const stage = measureStage()
    expect(stage.querySelectorAll('rect[fill="#ff2121"]').length).toBe(0)

    fireEvent.click(screen.getByRole('button', { name: COPY.vector.insertAsset }))
    const card = await screen.findByRole('button', { name: /castelo/ })
    fireEvent.click(card)

    await waitFor(() => {
      expect(stage.querySelectorAll('rect[fill="#ff2121"]').length).toBe(2)
    })
    // Entrou agrupado e já selecionado: a faixa oferece DESAGRUPAR.
    expect(screen.getByRole('button', { name: COPY.vector.selUngroup })).toBeTruthy()
    // Uma entrada de undo só.
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
    await waitFor(() => {
      expect(stage.querySelectorAll('rect[fill="#ff2121"]').length).toBe(0)
    })
  })

  it('o desenho ABERTO não aparece na lista (não se insere em si mesmo)', async () => {
    await openVectorEditor(undefined, async (seed) => {
      await seed.getState().create({
        kind: 'vector-background',
        name: 'castelo',
        width: 200,
        height: 200,
      })
    })
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.insertAsset }))
    await screen.findByText(COPY.vector.insertTitle)
    expect(screen.getByRole('button', { name: /castelo/ })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /^livre/ })).toBeNull()
  })

  it('sem canvas (happy-dom) o desenho de PIXEL recusa em vez de entrar vazio', async () => {
    await openVectorEditor(undefined, async (seed) => {
      await seed.getState().create({ kind: 'pixel-sprite', name: 'nave', frameSize: 16 })
    })
    const stage = measureStage()
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.insertAsset }))
    const card = await screen.findByRole('button', { name: /nave/ })
    fireEvent.click(card)
    await waitFor(() => {
      expect(screen.getByText(COPY.vector.insertFailed)).toBeTruthy()
    })
    expect(stage.querySelectorAll('image').length).toBe(0)
    expect(screen.getByText(COPY.vector.insertTitle)).toBeTruthy()
  })

  it('caixa de ferramentas: espessuras no topo, grade e os dois slots de cor no pé', async () => {
    await openVectorEditor()
    // Presets de espessura (espelho dos tamanhos de pincel do pixel): seis
    // degraus de meio em meio, com vírgula no rótulo; o antigo "4" não existe mais.
    for (const label of ['0,5', '1', '1,5', '2', '2,5', '3']) {
      expect(
        screen.getByRole('button', { name: `${COPY.vector.strokeWidth}: ${label}` }),
      ).toBeTruthy()
    }
    expect(screen.queryByRole('button', { name: `${COPY.vector.strokeWidth}: 4` })).toBeNull()
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

  it('escolher 0,5 desenha um contorno de meio pixel e o slider acompanha', async () => {
    await openVectorEditor()
    const stage = measureStage()
    fireEvent.click(screen.getByRole('button', { name: `${COPY.vector.strokeWidth}: 0,5` }))
    fireEvent.click(screen.getByRole('button', { name: COPY.tools.rect }))
    drawRect(stage, [16, 16], [64, 64])
    await waitFor(() => {
      expect(stage.querySelector('rect[stroke-width="0.5"]')).toBeTruthy()
    })
    const slider = screen.getByLabelText(COPY.vector.strokeWidth) as HTMLInputElement
    expect(slider.value).toBe('0')
    expect(slider.getAttribute('aria-valuetext')).toBe('0,5')

    // O degrau mais grosso agora é o 3 (o retângulo recém-desenhado segue selecionado).
    fireEvent.click(screen.getByRole('button', { name: `${COPY.vector.strokeWidth}: 3` }))
    await waitFor(() => {
      expect(stage.querySelector('rect[stroke-width="3"]')).toBeTruthy()
    })
    expect(slider.value).toBe('5')
  })

  it('traço antigo de 8 mantém a espessura e o slider para no ÚLTIMO degrau', async () => {
    await openVectorEditor(
      undefined,
      async (seed) => {
        const { createVectorBackgroundAsset } = await import('../../core/project')
        const grosso = createVectorBackgroundAsset({ name: 'grosso', width: 480, height: 360 })
        await seed.getState().importAssets([
          {
            ...grosso,
            shapes: [
              {
                id: 'g1',
                type: 'rect',
                x: 20,
                y: 20,
                w: 80,
                h: 80,
                rx: 0,
                fill: '#ff2121',
                stroke: { color: '#000000', width: 8 },
                opacity: 1,
                rotation: 0,
              },
            ],
          },
        ])
      },
      'grosso',
    )
    const stage = measureStage()
    const rect = stage.querySelector('rect[stroke-width="8"]')
    if (!rect) throw new Error('retângulo com traço de 8 esperado')

    // Selecionar a forma faz o painel ler a espessura DELA (inspetor).
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.select }))
    fireEvent.pointerDown(rect, { isPrimary: true, pointerId: 1, clientX: 60, clientY: 60 })
    fireEvent.pointerUp(stage, { pointerId: 1 })
    await waitFor(() => {
      expect(screen.getByRole('toolbar', { name: COPY.vector.selectionBar })).toBeTruthy()
    })

    // O desenho continua com 8 (o modelo não muda)...
    expect(stage.querySelector('rect[stroke-width="8"]')).toBeTruthy()
    // ...nenhum degrau acende (acender o "3" mentiria)...
    for (const label of ['0,5', '1', '1,5', '2', '2,5', '3']) {
      const button = screen.getByRole('button', { name: `${COPY.vector.strokeWidth}: ${label}` })
      expect(button.getAttribute('aria-pressed')).toBe('false')
    }
    // ...e o slider para no FIM dizendo a espessura real (antes caía no degrau
    // mais fino, o oposto do que a forma tem).
    const slider = screen.getByLabelText(COPY.vector.strokeWidth) as HTMLInputElement
    expect(slider.value).toBe('5')
    expect(slider.getAttribute('aria-valuetext')).toBe('8')
  })

  it('slots de cor distinguem ÁREA preenchida de MOLDURA de contorno', async () => {
    await openVectorEditor()
    const fill = screen
      .getAllByRole('button', { name: `${COPY.vector.fill}: verde` })
      .find((button) => button.getAttribute('title') === COPY.vector.fill)
    const stroke = screen.getByRole('button', { name: `${COPY.vector.stroke}: preto` })
    if (!fill) throw new Error('slot de preenchimento esperado')

    const fillShape = fill.querySelector<HTMLElement>('[data-vector-color-shape="fill"]')
    const strokeShape = stroke.querySelector<HTMLElement>('[data-vector-color-shape="stroke"]')
    expect(fillShape).toBeTruthy()
    expect(fillShape?.children).toHaveLength(0)
    expect(strokeShape).toBeTruthy()
    expect(strokeShape?.querySelector('[data-vector-color-hole]')).toBeTruthy()
    expect(fill.parentElement?.className).toContain('w-[88px]')
    expect(fill.className).toContain('size-11')
    expect(stroke.className).toContain('size-11')
    expect(fillShape?.className).toContain('size-10')
    expect(strokeShape?.className).toContain('size-10')
    expect(fill.className).toContain('focus-visible:z-30')
    expect(stroke.className).toContain('focus-visible:z-30')
    expect(fill.getAttribute('aria-pressed')).toBe('true')
    expect(fill.className).not.toContain('ring-2')
    expect(fillShape?.className).toContain('ring-2')
    expect(fillShape?.className).toContain('ring-pin-accent')
    expect(strokeShape?.className).not.toContain('ring-2')

    fireEvent.click(stroke)
    await waitFor(() => {
      expect(stroke.getAttribute('aria-pressed')).toBe('true')
      expect(strokeShape?.className).toContain('ring-2')
      expect(strokeShape?.className).toContain('ring-pin-accent')
      expect(fillShape?.className).not.toContain('ring-2')
    })
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

  it('os cards da direita abrem e fecham de forma independente quando cabem', async () => {
    // happy-dom não faz layout (scrollHeight/clientHeight = 0): a régua de
    // encaixe da coluna é inerte e tudo nasce aberto. O accordion por medida
    // tem o describe próprio, com stub na coluna.
    await openVectorEditor()
    const collapse = screen.getByRole('button', {
      name: COPY.panel.collapse(COPY.palette.title),
    })
    expect(collapse.getAttribute('aria-expanded')).toBe('true')
    // `aria-controls` aponta para o corpo MONTADO; recolhido, o corpo desmonta e o atributo some.
    const bodyId = collapse.getAttribute('aria-controls')
    expect(bodyId && document.getElementById(bodyId)).toBeTruthy()
    fireEvent.click(collapse)
    expect(screen.queryByRole('button', { name: `${COPY.vector.fill}: vermelho` })).toBeNull()
    expect(
      screen
        .getByRole('button', { name: COPY.panel.expand(COPY.palette.title) })
        .hasAttribute('aria-controls'),
    ).toBe(false)
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

  it('a alça de girar da UNIÃO gira as DUAS formas juntas', async () => {
    await openVectorEditor()
    const stage = measureStage()
    fireEvent.click(screen.getByRole('button', { name: COPY.tools.rect }))
    // A em 0..32, B em 96..128 (mesma faixa vertical): união = 0..128 × 0..32,
    // centro (64,16). Girar 180° troca as duas de lugar.
    drawRect(stage, [0, 0], [32, 32])
    drawRect(stage, [96, 0], [128, 32])
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.select }))
    fireEvent.pointerDown(stage, { isPrimary: true, pointerId: 1, clientX: 200, clientY: 200 })
    fireEvent.pointerMove(stage, { pointerId: 1, clientX: 0, clientY: 0 })
    fireEvent.pointerUp(stage, { pointerId: 1 })
    await waitFor(() => {
      expect(screen.getByRole('button', { name: COPY.vector.selGroup })).toBeTruthy()
    })

    const rotar = stage.querySelector('circle[data-rotate]') as SVGCircleElement | null
    expect(rotar).toBeTruthy()
    if (!rotar) return
    // Começa na vertical acima do centro e termina embaixo: meia volta.
    fireEvent.pointerDown(rotar, { isPrimary: true, pointerId: 2, clientX: 64, clientY: 0 })
    fireEvent.pointerMove(stage, { pointerId: 2, clientX: 64, clientY: 200 })
    fireEvent.pointerUp(stage, { pointerId: 2 })

    await waitFor(() => {
      const rects = stage.querySelectorAll('rect[fill="#78dc52"]')
      // Trocaram de lado e cada uma carrega o giro de meia volta.
      expect(rects[0]?.getAttribute('x')).toBe('96')
      expect(rects[1]?.getAttribute('x')).toBe('0')
      expect(rects[0]?.getAttribute('transform')).toContain('rotate(180')
      expect(rects[1]?.getAttribute('transform')).toContain('rotate(180')
    })
  })

  it('girar UMA forma continua só girando (não sai do lugar)', async () => {
    await openVectorEditor()
    const stage = measureStage()
    fireEvent.click(screen.getByRole('button', { name: COPY.tools.rect }))
    // Desenhar já deixa a forma selecionada.
    drawRect(stage, [40, 40], [104, 104])
    const rotar = await waitFor(() => {
      const found = stage.querySelector('circle[data-rotate]')
      if (!found) throw new Error('sem alça de girar')
      return found as SVGCircleElement
    })
    fireEvent.pointerDown(rotar, { isPrimary: true, pointerId: 2, clientX: 72, clientY: 0 })
    fireEvent.pointerMove(stage, { pointerId: 2, clientX: 72, clientY: 200 })
    fireEvent.pointerUp(stage, { pointerId: 2 })
    await waitFor(() => {
      const alvo = stage.querySelector('rect[fill="#78dc52"]')
      expect(alvo?.getAttribute('transform')).toContain('rotate(180')
      expect(alvo?.getAttribute('x')).toBe('40')
      expect(alvo?.getAttribute('y')).toBe('40')
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

  it('⭐ ordem vale para o GRUPO: os botões ficam vivos e ele vai INTEIRO para a frente', async () => {
    await openVectorEditor()
    const stage = measureStage()
    fireEvent.click(screen.getByRole('button', { name: COPY.tools.rect }))
    drawRect(stage, [0, 0], [32, 32])
    drawRect(stage, [40, 0], [72, 32])
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.select }))
    fireEvent.pointerDown(stage, { isPrimary: true, pointerId: 30, clientX: 100, clientY: 100 })
    fireEvent.pointerMove(stage, { pointerId: 30, clientX: 0, clientY: 0 })
    fireEvent.pointerUp(stage, { pointerId: 30 })
    await waitFor(() => {
      expect(screen.getByRole('button', { name: COPY.vector.selGroup })).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.selGroup }))
    // A terceira nasce por CIMA das duas e FORA do grupo.
    fireEvent.click(screen.getByRole('button', { name: COPY.tools.rect }))
    drawRect(stage, [200, 200], [232, 232])
    await waitFor(() => {
      expect(stage.querySelectorAll('rect[fill="#78dc52"]').length).toBe(3)
    })

    // Tocar num membro seleciona o GRUPO — e era exatamente isso que apagava os
    // quatro botões de ordem (2+ selecionadas => `disabled`), deixando a forma
    // agrupada sem NENHUM jeito de mudar de camada.
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.select }))
    const membro = stage.querySelector('rect[fill="#78dc52"]')
    if (!membro) throw new Error('membro do grupo esperado')
    fireEvent.pointerDown(membro, { isPrimary: true, pointerId: 31, clientX: 8, clientY: 8 })
    fireEvent.pointerUp(stage, { pointerId: 31, clientX: 8, clientY: 8 })
    const paraFrente = await waitFor(() =>
      screen.getByRole('button', { name: COPY.vector.toFront }),
    )
    expect(paraFrente.hasAttribute('disabled')).toBe(false)
    fireEvent.click(paraFrente)
    await waitFor(() => {
      const xs = [...stage.querySelectorAll('rect[fill="#78dc52"]')].map((r) => r.getAttribute('x'))
      // As duas do grupo passaram na frente da solta, na ordem em que estavam.
      expect(xs).toEqual(['200', '0', '40'])
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

  it('a Mão mostra a mãozinha ABERTA, e arrastando ela FECHA', async () => {
    await openVectorEditor()
    const stage = measureStage()
    // `cursor: grab` é prefixo de `grabbing` — casar com o `;` do fim da regra.
    const cursorOf = (): string => stage.getAttribute('style') ?? ''
    expect(cursorOf()).not.toContain('cursor')

    fireEvent.click(screen.getByRole('button', { name: COPY.vector.pan }))
    await waitFor(() => {
      expect(cursorOf()).toMatch(/cursor:\s*grab\s*;/)
    })

    fireEvent.pointerDown(stage, { isPrimary: true, pointerId: 1, clientX: 40, clientY: 40 })
    await waitFor(() => {
      expect(cursorOf()).toContain('grabbing')
    })

    fireEvent.pointerUp(stage, { pointerId: 1 })
    await waitFor(() => {
      expect(cursorOf()).toMatch(/cursor:\s*grab\s*;/)
    })
  })

  it('segurar ESPAÇO também fecha a mão no arrasto, com outra ferramenta', async () => {
    await openVectorEditor()
    const stage = measureStage()
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.brush }))
    fireEvent.keyDown(window, { key: ' ' })
    await waitFor(() => {
      expect(stage.getAttribute('style') ?? '').toMatch(/cursor:\s*grab\s*;/)
    })
    fireEvent.pointerDown(stage, { isPrimary: true, pointerId: 1, clientX: 30, clientY: 30 })
    await waitFor(() => {
      expect(stage.getAttribute('style') ?? '').toContain('grabbing')
    })
    fireEvent.pointerUp(stage, { pointerId: 1 })
    fireEvent.keyUp(window, { key: ' ' })
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

  it('com um ponto escolhido, abre o caminho NAQUELE ponto', async () => {
    await openVectorEditor()
    const stage = measureStage()
    await drawQuad(stage)
    startNodeEditing()
    await waitFor(() => {
      expect(nodeCircles(stage).length).toBe(4)
    })
    // Escolhe o 3o no (300,250) e pede a tesoura.
    const alvo = nodeCircles(stage)[2]
    if (!alvo) throw new Error('sem no 2')
    tapNode(alvo, 3, [300, 250])
    await waitFor(() => {
      expect(chosenNodes(stage).length).toBe(1)
    })
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.nodeOpenHere }))

    await waitFor(() => {
      const path = stage.querySelector('path')
      expect(path).toBeTruthy()
      // Virou traco aberto (sem Z) e comeca no ponto escolhido.
      expect(path?.getAttribute('d')?.includes('Z')).toBe(false)
      expect(path?.getAttribute('d')?.startsWith('M 300 250')).toBe(true)
    })
    // Ganhou o no da emenda e nenhuma escolha atravessou a edicao.
    expect(nodeCircles(stage).length).toBe(5)
    expect(chosenNodes(stage).length).toBe(0)
  })

  it('cortar um traco aberto no miolo vira DUAS formas', async () => {
    await openVectorEditor()
    const stage = measureStage()
    await drawQuad(stage)
    startNodeEditing()
    // Abre primeiro (sem no escolhido = o interruptor de sempre).
    fireEvent.click(await screen.findByRole('button', { name: COPY.vector.nodeOpen }))
    await waitFor(() => {
      expect(stage.querySelectorAll('path').length).toBe(1)
    })
    const meio = nodeCircles(stage)[1]
    if (!meio) throw new Error('sem no do miolo')
    tapNode(meio, 4, [300, 100])
    await waitFor(() => {
      expect(chosenNodes(stage).length).toBe(1)
    })
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.nodeCut }))

    await waitFor(() => {
      // ⚠️ Escopo no PALCO: as miniaturas do painel Camadas tambem tem <path>.
      expect(stage.querySelectorAll('path').length).toBe(2)
    })
    // A metade que ficou selecionada guarda o id, entao a faixa de pontos vive.
    expect(screen.getByRole('toolbar', { name: COPY.vector.nodeBar })).toBeTruthy()
    expect(screen.getByText(COPY.vector.nodeCutDone)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
    await waitFor(() => {
      expect(stage.querySelectorAll('path').length).toBe(1)
    })
  })

  it('cortar numa PONTA avisa e nao corta', async () => {
    await openVectorEditor()
    const stage = measureStage()
    await drawQuad(stage)
    startNodeEditing()
    fireEvent.click(await screen.findByRole('button', { name: COPY.vector.nodeOpen }))
    await waitFor(() => {
      expect(stage.querySelectorAll('path').length).toBe(1)
    })
    const ponta = nodeCircles(stage)[0]
    if (!ponta) throw new Error('sem ponta')
    tapNode(ponta, 5, [100, 100])
    await waitFor(() => {
      expect(chosenNodes(stage).length).toBe(1)
    })
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.nodeCut }))
    await waitFor(() => {
      expect(screen.getByText(COPY.vector.nodeCutEndpoint)).toBeTruthy()
    })
    expect(stage.querySelectorAll('path').length).toBe(1)
  })

  it('com DOIS pontos escolhidos a tesoura fica desligada', async () => {
    await openVectorEditor()
    const stage = measureStage()
    await drawQuad(stage)
    startNodeEditing()
    await waitFor(() => {
      expect(nodeCircles(stage).length).toBe(4)
    })
    fireEvent.pointerDown(stage, { isPrimary: true, pointerId: 6, clientX: 50, clientY: 50 })
    fireEvent.pointerMove(stage, { pointerId: 6, clientX: 320, clientY: 150 })
    fireEvent.pointerUp(stage, { pointerId: 6 })
    await waitFor(() => {
      expect(chosenNodes(stage).length).toBe(2)
    })
    const tesoura = screen.getByRole('button', {
      name: COPY.vector.nodeOpenHere,
    }) as HTMLButtonElement
    expect(tesoura.disabled).toBe(true)
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

  it('com pontos escolhidos, suavizar alcanca SO eles e a escolha continua valendo', async () => {
    await openVectorEditor()
    const stage = measureStage()
    await drawQuad(stage)
    startNodeEditing()
    await waitFor(() => {
      expect(nodeCircles(stage).length).toBe(4)
    })
    expect(handleCircles(stage).length).toBe(0)
    // Sem escolha o rotulo promete o traco INTEIRO.
    expect(screen.getByRole('button', { name: COPY.vector.nodeSimplify })).toBeTruthy()

    // Laco nos dois de cima (mesmo gesto do teste de curva/reta).
    fireEvent.pointerDown(stage, { isPrimary: true, pointerId: 21, clientX: 40, clientY: 40 })
    fireEvent.pointerMove(stage, { pointerId: 21, clientX: 320, clientY: 150 })
    fireEvent.pointerUp(stage, { pointerId: 21 })
    await waitFor(() => {
      expect(chosenNodes(stage).length).toBe(2)
    })
    // Com escolha o rotulo TROCA: ele diz o alcance antes do toque.
    expect(screen.queryByRole('button', { name: COPY.vector.nodeSimplify })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: COPY.vector.nodeSimplifyPart }))
    await waitFor(() => {
      expect(handleCircles(stage).length).toBe(4)
    })
    // Os dois nós escolhidos curvam os três trechos que encostam neles. O
    // quarto trecho continua RETO: se a UI esquecer a seleção e suavizar o
    // traço inteiro, aparecem 4 comandos C e esta prova fica vermelha.
    const d = stage.querySelector('path')?.getAttribute('d') ?? ''
    expect(d.match(/\bC\b/g)).toHaveLength(3)
    expect(d.match(/\bL\b/g)).toHaveLength(1)
    // Trecho de 2 nao tem miolo: nenhum ponto sumiu...
    expect(nodeCircles(stage).length).toBe(4)
    // ...entao a edicao nao foi ESTRUTURAL e a escolha sobrevive (o indice
    // velho continua valendo). Limpar aqui obrigaria a escolher de novo.
    expect(chosenNodes(stage).length).toBe(2)
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

describe('Misturar formas (pathfinder)', () => {
  /** Duas formas SOBREPOSTAS e o laço que pega as duas. */
  async function duasSobrepostas(stage: HTMLElement): Promise<void> {
    fireEvent.click(screen.getByRole('button', { name: COPY.tools.rect }))
    drawRect(stage, [16, 16], [80, 80])
    drawRect(stage, [48, 48], [112, 112])
    await waitFor(() => {
      expect(stage.querySelectorAll('rect[fill="#78dc52"]').length).toBe(2)
    })
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.select }))
    fireEvent.pointerDown(stage, { isPrimary: true, pointerId: 1, clientX: 8, clientY: 8 })
    fireEvent.pointerMove(stage, { pointerId: 1, clientX: 140, clientY: 140 })
    fireEvent.pointerUp(stage, { pointerId: 1 })
    await waitFor(() => {
      expect(screen.getByRole('button', { name: COPY.vector.selGroup })).toBeTruthy()
    })
  }

  const QUATRO = [
    COPY.vector.selUnite,
    COPY.vector.selMinusFront,
    COPY.vector.selIntersect,
    COPY.vector.selExclude,
  ]

  it('o bloco só existe com DUAS formas escolhidas', async () => {
    await openVectorEditor()
    const stage = measureStage()
    fireEvent.click(screen.getByRole('button', { name: COPY.tools.rect }))
    drawRect(stage, [16, 16], [80, 80])
    // Com UMA selecionada (o desenho já deixa a nova escolhida) não há mistura.
    await waitFor(() => {
      expect(screen.getByRole('toolbar', { name: COPY.vector.selectionBar })).toBeTruthy()
    })
    expect(screen.queryByRole('button', { name: COPY.vector.selUnite })).toBeNull()

    drawRect(stage, [48, 48], [112, 112])
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.select }))
    fireEvent.pointerDown(stage, { isPrimary: true, pointerId: 1, clientX: 8, clientY: 8 })
    fireEvent.pointerMove(stage, { pointerId: 1, clientX: 140, clientY: 140 })
    fireEvent.pointerUp(stage, { pointerId: 1 })
    await waitFor(() => {
      for (const nome of QUATRO) {
        expect(screen.getByRole('button', { name: nome })).toBeTruthy()
      }
    })
  })

  it('⭐⭐ unir troca duas por uma, a faixa SOBREVIVE, e UM desfazer devolve as duas', async () => {
    await openVectorEditor()
    const stage = measureStage()
    await duasSobrepostas(stage)

    fireEvent.click(screen.getByRole('button', { name: COPY.vector.selUnite }))
    await waitFor(() => {
      // ⚠️ Escopo no PALCO: as miniaturas do painel Camadas também têm path.
      expect(stage.querySelectorAll('rect[fill="#78dc52"]').length).toBe(0)
      expect(stage.querySelectorAll('path[fill="#78dc52"]').length).toBe(1)
    })
    // ⭐ A faixa NÃO desmontou: o resultado herdou o id do de trás, então a
    // seleção não ficou órfã. Ela voltou a ser a de UMA forma selecionada.
    expect(screen.getByRole('toolbar', { name: COPY.vector.selectionBar })).toBeTruthy()
    expect(screen.getByRole('button', { name: COPY.vector.selRemove })).toBeTruthy()
    expect(screen.queryByRole('button', { name: COPY.vector.selUnite })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
    await waitFor(() => {
      // ⚠️ ANTI-VÁCUO do "um commit só": com DOIS commits (tirar, depois pôr)
      // um desfazer devolveria uma forma, não duas.
      expect(stage.querySelectorAll('rect[fill="#78dc52"]').length).toBe(2)
    })
  })

  it('⭐ "tirar a da frente" abre um FURO (o traço fica com dois sub-caminhos)', async () => {
    await openVectorEditor()
    const stage = measureStage()
    fireEvent.click(screen.getByRole('button', { name: COPY.tools.rect }))
    drawRect(stage, [16, 16], [128, 128])
    drawRect(stage, [48, 48], [96, 96])
    await waitFor(() => {
      expect(stage.querySelectorAll('rect[fill="#78dc52"]').length).toBe(2)
    })
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.select }))
    fireEvent.pointerDown(stage, { isPrimary: true, pointerId: 1, clientX: 8, clientY: 8 })
    fireEvent.pointerMove(stage, { pointerId: 1, clientX: 160, clientY: 160 })
    fireEvent.pointerUp(stage, { pointerId: 1 })
    await waitFor(() => {
      expect(screen.getByRole('button', { name: COPY.vector.selMinusFront })).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.selMinusFront }))
    await waitFor(() => {
      expect(stage.querySelectorAll('path[fill="#78dc52"]').length).toBe(1)
    })
    const d = stage.querySelector('path[fill="#78dc52"]')?.getAttribute('d') ?? ''
    // Dois M = contorno de fora + a parede do buraco.
    expect(d.match(/M /g)).toHaveLength(2)
  })

  it('recusa com LINHA na seleção, e o desenho fica intacto', async () => {
    await openVectorEditor()
    const stage = measureStage()
    fireEvent.click(screen.getByRole('button', { name: COPY.tools.rect }))
    drawRect(stage, [16, 16], [80, 80])
    fireEvent.click(screen.getByRole('button', { name: COPY.tools.line }))
    drawRect(stage, [24, 24], [72, 72])
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.select }))
    fireEvent.pointerDown(stage, { isPrimary: true, pointerId: 1, clientX: 8, clientY: 8 })
    fireEvent.pointerMove(stage, { pointerId: 1, clientX: 140, clientY: 140 })
    fireEvent.pointerUp(stage, { pointerId: 1 })
    await waitFor(() => {
      expect(screen.getByRole('button', { name: COPY.vector.selUnite })).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.selUnite }))
    await waitFor(() => {
      expect(screen.getByText(COPY.vector.pathfinderSkips)).toBeTruthy()
    })
    expect(stage.querySelectorAll('rect[fill="#78dc52"]').length).toBe(1)
    expect(stage.querySelectorAll('line').length).toBe(1)
  })

  it('recusa quando as formas NÃO se encostam', async () => {
    await openVectorEditor()
    const stage = measureStage()
    fireEvent.click(screen.getByRole('button', { name: COPY.tools.rect }))
    drawRect(stage, [16, 16], [48, 48])
    drawRect(stage, [200, 200], [240, 240])
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.select }))
    fireEvent.pointerDown(stage, { isPrimary: true, pointerId: 1, clientX: 8, clientY: 8 })
    fireEvent.pointerMove(stage, { pointerId: 1, clientX: 300, clientY: 300 })
    fireEvent.pointerUp(stage, { pointerId: 1 })
    await waitFor(() => {
      expect(screen.getByRole('button', { name: COPY.vector.selUnite })).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.selUnite }))
    await waitFor(() => {
      expect(screen.getByText(COPY.vector.pathfinderApart)).toBeTruthy()
    })
    expect(stage.querySelectorAll('rect[fill="#78dc52"]').length).toBe(2)
  })

  it('⭐ a faixa dos pontos EXPLICA em vez de sumir', async () => {
    await openVectorEditor()
    const stage = measureStage()
    // Um retângulo já não se edita por pontos: antes deste lote a faixa inteira
    // sumia em silêncio, o que lia como "quebrou".
    fireEvent.click(screen.getByRole('button', { name: COPY.tools.rect }))
    drawRect(stage, [16, 16], [80, 80])
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.reshape }))
    await waitFor(() => {
      expect(screen.getByRole('toolbar', { name: COPY.vector.nodeBar })).toBeTruthy()
    })
    expect(screen.getByText(COPY.vector.nodeUneditable)).toBeTruthy()
  })

  it('no TOQUE só o Unir aparece na barra flutuante', async () => {
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
      await duasSobrepostas(stage)
      expect(screen.getByRole('button', { name: COPY.vector.selUnite })).toBeTruthy()
      expect(screen.queryByRole('button', { name: COPY.vector.selIntersect })).toBeNull()
      expect(screen.queryByRole('button', { name: COPY.vector.selMinusFront })).toBeNull()
    } finally {
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        value: originalMatchMedia,
      })
    }
  })
})

/**
 * Conta-gotas da JANELINHA de cor do degradê (modo de captura): as duas janelas
 * fecham, ela toca numa forma, a cor entra na ponta e a janela do Degradê volta.
 */
describe('pegar uma cor do desenho (conta-gotas na janelinha do degradê)', () => {
  /** B verde em (100..160) e A vermelho em (16..64); A fica selecionado. */
  async function drawTwoRects(): Promise<HTMLElement> {
    const stage = measureStage()
    fireEvent.click(screen.getByRole('button', { name: COPY.tools.rect }))
    drawRect(stage, [100, 100], [160, 160])
    await waitFor(() => {
      expect(stage.querySelectorAll('rect[fill="#78dc52"]').length).toBe(1)
    })
    drawRect(stage, [16, 16], [64, 64])
    await waitFor(() => {
      expect(stage.querySelectorAll('rect[fill="#78dc52"]').length).toBe(2)
    })
    // A (recém-desenhado, selecionado) vira vermelho pelo swatch da paleta.
    fireEvent.click(screen.getByRole('button', { name: `${COPY.vector.fill}: vermelho` }))
    await waitFor(() => {
      expect(stage.querySelectorAll('rect[fill="#ff2121"]').length).toBe(1)
    })
    return stage
  }

  /** Abre Degradê → a ponta pedida → o botão do conta-gotas. */
  async function startPicking(end: 'from' | 'to'): Promise<void> {
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.gradient }))
    fireEvent.click(
      await screen.findByRole('button', {
        name: end === 'from' ? COPY.vector.gradientFrom : COPY.vector.gradientTo,
      }),
    )
    fireEvent.click(await screen.findByRole('button', { name: COPY.colorPicker.pickFromDrawing }))
    await waitFor(() => {
      expect(screen.getByText(COPY.vector.pickColorHint)).toBeTruthy()
    })
  }

  function pressed(name: string): string | null {
    return screen.getByRole('button', { name }).getAttribute('aria-pressed')
  }

  it('o botão fecha as DUAS janelas e entra na captura: mira, dica, sem alças', async () => {
    await openVectorEditor()
    const stage = await drawTwoRects()
    // Com A selecionado, as 8 alças estão no palco (os testes de cima contam 8).
    expect(stage.querySelectorAll('rect[width="14"]').length).toBe(8)
    await startPicking('from')

    expect(document.querySelector('[data-pinta-dialog]')).toBeNull()
    expect(screen.queryByLabelText(COPY.colorPicker.hex)).toBeNull()
    expect(pressed(COPY.tools.picker)).toBe('true')
    expect(stage.getAttribute('style') ?? '').toContain('crosshair')
    expect(stage.querySelectorAll('rect[width="14"]').length).toBe(0)
  })

  it('tocar numa forma leva a cor DELA para a ponta, devolve a ferramenta e reabre o Degradê em um desfazer', async () => {
    await openVectorEditor()
    const stage = await drawTwoRects()
    await startPicking('from')

    // O toque cai NO retângulo B (verde) e borbulha até o palco.
    const alvo = stage.querySelector('rect[fill="#78dc52"]')
    if (!alvo) throw new Error('retângulo verde esperado')
    fireEvent.pointerDown(alvo, { isPrimary: true, pointerId: 1, clientX: 130, clientY: 130 })

    await screen.findByRole('dialog', { name: COPY.vector.gradient })
    expect(screen.queryByText(COPY.vector.pickColorHint)).toBeNull()
    expect(pressed(COPY.tools.rect)).toBe('true')
    await waitFor(() => {
      // A (selecionado) ganhou o degradê que COMEÇA na cor de B.
      const stops = stage.querySelectorAll('linearGradient stop')
      expect(stops[0]?.getAttribute('stop-color')).toBe('#78dc52')
      expect(stage.querySelectorAll('rect[fill^="url(#"]').length).toBe(1)
    })
    // A cor pega também vira "recente" na janelinha.
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.gradientFrom }))
    expect(await screen.findByRole('button', { name: '#78dc52' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: COPY.gallery.cancel }))
    fireEvent.click(screen.getByRole('button', { name: COPY.a11y.close }))

    // UM desfazer devolve A ao vermelho sólido; B continua verde.
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
    await waitFor(() => {
      expect(stage.querySelectorAll('rect[fill="#ff2121"]').length).toBe(1)
      expect(stage.querySelectorAll('rect[fill="#78dc52"]').length).toBe(1)
      expect(stage.querySelectorAll('rect[fill^="url(#"]').length).toBe(0)
    })
  })

  it('a ponta do FIM também pega', async () => {
    await openVectorEditor()
    const stage = await drawTwoRects()
    await startPicking('to')
    const alvo = stage.querySelector('rect[fill="#78dc52"]')
    if (!alvo) throw new Error('retângulo verde esperado')
    fireEvent.pointerDown(alvo, { isPrimary: true, pointerId: 1, clientX: 130, clientY: 130 })
    await screen.findByRole('dialog', { name: COPY.vector.gradient })
    await waitFor(() => {
      const stops = stage.querySelectorAll('linearGradient stop')
      expect(stops[1]?.getAttribute('stop-color')).toBe('#78dc52')
    })
  })

  it('tocar no vazio não sai da captura; o X volta ao Degradê sem mudar nada', async () => {
    await openVectorEditor()
    const stage = await drawTwoRects()
    await startPicking('from')

    fireEvent.pointerDown(stage, { isPrimary: true, pointerId: 1, clientX: 300, clientY: 300 })
    expect(screen.getByText(COPY.vector.pickColorHint)).toBeTruthy()
    expect(screen.queryByRole('dialog')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: COPY.vector.pickColorCancel }))
    await screen.findByRole('dialog', { name: COPY.vector.gradient })
    expect(screen.queryByText(COPY.vector.pickColorHint)).toBeNull()
    expect(pressed(COPY.tools.rect)).toBe('true')
    expect(stage.querySelectorAll('rect[fill="#ff2121"]').length).toBe(1)
    expect(stage.querySelectorAll('rect[fill^="url(#"]').length).toBe(0)
  })

  it('Esc cancela, reabre o Degradê e NÃO solta a seleção', async () => {
    await openVectorEditor()
    await drawTwoRects()
    await startPicking('from')

    fireEvent.keyDown(document.body, { key: 'Escape' })
    await screen.findByRole('dialog', { name: COPY.vector.gradient })
    expect(screen.queryByText(COPY.vector.pickColorHint)).toBeNull()
    // O Esc foi consumido em captura: o "soltar a seleção" dos atalhos não rodou.
    expect(screen.getByRole('toolbar', { name: COPY.vector.selectionBar })).toBeTruthy()
  })

  it('escolher outra ferramenta cancela SEM reabrir o Degradê', async () => {
    await openVectorEditor()
    await drawTwoRects()
    await startPicking('from')

    fireEvent.click(screen.getByRole('button', { name: COPY.vector.brush }))
    await waitFor(() => {
      expect(screen.queryByText(COPY.vector.pickColorHint)).toBeNull()
    })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(pressed(COPY.vector.brush)).toBe('true')
  })

  it('na tela estreita a barra flutuante da seleção dá lugar à faixinha e volta ao cancelar', async () => {
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
      // Na tela estreita a paleta (e a Aparência) moram no disclosure: abre antes.
      fireEvent.click(screen.getByRole('button', { name: COPY.vector.panelsTitle }))
      await drawTwoRects()
      expect(screen.getByRole('toolbar', { name: COPY.vector.selectionBar })).toBeTruthy()
      await startPicking('from')
      expect(screen.queryByRole('toolbar', { name: COPY.vector.selectionBar })).toBeNull()
      expect(screen.getByRole('toolbar', { name: COPY.vector.pickColorBar })).toBeTruthy()

      fireEvent.click(screen.getByRole('button', { name: COPY.vector.pickColorCancel }))
      await screen.findByRole('dialog', { name: COPY.vector.gradient })
      expect(screen.getByRole('toolbar', { name: COPY.vector.selectionBar })).toBeTruthy()
    } finally {
      Object.defineProperty(window, 'matchMedia', { configurable: true, value: originalMatchMedia })
    }
  })

  it('o conta-gotas COMUM segue adotando o estilo da forma tocada', async () => {
    await openVectorEditor()
    const stage = await drawTwoRects()
    fireEvent.click(screen.getByRole('button', { name: COPY.tools.picker }))
    const alvo = stage.querySelector('rect[fill="#78dc52"]')
    if (!alvo) throw new Error('retângulo verde esperado')
    fireEvent.pointerDown(alvo, { isPrimary: true, pointerId: 1, clientX: 130, clientY: 130 })
    await waitFor(() => {
      const slot = screen
        .getAllByRole('button', { name: `${COPY.vector.fill}: verde` })
        .find((button) => button.getAttribute('title') === COPY.vector.fill)
      expect(slot).toBeTruthy()
    })
    // Adotar NÃO re-estiliza a seleção: A continua vermelho.
    expect(stage.querySelectorAll('rect[fill="#ff2121"]').length).toBe(1)
  })

  it('figura de pixel art avisa que não tem uma cor só e continua na captura', async () => {
    await openVectorEditor(
      undefined,
      async (seed) => {
        const { createVectorBackgroundAsset } = await import('../../core/project')
        const figura = createVectorBackgroundAsset({ name: 'figura', width: 480, height: 360 })
        await seed.getState().importAssets([
          {
            ...figura,
            shapes: [
              {
                id: 'img1',
                type: 'image',
                x: 200,
                y: 200,
                w: 100,
                h: 100,
                src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
                fill: 'none',
                stroke: null,
                opacity: 1,
                rotation: 0,
              },
            ],
          },
        ])
      },
      'figura',
    )
    const stage = measureStage()
    fireEvent.click(screen.getByRole('button', { name: COPY.tools.rect }))
    drawRect(stage, [16, 16], [64, 64])
    await waitFor(() => {
      expect(stage.querySelectorAll('rect[fill="#78dc52"]').length).toBe(1)
    })
    await startPicking('from')
    const figuraEl = stage.querySelector('image')
    if (!figuraEl) throw new Error('figura esperada')
    fireEvent.pointerDown(figuraEl, { isPrimary: true, pointerId: 1, clientX: 250, clientY: 250 })
    expect(await screen.findByText(COPY.vector.pickColorNoColor)).toBeTruthy()
    expect(screen.getByText(COPY.vector.pickColorHint)).toBeTruthy()
    expect(pressed(COPY.tools.picker)).toBe('true')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('reabrir o Degradê no meio da captura e pedir a OUTRA ponta: a última pedida vence', async () => {
    await openVectorEditor()
    const stage = await drawTwoRects()
    await startPicking('to')
    // Com a faixinha na tela, o botão "Degradê" do painel continua vivo.
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.gradient }))
    fireEvent.click(await screen.findByRole('button', { name: COPY.vector.gradientFrom }))
    fireEvent.click(await screen.findByRole('button', { name: COPY.colorPicker.pickFromDrawing }))
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull()
    })
    const alvo = stage.querySelector('rect[fill="#78dc52"]')
    if (!alvo) throw new Error('retângulo verde esperado')
    fireEvent.pointerDown(alvo, { isPrimary: true, pointerId: 1, clientX: 130, clientY: 130 })
    await screen.findByRole('dialog', { name: COPY.vector.gradient })
    await waitFor(() => {
      // A cor foi para o COMEÇO (a última pedida), e o fim ficou o branco de fábrica.
      const stops = stage.querySelectorAll('linearGradient stop')
      expect(stops[0]?.getAttribute('stop-color')).toBe('#78dc52')
      expect(stops[1]?.getAttribute('stop-color')).toBe('#ffffff')
    })
    expect(pressed(COPY.tools.rect)).toBe('true')
  })

  it('ao fechar o Degradê reaberto pela captura, o foco volta ao botão "Degradê"', async () => {
    await openVectorEditor()
    const stage = await drawTwoRects()
    await startPicking('from')
    const alvo = stage.querySelector('rect[fill="#78dc52"]')
    if (!alvo) throw new Error('retângulo verde esperado')
    fireEvent.pointerDown(alvo, { isPrimary: true, pointerId: 1, clientX: 130, clientY: 130 })
    await screen.findByRole('dialog', { name: COPY.vector.gradient })
    fireEvent.click(screen.getByRole('button', { name: COPY.a11y.close }))
    await waitFor(() => {
      expect(document.activeElement).toBe(
        screen.getByRole('button', { name: COPY.vector.gradient }),
      )
    })
  })

  it('pegar a mesma cor que já está na ponta não grava um desfazer vazio', async () => {
    await openVectorEditor()
    const stage = await drawTwoRects()
    const alvo = stage.querySelector('rect[fill="#78dc52"]')
    if (!alvo) throw new Error('retângulo verde esperado')
    // 1ª captura: A ganha o degradê que começa no verde de B (uma entrada de desfazer).
    await startPicking('from')
    fireEvent.pointerDown(alvo, { isPrimary: true, pointerId: 1, clientX: 130, clientY: 130 })
    await screen.findByRole('dialog', { name: COPY.vector.gradient })
    // 2ª captura da MESMA cor para a MESMA ponta: nada muda, nada entra no histórico.
    fireEvent.click(await screen.findByRole('button', { name: COPY.vector.gradientFrom }))
    fireEvent.click(await screen.findByRole('button', { name: COPY.colorPicker.pickFromDrawing }))
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull()
    })
    fireEvent.pointerDown(alvo, { isPrimary: true, pointerId: 1, clientX: 130, clientY: 130 })
    await screen.findByRole('dialog', { name: COPY.vector.gradient })
    fireEvent.click(screen.getByRole('button', { name: COPY.a11y.close }))
    // UM desfazer devolve o vermelho sólido: se a 2ª captura tivesse gravado, A
    // ainda estaria em degradê.
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
    await waitFor(() => {
      expect(stage.querySelectorAll('rect[fill="#ff2121"]').length).toBe(1)
      expect(stage.querySelectorAll('rect[fill^="url(#"]').length).toBe(0)
    })
  })

  it('na tela estreita, recolher "Cores e camadas" no meio da captura não perde a volta do Degradê', async () => {
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
      fireEvent.click(screen.getByRole('button', { name: COPY.vector.panelsTitle }))
      await drawTwoRects()
      await startPicking('from')
      // Recolher o disclosure DESMONTA o painel de Aparência (o botão some)...
      fireEvent.click(screen.getByRole('button', { name: COPY.vector.panelsTitle }))
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: COPY.vector.gradient })).toBeNull()
      })
      // ...mas a janela vive no palco: o X devolve o Degradê mesmo assim.
      fireEvent.click(screen.getByRole('button', { name: COPY.vector.pickColorCancel }))
      await screen.findByRole('dialog', { name: COPY.vector.gradient })
    } finally {
      Object.defineProperty(window, 'matchMedia', { configurable: true, value: originalMatchMedia })
    }
  })

  /** A cor de uma amostra (`style.backgroundColor`), em hex minúsculo. */
  function swatchHex(el: HTMLElement): string {
    const value = el.style.backgroundColor.trim()
    const m = /^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/.exec(value)
    if (!m) return value.toLowerCase()
    return `#${[m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, '0')).join('')}`
  }

  const azul = () => `${COPY.vector.fill}: ${COPY.colorNames['#003fad']}`
  /** Rótulo de um quadradinho da paleta ENQUANTO a captura está ligada. */
  const naCaptura = (hex: string) => `${COPY.vector.pickColorTake}: ${COPY.colorNames[hex]}`

  /** As paradas de todos os degradês do palco, na ordem do documento (de baixo para cima). */
  function gradientes(stage: HTMLElement): (string | null)[][] {
    return [...stage.querySelectorAll('linearGradient')].map((g) =>
      [...g.querySelectorAll('stop')].map((s) => s.getAttribute('stop-color')),
    )
  }

  /** Laço com a Selecionar que pega B e A (não uma eventual C em 200..260). */
  async function lacoAB(stage: HTMLElement): Promise<void> {
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.select }))
    fireEvent.pointerDown(stage, { isPrimary: true, pointerId: 1, clientX: 8, clientY: 8 })
    fireEvent.pointerMove(stage, { pointerId: 1, clientX: 170, clientY: 170 })
    fireEvent.pointerUp(stage, { pointerId: 1 })
    await waitFor(() => {
      const marcadas = screen
        .getAllByRole('button', { name: /^Selecionar: / })
        .filter((b) => b.getAttribute('aria-pressed') === 'true')
      expect(marcadas.length).toBe(2)
    })
  }

  /** A (vermelha, selecionada) ganha vermelho→verde pela captura do fim em B; a janela fecha. */
  async function aComDegrade(stage: HTMLElement): Promise<void> {
    await startPicking('to')
    const b = stage.querySelector('rect[fill="#78dc52"]')
    if (!b) throw new Error('retângulo verde esperado')
    fireEvent.pointerDown(b, { isPrimary: true, pointerId: 1, clientX: 130, clientY: 130 })
    await screen.findByRole('dialog', { name: COPY.vector.gradient })
    fireEvent.click(screen.getByRole('button', { name: COPY.a11y.close }))
    await waitFor(() => {
      expect(gradientes(stage)).toEqual([['#ff2121', '#78dc52']])
    })
  }

  it('seleção com VÁRIAS formas: a janela inspeciona a primeira forma, e cada uma guarda o PRÓPRIO começo', async () => {
    await openVectorEditor()
    const stage = await drawTwoRects()
    // C azul: o estilo vigente vira azul (C fica selecionado ao nascer).
    fireEvent.click(screen.getByRole('button', { name: COPY.tools.rect }))
    drawRect(stage, [200, 200], [260, 260])
    // C nasce com o estilo vigente (vermelho, herdado de A) e é a selecionada.
    await waitFor(() => {
      expect(stage.querySelectorAll('rect[fill="#ff2121"]').length).toBe(2)
    })
    fireEvent.click(screen.getByRole('button', { name: azul() }))
    await waitFor(() => {
      expect(stage.querySelectorAll('rect[fill="#003fad"]').length).toBe(1)
    })
    // Laço com a Selecionar pega B e A (não C): seleção MÚLTIPLA, `single` nulo.
    await lacoAB(stage)
    // A janela mostra o preenchimento da PRIMEIRA forma selecionada (B, verde)...
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.gradient }))
    const fromSwatch = await screen.findByRole('button', { name: COPY.vector.gradientFrom })
    expect(swatchHex(fromSwatch)).toBe('#78dc52')
    // ...e o slot da CAIXA concorda (o estilo sincroniza da inspecionada; antes
    // ficava no azul de C, e a criança via duas cores para a mesma seleção).
    const slotVerde = screen
      .getAllByRole('button', { name: `${COPY.vector.fill}: ${COPY.colorNames['#78dc52']}` })
      .some((b) => b.querySelector('[data-vector-color-shape="fill"]'))
    expect(slotVerde).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: COPY.a11y.close }))
    // Pegar a cor do FIM em C: cada forma guarda o PRÓPRIO começo (B verde, A
    // vermelha), na ordem do documento. Antes as duas recebiam o começo do estilo.
    await startPicking('to')
    const c = stage.querySelector('rect[fill="#003fad"]')
    if (!c) throw new Error('retângulo azul esperado')
    fireEvent.pointerDown(c, { isPrimary: true, pointerId: 1, clientX: 230, clientY: 230 })
    await screen.findByRole('dialog', { name: COPY.vector.gradient })
    await waitFor(() => {
      expect(gradientes(stage)).toEqual([
        ['#78dc52', '#003fad'],
        ['#ff2121', '#003fad'],
      ])
    })
    expect(swatchHex(screen.getByRole('button', { name: COPY.vector.gradientTo }))).toBe('#003fad')
  })

  it('o conta-gotas da CAIXA não faz a janela esquecer o degradê da forma selecionada', async () => {
    await openVectorEditor()
    const stage = await drawTwoRects()
    // C azul (fonte para o conta-gotas da caixa); depois A volta a ser a selecionada.
    fireEvent.click(screen.getByRole('button', { name: COPY.tools.rect }))
    drawRect(stage, [200, 200], [260, 260])
    // C nasce com o estilo vigente (vermelho, herdado de A) e é a selecionada.
    await waitFor(() => {
      expect(stage.querySelectorAll('rect[fill="#ff2121"]').length).toBe(2)
    })
    fireEvent.click(screen.getByRole('button', { name: azul() }))
    await waitFor(() => {
      expect(stage.querySelectorAll('rect[fill="#003fad"]').length).toBe(1)
    })
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.select }))
    const a = stage.querySelector('rect[fill="#ff2121"]')
    if (!a) throw new Error('retângulo vermelho esperado')
    fireEvent.pointerDown(a, { isPrimary: true, pointerId: 1, clientX: 40, clientY: 40 })
    fireEvent.pointerUp(stage, { pointerId: 1 })
    // A ganha degradê verde→branco pela captura do começo em B.
    await startPicking('from')
    const b = stage.querySelector('rect[fill="#78dc52"]')
    if (!b) throw new Error('retângulo verde esperado')
    fireEvent.pointerDown(b, { isPrimary: true, pointerId: 1, clientX: 130, clientY: 130 })
    await screen.findByRole('dialog', { name: COPY.vector.gradient })
    fireEvent.click(screen.getByRole('button', { name: COPY.a11y.close }))
    // Conta-gotas da CAIXA em C: o estilo vira azul; A continua selecionada com o degradê.
    fireEvent.click(screen.getByRole('button', { name: COPY.tools.picker }))
    const c = stage.querySelector('rect[fill="#003fad"]')
    if (!c) throw new Error('retângulo azul esperado')
    fireEvent.pointerDown(c, { isPrimary: true, pointerId: 1, clientX: 230, clientY: 230 })
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: azul() }).length).toBeGreaterThanOrEqual(2)
    })
    // A janela mostra o degradê DE A (começo verde), não o azul adotado...
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.gradient }))
    const fromSwatch = await screen.findByRole('button', { name: COPY.vector.gradientFrom })
    expect(swatchHex(fromSwatch)).toBe('#78dc52')
    // ...e pegar a cor do FIM preserva esse começo.
    fireEvent.click(await screen.findByRole('button', { name: COPY.vector.gradientTo }))
    fireEvent.click(await screen.findByRole('button', { name: COPY.colorPicker.pickFromDrawing }))
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull()
    })
    fireEvent.pointerDown(c, { isPrimary: true, pointerId: 1, clientX: 230, clientY: 230 })
    await screen.findByRole('dialog', { name: COPY.vector.gradient })
    await waitFor(() => {
      const stops = [...stage.querySelectorAll('linearGradient stop')].map((s) =>
        s.getAttribute('stop-color'),
      )
      expect(stops).toEqual(['#78dc52', '#003fad'])
    })
  })

  it('linha selecionada: pegar cor não grava desfazer vazio e o degradê fica no estilo', async () => {
    await openVectorEditor()
    const stage = await drawTwoRects()
    fireEvent.click(screen.getByRole('button', { name: COPY.tools.line }))
    drawRect(stage, [200, 200], [260, 260])
    await waitFor(() => {
      expect(stage.querySelector('line')).toBeTruthy()
    })
    await startPicking('from')
    const b = stage.querySelector('rect[fill="#78dc52"]')
    if (!b) throw new Error('retângulo verde esperado')
    fireEvent.pointerDown(b, { isPrimary: true, pointerId: 1, clientX: 130, clientY: 130 })
    await screen.findByRole('dialog', { name: COPY.vector.gradient })
    // A linha não tem preenchimento: nada muda no palco, e a janela guarda o
    // degradê no estilo (a amostra do começo mostra o verde pego).
    expect(stage.querySelectorAll('[fill^="url(#"]').length).toBe(0)
    expect(swatchHex(screen.getByRole('button', { name: COPY.vector.gradientFrom }))).toBe(
      '#78dc52',
    )
    fireEvent.click(screen.getByRole('button', { name: COPY.a11y.close }))
    // UM desfazer tira a LINHA (o último commit de verdade): não houve desfazer
    // vazio no meio.
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
    await waitFor(() => {
      expect(stage.querySelector('line')).toBeNull()
    })
    // O próximo retângulo nasce com o degradê que ficou no estilo.
    fireEvent.click(screen.getByRole('button', { name: COPY.tools.rect }))
    drawRect(stage, [300, 100], [360, 160])
    await waitFor(() => {
      expect(stage.querySelectorAll('rect[fill^="url(#"]').length).toBe(1)
    })
  })

  it('forma trancada: a janela não mente e o toast do cadeado avisa', async () => {
    await openVectorEditor()
    const stage = await drawTwoRects()
    // A (a de cima no painel Camadas) é trancada pelo cadeado e continua selecionada.
    fireEvent.click(
      screen.getAllByRole('button', {
        name: `${COPY.layers.lock}: ${COPY.vector.shapeNames.rect}`,
      })[0] as HTMLElement,
    )
    // O cadeado pode largar a seleção: o painel Camadas seleciona trancada de propósito.
    fireEvent.click(screen.getAllByRole('button', { name: /^Selecionar: / })[0] as HTMLElement)
    await waitFor(() => {
      expect(stage.querySelectorAll('rect[width="14"]').length).toBe(8)
    })
    await startPicking('from')
    const b = stage.querySelector('rect[fill="#78dc52"]')
    if (!b) throw new Error('retângulo verde esperado')
    fireEvent.pointerDown(b, { isPrimary: true, pointerId: 1, clientX: 130, clientY: 130 })
    expect(await screen.findByText(COPY.layers.lockedShapeWarning)).toBeTruthy()
    await screen.findByRole('dialog', { name: COPY.vector.gradient })
    // A continua vermelha e sólida; a amostra do começo mostra o vermelho DELA.
    expect(stage.querySelectorAll('rect[fill="#ff2121"]').length).toBe(1)
    expect(stage.querySelectorAll('rect[fill^="url(#"]').length).toBe(0)
    expect(swatchHex(screen.getByRole('button', { name: COPY.vector.gradientFrom }))).toBe(
      '#ff2121',
    )
  })

  it('personagem pequeno: colar e duplicar nascem DENTRO do papel, com a mesma régua', async () => {
    await openVectorEditor(
      undefined,
      async (seed) => {
        const { createVectorSpriteAsset } = await import('../../core/project')
        const heroi = createVectorSpriteAsset({ name: 'heroi', frameSize: 32 })
        const parado = heroi.animations[0]
        if (!parado) throw new Error('animação esperada')
        await seed.getState().importAssets([
          {
            ...heroi,
            animations: [
              {
                ...parado,
                frames: [
                  [
                    {
                      id: 'olho',
                      type: 'rect',
                      x: 20,
                      y: 20,
                      w: 8,
                      h: 8,
                      rx: 0,
                      fill: '#ff2121',
                      stroke: null,
                      opacity: 1,
                      rotation: 0,
                    },
                  ],
                ],
              },
            ],
          },
        ])
      },
      'heroi',
    )
    const stage = measureStage()
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.select }))
    const olho = stage.querySelector('rect[fill="#ff2121"]')
    if (!olho) throw new Error('olho esperado')
    fireEvent.pointerDown(olho, { isPrimary: true, pointerId: 1, clientX: 300, clientY: 300 })
    fireEvent.pointerUp(stage, { pointerId: 1 })
    fireEvent.keyDown(window, { key: 'c', ctrlKey: true })
    fireEvent.keyDown(window, { key: 'v', ctrlKey: true })
    const xs = () =>
      [...stage.querySelectorAll('rect[fill="#ff2121"]')].map((r) => Number(r.getAttribute('x')))
    // 20 + 8 + 12 passa dos 32 do papel: a cópia vai para o outro lado, em 8 (dentro).
    // (O toque acima seleciona pelo ELEMENTO tocado: o `measureStage` de 480×360
    // é o do cenário, e a coordenada 300 nem existe num papel de 32.)
    await waitFor(() => {
      expect(xs()).toEqual([20, 8])
    })
    // Duplicar a cópia (selecionada, em 8): +12 cairia EM CIMA do original em 20,
    // então a cópia vai para o próximo lugar livre (a folga de trás, 0). Mesma régua.
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.selDuplicate }))
    await waitFor(() => {
      expect(xs()).toEqual([20, 8, 0])
    })
  })

  it('na captura, uma cor da PALETA também serve de fonte (e "Sem cor" avisa)', async () => {
    await openVectorEditor()
    const stage = await drawTwoRects()
    await startPicking('to')
    // Os quadradinhos dizem o que fazem na captura ("Pegar esta cor", sem o canal
    // e sem `aria-pressed`, que é do estilo e não da captura).
    expect(screen.queryByRole('button', { name: azul() })).toBeNull()
    const azulNaCaptura = screen.getByRole('button', { name: naCaptura('#003fad') })
    expect(azulNaCaptura.hasAttribute('aria-pressed')).toBe(false)
    // "Sem cor" não é uma cor: avisa, a captura continua e A não muda.
    fireEvent.click(
      screen.getByRole('button', { name: `${COPY.vector.pickColorTake}: ${COPY.vector.none}` }),
    )
    expect(await screen.findByText(COPY.vector.pickColorNone)).toBeTruthy()
    expect(screen.getByText(COPY.vector.pickColorHint)).toBeTruthy()
    expect(stage.querySelectorAll('rect[fill="#ff2121"]').length).toBe(1)
    // Um swatch da paleta: a cor vai para a ponta pedida, sem apagar o degradê
    // (antes a paleta aplicava a cor SÓLIDA na forma e a captura seguia aberta).
    fireEvent.click(azulNaCaptura)
    await screen.findByRole('dialog', { name: COPY.vector.gradient })
    expect(screen.queryByText(COPY.vector.pickColorHint)).toBeNull()
    expect(pressed(COPY.tools.rect)).toBe('true')
    await waitFor(() => {
      const stops = [...stage.querySelectorAll('linearGradient stop')].map((s) =>
        s.getAttribute('stop-color'),
      )
      expect(stops).toEqual(['#ff2121', '#003fad'])
    })
    expect(swatchHex(screen.getByRole('button', { name: COPY.vector.gradientTo }))).toBe('#003fad')
  })

  it('a mesma cor numa ponta não engole a cor nas OUTRAS formas da seleção', async () => {
    await openVectorEditor()
    const stage = await drawTwoRects()
    await aComDegrade(stage)
    await lacoAB(stage)
    // "Cor do fim" = verde, que A JÁ tem na ponta: A sai igual (sem desfazer
    // vazio) e B, sólida, vira verde→verde. Antes o guard olhava só a
    // inspecionada e B não recebia nada.
    await startPicking('to')
    fireEvent.click(screen.getByRole('button', { name: naCaptura('#78dc52') }))
    await screen.findByRole('dialog', { name: COPY.vector.gradient })
    await waitFor(() => {
      expect(gradientes(stage)).toEqual([
        ['#78dc52', '#78dc52'],
        ['#ff2121', '#78dc52'],
      ])
    })
    fireEvent.click(screen.getByRole('button', { name: COPY.a11y.close }))
    // UM desfazer devolve B ao verde sólido; o degradê de A fica.
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
    await waitFor(() => {
      expect(stage.querySelectorAll('rect[fill="#78dc52"]').length).toBe(1)
      expect(gradientes(stage)).toEqual([['#ff2121', '#78dc52']])
    })
  })

  it('"Tirar o degradê" com várias: vivo se ALGUMA tem, e cada uma volta para o PRÓPRIO começo', async () => {
    await openVectorEditor()
    const stage = await drawTwoRects()
    // Sem degradê em ninguém, o botão fica desligado (não há o que tirar).
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.gradient }))
    const morto = await screen.findByRole('button', { name: COPY.vector.gradientOff })
    expect(morto.hasAttribute('disabled')).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: COPY.a11y.close }))
    await aComDegrade(stage)
    await lacoAB(stage)
    // A inspecionada (B, a de baixo) é sólida, mas A tem degradê: o botão está VIVO.
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.gradient }))
    const vivo = await screen.findByRole('button', { name: COPY.vector.gradientOff })
    expect(vivo.hasAttribute('disabled')).toBe(false)
    fireEvent.click(vivo)
    await waitFor(() => {
      expect(stage.querySelectorAll('rect[fill^="url(#"]').length).toBe(0)
      expect(stage.querySelectorAll('rect[fill="#ff2121"]').length).toBe(1)
      expect(stage.querySelectorAll('rect[fill="#78dc52"]').length).toBe(1)
    })
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
    await waitFor(() => {
      expect(gradientes(stage)).toEqual([['#ff2121', '#78dc52']])
    })
  })

  it('trancada + livre na seleção: a janela inspeciona a LIVRE, e a cor vai para ela', async () => {
    await openVectorEditor()
    const stage = await drawTwoRects()
    // Tranca A pelo cadeado, seleciona A pela linha (trancada, de propósito) e
    // soma B com Shift no palco: seleção mista [A trancada, B livre].
    fireEvent.click(
      screen.getAllByRole('button', {
        name: `${COPY.layers.lock}: ${COPY.vector.shapeNames.rect}`,
      })[0] as HTMLElement,
    )
    fireEvent.click(screen.getAllByRole('button', { name: /^Selecionar: / })[0] as HTMLElement)
    await waitFor(() => {
      expect(stage.querySelectorAll('rect[width="14"]').length).toBe(8)
    })
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.select }))
    const b = stage.querySelector('rect[fill="#78dc52"]')
    if (!b) throw new Error('retângulo verde esperado')
    fireEvent.pointerDown(b, {
      isPrimary: true,
      pointerId: 1,
      clientX: 130,
      clientY: 130,
      shiftKey: true,
    })
    fireEvent.pointerUp(stage, { pointerId: 1 })
    await waitFor(() => {
      const marcadas = screen
        .getAllByRole('button', { name: /^Selecionar: / })
        .filter((row) => row.getAttribute('aria-pressed') === 'true')
      expect(marcadas.length).toBe(2)
    })
    // A janela mostra o verde de B (quem ela PODE editar), não o vermelho da trancada.
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.gradient }))
    expect(swatchHex(await screen.findByRole('button', { name: COPY.vector.gradientFrom }))).toBe(
      '#78dc52',
    )
    fireEvent.click(screen.getByRole('button', { name: COPY.a11y.close }))
    // Pegar a cor do fim na paleta: B vira verde→azul escuro; A segue vermelha e sólida.
    await startPicking('to')
    fireEvent.click(screen.getByRole('button', { name: naCaptura('#003fad') }))
    await screen.findByRole('dialog', { name: COPY.vector.gradient })
    await waitFor(() => {
      expect(gradientes(stage)).toEqual([['#78dc52', '#003fad']])
      expect(stage.querySelectorAll('rect[fill="#ff2121"]').length).toBe(1)
    })
  })

  it('a cor livre do "+" na captura vai para a ponta, e ao fechar o Degradê o foco volta ao botão "Degradê"', async () => {
    await openVectorEditor()
    const stage = await drawTwoRects()
    await startPicking('to')
    fireEvent.click(screen.getByRole('button', { name: COPY.palette.addColor }))
    const hex = await screen.findByLabelText(COPY.colorPicker.hex)
    fireEvent.change(hex, { target: { value: '#123456' } })
    fireEvent.click(screen.getByRole('button', { name: COPY.palette.add }))
    await screen.findByRole('dialog', { name: COPY.vector.gradient })
    expect(screen.queryByText(COPY.vector.pickColorHint)).toBeNull()
    await waitFor(() => {
      expect(gradientes(stage)).toEqual([['#ff2121', '#123456']])
    })
    // O "+" fechou no MESMO commit em que o Degradê abriu e devolveu o foco ao
    // seu botão; sem o `returnFocusTo`, o Degradê guardaria o "+" como acionador.
    fireEvent.click(screen.getByRole('button', { name: COPY.a11y.close }))
    await waitFor(() => {
      expect(document.activeElement).toBe(
        screen.getByRole('button', { name: COPY.vector.gradient }),
      )
    })
  })

  it('figura selecionada: o estilo guarda o degradê montado, e a paleta não grava desfazer vazio nela', async () => {
    await openVectorEditor(
      undefined,
      async (seed) => {
        const { createVectorBackgroundAsset } = await import('../../core/projectConfig')
        const fundo = createVectorBackgroundAsset({ name: 'figura', width: 480, height: 360 })
        await seed.getState().importAssets([
          {
            ...fundo,
            shapes: [
              {
                id: 'quadro',
                type: 'rect',
                x: 16,
                y: 16,
                w: 48,
                h: 48,
                rx: 0,
                fill: '#78dc52',
                stroke: null,
                opacity: 1,
                rotation: 0,
              },
              {
                id: 'foto',
                type: 'image',
                x: 200,
                y: 200,
                w: 40,
                h: 40,
                src: 'data:image/png;base64,iVBORw0KGgo=',
                fill: 'none',
                stroke: null,
                opacity: 1,
                rotation: 0,
              },
            ],
          },
        ])
      },
      'figura',
    )
    const stage = measureStage()
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.select }))
    const quadro = stage.querySelector('rect[fill="#78dc52"]')
    if (!quadro) throw new Error('quadro esperado')
    fireEvent.pointerDown(quadro, { isPrimary: true, pointerId: 1, clientX: 40, clientY: 40 })
    fireEvent.pointerUp(stage, { pointerId: 1 })
    // O quadro ganha verde→azul escuro pela paleta na captura.
    await startPicking('to')
    fireEvent.click(screen.getByRole('button', { name: naCaptura('#003fad') }))
    await screen.findByRole('dialog', { name: COPY.vector.gradient })
    fireEvent.click(screen.getByRole('button', { name: COPY.a11y.close }))
    await waitFor(() => {
      expect(gradientes(stage)).toEqual([['#78dc52', '#003fad']])
    })
    // Seleciona a FIGURA: ela não tem preenchimento que valha como inspetor, então
    // a janela continua mostrando o degradê montado (antes o `fill: 'none'` dela
    // apagava o estilo e a janela voltava ao verde de fábrica).
    const foto = stage.querySelector('image')
    if (!foto) throw new Error('figura esperada')
    fireEvent.pointerDown(foto, { isPrimary: true, pointerId: 1, clientX: 220, clientY: 220 })
    fireEvent.pointerUp(stage, { pointerId: 1 })
    await waitFor(() => {
      expect(stage.querySelectorAll('rect[width="14"]').length).toBe(8)
    })
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.gradient }))
    expect(swatchHex(await screen.findByRole('button', { name: COPY.vector.gradientTo }))).toBe(
      '#003fad',
    )
    fireEvent.click(screen.getByRole('button', { name: COPY.a11y.close }))
    // Uma cor da paleta com a figura selecionada: nada a pintar nela, nenhum
    // desfazer gravado. UM desfazer volta ao commit anterior (o degradê do quadro).
    fireEvent.click(
      screen.getByRole('button', { name: `${COPY.vector.fill}: ${COPY.colorNames['#ff2121']}` }),
    )
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
    await waitFor(() => {
      expect(stage.querySelectorAll('rect[fill="#78dc52"]').length).toBe(1)
      expect(stage.querySelectorAll('rect[fill^="url(#"]').length).toBe(0)
    })
  })
})

/**
 * Accordion POR MEDIDA da coluna direita: happy-dom não faz layout, então a
 * coluna recebe um stub VIVO — aberto = 250px, recolhido = 50px, vãos de 8 — e
 * um `clientHeight` fixo, para a régua ter o que medir.
 */
describe('a coluna da direita cabe na tela (accordion por medida)', () => {
  const collapseBtn = (title: string): HTMLElement | null =>
    screen.queryByRole('button', { name: COPY.panel.collapse(title) })
  const expandBtn = (title: string): HTMLElement | null =>
    screen.queryByRole('button', { name: COPY.panel.expand(title) })

  it('abrir um painel que não cabe fecha os menos recentes, nunca o recém-aberto', async () => {
    await openVectorEditor()
    const stage = measureStage()
    fireEvent.click(screen.getByRole('button', { name: COPY.tools.rect }))
    drawRect(stage, [16, 16], [64, 64])
    await waitFor(() => {
      expect(collapseBtn(COPY.layers.title)).toBeTruthy()
    })
    stubColumn(rightColumn(), 500)

    // Recolher à mão NÃO cascateia, mesmo com 566 > 500.
    fireEvent.click(
      screen.getByRole('button', { name: COPY.panel.collapse(COPY.vector.appearance) }),
    )
    expect(collapseBtn(COPY.layers.title)).toBeTruthy()
    expect(collapseBtn(COPY.palette.title)).toBeTruthy()

    // Reabrir arma a régua: 766 → fecha Camadas (566) → fecha Cores (366) → cabe.
    fireEvent.click(screen.getByRole('button', { name: COPY.panel.expand(COPY.vector.appearance) }))
    expect(expandBtn(COPY.layers.title)).toBeTruthy()
    expect(expandBtn(COPY.palette.title)).toBeTruthy()
    expect(collapseBtn(COPY.vector.appearance)).toBeTruthy()
    expect(screen.getByRole('button', { name: COPY.vector.gradient })).toBeTruthy()
    // O leitor de tela ouve quem a régua recolheu (o mount é mudo).
    expect(
      screen.getByText(COPY.panel.autoCollapsed(`${COPY.layers.title} e ${COPY.palette.title}`)),
    ).toBeTruthy()
  })

  it('um painel ausente não conta como vítima e nasce ABERTO quando aparece', async () => {
    await openVectorEditor()
    stubColumn(rightColumn(), 300)
    // Sem forma não há Camadas: só Cores e Aparência na tela.
    fireEvent.click(screen.getByRole('button', { name: COPY.panel.collapse(COPY.palette.title) }))
    fireEvent.click(screen.getByRole('button', { name: COPY.panel.expand(COPY.palette.title) }))
    // 508 > 301 → fecha Aparência (a menos recente); 308 > 301, mas só Cores sobrou: para.
    expect(expandBtn(COPY.vector.appearance)).toBeTruthy()
    expect(collapseBtn(COPY.palette.title)).toBeTruthy()

    const stage = measureStage()
    fireEvent.click(screen.getByRole('button', { name: COPY.tools.rect }))
    drawRect(stage, [16, 16], [64, 64])
    await waitFor(() => {
      expect(collapseBtn(COPY.layers.title)).toBeTruthy()
    })
    // Crescer não fecha nada: Cores segue aberta (a coluna rola).
    expect(collapseBtn(COPY.palette.title)).toBeTruthy()
  })

  it('desenhar (o conteúdo crescer) nunca fecha um painel', async () => {
    await openVectorEditor()
    Object.defineProperties(rightColumn(), {
      clientHeight: { configurable: true, value: 100 },
      scrollHeight: { configurable: true, value: 9999 },
    })
    const stage = measureStage()
    fireEvent.click(screen.getByRole('button', { name: COPY.tools.rect }))
    drawRect(stage, [16, 16], [64, 64])
    drawRect(stage, [100, 100], [160, 160])
    await waitFor(() => {
      expect(collapseBtn(COPY.layers.title)).toBeTruthy()
    })
    expect(collapseBtn(COPY.palette.title)).toBeTruthy()
    expect(collapseBtn(COPY.vector.appearance)).toBeTruthy()
  })
  it('o recém-aberto sobrevive a TRÊS passadas, mesmo sendo o último da ordem de sacrifício', async () => {
    // Personagem com uma forma: os QUATRO painéis na tela.
    await openVectorEditor(
      undefined,
      async (store) => {
        await store.getState().create({ kind: 'vector-sprite', name: 'heroi', frameSize: 64 })
      },
      'heroi',
    )
    const stage = measureStage()
    fireEvent.click(screen.getByRole('button', { name: COPY.tools.rect }))
    drawRect(stage, [16, 16], [64, 64])
    await waitFor(() => {
      expect(collapseBtn(COPY.layers.title)).toBeTruthy()
    })
    stubColumn(rightColumn(), 300)
    // Recolher e reabrir a Prévia: 1024 → Aparência (824) → Camadas (624) → Cores (424)
    // → sobrou só a Prévia, a recém-aberta: para. Cores morre porque o recém-aberto é intocável.
    fireEvent.click(
      screen.getByRole('button', { name: COPY.panel.collapse(COPY.animation.preview) }),
    )
    fireEvent.click(screen.getByRole('button', { name: COPY.panel.expand(COPY.animation.preview) }))
    expect(collapseBtn(COPY.animation.preview)).toBeTruthy()
    expect(expandBtn(COPY.vector.appearance)).toBeTruthy()
    expect(expandBtn(COPY.layers.title)).toBeTruthy()
    expect(expandBtn(COPY.palette.title)).toBeTruthy()
    expect(
      screen.getByText(
        COPY.panel.autoCollapsed(
          `${COPY.vector.appearance}, ${COPY.layers.title} e ${COPY.palette.title}`,
        ),
      ),
    ).toBeTruthy()
    // Recolhida, a Prévia continua VIVA no cabeçalho (miniatura) e sem os botões.
    fireEvent.click(
      screen.getByRole('button', { name: COPY.panel.collapse(COPY.animation.preview) }),
    )
    const preview = rightColumn().querySelector(`section[aria-label="${COPY.animation.preview}"]`)
    expect(preview?.querySelector('svg')).toBeTruthy()
    expect(screen.queryByRole('button', { name: COPY.animation.reproduce })).toBeNull()
  })

  it('redimensionar a janela não fecha nada (a coluna rola)', async () => {
    await openVectorEditor()
    stubColumn(rightColumn(), 100) // 508 > 101
    fireEvent(window, new Event('resize'))
    expect(collapseBtn(COPY.palette.title)).toBeTruthy()
    expect(collapseBtn(COPY.vector.appearance)).toBeTruthy()
  })

  it('a faixa do título abre e recolhe; recolhida, a paleta esconde a lixeira e o "+" e diz "Cores"', async () => {
    await openVectorEditor()
    // O título inteiro é o botão (alvo grande), com o nome do painel.
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.appearance }))
    expect(screen.queryByRole('button', { name: COPY.vector.gradient })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.appearance }))
    expect(screen.getByRole('button', { name: COPY.vector.gradient })).toBeTruthy()
    // Cores recolhida: sem menu da paleta, sem "+", sem lixeira (agiam num corpo desmontado).
    fireEvent.click(screen.getByRole('button', { name: COPY.panel.collapse(COPY.palette.title) }))
    expect(screen.queryByRole('button', { name: COPY.palette.addColor })).toBeNull()
    expect(screen.queryByRole('button', { name: /^Trocar paleta:/ })).toBeNull()
    const cores = screen.getByRole('button', { name: COPY.palette.title })
    expect(cores.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(cores)
    expect(screen.getByRole('button', { name: /^Trocar paleta:/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: COPY.palette.addColor })).toBeTruthy()
  })

  it('em captura de cor, a Aparência e as Cores nunca são vítimas', async () => {
    await openVectorEditor()
    const stage = measureStage()
    fireEvent.click(screen.getByRole('button', { name: COPY.tools.rect }))
    drawRect(stage, [16, 16], [64, 64])
    await waitFor(() => {
      expect(collapseBtn(COPY.layers.title)).toBeTruthy()
    })
    // Entra na captura pela janelinha do Degradê ("Cor do fim").
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.gradient }))
    fireEvent.click(await screen.findByRole('button', { name: COPY.vector.gradientTo }))
    fireEvent.click(await screen.findByRole('button', { name: COPY.colorPicker.pickFromDrawing }))
    await waitFor(() => {
      expect(screen.getByText(COPY.vector.pickColorHint)).toBeTruthy()
    })
    stubColumn(rightColumn(), 300)
    // Reabrir Camadas com 766 > 301: as duas do fluxo ficam de fora, sobra só a recém-aberta: para.
    fireEvent.click(screen.getByRole('button', { name: COPY.panel.collapse(COPY.layers.title) }))
    fireEvent.click(screen.getByRole('button', { name: COPY.panel.expand(COPY.layers.title) }))
    expect(collapseBtn(COPY.vector.appearance)).toBeTruthy()
    expect(collapseBtn(COPY.palette.title)).toBeTruthy()
    expect(collapseBtn(COPY.layers.title)).toBeTruthy()
  })
})
