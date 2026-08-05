import { afterEach, describe, expect, it, mock } from 'bun:test'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { COPY } from '../../core/copy'
import { createPixelSpriteAsset } from '../../core/project'
import { AssetCard } from './AssetCard'

afterEach(cleanup)

describe('AssetCard', () => {
  it('bloqueia duplo clique enquanto a duplicação está em andamento', async () => {
    let finish = (): void => {}
    const pending = new Promise<void>((resolve) => {
      finish = resolve
    })
    const onDuplicate = mock(() => pending)
    const asset = createPixelSpriteAsset({ name: 'heroi', frameSize: 8 })
    render(
      <AssetCard
        asset={asset}
        onOpen={() => {}}
        onRename={() => {}}
        onDuplicate={onDuplicate}
        onRemove={() => {}}
      />,
    )
    const button = screen.getByRole('button', { name: `${COPY.gallery.duplicate} heroi` })
    fireEvent.click(button)
    fireEvent.click(button)
    expect(onDuplicate).toHaveBeenCalledTimes(1)
    expect(button.hasAttribute('disabled')).toBe(true)
    finish()
    await waitFor(() => expect(button.hasAttribute('disabled')).toBe(false))
  })
})
