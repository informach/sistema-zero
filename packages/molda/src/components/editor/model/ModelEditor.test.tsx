import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { COPY } from '../../../core/copy'
import { MOLDA_LIMITS } from '../../../core/limits'
import {
  createPart,
  type MoldaAsset,
  type MoldaMesh,
  type MoldaModelAsset,
} from '../../../core/model'
import { getPalette } from '../../../core/palette'
import { applySnapMove, snapSourceAnchors, snapTargetAnchors } from '../../../model/snap'
import { mirrorTwinOf } from '../../../model/twins'
import { createMemoryPersistence } from '../../../state/memoryPersistence'
import { resetMoldaPersistenceForTests } from '../../../state/persistence'
import { installFailingViewport, installFakeViewport } from '../../../testing/fakeViewport'
import { makeModel } from '../../../testing/fixtures'
import { MoldaApp } from '../../MoldaApp'

let fake: ReturnType<typeof installFakeViewport>

beforeEach(() => {
  resetMoldaPersistenceForTests()
  // ⚠️ Sem foto por padrão: com a foto, cada montagem agenda um `setThumb` 700 ms depois,
  // e um teste que passe desse tempo recebe essa atualização FORA do act. Era a causa dos
  // avisos act intermitentes que só apareciam na suíte inteira, onde os testes ficam mais
  // lentos. Quem prova a miniatura reinstala o palco com ela.
  fake = installFakeViewport({ thumb: null })
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

function meshWithFaces(count: number): MoldaMesh {
  const faces: MoldaMesh['faces'] = {}
  for (let index = 0; index < count; index += 1) {
    faces[`f_${index.toString(36)}`] = { v: ['v_a', 'v_b', 'v_c', 'v_d'] }
  }
  return {
    vertices: {
      v_a: [0, 0, 0],
      v_b: [1, 0, 0],
      v_c: [1, 1, 1],
      v_d: [0, 1, 1],
    },
    faces,
  }
}

function modelAtTriangleLimit(): MoldaModelAsset {
  const parts = Array.from({ length: 10 }, (_unused, index) =>
    createPart({
      id: `mesh-${index}`,
      name: `malha-${index}`,
      shape: 'mesh',
      from: [0, 0, 0],
      to: [1, 1, 1],
      color: 1,
      mesh: meshWithFaces(index === 9 ? 784 : MOLDA_LIMITS.maxMeshFaces),
    }),
  )
  return makeModel({ parts })
}

async function openModel(
  asset: MoldaModelAsset = makeModel(),
): Promise<ReturnType<typeof createMemoryPersistence>> {
  const persistence = createMemoryPersistence([asset])
  render(<MoldaApp persistence={persistence} adapter={{ initialAssetId: 'model-1' }} />)
  await screen.findByRole('complementary', { name: COPY.editor.model.toolbox })
  await waitFor(() => expect(lastModel().parts).toHaveLength(asset.parts.length))
  return persistence
}

describe('ModelEditor (bancada Montar)', () => {
  test('isolation follows selection, offers an explicit exit and never enters saved content/history', async () => {
    await openModel()
    const before = lastModel()
    const isolate = screen.getByRole('button', {
      name: COPY.editor.model.isolation.toggle,
    }) as HTMLButtonElement
    expect(isolate.disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'corpo, caixa' }))
    fireEvent.click(isolate)
    expect(fake.instances[0]?.isolatedIds).toEqual(['body'])
    expect(isolate.getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: 'asa, rampa' }))
    expect(fake.instances[0]?.isolatedIds).toEqual(['wing'])
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.model.isolation.showAll }))
    expect(fake.instances[0]?.isolatedIds).toBeNull()
    expect(lastModel().parts).toBe(before.parts)
    expect(
      (screen.getByRole('button', { name: COPY.editor.undo }) as HTMLButtonElement).disabled,
    ).toBe(true)
  })

  test('view controls show the active projection and frame the selection without changing the document', async () => {
    await openModel()
    const before = lastModel()
    const selectedFrame = screen.getByRole('button', {
      name: COPY.editor.model.views.selection,
    }) as HTMLButtonElement
    expect(selectedFrame.disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.model.views.front }))
    expect(fake.instances[0]?.views.at(-1)).toBe('front')
    expect(
      screen
        .getByRole('button', { name: COPY.editor.model.views.front })
        .getAttribute('aria-pressed'),
    ).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: 'corpo, caixa' }))
    fireEvent.click(selectedFrame)
    expect(fake.instances[0]?.views.at(-1)).toBe('selection')
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.model.views.free }))
    expect(fake.instances[0]?.views.at(-1)).toBe('free')
    expect(lastModel().parts).toBe(before.parts)
    expect(
      (screen.getByRole('button', { name: COPY.editor.undo }) as HTMLButtonElement).disabled,
    ).toBe(true)
  })

  test('Escape cancels a held arrow without creating history on its late keyup', async () => {
    await openModel()
    fireEvent.click(screen.getByRole('button', { name: 'corpo, caixa' }))
    const before = lastModel()
    fireEvent.keyDown(document, { key: 'ArrowRight' })
    fireEvent.keyDown(document, { key: 'ArrowRight', repeat: true })
    expect(lastModel().parts).not.toEqual(before.parts)
    fireEvent.keyDown(document, { key: 'Escape' })
    fireEvent.keyUp(document, { key: 'ArrowRight' })
    expect(lastModel().parts).toEqual(before.parts)
    expect(
      (screen.getByRole('button', { name: COPY.editor.undo }) as HTMLButtonElement).disabled,
    ).toBe(true)
  })

  test.each([
    'Escape',
    'pointercancel',
  ])('%s cancels the active viewport preview and ignores its late end', async (reason) => {
    await openModel()
    fireEvent.click(screen.getByRole('button', { name: 'corpo, caixa' }))
    const before = lastModel()
    act(() => {
      fake.instances[0]?.callbacks.onDragStart('body')
      fake.instances[0]?.callbacks.onDragMove({ id: 'body', from: [0, 0, 0], to: [4, 4, 4] })
    })
    expect(lastModel().parts[0]?.from).toEqual([0, 0, 0])
    if (reason === 'Escape') {
      fireEvent.keyDown(document, { key: 'Escape' })
      expect(fake.instances[0]?.cancellations).toBe(1)
    } else act(() => fake.instances[0]?.callbacks.onGestureCancel())
    expect(lastModel().parts).toEqual(before.parts)
    act(() => fake.instances[0]?.callbacks.onDragEnd(null))
    expect(lastModel().parts).toEqual(before.parts)
    expect(
      (screen.getByRole('button', { name: COPY.editor.undo }) as HTMLButtonElement).disabled,
    ).toBe(true)
  })

  test('a late paint completion cannot overwrite a newer palette command', async () => {
    await openModel()
    const before = lastModel()
    act(() => fake.instances[0]?.callbacks.onPaintStart())
    fireEvent.change(screen.getByRole('combobox', { name: COPY.a11y.paletteSelect }), {
      target: { value: 'pastel' },
    })
    await waitFor(() => expect(lastModel().paletteId).toBe('pastel'))
    const edited = lastModel()
    act(() => fake.instances[0]?.callbacks.onPaintEnd({ ...before, name: 'stale paint buffer' }))
    expect(lastModel()).toBe(edited)
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
    await waitFor(() => expect(lastModel().paletteId).toBe(before.paletteId))
    expect(
      (screen.getByRole('button', { name: COPY.editor.undo }) as HTMLButtonElement).disabled,
    ).toBe(true)
  })

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
    screen.getByText(COPY.editor.model.status(2, 128, 20))
    screen.getByRole('button', { name: 'corpo, caixa' })
    screen.getByText(COPY.editor.model.noSelection)
  })

  test('a ajuda mostra apenas os comandos e gestos do contexto atual', async () => {
    await openModel()
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.model.help.button }))
    let dialog = screen.getByRole('dialog', { name: COPY.editor.model.help.title })
    expect(within(dialog).getByText(COPY.editor.model.help.contexts.build)).toBeDefined()
    expect(within(dialog).getByText(COPY.editor.model.tools.move)).toBeDefined()
    expect(within(dialog).getByText('Ctrl+D')).toBeDefined()
    expect(within(dialog).queryByText(COPY.editor.model.paint.tools.pencil)).toBeNull()

    fireEvent.click(within(dialog).getByRole('button', { name: COPY.a11y.closeDialog }))
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.model.mode.paint }))
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.model.help.button }))
    dialog = screen.getByRole('dialog', { name: COPY.editor.model.help.title })
    expect(within(dialog).getByText(COPY.editor.model.help.contexts.paint)).toBeDefined()
    expect(within(dialog).getByText(COPY.editor.model.paint.tools.pencil)).toBeDefined()
    expect(within(dialog).queryByText(COPY.editor.model.tools.move)).toBeNull()
  })

  test('adicionar caixa entra no modo de colocar; toque na superfície cria e desfazer volta', async () => {
    await openModel()
    fireEvent.click(screen.getByRole('button', { name: `${COPY.editor.model.addGroup} caixa` }))
    expect(fake.instances[0]?.placementShape).toBe('box')
    expect(lastModel().parts).toHaveLength(2)
    act(() => fake.instances[0]?.callbacks.onPlace('box', [2, 1, 0], [1, 0, 0], 'body'))
    await waitFor(() => expect(lastModel().parts).toHaveLength(3))
    expect(fake.instances[0]?.placementShape).toBeNull()
    screen.getByText(COPY.editor.model.status(3, 128, 32))
    const nameInput = screen.getByDisplayValue('caixa') as HTMLInputElement
    expect(nameInput).toBeDefined()
    expect(fake.instances[0]?.selected).toBe(lastModel().parts[2]?.id ?? null)
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
    await waitFor(() => expect(lastModel().parts).toHaveLength(2))
    screen.getByText(COPY.editor.model.noSelection)
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

  test('espelhar no teto de peças explica por que não pode ligar', async () => {
    const parts = Array.from({ length: MOLDA_LIMITS.maxParts }, (_unused, index) =>
      createPart({
        id: `p-${index}`,
        name: `peca-${index}`,
        from: [2, 0, 0],
        to: [3, 1, 1],
        color: 1,
      }),
    )
    await openModel(makeModel({ mirrorX: false, parts }))

    fireEvent.click(screen.getByRole('button', { name: COPY.editor.model.mirror }))

    await screen.findByText(COPY.editor.model.partsFull)
    expect(lastModel().mirrorX).toBe(false)
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

  test('adicionar no teto de triângulos explica o limite correto', async () => {
    await openModel(modelAtTriangleLimit())

    fireEvent.keyDown(document, { key: 'b' })

    await screen.findByText(COPY.editor.model.trianglesFull)
    expect(lastModel().parts).toHaveLength(10)
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
    const input = document.querySelector('input[type="color"]') as HTMLInputElement
    fireEvent.change(input, { target: { value: '#123456' } })
    await waitFor(() => expect(lastModel().extraColors).toEqual(['#123456']))
    expect(lastModel().parts[0]?.color).toBe(16)
  })

  test('"+ Nova cor" é UM gesto: N passos do seletor viram UMA extra e UM desfazer', async () => {
    await openModel()
    fireEvent.click(screen.getByRole('button', { name: 'corpo, caixa' }))
    const input = document.querySelector('input[type="color"]') as HTMLInputElement
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

  test('sem foto no palco, nada é gravado depois que o teste passa do tempo da miniatura', async () => {
    // Regressão da causa dos avisos act intermitentes (aberta desde o lote 203): com o
    // palco devolvendo foto, cada montagem agendava um `setThumb` 700 ms depois. Um teste
    // mais lento que isso recebia a atualização FORA do act, e é por isso que os avisos só
    // apareciam na suíte inteira. A sonda que provou isso reproduzia exatamente os mesmos
    // cinco componentes: LoadedEditor, EditorTopBar duas vezes, FacePaintDialog e ModelEditor.
    const persistence = await openModel()
    await new Promise((resolve) => setTimeout(resolve, 1200))
    expect(modelOf(persistence.snapshot()[0]).thumb).toBeUndefined()
    expect(fake.instances[0]?.thumbs ?? 0).toBeGreaterThan(0)
  })

  test('a miniatura é fotografada depois de uma mudança e salva no asset', async () => {
    // Este é o teste da foto: aqui o palco devolve uma.
    fake.uninstall()
    fake = installFakeViewport()
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
      await screen.findByText(COPY.editor.model.unsupported)
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
    fireEvent.keyUp(document, { key: 'ArrowRight' })
    await waitFor(() => expect(lastModel().parts[0]?.from[0]).toBe(-1))
    fireEvent.keyDown(document, { key: 'ArrowUp', shiftKey: true })
    fireEvent.keyUp(document, { key: 'ArrowUp', shiftKey: true })
    await waitFor(() => expect(lastModel().parts[0]?.from[2]).toBe(-8))
    fireEvent.keyDown(document, { key: 'PageUp' })
    fireEvent.keyUp(document, { key: 'PageUp' })
    await waitFor(() => expect(lastModel().parts[0]?.from[1]).toBe(1))
    // Um desfazer por toque.
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
    await waitFor(() => expect(lastModel().parts[0]?.from[1]).toBe(0))
    expect(lastModel().parts[0]?.from[2]).toBe(-8)
    // Editar malha: a seta move os PONTOS escolhidos, não a peça.
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.model.mesh.convert }))
    await waitFor(() => expect(fake.instances[0]?.meshEdit?.partId).toBe('body'))
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.model.mesh.modes.face }))
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
    const lock = screen.getByRole('button', { name: COPY.a11y.partLock('corpo') })
    fireEvent.click(lock)
    await waitFor(() => expect(lastModel().parts[0]?.locked).toBe(true))
    expect(lock.getAttribute('aria-pressed')).toBe('true')
    screen.getByText(new RegExp(COPY.editor.model.lockedTag))
    fireEvent.keyDown(document, { key: 'ArrowRight' })
    await screen.findByText(COPY.editor.model.lockedHint)
    expect(lastModel().parts[0]?.from[0]).toBe(-2)
    fireEvent.click(lock)
    await waitFor(() => expect(lastModel().parts[0]?.locked).toBeUndefined())
    expect(lock.getAttribute('aria-pressed')).toBe('false')
    const hide = screen.getByRole('button', { name: COPY.a11y.partHide('corpo') })
    fireEvent.click(hide)
    await waitFor(() => expect(lastModel().parts[0]?.hidden).toBe(true))
    expect(hide.getAttribute('aria-pressed')).toBe('true')
    // Escondida segue no modelo e no export: o status conta as duas peças.
    screen.getByText(/2\/128 peças/)
  })

  test('seleção múltipla: Somar à seleção (ou Shift) soma pela lista; o palco recebe as somadas; Delete apaga todas', async () => {
    await openModel()
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.model.partsAdditive }))
    fireEvent.click(screen.getByRole('button', { name: 'corpo, caixa' }))
    fireEvent.click(screen.getByRole('button', { name: 'asa, rampa' }))
    await waitFor(() => expect(fake.instances[0]?.extraSelected).toEqual(['wing']))
    expect(fake.instances[0]?.selected).toBe('body')
    screen.getByText(COPY.editor.model.selectedParts(2))
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

  test('duplicar uma seleção é atômico quando só parte do grupo caberia', async () => {
    const parts = Array.from({ length: MOLDA_LIMITS.maxParts - 1 }, (_unused, index) =>
      createPart({
        id: `p-${index}`,
        name: `peca-${index}`,
        from: [0, 0, 0],
        to: [1, 1, 1],
        color: 1,
      }),
    )
    await openModel(makeModel({ parts }))
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.model.partsAdditive }))
    fireEvent.click(screen.getByRole('button', { name: 'peca-0, caixa' }))
    fireEvent.click(screen.getByRole('button', { name: 'peca-1, caixa' }))

    fireEvent.click(screen.getByRole('button', { name: COPY.editor.model.duplicate }))

    await screen.findByText(COPY.editor.model.partsFull)
    expect(lastModel().parts).toHaveLength(MOLDA_LIMITS.maxParts - 1)
  })

  test('Arrumar move o grupo atomicamente e Repetir mantém um único passo de desfazer ao ajustar', async () => {
    const low = createPart({ id: 'low', name: 'baixo', from: [4, 3, 4], to: [6, 5, 6], color: 1 })
    const high = createPart({ id: 'high', name: 'alto', from: [6, 5, 4], to: [8, 7, 6], color: 2 })
    await openModel(makeModel({ parts: [low, high] }))
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.model.partsAdditive }))
    fireEvent.click(screen.getByRole('button', { name: 'baixo, caixa' }))
    const alignX = screen.getByRole('button', { name: COPY.editor.model.arrange.alignAxis('X') })
    expect((alignX as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'alto, caixa' }))
    expect((alignX as HTMLButtonElement).disabled).toBe(false)

    fireEvent.click(screen.getByRole('button', { name: COPY.editor.model.arrange.floor }))
    await waitFor(() => expect(lastModel().parts[0]?.from[1]).toBe(0))
    expect(lastModel().parts[1]?.from[1]).toBe(2)
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
    await waitFor(() => expect(lastModel().parts[0]?.from[1]).toBe(3))

    fireEvent.click(
      screen.getByRole('button', {
        name: COPY.editor.model.arrange.repeatDirection(COPY.editor.model.arrange.directions['+x']),
      }),
    )
    await waitFor(() => expect(lastModel().parts).toHaveLength(4))
    fireEvent.click(
      screen.getByRole('button', { name: COPY.a11y.increase(COPY.editor.model.arrange.count) }),
    )
    await waitFor(() => expect(lastModel().parts).toHaveLength(6))
    expect(fake.instances[0]?.extraSelected).toHaveLength(3)

    fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
    await waitFor(() => expect(lastModel().parts).toHaveLength(2))
  })

  test('arrasto do grupo é atômico quando um novo gêmeo não cabe', async () => {
    const crossing = createPart({
      id: 'a',
      name: 'a',
      from: [-1, 0, 0],
      to: [1, 1, 1],
      color: 1,
    })
    const otherCrossing = createPart({
      id: 'c',
      name: 'c',
      from: [-1, 2, 0],
      to: [1, 3, 1],
      color: 1,
    })
    const pairs = Array.from({ length: 63 }, (_unused, index) => {
      const source = createPart({
        id: `s${index}`,
        name: `s${index}`,
        from: [4, 4, 0],
        to: [5, 5, 1],
        color: 1,
      })
      return [source, mirrorTwinOf(source, { id: `t${index}`, name: `t${index}` })]
    }).flat()
    const model = makeModel({ mirrorX: true, parts: [crossing, otherCrossing, ...pairs] })
    expect(model.parts).toHaveLength(MOLDA_LIMITS.maxParts)
    await openModel(model)
    const callbacks = fake.instances[0]?.callbacks
    if (!callbacks) throw new Error('sem palco')
    act(() => {
      callbacks.onSelect('a', false)
      callbacks.onSelect('s0', true)
      callbacks.onDragStart('a')
      callbacks.onDragMove({
        id: 'a',
        parts: [
          { id: 'a', from: [1, 0, 0], to: [3, 1, 1] },
          { id: 's0', from: [6, 4, 0], to: [7, 5, 1] },
        ],
      })
      callbacks.onDragEnd(null)
    })

    expect(lastModel().parts.find((part) => part.id === 'a')?.from).toEqual([-1, 0, 0])
    expect(lastModel().parts.find((part) => part.id === 's0')?.from).toEqual([4, 4, 0])
  })
})

describe('review 06/09: gesto de cor, setas seguradas, Pintar sem somar', () => {
  test('o gesto do "+" fecha ANTES de um gesto do palco: o histórico fica na ordem certa', async () => {
    await openModel()
    fireEvent.click(screen.getByRole('button', { name: 'corpo, caixa' }))
    const input = document.querySelector('input[type="color"]') as HTMLInputElement
    // Um passo do seletor (sem `change`: o Esc do seletor) deixa o gesto aberto.
    fireEvent.input(input, { target: { value: '#123456' } })
    await waitFor(() => expect(lastModel().extraColors).toEqual(['#123456']))
    // Um arrasto no palco começa: o gesto de cor fecha primeiro, com o SEU antes.
    const callbacks = fake.instances[0]?.callbacks
    if (!callbacks) throw new Error('palco')
    act(() => {
      callbacks.onDragStart('body')
      callbacks.onDragMove({ id: 'body', from: [-1, 0, -3], to: [3, 2, 3] })
      callbacks.onDragEnd(null)
    })
    await waitFor(() => expect(lastModel().parts[0]?.from[0]).toBe(-1))
    // O blur tardio não commita nada por cima.
    fireEvent.blur(input)
    const undo = screen.getByRole('button', { name: COPY.editor.undo })
    // 1º desfazer: o arrasto (a cor fica); 2º: a cor.
    fireEvent.click(undo)
    await waitFor(() => expect(lastModel().parts[0]?.from[0]).toBe(-2))
    expect(lastModel().extraColors).toEqual(['#123456'])
    fireEvent.click(undo)
    await waitFor(() => expect(lastModel().extraColors ?? []).toEqual([]))
  })

  test('um passo do seletor sobre uma cor que JÁ existe tira a extra e aponta para ela', async () => {
    await openModel()
    fireEvent.click(screen.getByRole('button', { name: 'corpo, caixa' }))
    const input = document.querySelector('input[type="color"]') as HTMLInputElement
    fireEvent.input(input, { target: { value: '#123456' } })
    await waitFor(() => expect(lastModel().parts[0]?.color).toBe(16))
    // O vermelho fixo (índice 2).
    fireEvent.input(input, { target: { value: '#ff2121' } })
    fireEvent.change(input, { target: { value: '#ff2121' } })
    await waitFor(() => expect(lastModel().parts[0]?.color).toBe(2))
    expect(lastModel().extraColors ?? []).toEqual([])
  })

  test('desfazer a cor extra que o lápis usa devolve o lápis à 1ª cor', async () => {
    await openModel()
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.model.mode.paint }))
    await waitFor(() => expect(fake.instances[0]?.mode).toBe('paint'))
    const input = document.querySelector('input[type="color"]') as HTMLInputElement
    fireEvent.change(input, { target: { value: '#123456' } })
    await waitFor(() => expect(fake.instances[0]?.paint?.color).toBe(16))
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
    await waitFor(() => expect(fake.instances[0]?.paint?.color).toBe(1))
  })

  test('seta segurada é UM gesto (um desfazer só) e sem seleção a seta é do navegador', async () => {
    await openModel()
    act(() => fake.instances[0]?.callbacks.onSelect(null, false))
    await waitFor(() => expect(fake.instances[0]?.selected).toBeNull())
    fireEvent.keyDown(document, { key: 'ArrowRight' })
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(lastModel().parts[0]?.from[0]).toBe(-2)
    fireEvent.click(screen.getByRole('button', { name: 'corpo, caixa' }))
    fireEvent.keyDown(document, { key: 'ArrowRight' })
    fireEvent.keyDown(document, { key: 'ArrowRight', repeat: true })
    fireEvent.keyDown(document, { key: 'ArrowRight', repeat: true })
    fireEvent.keyUp(document, { key: 'ArrowRight' })
    await waitFor(() => expect(lastModel().parts[0]?.from[0]).toBe(1))
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
    await waitFor(() => expect(lastModel().parts[0]?.from[0]).toBe(-2))
  })

  test('no Pintar o toque só escolhe a peça (o "Somar à seleção" não vaza)', async () => {
    await openModel()
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.model.partsAdditive }))
    fireEvent.click(screen.getByRole('button', { name: 'corpo, caixa' }))
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.model.mode.paint }))
    await waitFor(() => expect(fake.instances[0]?.mode).toBe('paint'))
    act(() => fake.instances[0]?.callbacks.onSelect('wing', false))
    await waitFor(() => expect(fake.instances[0]?.selected).toBe('wing'))
    expect(fake.instances[0]?.extraSelected).toEqual([])
  })

  test('Editar malha numa peça trancada avisa em vez de abrir um beco sem saída', async () => {
    await openModel()
    fireEvent.click(screen.getByRole('button', { name: 'corpo, caixa' }))
    fireEvent.click(screen.getByRole('button', { name: COPY.a11y.partLock('corpo') }))
    await waitFor(() => expect(lastModel().parts[0]?.locked).toBe(true))
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.model.mesh.convert }))
    await screen.findByText(COPY.editor.model.lockedHint)
    expect(fake.instances[0]?.meshEdit).toBeNull()
    expect(lastModel().parts[0]?.shape).toBe('box')
  })

  test('apagar a extra anterior preserva a mesma cor física do lápis', async () => {
    const model = makeModel({ extraColors: ['#111111', '#222222'] })
    const body = model.parts[0]
    if (!body) throw new Error('sem corpo')
    body.color = 16
    await openModel(model)
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.model.mode.paint }))
    fireEvent.click(screen.getByRole('button', { name: COPY.a11y.colorSwatch(17, '#222222') }))
    await waitFor(() => expect(fake.instances[0]?.paint?.color).toBe(17))

    fireEvent.click(screen.getByRole('button', { name: COPY.editor.model.mode.build }))
    fireEvent.click(screen.getByRole('button', { name: 'corpo, caixa' }))
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.model.paint.removeColor }))
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.model.mode.paint }))

    await waitFor(() => expect(fake.instances[0]?.paint?.color).toBe(16))
    expect(lastModel().extraColors).toEqual(['#222222'])
  })
})

describe('Grudar pontos', () => {
  test('dois toques movem a peça em um único commit e voltam para Mover', async () => {
    await openModel()
    fireEvent.click(screen.getByRole('button', { name: 'corpo, caixa' }))
    const before = structuredClone(lastModel())
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.model.tools.snap }))
    await waitFor(() => expect(fake.instances[0]?.snapState.phase).toBe('source'))
    screen.getByText(COPY.editor.model.snap.source)

    const sources = snapSourceAnchors(lastModel(), 'body', ['body'])
    const targets = snapTargetAnchors(lastModel(), 'wing', ['body'])
    const pair = sources
      .flatMap((source) => targets.map((target) => ({ source, target })))
      .find(({ source, target }) => applySnapMove(lastModel(), ['body'], source.ref, target.ref).ok)
    if (!pair) throw new Error('sem par válido')
    const { source, target } = pair
    act(() => fake.instances[0]?.callbacks.onSnapSource(source))
    await waitFor(() => expect(fake.instances[0]?.snapState.phase).toBe('target'))
    screen.getByText(COPY.editor.model.snap.target)

    act(() => fake.instances[0]?.callbacks.onSnapTarget(target))

    await waitFor(() => expect(fake.instances[0]?.tool).toBe('move'))
    expect(fake.instances[0]?.snapState).toEqual({ phase: 'inactive' })
    expect(lastModel().parts.find((part) => part.id === 'body')?.from).not.toEqual(
      before.parts.find((part) => part.id === 'body')?.from,
    )
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
    await waitFor(() => expect(lastModel().parts).toEqual(before.parts))
    expect(
      (screen.getByRole('button', { name: COPY.editor.undo }) as HTMLButtonElement).disabled,
    ).toBe(true)
  })

  test('G ativa; Esc, novo clique e troca de modo cancelam; peça trancada não entra', async () => {
    await openModel()
    fireEvent.click(screen.getByRole('button', { name: 'corpo, caixa' }))
    fireEvent.keyDown(document, { key: 'g' })
    await waitFor(() => expect(fake.instances[0]?.tool).toBe('snap'))
    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(fake.instances[0]?.tool).toBe('move'))
    expect(fake.instances[0]?.snapState.phase).toBe('inactive')

    fireEvent.keyDown(document, { key: 'g' })
    await waitFor(() => expect(fake.instances[0]?.tool).toBe('snap'))
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.model.tools.snap }))
    await waitFor(() => expect(fake.instances[0]?.tool).toBe('move'))

    fireEvent.keyDown(document, { key: 'g' })
    await waitFor(() => expect(fake.instances[0]?.tool).toBe('snap'))
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.model.mode.paint }))
    await waitFor(() => expect(fake.instances[0]?.mode).toBe('paint'))
    expect(fake.instances[0]?.snapState.phase).toBe('inactive')
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.model.mode.build }))

    fireEvent.keyDown(document, { key: 'g' })
    await waitFor(() => expect(fake.instances[0]?.tool).toBe('snap'))
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.model.mesh.convert }))
    await waitFor(() => expect(fake.instances[0]?.meshEdit).not.toBeNull())
    expect(fake.instances[0]?.tool).toBe('move')
    expect(fake.instances[0]?.snapState.phase).toBe('inactive')
    fireEvent.keyDown(document, { key: 'g' })
    expect(fake.instances[0]?.tool).toBe('move')
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.model.mesh.done }))

    fireEvent.click(screen.getByRole('button', { name: COPY.a11y.partLock('corpo') }))
    await waitFor(() => expect(lastModel().parts[0]?.locked).toBe(true))
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.model.tools.snap }))
    await screen.findByText(COPY.editor.model.snap.locked)
    expect(fake.instances[0]?.snapState.phase).toBe('inactive')
  })

  test('trocar a seleção pela lista cancela Grudar e não move o grupo antigo', async () => {
    await openModel()
    fireEvent.click(screen.getByRole('button', { name: 'corpo, caixa' }))
    const before = structuredClone(lastModel())
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.model.tools.snap }))
    await waitFor(() => expect(fake.instances[0]?.snapState.phase).toBe('source'))
    const source = snapSourceAnchors(lastModel(), 'body', ['body'])[0]
    const target = snapTargetAnchors(lastModel(), 'wing', ['body'])[0]
    if (!source || !target) throw new Error('sem âncoras')
    act(() => fake.instances[0]?.callbacks.onSnapSource(source))
    await waitFor(() => expect(fake.instances[0]?.snapState.phase).toBe('target'))

    fireEvent.click(screen.getByRole('button', { name: 'asa, rampa' }))

    await waitFor(() => expect(fake.instances[0]?.snapState.phase).toBe('inactive'))
    expect(fake.instances[0]?.tool).toBe('move')
    act(() => fake.instances[0]?.callbacks.onSnapTarget(target))
    expect(lastModel().parts).toEqual(before.parts)
    expect(fake.instances[0]?.selected).toBe('wing')
  })
})
