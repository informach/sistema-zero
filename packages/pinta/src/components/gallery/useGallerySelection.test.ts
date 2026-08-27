import { describe, expect, it } from 'bun:test'
import { act, fireEvent, renderHook } from '@testing-library/react'
import { useGallerySelection } from './useGallerySelection'

describe('useGallerySelection', () => {
  it('não encerra uma sessão cuja seleção mudou durante um download assíncrono', () => {
    const searchInputRef = { current: null }
    const assets = [{ id: 'a' }, { id: 'b' }]
    const { result } = renderHook(() => useGallerySelection(assets, searchInputRef))

    act(() => {
      result.current.enterSelection()
      result.current.toggleSelection('a')
    })
    const startedWith = result.current.captureSelection()

    act(() => result.current.toggleSelection('b'))
    let exited = false
    act(() => {
      exited = result.current.exitSelectionIfUnchanged(startedWith)
    })

    expect(exited).toBe(false)
    expect(result.current.selectionMode).toBe(true)
    expect(result.current.selectedCount).toBe(2)

    const currentSelection = result.current.captureSelection()
    act(() => {
      exited = result.current.exitSelectionIfUnchanged(currentSelection)
    })
    expect(exited).toBe(true)
    expect(result.current.selectionMode).toBe(false)
    expect(result.current.selectedCount).toBe(0)
  })

  it('Esc com um Dialog do Pinta aberto NÃO sai do modo; sem dialog e busca vazia, sai', () => {
    // O guard `[data-pinta-dialog]` nunca tinha teste (o Esc de um diálogo
    // aberto não pode arrastar a saída do modo junto — full review 26/08).
    const searchInputRef = { current: null }
    const { result } = renderHook(() => useGallerySelection([{ id: 'a' }], searchInputRef))
    act(() => {
      result.current.enterSelection()
    })

    const dialog = document.createElement('div')
    dialog.setAttribute('data-pinta-dialog', '')
    document.body.appendChild(dialog)
    try {
      act(() => {
        fireEvent.keyDown(window, { key: 'Escape' })
      })
      expect(result.current.selectionMode).toBe(true)
    } finally {
      dialog.remove()
    }

    act(() => {
      fireEvent.keyDown(window, { key: 'Escape' })
    })
    expect(result.current.selectionMode).toBe(false)
  })
})
