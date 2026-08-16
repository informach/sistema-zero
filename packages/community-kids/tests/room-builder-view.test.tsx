import { describe, expect, mock, test } from 'bun:test'
import { fireEvent, render, screen } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { RoomBuilderView } from '../src/components/kids/room/room-builder-view'

function viewProps(): ComponentProps<typeof RoomBuilderView> {
  const noop = () => {}
  return {
    scene: {
      data: null,
      loadState: 'error',
      draft: { theme: 'aconchego', placedItems: [], pet: null },
      onMoveItem: noop,
      onPaintWall: noop,
      paintColor: null,
      onRetry: noop,
    },
    selection: {
      selected: null,
      onSelectPiece: noop,
      stackPicker: false,
      surfaces: [],
      onBringDown: noop,
      onToggleStackPicker: noop,
      onRotateSelected: noop,
      onRemoveSelected: noop,
      onPlaceOnSurface: noop,
      onCloseStackPicker: noop,
    },
    wallet: {
      coinsUnlimited: false,
      balance: 25,
      saving: false,
      onSave: noop,
    },
    catalog: {
      tab: 'moveis',
      onSelectTab: noop,
      confirmBuyId: null,
      busy: null,
      onCancelBuy: noop,
      onBuy: noop,
      isOwned: () => false,
      onPickItem: noop,
      onApplyFloor: noop,
      onApplyLighting: noop,
      onApplyTheme: noop,
      brush: '#f3ede1',
      onPickBrush: noop,
      onPickPet: noop,
    },
  }
}

describe('RoomBuilderView — contrato do boundary de apresentação', () => {
  test('encaminha recuperação e troca de aba sem liberar salvamento durante erro', () => {
    const onRetry = mock(() => {})
    const onSelectTab = mock(() => {})
    const props = viewProps()

    render(
      <RoomBuilderView
        {...props}
        scene={{ ...props.scene, onRetry }}
        catalog={{ ...props.catalog, onSelectTab }}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    fireEvent.click(screen.getByRole('button', { name: 'Piso' }))

    expect(onRetry).toHaveBeenCalledTimes(1)
    expect(onSelectTab).toHaveBeenCalledWith('piso')
    expect(screen.getByRole('button', { name: 'Salvar quarto' }).hasAttribute('disabled')).toBe(
      true,
    )
  })

  test('encaminha seleção, empilhamento, edição, compra e salvamento', () => {
    const props = viewProps()
    const onSelectPiece = mock(() => {})
    const onToggleStackPicker = mock(() => {})
    const onRotateSelected = mock(() => {})
    const onRemoveSelected = mock(() => {})
    const onBuy = mock(() => {})
    const onSave = mock(() => {})
    const draft = {
      theme: 'aconchego',
      placedItems: [{ itemId: 'ursinho', x: 2, y: 2 }],
      pet: null,
    }
    const data = {
      state: draft,
      items: [
        {
          id: 'cama',
          category: 'furniture',
          tier: 'coins' as const,
          price: 50,
          owned: false,
          locked: true,
        },
      ],
      themes: [],
      floors: [],
      lightings: [],
      balance: 25,
    }

    render(
      <RoomBuilderView
        {...props}
        scene={{ ...props.scene, data, draft, loadState: 'ready' }}
        selection={{
          ...props.selection,
          selected: 0,
          surfaces: [{ itemId: 'mesa', free: 2 }],
          onSelectPiece,
          onToggleStackPicker,
          onRotateSelected,
          onRemoveSelected,
        }}
        wallet={{ ...props.wallet, onSave }}
        catalog={{ ...props.catalog, confirmBuyId: 'cama', onBuy }}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Ursinho' }))
    fireEvent.click(screen.getByRole('button', { name: 'Em cima…' }))
    fireEvent.click(screen.getByRole('button', { name: 'Girar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Tirar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Comprar por 50' }))
    fireEvent.click(screen.getByRole('button', { name: 'Salvar quarto' }))

    expect(onSelectPiece).toHaveBeenCalledWith(null)
    expect(onToggleStackPicker).toHaveBeenCalledTimes(1)
    expect(onRotateSelected).toHaveBeenCalledTimes(1)
    expect(onRemoveSelected).toHaveBeenCalledTimes(1)
    expect(onBuy).toHaveBeenCalledWith('cama')
    expect(onSave).toHaveBeenCalledTimes(1)
  })
})
