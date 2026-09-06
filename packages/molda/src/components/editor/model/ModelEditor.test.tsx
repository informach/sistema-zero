import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { COPY } from '../../../core/copy'
import type { MoldaAsset, MoldaModelAsset } from '../../../core/model'
import { getPalette } from '../../../core/palette'
import { createMemoryPersistence } from '../../../state/memoryPersistence'
import { resetMoldaPersistenceForTests } from '../../../state/persistence'
import { installFailingViewport, installFakeViewport } from '../../../testing/fakeViewport'
import { makeModel } from '../../../testing/fixtures'
import { MoldaApp } from '../../MoldaApp'

let fake: ReturnType<typeof installFakeViewport>

beforeEach(() => {
  resetMoldaPersistenceForTests()
  fake = installFakeViewport()
})

afterEach(() => {
  fake.uninstall()
})

function lastModel(): MoldaModelAsset {
  const instance = fake.instances.at(-1)
  const model = instance?.models.at(-1)
  if (!model) throw new Error('o palco não recebeu modelo')
  return model
}

function modelOf(asset: MoldaAsset | undefined): MoldaModelAsset {
  if (asset?.kind !== 'model') throw new Error('não é modelo')
  return asset
}

async function openModel(
  asset: MoldaModelAsset = makeModel(),
): Promise<ReturnType<typeof createMemoryPersistence>> {
  const persistence = createMemoryPersistence([asset])
  render(<MoldaApp persistence={persistence} adapter={{ initialAssetId: 'model-1' }} />)
  await screen.findByRole('complementary', { name: COPY.editor.model.toolbox })
  await waitFor(() => expect(lastModel().parts).toHaveLength(2))
  return persistence
}

describe('ModelEditor (bancada Montar)', () => {
  test('uma criação com paleta personalizada pode voltar para uma paleta de fábrica', async () => {
    await openModel(
      makeModel({
        paletteId: 'custom',
        customPalette: { name: 'Minha paleta', colors: [...getPalette('arcade').colors] },
      }),
    )

    fireEvent.change(screen.getByRole('combobox', { name: COPY.a11y.paletteSelect }), {
      target: { value: 'pastel' },
    })
    await waitFor(() => expect(lastModel().paletteId).toBe('pastel'))
    expect(lastModel().customPalette).toBeUndefined()
  })

  test('abre com a caixa de ferramentas, o palco recebe o modelo e o status conta as peças', async () => {
    await openModel()
    expect(fake.instances).toHaveLength(1)
    expect(screen.getByText(COPY.editor.model.status(2, 128, 20))).toBeDefined()
    expect(screen.getByRole('button', { name: 'corpo, caixa' })).toBeDefined()
    expect(screen.getByText(COPY.editor.model.noSelection)).toBeDefined()
  })

  test('adicionar caixa entra no modo de colocar; toque na superfície cria e desfazer volta', async () => {
    await openModel()
    fireEvent.click(screen.getByRole('button', { name: `${COPY.editor.model.addGroup} caixa` }))
    expect(fake.instances[0]?.placementShape).toBe('box')
    expect(lastModel().parts).toHaveLength(2)
    act(() => fake.instances[0]?.callbacks.onPlace('box', [2, 1, 0], [1, 0, 0], 'body'))
    await waitFor(() => expect(lastModel().parts).toHaveLength(3))
    expect(fake.instances[0]?.placementShape).toBeNull()
    expect(screen.getByText(COPY.editor.model.status(3, 128, 32))).toBeDefined()
    const nameInput = screen.getByDisplayValue('caixa') as HTMLInputElement
    expect(nameInput).toBeDefined()
    expect(fake.instances[0]?.selected).toBe(lastModel().parts[2]?.id ?? null)
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
    await waitFor(() => expect(lastModel().parts).toHaveLength(2))
    expect(screen.getByText(COPY.editor.model.noSelection)).toBeDefined()
  })

  test('selecionar pela lista mostra as propriedades; Delete apaga; steppers commitam', async () => {
    const persistence = await openModel()
    fireEvent.click(screen.getByRole('button', { name: 'corpo, caixa' }))
    expect(fake.instances[0]?.selected).toBe('body')
    const x = screen.getByRole('textbox', {
      name: `${COPY.editor.model.position} X`,
    }) as HTMLInputElement
    expect(x.value).toBe('-2')
    fireEvent.click(
      screen.getByRole('button', { name: COPY.a11y.increase(`${COPY.editor.model.position} X`) }),
    )
    await waitFor(() => expect(lastModel().parts[0]?.from[0]).toBe(-1))
    expect(lastModel().parts[0]?.to[0]).toBe(3)
    fireEvent.change(x, { target: { value: '4' } })
    fireEvent.blur(x)
    await waitFor(() => expect(lastModel().parts[0]?.from[0]).toBe(4))
    const w = screen.getByRole('textbox', { name: COPY.editor.model.dims.w }) as HTMLInputElement
    fireEvent.change(w, { target: { value: '6' } })
    fireEvent.keyDown(w, { key: 'Enter' })
    await waitFor(() => expect(lastModel().parts[0]?.to[0]).toBe(10))
    const ry = screen.getByRole('button', {
      name: COPY.a11y.increase(`${COPY.editor.model.rotation} Y`),
    })
    fireEvent.click(ry)
    await waitFor(() => expect(lastModel().parts[0]?.rotation[1]).toBe(15))
    fireEvent.keyDown(document, { key: 'Delete' })
    await waitFor(() => expect(lastModel().parts).toHaveLength(1))
    expect(lastModel().parts[0]?.id).toBe('wing')
    await waitFor(() => expect(modelOf(persistence.snapshot()[0]).parts).toHaveLength(1), {
      timeout: 3000,
    })
  })

  test('espelhar cria o gêmeo na lista e desligar assa; encaixe de meio bloco muda o snap', async () => {
    await openModel()
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.model.mirror }))
    await waitFor(() => expect(lastModel().mirrorX).toBe(true))
    expect(screen.getAllByText(COPY.editor.model.twinTag)).toHaveLength(1)
    fireEvent.keyDown(document, { key: 'm' })
    await waitFor(() => expect(lastModel().mirrorX).toBe(false))
    expect(screen.queryByText(COPY.editor.model.twinTag)).toBeNull()
    expect(lastModel().parts).toHaveLength(3)
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.model.snapHalf }))
    await waitFor(() => expect(lastModel().snap).toBe(0.5))
    expect(fake.instances[0]?.snap).toBe(0.5)
  })

  test('atalhos trocam a ferramenta e adicionam caixa; vistas e grade chegam ao palco', async () => {
    await openModel()
    fireEvent.keyDown(document, { key: 'r' })
    expect(fake.instances[0]?.tool).toBe('rotate')
    fireEvent.keyDown(document, { key: 't' })
    expect(fake.instances[0]?.tool).toBe('scale')
    fireEvent.keyDown(document, { key: 'v' })
    expect(fake.instances[0]?.tool).toBe('move')
    fireEvent.keyDown(document, { key: 'b' })
    await waitFor(() => expect(lastModel().parts).toHaveLength(3))
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.model.views.top }))
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.model.views.frame }))
    expect(fake.instances[0]?.views).toEqual(['top', 'frame'])
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.model.grid }))
    expect(fake.instances[0]?.gridVisible).toBe(false)
  })

  test('um arrasto de mover é UM passo de desfazer; o de tamanho aplica a caixa no soltar', async () => {
    await openModel()
    const callbacks = fake.instances[0]?.callbacks
    if (!callbacks) throw new Error('palco')
    act(() => {
      callbacks.onSelect('body', false)
      callbacks.onDragStart('body')
      callbacks.onDragMove({ id: 'body', from: [-1, 0, -3], to: [3, 2, 3] })
      callbacks.onDragMove({ id: 'body', from: [0, 0, -3], to: [4, 2, 3] })
    })
    await waitFor(() => expect(lastModel().parts[0]?.from[0]).toBe(0))
    act(() => callbacks.onDragEnd(null))
    await waitFor(() =>
      expect(
        (screen.getByRole('button', { name: COPY.editor.undo }) as HTMLButtonElement).disabled,
      ).toBe(false),
    )
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
    await waitFor(() => expect(lastModel().parts[0]?.from[0]).toBe(-2))
    expect(
      (screen.getByRole('button', { name: COPY.editor.undo }) as HTMLButtonElement).disabled,
    ).toBe(true)

    act(() => {
      callbacks.onDragStart('body')
      callbacks.onDragEnd({ id: 'body', from: [-2, 0, -3], to: [4, 4, 3] })
    })
    await waitFor(() => expect(lastModel().parts[0]?.to[1]).toBe(4))
    // A pele da face de cima foi re-amostrada para o tamanho novo.
    expect(lastModel().parts[0]?.faces.py?.width).toBe(24)
  })

  test('cores: tocar um swatch pinta a peça; a cor nova entra nas extras', async () => {
    await openModel()
    fireEvent.click(screen.getByRole('button', { name: 'corpo, caixa' }))
    fireEvent.click(screen.getByRole('button', { name: COPY.a11y.colorSwatch(2, '#ff2121') }))
    await waitFor(() => expect(lastModel().parts[0]?.color).toBe(2))
    const input = screen.getByLabelText(COPY.editor.model.addColor, { selector: 'input' })
    fireEvent.change(input, { target: { value: '#123456' } })
    await waitFor(() => expect(lastModel().extraColors).toEqual(['#123456']))
    expect(lastModel().parts[0]?.color).toBe(16)
  })

  test('"+ Nova cor" é UM gesto: N passos do seletor viram UMA extra e UM desfazer', async () => {
    await openModel()
    fireEvent.click(screen.getByRole('button', { name: 'corpo, caixa' }))
    const input = screen.getByLabelText(COPY.editor.model.addColor, { selector: 'input' })
    // O seletor nativo dispara `input` a cada passo do arrasto e `change` só ao fechar.
    fireEvent.input(input, { target: { value: '#123456' } })
    fireEvent.input(input, { target: { value: '#234567' } })
    fireEvent.input(input, { target: { value: '#345678' } })
    await waitFor(() => expect(lastModel().extraColors).toEqual(['#345678']))
    expect(lastModel().parts[0]?.color).toBe(16)
    fireEvent.change(input, { target: { value: '#345678' } })
    const undo = screen.getByRole('button', { name: COPY.editor.undo }) as HTMLButtonElement
    await waitFor(() => expect(undo.disabled).toBe(false))
    fireEvent.click(undo)
    await waitFor(() => expect(lastModel().extraColors ?? []).toEqual([]))
    expect(lastModel().parts[0]?.color).not.toBe(16)
    expect(undo.disabled).toBe(true)
  })

  test('a miniatura é fotografada depois de uma mudança e salva no asset', async () => {
    const persistence = await openModel()
    fireEvent.keyDown(document, { key: 'b' })
    await waitFor(
      () => expect(modelOf(persistence.snapshot()[0]).thumb).toBe('data:image/jpeg;base64,AAAA'),
      { timeout: 4000 },
    )
    expect(fake.instances[0]?.thumbs).toBeGreaterThan(0)
  })

  test('sem WebGL a tela mostra o recado em vez de quebrar', async () => {
    fake.uninstall()
    const uninstall = installFailingViewport()
    try {
      render(
        <MoldaApp
          persistence={createMemoryPersistence([makeModel()])}
          adapter={{ initialAssetId: 'model-1' }}
        />,
      )
      expect(await screen.findByText(COPY.editor.model.unsupported)).toBeDefined()
      const toolbox = screen.getByRole('complementary', { name: COPY.editor.model.toolbox })
      expect(
        within(toolbox).getByRole('button', { name: COPY.editor.model.tools.move }),
      ).toBeDefined()
    } finally {
      uninstall()
    }
  })

  test('sair do editor descarta o palco', async () => {
    await openModel()
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.backToGallery }))
    await screen.findByRole('heading', { level: 1, name: COPY.gallery.title })
    expect(fake.instances[0]?.disposed).toBe(true)
  })
})

describe('extras de 06/09: setas, arestas, pivô, trancar/esconder, seleção múltipla', () => {
  test('setas empurram a peça um encaixe (Shift = 5, PageUp sobe); no Editar malha movem os pontos', async () => {
    await openModel()
    fireEvent.click(screen.getByRole('button', { name: 'corpo, caixa' }))
    fireEvent.keyDown(document, { key: 'ArrowRight' })
    await waitFor(() => expect(lastModel().parts[0]?.from[0]).toBe(-1))
    fireEvent.keyDown(document, { key: 'ArrowUp', shiftKey: true })
    await waitFor(() => expect(lastModel().parts[0]?.from[2]).toBe(-8))
    fireEvent.keyDown(document, { key: 'PageUp' })
    await waitFor(() => expect(lastModel().parts[0]?.from[1]).toBe(1))
    // Um desfazer por toque.
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
    await waitFor(() => expect(lastModel().parts[0]?.from[1]).toBe(0))
    expect(lastModel().parts[0]?.from[2]).toBe(-8)
    // Editar malha: a seta move os PONTOS escolhidos, não a peça.
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.model.mesh.convert }))
    await waitFor(() => expect(fake.instances[0]?.meshEdit?.partId).toBe('body'))
    act(() => fake.instances[0]?.callbacks.onMeshPick({ kind: 'face', key: 'f_py' }, false))
    await waitFor(() => expect(fake.instances[0]?.meshEdit?.vertices).toHaveLength(4))
    fireEvent.keyDown(document, { key: 'PageUp' })
    await waitFor(() => expect(lastModel().parts[0]?.to[1]).toBe(3))
    expect(lastModel().parts[0]?.from[1]).toBe(0)
  })

  test('"Ver arestas" chega ao palco', async () => {
    await openModel()
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.model.edges }))
    await waitFor(() => expect(fake.instances[0]?.edgesVisible).toBe(true))
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.model.edges }))
    await waitFor(() => expect(fake.instances[0]?.edgesVisible).toBe(false))
  })

  test('pivô: os steppers gravam a origem dentro da caixa e "Pivô no centro" apaga', async () => {
    await openModel()
    fireEvent.click(screen.getByRole('button', { name: 'corpo, caixa' }))
    const label = `${COPY.editor.model.pivot} X`
    const x = screen.getByRole('textbox', { name: label }) as HTMLInputElement
    expect(x.value).toBe('0')
    fireEvent.click(screen.getByRole('button', { name: COPY.a11y.increase(label) }))
    await waitFor(() => expect(lastModel().parts[0]?.origin).toEqual([1, 1, 0]))
    fireEvent.change(x, { target: { value: '9' } })
    fireEvent.blur(x)
    // Preso à caixa da peça (x vai até 2).
    await waitFor(() => expect(lastModel().parts[0]?.origin?.[0]).toBe(2))
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.model.pivotCenter }))
    await waitFor(() => expect(lastModel().parts[0]?.origin).toBeUndefined())
  })

  test('trancar e esconder pela lista; a peça trancada não anda com as setas e avisa', async () => {
    await openModel()
    fireEvent.click(screen.getByRole('button', { name: 'corpo, caixa' }))
    fireEvent.click(screen.getByRole('button', { name: COPY.a11y.partLock('corpo', false) }))
    await waitFor(() => expect(lastModel().parts[0]?.locked).toBe(true))
    expect(screen.getByText(new RegExp(COPY.editor.model.lockedTag))).toBeDefined()
    fireEvent.keyDown(document, { key: 'ArrowRight' })
    expect(await screen.findByText(COPY.editor.model.lockedHint)).toBeDefined()
    expect(lastModel().parts[0]?.from[0]).toBe(-2)
    fireEvent.click(screen.getByRole('button', { name: COPY.a11y.partLock('corpo', true) }))
    await waitFor(() => expect(lastModel().parts[0]?.locked).toBeUndefined())
    fireEvent.click(screen.getByRole('button', { name: COPY.a11y.partHide('corpo', false) }))
    await waitFor(() => expect(lastModel().parts[0]?.hidden).toBe(true))
    expect(screen.getByRole('button', { name: COPY.a11y.partHide('corpo', true) })).toBeDefined()
    // Escondida segue no modelo e no export: o status conta as duas peças.
    expect(screen.getByText(/2\/128 peças/)).toBeDefined()
  })

  test('seleção múltipla: Somar à seleção (ou Shift) soma pela lista; o palco recebe as somadas; Delete apaga todas', async () => {
    await openModel()
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.model.partsAdditive }))
    fireEvent.click(screen.getByRole('button', { name: 'corpo, caixa' }))
    fireEvent.click(screen.getByRole('button', { name: 'asa, rampa' }))
    await waitFor(() => expect(fake.instances[0]?.extraSelected).toEqual(['wing']))
    expect(fake.instances[0]?.selected).toBe('body')
    expect(screen.getByText(COPY.editor.model.selectedParts(2))).toBeDefined()
    // Tocar de novo tira da seleção; Shift soma sem o botão.
    fireEvent.click(screen.getByRole('button', { name: 'asa, rampa' }))
    await waitFor(() => expect(fake.instances[0]?.extraSelected).toEqual([]))
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.model.partsAdditive }))
    fireEvent.click(screen.getByRole('button', { name: 'asa, rampa' }), { shiftKey: true })
    await waitFor(() => expect(fake.instances[0]?.extraSelected).toEqual(['wing']))
    // O toque no palco com Shift também soma (e tira).
    act(() => fake.instances[0]?.callbacks.onSelect('wing', true))
    await waitFor(() => expect(fake.instances[0]?.extraSelected).toEqual([]))
    act(() => fake.instances[0]?.callbacks.onSelect('wing', true))
    await waitFor(() => expect(fake.instances[0]?.extraSelected).toEqual(['wing']))
    // As setas movem o grupo inteiro.
    fireEvent.keyDown(document, { key: 'ArrowRight' })
    await waitFor(() => expect(lastModel().parts[0]?.from[0]).toBe(-1))
    expect(lastModel().parts[1]?.from[0]).toBe(3)
    // O arrasto do grupo chega como caixas absolutas por peça.
    act(() => {
      fake.instances[0]?.callbacks.onDragStart('body')
      fake.instances[0]?.callbacks.onDragMove({
        id: 'body',
        parts: [
          { id: 'body', from: [-1, 0, -2], to: [3, 2, 4] },
          { id: 'wing', from: [3, 0, 0], to: [6, 1, 2] },
        ],
      })
      fake.instances[0]?.callbacks.onDragEnd(null)
    })
    await waitFor(() => expect(lastModel().parts[1]?.from[2]).toBe(0))
    expect(lastModel().parts[0]?.from[2]).toBe(-2)
    fireEvent.keyDown(document, { key: 'Delete' })
    await waitFor(() => expect(lastModel().parts).toHaveLength(0))
    expect(fake.instances[0]?.extraSelected).toEqual([])
  })
})
