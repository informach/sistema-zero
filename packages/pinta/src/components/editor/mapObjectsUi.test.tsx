/**
 * Camadas de OBJETOS e peças por camada no editor de mapa (10/2026): criar a
 * camada, marcar um ponto e desenhar uma área no palco, editar nome, tipo e
 * propriedades, apagar pelo Delete, e trocar as peças de uma camada.
 *
 * ⚠️ O palco de objetos converte ponteiro → pixel do mapa pela caixa REAL do
 * `<svg>` (0 sem layout no happy-dom): os testes fixam o `getBoundingClientRect`.
 * ⚠️ O "Salvo" não prova nada (o autosave é debounced): quem diz a verdade é o
 * disco, relido num `waitFor`.
 */
import { beforeEach, describe, expect, it } from 'bun:test'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { COPY } from '../../core/copy'
import { isObjectLayer, type TilemapAsset } from '../../core/project'
import { clearIdbMock } from '../../testing/idbMock'

const { PintaApp } = await import('../PintaApp')
const { setPintaStorageNamespace } = await import('../../state/persistence')
const { createGalleryStore } = await import('../../state/galleryStore')

beforeEach(() => {
  clearIdbMock()
  setPintaStorageNamespace('')
})

/** 4 × 3 células de 16 px = 64 × 48 px do mapa; o svg fica com 128 × 96 px de tela. */
const SCALE = 2

async function abrirMapa(extra?: (seed: ReturnType<typeof createGalleryStore>) => Promise<void>) {
  const seed = createGalleryStore()
  const tileset = await seed.getState().create({ kind: 'tileset', name: 'pecas', tileSize: 16 })
  if (!tileset) throw new Error('tileset esperado')
  await seed
    .getState()
    .create({ kind: 'tilemap', name: 'fase', tilesetId: tileset.id, cols: 4, rows: 3 })
  await extra?.(seed)
  const view = render(<PintaApp />)
  fireEvent.click(await screen.findByRole('button', { name: /Abrir fase/ }))
  await screen.findByText(COPY.tiles.pickTile)
  return view
}

function overlay(container: HTMLElement): SVGSVGElement {
  const svg = container.querySelector<SVGSVGElement>('[data-pin-objects-overlay]')
  if (!svg) throw new Error('palco de objetos esperado')
  Object.defineProperty(svg, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      left: 0,
      top: 0,
      width: 64 * SCALE,
      height: 48 * SCALE,
      right: 64 * SCALE,
      bottom: 48 * SCALE,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }),
  })
  return svg
}

/** Um ponto do mapa (px do mapa) → evento de ponteiro na tela. */
const at = (x: number, y: number, pointerId = 1) => ({
  isPrimary: true,
  pointerId,
  clientX: x * SCALE,
  clientY: y * SCALE,
})

async function mapaDoDisco(): Promise<TilemapAsset> {
  const conferir = createGalleryStore()
  await conferir.getState().load()
  const map = conferir.getState().assets.find((a) => a.kind === 'tilemap')
  if (map?.kind !== 'tilemap') throw new Error('mapa esperado no disco')
  return map
}

async function objetosNoDisco() {
  const map = await mapaDoDisco()
  return map.layers.find(isObjectLayer)?.objects ?? []
}

describe('camada de objetos no editor de mapa', () => {
  it('cria a camada, marca um ponto e edita nome, tipo e propriedades', async () => {
    const { container } = await abrirMapa()

    fireEvent.click(screen.getByRole('button', { name: COPY.tiles.addObjectLayer }))
    // A caixa troca para as ferramentas de objeto e o painel de peças sai.
    expect(await screen.findByRole('button', { name: COPY.tiles.objectPoint })).toBeTruthy()
    expect(screen.getByRole('button', { name: COPY.tiles.objectSelect })).toBeTruthy()
    expect(screen.queryByRole('button', { name: COPY.tools.pencil })).toBeNull()
    expect(screen.queryByText(COPY.tiles.pickTile)).toBeNull()
    expect(screen.getByText(COPY.tiles.objectsEmpty)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: COPY.tiles.objectPoint }))
    const svg = overlay(container)
    // Com o encaixe ligado (padrão), o ponto vai para o MEIO da peça tocada.
    fireEvent.pointerDown(svg, at(20, 5))
    fireEvent.pointerUp(svg, at(20, 5))

    expect(
      await screen.findByRole('button', { name: COPY.tiles.pickObject('Objeto 1') }),
    ).toBeTruthy()
    expect(svg.querySelector('[data-object-kind="point"]')).toBeTruthy()

    const name = screen.getByLabelText(COPY.tiles.objectName) as HTMLInputElement
    expect(name.value).toBe('Objeto 1')
    fireEvent.change(name, { target: { value: 'inicio' } })
    fireEvent.blur(name)
    const type = screen.getByLabelText(COPY.tiles.objectType) as HTMLInputElement
    fireEvent.change(type, { target: { value: 'jogador' } })
    fireEvent.keyDown(type, { key: 'Enter' })
    expect(
      await screen.findByRole('button', { name: COPY.tiles.pickObject('inicio') }),
    ).toBeTruthy()
    expect((screen.getByLabelText(COPY.tiles.objectX) as HTMLInputElement).value).toBe('24')
    expect((screen.getByLabelText(COPY.tiles.objectY) as HTMLInputElement).value).toBe('8')

    // Propriedade nova → renomeia a chave, troca o tipo para número e dá o valor.
    fireEvent.click(screen.getByRole('button', { name: COPY.tiles.addProperty }))
    const key = (await screen.findByLabelText(
      `${COPY.tiles.propertyKey}: ${COPY.tiles.objectPropertyDefaultKey}`,
    )) as HTMLInputElement
    fireEvent.change(key, { target: { value: 'Vidas Extras' } })
    fireEvent.blur(key)
    const kind = (await screen.findByLabelText(
      `${COPY.tiles.propertyKind}: Vidas_Extras`,
    )) as HTMLSelectElement
    fireEvent.change(kind, { target: { value: 'number' } })
    const value = (await screen.findByLabelText(
      `${COPY.tiles.propertyValue}: Vidas_Extras`,
    )) as HTMLInputElement
    fireEvent.change(value, { target: { value: '3' } })
    fireEvent.blur(value)

    // E uma de sim-ou-não.
    fireEvent.click(screen.getByRole('button', { name: COPY.tiles.addProperty }))
    const kind2 = (await screen.findByLabelText(
      `${COPY.tiles.propertyKind}: ${COPY.tiles.objectPropertyDefaultKey}`,
    )) as HTMLSelectElement
    fireEvent.change(kind2, { target: { value: 'boolean' } })
    fireEvent.click(
      await screen.findByLabelText(
        `${COPY.tiles.propertyValue}: ${COPY.tiles.objectPropertyDefaultKey}`,
      ),
    )

    await waitFor(
      async () => {
        const [object] = await objetosNoDisco()
        expect(object).toMatchObject({
          name: 'inicio',
          type: 'jogador',
          x: 24,
          y: 8,
          width: 0,
          height: 0,
          properties: { Vidas_Extras: 3, [COPY.tiles.objectPropertyDefaultKey]: true },
        })
      },
      { timeout: 5000 },
    )
  })

  it('desenha uma área arrastando, encaixa na grade e o Delete apaga o objeto', async () => {
    const { container } = await abrirMapa()
    fireEvent.click(screen.getByRole('button', { name: COPY.tiles.addObjectLayer }))
    fireEvent.click(await screen.findByRole('button', { name: COPY.tiles.objectRect }))
    const svg = overlay(container)
    // Um gesto só (vários pointermove), como no pintar.
    fireEvent.pointerDown(svg, at(3, 3))
    fireEvent.pointerMove(svg, at(20, 20))
    fireEvent.pointerMove(svg, at(30, 29))
    fireEvent.pointerUp(svg, at(30, 29))

    await screen.findByRole('button', { name: COPY.tiles.pickObject('Objeto 1') })
    expect(svg.querySelector('[data-object-kind="rect"]')).toBeTruthy()
    expect((screen.getByLabelText(COPY.tiles.objectWidth) as HTMLInputElement).value).toBe('32')
    expect((screen.getByLabelText(COPY.tiles.objectHeight) as HTMLInputElement).value).toBe('32')

    // Arrastar a área (com "Mexer nos objetos") move inteira, encaixada.
    fireEvent.click(screen.getByRole('button', { name: COPY.tiles.objectSelect }))
    fireEvent.pointerDown(svg, at(10, 10, 2))
    fireEvent.pointerMove(svg, at(27, 26, 2))
    fireEvent.pointerUp(svg, at(27, 26, 2))
    await waitFor(() => {
      expect((screen.getByLabelText(COPY.tiles.objectX) as HTMLInputElement).value).toBe('16')
    })

    fireEvent.keyDown(window, { key: 'Delete' })
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: COPY.tiles.pickObject('Objeto 1') })).toBeNull()
    })
    expect(svg.querySelector('[data-object-id]')).toBeNull()
  })

  /** Camada de objetos com dois pontos: "Objeto 1" em (24, 8) e "Objeto 2" em (56, 40). */
  async function doisPontos(container: HTMLElement) {
    fireEvent.click(screen.getByRole('button', { name: COPY.tiles.addObjectLayer }))
    fireEvent.click(await screen.findByRole('button', { name: COPY.tiles.objectPoint }))
    const svg = overlay(container)
    fireEvent.pointerDown(svg, at(20, 5))
    fireEvent.pointerUp(svg, at(20, 5))
    await screen.findByRole('button', { name: COPY.tiles.pickObject('Objeto 1') })
    fireEvent.pointerDown(svg, at(50, 40, 2))
    fireEvent.pointerUp(svg, at(50, 40, 2))
    await screen.findByRole('button', { name: COPY.tiles.pickObject('Objeto 2') })
    fireEvent.click(screen.getByRole('button', { name: COPY.tiles.objectSelect }))
    return svg
  }

  const campoNome = () => screen.getByLabelText(COPY.tiles.objectName) as HTMLInputElement

  it('o nome digitado não se perde quando o toque no mapa troca de objeto antes do blur', async () => {
    const { container } = await abrirMapa()
    const svg = await doisPontos(container)
    fireEvent.click(screen.getByRole('button', { name: COPY.tiles.pickObject('Objeto 1') }))
    await waitFor(() => expect(campoNome().value).toBe('Objeto 1'))
    campoNome().focus()
    fireEvent.change(campoNome(), { target: { value: 'porta' } })
    // Tocar o outro objeto no MAPA: a seleção troca no pointerdown, antes do blur do navegador.
    fireEvent.pointerDown(svg, at(56, 40, 3))
    fireEvent.pointerUp(svg, at(56, 40, 3))
    await waitFor(() => expect(campoNome().value).toBe('Objeto 2'))
    expect(screen.getByRole('button', { name: COPY.tiles.pickObject('porta') })).toBeTruthy()

    // Sem foco (o campo sai sem blur nenhum): tocar no vazio desmonta o painel e grava.
    fireEvent.change(campoNome(), { target: { value: 'saida' } })
    fireEvent.pointerDown(svg, at(40, 20, 4))
    fireEvent.pointerUp(svg, at(40, 20, 4))
    await waitFor(() => expect(screen.queryByLabelText(COPY.tiles.objectName)).toBeNull())
    await waitFor(
      async () => {
        const objects = await objetosNoDisco()
        expect(objects.map((object) => object.name)).toEqual(['porta', 'saida'])
      },
      { timeout: 5000 },
    )
  })

  it('trocar de objeto sem ter mudado o texto não cria um desfazer vazio', async () => {
    const { container } = await abrirMapa()
    const svg = await doisPontos(container)
    fireEvent.click(screen.getByRole('button', { name: COPY.tiles.pickObject('Objeto 1') }))
    await waitFor(() => expect(campoNome().value).toBe('Objeto 1'))
    campoNome().focus()
    fireEvent.pointerDown(svg, at(56, 40, 3))
    fireEvent.pointerUp(svg, at(56, 40, 3))
    await waitFor(() => expect(campoNome().value).toBe('Objeto 2'))
    // O último desfazer ainda é o "Objeto 2" nascendo, não uma edição que não houve.
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: COPY.tiles.pickObject('Objeto 2') })).toBeNull(),
    )
    expect(screen.getByRole('button', { name: COPY.tiles.pickObject('Objeto 1') })).toBeTruthy()
  })

  it('com uma janela do Pinta aberta, o Delete não apaga o objeto escolhido', async () => {
    const { container } = await abrirMapa()
    await doisPontos(container)
    const dialog = document.createElement('div')
    dialog.setAttribute('data-pinta-dialog', '')
    document.body.append(dialog)
    try {
      fireEvent.keyDown(window, { key: 'Delete' })
      fireEvent.keyDown(window, { key: 'Backspace' })
      await new Promise((resolve) => setTimeout(resolve, 0))
      expect(screen.getByRole('button', { name: COPY.tiles.pickObject('Objeto 2') })).toBeTruthy()
    } finally {
      dialog.remove()
    }
    fireEvent.keyDown(window, { key: 'Delete' })
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: COPY.tiles.pickObject('Objeto 2') })).toBeNull(),
    )
  })

  it('a chave recusada (repetida) volta ao nome gravado em vez de mostrar o que não foi salvo', async () => {
    const { container } = await abrirMapa()
    await doisPontos(container)
    const base = COPY.tiles.objectPropertyDefaultKey
    fireEvent.click(screen.getByRole('button', { name: COPY.tiles.addProperty }))
    await screen.findByLabelText(`${COPY.tiles.propertyKey}: ${base}`)
    fireEvent.click(screen.getByRole('button', { name: COPY.tiles.addProperty }))
    const second = (await screen.findByLabelText(
      `${COPY.tiles.propertyKey}: ${base}_2`,
    )) as HTMLInputElement
    fireEvent.change(second, { target: { value: base } })
    fireEvent.blur(second)
    expect(await screen.findByText(COPY.tiles.propertyDuplicateKey)).toBeTruthy()
    await waitFor(() => expect(second.value).toBe(`${base}_2`))
    // Inválida (não começa com letra): idem.
    fireEvent.change(second, { target: { value: '9' } })
    fireEvent.keyDown(second, { key: 'Enter' })
    await waitFor(() => expect(second.value).toBe(`${base}_2`))
  })

  it('a última camada de PEÇAS não tem lixeira; a de objetos tem', async () => {
    await abrirMapa()
    expect(screen.queryByRole('button', { name: `${COPY.tiles.removeLayer}: Chão` })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: COPY.tiles.addObjectLayer }))
    await screen.findByRole('button', { name: COPY.tiles.objectPoint })
    expect(screen.queryByRole('button', { name: `${COPY.tiles.removeLayer}: Chão` })).toBeNull()
    fireEvent.click(
      screen.getByRole('button', {
        name: `${COPY.tiles.removeLayer}: ${COPY.tiles.objectLayerNamePrefix}`,
      }),
    )
    // Voltou a ser só peças: a caixa de peças volta junto.
    expect(await screen.findByRole('button', { name: COPY.tools.pencil })).toBeTruthy()
  })
})

describe('peças por camada no editor de mapa', () => {
  it('a camada escolhe outras peças do MESMO tamanho; as de outro tamanho não aparecem', async () => {
    await abrirMapa(async (seed) => {
      await seed.getState().create({ kind: 'tileset', name: 'casas', tileSize: 16 })
      await seed.getState().create({ kind: 'tileset', name: 'gigante', tileSize: 32 })
    })
    fireEvent.click(screen.getByRole('button', { name: COPY.tiles.addLayer }))
    const select = (await screen.findByLabelText(
      `${COPY.tiles.layerTileset}: Camada 2`,
    )) as HTMLSelectElement
    // A ordem segue a galeria (a data de criação): dois tilesets criados no mesmo milissegundo
    // empatam, então o teste confere QUAIS aparecem, não em que ordem.
    const options = Array.from(select.options).map((option) => option.textContent)
    expect(options.sort()).toEqual(['casas', 'pecas'])
    const casas = Array.from(select.options).find((option) => option.textContent === 'casas')
    fireEvent.change(select, { target: { value: casas?.value } })

    await waitFor(
      async () => {
        const map = await mapaDoDisco()
        const layer = map.layers[1]
        expect(layer && !isObjectLayer(layer) && layer.tilesetId).toBe(casas?.value)
      },
      { timeout: 5000 },
    )
  })
})
