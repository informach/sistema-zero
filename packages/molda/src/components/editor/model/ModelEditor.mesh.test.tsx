import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { COPY } from '../../../core/copy'
import type { MoldaModelAsset } from '../../../core/model'
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
    expect(await screen.findByText(copy.converted)).toBeDefined()
    expect(screen.getByRole('complementary', { name: copy.toolbox })).toBeDefined()
    expect(screen.getByText(copy.counts(8, 6, 12))).toBeDefined()
    expect(screen.getByText(copy.nothingSelected)).toBeDefined()
  })

  test('toque escolhe ponto/face; arrastar a alça move os vértices com UM desfazer; Esc fecha', async () => {
    const callbacks = await openAndConvert()
    act(() => callbacks.onMeshPick({ kind: 'face', key: 'f_py' }, false))
    await waitFor(() => expect(fake.instances[0]?.meshEdit?.vertices).toHaveLength(4))
    expect(screen.getByText(copy.selected(4, 'vertex'))).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: copy.modes.face }))
    await waitFor(() => expect(screen.getByText(copy.selected(1, 'face'))).toBeDefined())
    // Somar: o toque no mesmo ponto tira, no outro acrescenta.
    act(() => callbacks.onMeshPick({ kind: 'vertex', key: 'v_000' }, true))
    await waitFor(() => expect(fake.instances[0]?.meshEdit?.vertices).toHaveLength(5))
    act(() => callbacks.onMeshPick({ kind: 'vertex', key: 'v_000' }, true))
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
    expect(screen.getByRole('complementary', { name: COPY.editor.model.toolbox })).toBeDefined()
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
    expect(await screen.findByText(copy.emptied)).toBeDefined()
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
    expect(screen.getByRole('button', { name: copy.edit })).toBeDefined()
  })
})

describe('ferramentas da malha (M3)', () => {
  test('Puxar a face de cima, Ajustar a distância (um desfazer só) e o toast de face virada', async () => {
    const callbacks = await openAndConvert()
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
    expect(await screen.findByText(copy.issues.flipped)).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: copy.fixes.flip }))
    await waitFor(() => expect(screen.queryByText(copy.issues.flipped)).toBeNull())
  })

  test('Cortar no meio com UMA aresta escolhida; Juntar pontos com dois', async () => {
    const callbacks = await openAndConvert()
    fireEvent.click(screen.getByRole('button', { name: copy.modes.edge }))
    act(() => callbacks.onMeshPick({ kind: 'edge', keys: ['v_010', 'v_011'] }, false))
    await waitFor(() => expect(screen.getByText(copy.selected(1, 'edge'))).toBeDefined())
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
})
