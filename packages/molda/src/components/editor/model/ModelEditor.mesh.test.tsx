import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { COPY } from '../../../core/copy'
import type { MoldaModelAsset } from '../../../core/model'
import { boxMesh, meshIssues } from '../../../model/mesh'
import { createMemoryPersistence } from '../../../state/memoryPersistence'
import { resetMoldaPersistenceForTests } from '../../../state/persistence'
import { installFakeViewport } from '../../../testing/fakeViewport'
import { makeModel } from '../../../testing/fixtures'
import type { ViewportCallbacks } from '../../../viewport/types'
import { MoldaApp } from '../../MoldaApp'

/**
 * O sub-modo EDITAR MALHA na bancada (palco falso): transformar, escolher por
 * ponto/face, arrastar a alça com um desfazer só, apagar a seleção, fechar.
 */
let fake: ReturnType<typeof installFakeViewport>

beforeEach(() => {
  resetMoldaPersistenceForTests()
  fake = installFakeViewport()
})

afterEach(() => {
  fake.uninstall()
})

const copy = COPY.editor.model.mesh

function lastModel(): MoldaModelAsset {
  const model = fake.instances.at(-1)?.models.at(-1)
  if (!model) throw new Error('o palco não recebeu modelo')
  return model
}

async function openAndConvert(): Promise<ViewportCallbacks> {
  render(
    <MoldaApp
      persistence={createMemoryPersistence([makeModel()])}
      adapter={{ initialAssetId: 'model-1' }}
    />,
  )
  await screen.findByRole('complementary', { name: COPY.editor.model.toolbox })
  await waitFor(() => expect(lastModel().parts).toHaveLength(2))
  fireEvent.click(screen.getByRole('button', { name: 'corpo, caixa' }))
  fireEvent.click(screen.getByRole('button', { name: copy.convert }))
  await waitFor(() => expect(fake.instances[0]?.meshEdit?.partId).toBe('body'))
  const callbacks = fake.instances[0]?.callbacks
  if (!callbacks) throw new Error('sem palco')
  return callbacks
}

describe('Editar malha (M2)', () => {
  test('Transformar em malha: a caixa vira malha, o toast avisa e a bancada troca de caixa', async () => {
    await openAndConvert()
    expect(lastModel().parts[0]?.shape).toBe('mesh')
    await screen.findByText(copy.converted)
    screen.getByRole('complementary', { name: copy.toolbox })
    screen.getByText(copy.counts(8, 6, 12))
    screen.getByText(copy.nothingSelected)
  })

  test('toque escolhe ponto/face; arrastar a alça move os vértices com UM desfazer; Esc fecha', async () => {
    const callbacks = await openAndConvert()
    fireEvent.click(screen.getByRole('button', { name: copy.modes.face }))
    act(() => callbacks.onMeshPick({ kind: 'face', key: 'f_py' }, false))
    await waitFor(() => expect(fake.instances[0]?.meshEdit?.vertices).toHaveLength(4))
    await waitFor(() => screen.getByText(copy.selected(1, 'face')))
    // Somar: o toque na mesma face tira; o próximo a acrescenta de novo.
    act(() => callbacks.onMeshPick({ kind: 'face', key: 'f_py' }, true))
    await waitFor(() => expect(fake.instances[0]?.meshEdit?.vertices).toHaveLength(0))
    act(() => callbacks.onMeshPick({ kind: 'face', key: 'f_py' }, true))
    await waitFor(() => expect(fake.instances[0]?.meshEdit?.vertices).toHaveLength(4))
    // Arrasto da alça: a face de cima sobe um bloco (delta encaixado), um desfazer só.
    act(() => {
      callbacks.onMeshDragStart()
      callbacks.onMeshDragMove([0, 0.6, 0])
      callbacks.onMeshDragMove([0, 1.2, 0])
    })
    await waitFor(() => expect(lastModel().parts[0]?.to[1]).toBe(3))
    act(() => callbacks.onMeshDragEnd())
    const undo = screen.getByRole('button', { name: COPY.editor.undo }) as HTMLButtonElement
    await waitFor(() => expect(undo.disabled).toBe(false))
    fireEvent.click(undo)
    await waitFor(() => expect(lastModel().parts[0]?.to[1]).toBe(2))
    // Desfazer uma vez volta ao modelo convertido (a conversão é o passo anterior).
    expect(lastModel().parts[0]?.shape).toBe('mesh')
    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(fake.instances[0]?.meshEdit).toBeNull())
    screen.getByRole('complementary', { name: COPY.editor.model.toolbox })
  })

  test('Delete apaga a seleção; apagar tudo apaga a peça e avisa', async () => {
    const callbacks = await openAndConvert()
    act(() => callbacks.onMeshPick({ kind: 'vertex', key: 'v_111' }, false))
    await waitFor(() => expect(fake.instances[0]?.meshEdit?.vertices).toEqual(['v_111']))
    fireEvent.keyDown(document, { key: 'Delete' })
    await waitFor(() =>
      expect(Object.keys(lastModel().parts[0]?.mesh?.faces ?? {})).toHaveLength(3),
    )
    const remaining = Object.keys(lastModel().parts[0]?.mesh?.vertices ?? {})
    expect(remaining).toHaveLength(7)
    act(() => {
      for (const key of remaining) callbacks.onMeshPick({ kind: 'vertex', key }, true)
    })
    await waitFor(() => expect(fake.instances[0]?.meshEdit?.vertices).toHaveLength(7))
    fireEvent.keyDown(document, { key: 'Delete' })
    await waitFor(() => expect(lastModel().parts).toHaveLength(1))
    expect(lastModel().parts[0]?.id).toBe('wing')
    await screen.findByText(copy.emptied)
    expect(fake.instances[0]?.meshEdit).toBeNull()
  })

  test('a 5ª forma "Malha" coloca uma caixa já convertida', async () => {
    render(
      <MoldaApp
        persistence={createMemoryPersistence([makeModel()])}
        adapter={{ initialAssetId: 'model-1' }}
      />,
    )
    await screen.findByRole('complementary', { name: COPY.editor.model.toolbox })
    fireEvent.click(screen.getByRole('button', { name: `${COPY.editor.model.addGroup} malha` }))
    expect(fake.instances[0]?.placementShape).toBe('mesh')
    act(() => fake.instances[0]?.callbacks.onPlace('mesh', [2, 1, 0], [1, 0, 0], 'body'))
    await waitFor(() => expect(lastModel().parts).toHaveLength(3))
    const added = lastModel().parts[2]
    expect(added?.shape).toBe('mesh')
    expect(Object.keys(added?.mesh?.faces ?? {})).toHaveLength(6)
    screen.getByRole('button', { name: copy.edit })
  })
})

describe('ferramentas da malha (M3)', () => {
  test('cada modo mostra somente as ferramentas que servem para pontos, arestas ou faces', async () => {
    await openAndConvert()
    screen.getByRole('button', { name: copy.tools.merge })
    screen.getByRole('button', { name: copy.tools.createFace })
    screen.getByRole('button', { name: copy.tools.connect })
    expect(screen.queryByRole('button', { name: copy.tools.extrude })).toBeNull()
    expect(screen.queryByRole('button', { name: copy.tools.inset })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: copy.modes.edge }))
    screen.getByRole('button', { name: copy.tools.extrude })
    screen.getByRole('button', { name: copy.tools.loopCut })
    expect(screen.queryByRole('button', { name: copy.tools.merge })).toBeNull()
    expect(screen.queryByRole('button', { name: copy.tools.flip })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: copy.modes.face }))
    screen.getByRole('button', { name: copy.tools.extrude })
    screen.getByRole('button', { name: copy.tools.inset })
    screen.getByRole('button', { name: copy.tools.flip })
    screen.getByRole('button', { name: copy.tools.split })
    expect(screen.queryByRole('button', { name: copy.tools.loopCut })).toBeNull()
    screen.getByText(copy.modeHints.face)
  })

  test('Puxar a face de cima, Ajustar a distância (um desfazer só) e o toast de face virada', async () => {
    const callbacks = await openAndConvert()
    fireEvent.click(screen.getByRole('button', { name: copy.modes.face }))
    act(() => callbacks.onMeshPick({ kind: 'face', key: 'f_py' }, false))
    await waitFor(() => expect(fake.instances[0]?.meshEdit?.vertices).toHaveLength(4))
    fireEvent.click(screen.getByRole('button', { name: copy.tools.extrude }))
    await waitFor(() =>
      expect(Object.keys(lastModel().parts[0]?.mesh?.faces ?? {})).toHaveLength(10),
    )
    expect(lastModel().parts[0]?.to[1]).toBe(3)
    // A seleção virou os 4 vértices novos; o Ajustar apareceu.
    expect(fake.instances[0]?.meshEdit?.vertices).toHaveLength(4)
    const adjust = screen.getByRole('region', { name: copy.adjust })
    fireEvent.click(within(adjust).getByRole('button', { name: /aumentar/i }))
    await waitFor(() => expect(lastModel().parts[0]?.to[1]).toBe(4))
    // Um desfazer volta ao cubo convertido (o Ajustar não criou passo).
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
    await waitFor(() =>
      expect(Object.keys(lastModel().parts[0]?.mesh?.faces ?? {})).toHaveLength(6),
    )
    expect(screen.queryByRole('region', { name: copy.adjust })).toBeNull()
    // Virar a face de cima: o toast avisa e o botão "Virar" conserta.
    act(() => callbacks.onMeshPick({ kind: 'face', key: 'f_py' }, false))
    await waitFor(() => expect(fake.instances[0]?.meshEdit?.vertices).toHaveLength(4))
    fireEvent.click(screen.getByRole('button', { name: copy.tools.flip }))
    await screen.findByText(copy.issues.flipped)
    fireEvent.click(screen.getByRole('button', { name: copy.fixes.flip }))
    await waitFor(() => expect(screen.queryByText(copy.issues.flipped)).toBeNull())
  })

  test('Cortar no meio com UMA aresta escolhida; Juntar pontos com dois', async () => {
    const callbacks = await openAndConvert()
    fireEvent.click(screen.getByRole('button', { name: copy.modes.edge }))
    act(() => callbacks.onMeshPick({ kind: 'edge', keys: ['v_010', 'v_011'] }, false))
    await waitFor(() => screen.getByText(copy.selected(1, 'edge')))
    fireEvent.click(screen.getByRole('button', { name: copy.tools.loopCut }))
    await waitFor(() =>
      expect(Object.keys(lastModel().parts[0]?.mesh?.faces ?? {})).toHaveLength(10),
    )
    expect(Object.keys(lastModel().parts[0]?.mesh?.vertices ?? {})).toHaveLength(12)
    fireEvent.click(screen.getByRole('button', { name: copy.modes.vertex }))
    act(() => {
      callbacks.onMeshPick({ kind: 'vertex', key: 'v_110' }, false)
      callbacks.onMeshPick({ kind: 'vertex', key: 'v_111' }, true)
    })
    await waitFor(() => expect(fake.instances[0]?.meshEdit?.vertices).toHaveLength(2))
    fireEvent.click(screen.getByRole('button', { name: copy.tools.merge }))
    await waitFor(() =>
      expect(Object.keys(lastModel().parts[0]?.mesh?.vertices ?? {})).toHaveLength(11),
    )
  })

  test('Encolher dentro ajusta o percentual sobre a face original e desfaz em um passo', async () => {
    const callbacks = await openAndConvert()
    fireEvent.click(screen.getByRole('button', { name: copy.modes.face }))
    act(() => callbacks.onMeshPick({ kind: 'face', key: 'f_py' }, false))
    fireEvent.click(screen.getByRole('button', { name: copy.tools.inset }))
    await waitFor(() =>
      expect(Object.keys(lastModel().parts[0]?.mesh?.faces ?? {})).toHaveLength(10),
    )
    const innerKeys = [...(fake.instances[0]?.meshEdit?.vertices ?? [])]
    expect(innerKeys).toHaveLength(4)
    const firstBefore = lastModel().parts[0]?.mesh?.vertices[innerKeys[0] as string]
    const adjust = screen.getByRole('region', { name: copy.adjust })
    fireEvent.click(
      within(adjust).getByRole('button', { name: COPY.a11y.increase(copy.insetAmount) }),
    )
    await waitFor(() => {
      const firstAfter =
        lastModel().parts[0]?.mesh?.vertices[fake.instances[0]?.meshEdit?.vertices[0] as string]
      expect(firstAfter).not.toEqual(firstBefore)
    })
    expect(
      (within(adjust).getByRole('textbox', { name: copy.insetAmount }) as HTMLInputElement).value,
    ).toBe('30')
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
    await waitFor(() =>
      expect(Object.keys(lastModel().parts[0]?.mesh?.faces ?? {})).toHaveLength(6),
    )
  })

  test('Conectar pontos cria a diagonal escolhida e já muda para Arestas', async () => {
    const callbacks = await openAndConvert()
    act(() => {
      callbacks.onMeshPick({ kind: 'vertex', key: 'v_010' }, false)
      callbacks.onMeshPick({ kind: 'vertex', key: 'v_111' }, true)
    })
    await waitFor(() => expect(fake.instances[0]?.meshEdit?.vertices).toHaveLength(2))
    fireEvent.click(screen.getByRole('button', { name: copy.tools.connect }))
    await waitFor(() => {
      expect(Object.keys(lastModel().parts[0]?.mesh?.faces ?? {})).toHaveLength(7)
      expect(fake.instances[0]?.meshEdit?.mode).toBe('edge')
    })
    screen.getByText(copy.selected(1, 'edge'))
    screen.getByRole('button', { name: copy.tools.extrude })
    expect(screen.queryByRole('button', { name: copy.tools.connect })).toBeNull()
  })
})

describe('review 06/09: toast preso ao estado, E fecha, Ctrl+A escolhe tudo', () => {
  test('"Virar" do toast conserta de verdade; depois de mudar o modelo o botão não mexe em nada', async () => {
    const callbacks = await openAndConvert()
    fireEvent.click(screen.getByRole('button', { name: copy.modes.face }))
    act(() => callbacks.onMeshPick({ kind: 'face', key: 'f_py' }, false))
    await waitFor(() => expect(fake.instances[0]?.meshEdit?.vertices).toHaveLength(4))
    fireEvent.click(screen.getByRole('button', { name: copy.tools.flip }))
    await screen.findByText(copy.issues.flipped)
    expect(meshIssues(lastModel().parts[0]?.mesh ?? { vertices: {}, faces: {} })).not.toEqual([])
    fireEvent.click(screen.getByRole('button', { name: copy.fixes.flip }))
    await waitFor(() =>
      expect(meshIssues(lastModel().parts[0]?.mesh ?? { vertices: {}, faces: {} })).toEqual([]),
    )
    // Virar de novo, mudar SÓ a paleta (mesma referência de parts) e então tocar no toast.
    fireEvent.click(screen.getByRole('button', { name: copy.tools.flip }))
    await screen.findByText(copy.issues.flipped)
    fireEvent.change(screen.getByRole('combobox', { name: COPY.a11y.paletteSelect }), {
      target: { value: 'pastel' },
    })
    await waitFor(() => expect(lastModel().paletteId).toBe('pastel'))
    const flippedBefore = lastModel().parts[0]?.mesh?.faces.f_py?.v
    fireEvent.click(screen.getByRole('button', { name: copy.fixes.flip }))
    await screen.findByText(copy.fixes.stale)
    expect(lastModel().parts[0]?.mesh?.faces.f_py?.v).toEqual(flippedBefore)
    expect(lastModel().paletteId).toBe('pastel')
  })

  test('duas faces opostas continuam duas e Puxar não translada o cubo inteiro', async () => {
    const callbacks = await openAndConvert()
    fireEvent.click(screen.getByRole('button', { name: copy.modes.face }))
    act(() => {
      callbacks.onMeshPick({ kind: 'face', key: 'f_py' }, false)
      callbacks.onMeshPick({ kind: 'face', key: 'f_ny' }, true)
    })
    await waitFor(() => screen.getByText(copy.selected(2, 'face')))
    const before = structuredClone(lastModel().parts[0]?.mesh)
    fireEvent.click(screen.getByRole('button', { name: copy.tools.extrude }))
    expect(lastModel().parts[0]?.mesh).toEqual(before)
  })

  test('mudar a paleta encerra Ajustar sem reverter a mudança', async () => {
    const callbacks = await openAndConvert()
    fireEvent.click(screen.getByRole('button', { name: copy.modes.face }))
    act(() => callbacks.onMeshPick({ kind: 'face', key: 'f_py' }, false))
    fireEvent.click(screen.getByRole('button', { name: copy.tools.extrude }))
    await screen.findByRole('region', { name: copy.adjust })
    fireEvent.change(screen.getByRole('combobox', { name: COPY.a11y.paletteSelect }), {
      target: { value: 'pastel' },
    })
    await waitFor(() => expect(screen.queryByRole('region', { name: copy.adjust })).toBeNull())
    expect(lastModel().paletteId).toBe('pastel')
  })

  test('E fecha o Editar malha sem apagar a seleção antes; Ctrl+A escolhe todos os pontos', async () => {
    const callbacks = await openAndConvert()
    fireEvent.keyDown(document, { key: 'a', ctrlKey: true })
    await waitFor(() => expect(fake.instances[0]?.meshEdit?.vertices).toHaveLength(8))
    act(() => callbacks.onMeshPick({ kind: 'vertex', key: 'v_111' }, false))
    await waitFor(() => expect(fake.instances[0]?.meshEdit?.vertices).toEqual(['v_111']))
    fireEvent.keyDown(document, { key: 'e' })
    await waitFor(() => expect(fake.instances[0]?.meshEdit).toBeNull())
  })

  test('undo que restaura uma peça trancada encerra o Editar malha', async () => {
    const model = makeModel()
    const body = model.parts[0]
    if (!body) throw new Error('sem corpo')
    body.shape = 'mesh'
    body.mesh = boxMesh(body.from, body.to)
    body.locked = true
    render(
      <MoldaApp
        persistence={createMemoryPersistence([model])}
        adapter={{ initialAssetId: 'model-1' }}
      />,
    )
    await screen.findByRole('complementary', { name: COPY.editor.model.toolbox })
    fireEvent.click(screen.getByRole('button', { name: 'corpo, malha' }))
    fireEvent.click(screen.getByRole('button', { name: COPY.a11y.partLock('corpo') }))
    fireEvent.click(screen.getByRole('button', { name: copy.edit }))
    await waitFor(() => expect(fake.instances[0]?.meshEdit?.partId).toBe('body'))

    fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))

    await waitFor(() => expect(lastModel().parts[0]?.locked).toBe(true))
    expect(fake.instances[0]?.meshEdit).toBeNull()
  })

  test('redo que restaura uma peça trancada encerra o Editar malha', async () => {
    const model = makeModel()
    const body = model.parts[0]
    if (!body) throw new Error('sem corpo')
    body.shape = 'mesh'
    body.mesh = boxMesh(body.from, body.to)
    render(
      <MoldaApp
        persistence={createMemoryPersistence([model])}
        adapter={{ initialAssetId: 'model-1' }}
      />,
    )
    await screen.findByRole('complementary', { name: COPY.editor.model.toolbox })
    fireEvent.click(screen.getByRole('button', { name: 'corpo, malha' }))
    fireEvent.click(screen.getByRole('button', { name: COPY.a11y.partLock('corpo') }))
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
    fireEvent.click(screen.getByRole('button', { name: copy.edit }))
    await waitFor(() => expect(fake.instances[0]?.meshEdit?.partId).toBe('body'))

    fireEvent.click(screen.getByRole('button', { name: COPY.editor.redo }))

    await waitFor(() => expect(lastModel().parts[0]?.locked).toBe(true))
    expect(fake.instances[0]?.meshEdit).toBeNull()
  })
})
