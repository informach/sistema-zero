import { describe, expect, mock, test } from 'bun:test'
import { fireEvent, render, screen } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { RoomBuilderView } from '../src/components/kids/room/room-builder-view'

function viewProps(): ComponentProps<typeof RoomBuilderView> {
  const noop = () => {}
  return {
    data: null,
    loadState: 'error',
    draft: { theme: 'aconchego', placedItems: [], pet: null },
    selected: null,
    onSelectPiece: noop,
    onMoveItem: noop,
    onPaintWall: noop,
    paintColor: null,
    onRetry: noop,
    stackPicker: false,
    surfaces: [],
    onBringDown: noop,
    onToggleStackPicker: noop,
    onRotateSelected: noop,
    onRemoveSelected: noop,
    onPlaceOnSurface: noop,
    onCloseStackPicker: noop,
    coinsUnlimited: false,
    balance: 25,
    saving: false,
    onSave: noop,
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
  }
}

describe('RoomBuilderView — contrato do boundary de apresentação', () => {
  test('encaminha recuperação e troca de aba sem liberar salvamento durante erro', () => {
    const onRetry = mock(() => {})
    const onSelectTab = mock(() => {})
    const props = viewProps()

    render(<RoomBuilderView {...props} onRetry={onRetry} onSelectTab={onSelectTab} />)

    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    fireEvent.click(screen.getByRole('button', { name: 'Piso' }))

    expect(onRetry).toHaveBeenCalledTimes(1)
    expect(onSelectTab).toHaveBeenCalledWith('piso')
    expect(screen.getByRole('button', { name: 'Salvar quarto' }).hasAttribute('disabled')).toBe(
      true,
    )
  })
})
