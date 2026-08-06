import { afterEach, describe, expect, it, mock } from 'bun:test'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { COPY } from '../../core/copy'
import { createPixelSpriteAsset } from '../../core/project'
import { AssetCard } from './AssetCard'

afterEach(cleanup)

describe('AssetCard', () => {
  it('as ações vivem atrás do botão "⋮" (um alvo de 44px no card pequeno)', () => {
    const asset = createPixelSpriteAsset({ name: 'heroi', frameSize: 8 })
    render(
      <AssetCard
        asset={asset}
        onOpen={() => {}}
        onRename={() => {}}
        onDuplicate={() => {}}
        onRemove={() => {}}
      />,
    )
    // Fechado: só abrir o desenho e o "⋮" — nada de renomear/duplicar/apagar.
    expect(screen.queryByRole('menu')).toBeNull()
    expect(screen.queryByRole('button', { name: `${COPY.gallery.remove} heroi` })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: COPY.gallery.cardActions('heroi') }))
    expect(screen.getByRole('menu')).toBeTruthy()
    for (const label of [COPY.gallery.rename, COPY.gallery.duplicate, COPY.gallery.remove]) {
      expect(screen.getByRole('menuitem', { name: `${label} heroi` })).toBeTruthy()
    }
  })

  it('duplicar fecha o menu e não dispara duas vezes no mesmo turno', async () => {
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
    fireEvent.click(screen.getByRole('button', { name: COPY.gallery.cardActions('heroi') }))
    const button = screen.getByRole('menuitem', { name: `${COPY.gallery.duplicate} heroi` })
    fireEvent.click(button)
    fireEvent.click(button)
    expect(onDuplicate).toHaveBeenCalledTimes(1)
    // O menu some no 1º clique: a 2ª tentativa nem alcança o handler.
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull())
    finish()
    // Reabrir depois de terminar volta com o item liberado.
    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: COPY.gallery.cardActions('heroi') }))
      const reopened = screen.getByRole('menuitem', { name: `${COPY.gallery.duplicate} heroi` })
      expect(reopened.hasAttribute('disabled')).toBe(false)
    })
  })
})
