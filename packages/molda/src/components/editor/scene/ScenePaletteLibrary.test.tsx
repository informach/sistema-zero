import { expect, test } from 'bun:test'
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react'
import { createStore } from 'zustand/vanilla'
import { getPalette } from '../../../core/palette'
import { moldaPreferenceKey } from '../../../state/interfacePreferences'
import { getMoldaStorageNamespace, setMoldaStorageNamespace } from '../../../state/persistence'
import { MoldaAppProvider, type MoldaPaletteLibraryPort } from '../../appContext'
import { ScenePaletteLibrary } from './ScenePaletteLibrary'
import { useScenePaletteLibrary } from './useScenePaletteLibrary'

test('paletas criadas persistem no perfil e podem ser renomeadas e apagadas', () => {
  const original = getMoldaStorageNamespace()
  setMoldaStorageNamespace('palette-library-test')
  const key = moldaPreferenceKey('scene.palettes')
  localStorage.removeItem(key)
  try {
    let hook = renderHook(useScenePaletteLibrary)
    let id = ''
    act(() => {
      id = hook.result.current.create({
        name: 'Bichos',
        colors: [...getPalette('arcade').colors],
      })!.id
    })
    expect(hook.result.current.palettes.map((item) => item.name)).toEqual(['Bichos'])
    hook.unmount()
    hook = renderHook(useScenePaletteLibrary)
    expect(hook.result.current.palettes[0]?.id).toBe(id)
    act(() => {
      hook.result.current.rename(id, 'Floresta')
    })
    expect(hook.result.current.palettes[0]?.name).toBe('Floresta')
    act(() => {
      hook.result.current.remove(id)
    })
    expect(hook.result.current.palettes).toEqual([])
    hook.unmount()
    setMoldaStorageNamespace('palette-library-other-test')
    const other = renderHook(useScenePaletteLibrary)
    expect(other.result.current.palettes).toEqual([])
    other.unmount()
  } finally {
    localStorage.removeItem(key)
    setMoldaStorageNamespace(original)
  }
})

test('criar e escolher paleta envia as cores ao documento', async () => {
  const original = getMoldaStorageNamespace()
  setMoldaStorageNamespace('palette-ui-test')
  const key = moldaPreferenceKey('scene.palettes')
  localStorage.removeItem(key)
  try {
    const applied: unknown[] = []
    const view = render(
      <ScenePaletteLibrary
        palette={{ paletteId: 'arcade' }}
        busy={false}
        apply={(next) => applied.push(next)}
      />,
    )
    fireEvent.click(screen.getByText('Paletas: Arcade', { selector: 'summary' }))
    fireEvent.click(screen.getByRole('button', { name: '+ Criar paleta' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Nome da paleta' }), {
      target: { value: 'Minha floresta' },
    })
    fireEvent.change(screen.getByLabelText('Cor 1'), { target: { value: '#123456' } })
    fireEvent.click(screen.getByRole('button', { name: 'Criar paleta' }))
    await waitFor(() => expect(applied).toHaveLength(1))
    expect(applied[0]).toMatchObject({
      paletteId: 'custom',
      customPalette: { name: 'Minha floresta' },
    })
    expect((applied[0] as { customPalette: { colors: string[] } }).customPalette.colors[1]).toBe(
      '#123456',
    )
    view.rerender(
      <ScenePaletteLibrary
        palette={
          applied[0] as { paletteId: 'custom'; customPalette: { name: string; colors: string[] } }
        }
        busy={false}
        apply={(next) => applied.push(next)}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Gerenciar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Apagar paleta Minha floresta' }))
    fireEvent.click(
      screen.getByRole('button', { name: 'Confirmar exclusão da paleta Minha floresta' }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Concluir' }))
    expect(
      (screen.getByRole('combobox', { name: 'Escolher paleta' }) as HTMLSelectElement).value,
    ).toBe('current')
    expect(applied).toHaveLength(1)
    fireEvent.change(screen.getByRole('combobox', { name: 'Escolher paleta' }), {
      target: { value: 'pastel' },
    })
    expect(applied[1]).toEqual({ paletteId: 'pastel' })
    view.unmount()
  } finally {
    localStorage.removeItem(key)
    setMoldaStorageNamespace(original)
  }
})

test('selecionar paleta guardada copia as cores para a criação', () => {
  const original = getMoldaStorageNamespace()
  setMoldaStorageNamespace('palette-choose-test')
  const key = moldaPreferenceKey('scene.palettes')
  const colors = [...getPalette('arcade').colors]
  colors[1] = '#654321'
  localStorage.setItem(key, JSON.stringify([{ id: 'saved-1', name: 'Terra', colors }]))
  try {
    const applied: unknown[] = []
    const view = render(
      <ScenePaletteLibrary
        palette={{ paletteId: 'arcade' }}
        busy={false}
        apply={(next) => applied.push(next)}
      />,
    )
    fireEvent.click(screen.getByText('Paletas: Arcade', { selector: 'summary' }))
    fireEvent.change(screen.getByRole('combobox', { name: 'Escolher paleta' }), {
      target: { value: 'saved-1' },
    })
    expect(applied[0]).toEqual({ paletteId: 'custom', customPalette: { name: 'Terra', colors } })
    view.unmount()
  } finally {
    localStorage.removeItem(key)
    setMoldaStorageNamespace(original)
  }
})

test('Molda usa a biblioteca compartilhada pelo host e vê alterações do Pinta', async () => {
  type State = ReturnType<MoldaPaletteLibraryPort['getState']>
  const store = createStore<State>((set, get) => ({
    loaded: true,
    palettes: [],
    load: async () => {},
    savePalette: async (input) => {
      const saved = { id: 'shared-1', name: input.name, colors: [...input.colors] }
      set({ palettes: [...get().palettes, saved] })
      return saved
    },
    renamePalette: async (id, name) => {
      set({
        palettes: get().palettes.map((entry) => (entry.id === id ? { ...entry, name } : entry)),
      })
      return true
    },
    removePalette: async (id) => {
      set({ palettes: get().palettes.filter((entry) => entry.id !== id) })
      return true
    },
  }))
  const key = moldaPreferenceKey('scene.palettes')
  localStorage.removeItem(key)
  const applied: unknown[] = []
  const view = render(
    <MoldaAppProvider
      value={{
        adapter: { paletteLibrary: store },
        gallery: {} as never,
        persistence: {} as never,
        scene: {} as never,
      }}
    >
      <ScenePaletteLibrary
        palette={{ paletteId: 'arcade' }}
        busy={false}
        apply={(next) => applied.push(next)}
      />
    </MoldaAppProvider>,
  )
  try {
    fireEvent.click(screen.getByText('Paletas: Arcade', { selector: 'summary' }))
    fireEvent.click(screen.getByRole('button', { name: '+ Criar paleta' }))
    fireEvent.click(screen.getByRole('button', { name: 'Criar paleta' }))
    await waitFor(() => expect(store.getState().palettes).toHaveLength(1))
    expect(localStorage.getItem(key)).toBeNull()
    act(() =>
      store.setState({
        palettes: [
          ...store.getState().palettes,
          { id: 'from-pinta', name: 'Do Pinta', colors: [...getPalette('pastel').colors] },
        ],
      }),
    )
    fireEvent.change(screen.getByRole('combobox', { name: 'Escolher paleta' }), {
      target: { value: 'from-pinta' },
    })
    expect(applied.at(-1)).toEqual({
      paletteId: 'custom',
      customPalette: { name: 'Do Pinta', colors: [...getPalette('pastel').colors] },
    })
  } finally {
    view.unmount()
    localStorage.removeItem(key)
  }
})
