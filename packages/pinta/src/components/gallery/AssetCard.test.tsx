import { afterEach, describe, expect, it, mock } from 'bun:test'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { COPY } from '../../core/copy'
import { createPixelSpriteAsset } from '../../core/project'
import { AssetCard } from './AssetCard'

afterEach(cleanup)

describe('AssetCard', () => {
  it('desconecta e descarta o observer compartilhado quando o último card sai', () => {
    const previous = globalThis.IntersectionObserver
    const instances: Array<{
      observe: ReturnType<typeof mock>
      unobserve: ReturnType<typeof mock>
      disconnect: ReturnType<typeof mock>
    }> = []
    class FakeIntersectionObserver {
      readonly root = null
      readonly rootMargin = '50% 0px'
      readonly thresholds = [0]
      readonly observe = mock(() => {})
      readonly unobserve = mock(() => {})
      readonly disconnect = mock(() => {})
      constructor(_callback: IntersectionObserverCallback) {
        instances.push(this)
      }
      takeRecords(): IntersectionObserverEntry[] {
        return []
      }
    }
    globalThis.IntersectionObserver =
      FakeIntersectionObserver as unknown as typeof IntersectionObserver
    const asset = createPixelSpriteAsset({ name: 'heroi', frameSize: 8 })
    const props = {
      asset,
      onOpen: () => {},
      onRename: () => {},
      onDuplicate: () => {},
      onRemove: () => {},
    }

    try {
      const first = render(<AssetCard {...props} />)
      expect(instances).toHaveLength(1)
      first.unmount()
      expect(instances[0]?.unobserve).toHaveBeenCalledTimes(1)
      expect(instances[0]?.disconnect).toHaveBeenCalledTimes(1)

      const second = render(<AssetCard {...props} />)
      expect(instances).toHaveLength(2)
      second.unmount()
    } finally {
      globalThis.IntersectionObserver = previous
    }
  })

  it('as três ações ficam NO card, cada uma com alvo de 44px', () => {
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
    for (const label of [COPY.gallery.rename, COPY.gallery.duplicate, COPY.gallery.remove]) {
      const botao = screen.getByRole('button', { name: `${label} heroi` })
      // `min-h-11`/`min-w-11` = 44px: a regra de toque infantil é o que define a
      // largura mínima do card (3×44 + respiros ⇒ ~164px na grade).
      expect(botao.className).toContain('min-h-11')
      expect(botao.className).toContain('min-w-11')
    }
  })

  it('as ações avisam com o ID do desenho (callbacks estáveis na galeria: o card é memo)', () => {
    const asset = createPixelSpriteAsset({ name: 'heroi', frameSize: 8 })
    const seen: string[] = []
    render(
      <AssetCard
        asset={asset}
        onOpen={(id) => seen.push(`abrir:${id}`)}
        onRename={(id) => seen.push(`renomear:${id}`)}
        onDuplicate={() => {}}
        onRemove={(id) => seen.push(`apagar:${id}`)}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /^Abrir heroi/ }))
    fireEvent.click(screen.getByRole('button', { name: `${COPY.gallery.rename} heroi` }))
    fireEvent.click(screen.getByRole('button', { name: `${COPY.gallery.remove} heroi` }))
    expect(seen).toEqual([`abrir:${asset.id}`, `renomear:${asset.id}`, `apagar:${asset.id}`])
  })

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
