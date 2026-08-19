/**
 * Medição sintética (19/08/2026): galeria com CENTENAS de desenhos — quanto custa
 * abrir e buscar. Registra os tempos no console (`[perf]`) e só ASSERTA corretude
 * (contagens): tempo nunca entra em `expect` (máquina/CI variam). Serve para
 * comparar antes/depois das otimizações da galeria.
 *
 * `container.querySelectorAll` em vez de `getAllByRole`: com 500 cards o
 * `getAllByRole` do testing-library no happy-dom leva segundos só para
 * enumerar papéis.
 */
import { beforeEach, describe, expect, it } from 'bun:test'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { COPY } from '../../core/copy'
import { createPixelBackgroundAsset, createPixelSpriteAsset } from '../../core/project'
import { clearIdbMock, idbMockStats } from '../../testing/idbMock'

const { PintaApp } = await import('../PintaApp')
const { setPintaStorageNamespace } = await import('../../state/persistence')
const { createGalleryStore } = await import('../../state/galleryStore')

const SPRITES = 500
const BACKGROUNDS = 20

beforeEach(() => {
  clearIdbMock()
  setPintaStorageNamespace('')
  localStorage.clear()
})

function openButtons(container: HTMLElement): NodeListOf<HTMLButtonElement> {
  return container.querySelectorAll<HTMLButtonElement>('button[aria-label^="Abrir "]')
}

function log(label: string, ms: number, extra: Record<string, unknown> = {}): void {
  console.log(`[perf] pinta ${label}: ${ms.toFixed(0)}ms`, extra)
}

describe('galeria com centenas de desenhos (medição)', () => {
  it(`${SPRITES} personagens + ${BACKGROUNDS} cenários 256×256: abre inteira e a busca acha um deles`, async () => {
    const seed = createGalleryStore()
    const seedStart = performance.now()
    await seed
      .getState()
      .importAssets([
        ...Array.from({ length: SPRITES }, (_, i) =>
          createPixelSpriteAsset({ name: `heroi-${i}`, frameSize: 8 }),
        ),
        ...Array.from({ length: BACKGROUNDS }, (_, i) =>
          createPixelBackgroundAsset({ name: `cenario-${i}`, width: 256, height: 256 }),
        ),
      ])
    log('seed (importAssets)', performance.now() - seedStart, idbMockStats())

    const renderStart = performance.now()
    const { container } = render(<PintaApp />)
    await waitFor(
      () => {
        expect(openButtons(container).length).toBe(SPRITES + BACKGROUNDS)
      },
      { timeout: 60_000, interval: 50 },
    )
    log('abrir a galeria até todos os cards', performance.now() - renderStart, {
      cards: SPRITES + BACKGROUNDS,
    })

    const searchStart = performance.now()
    fireEvent.change(screen.getByRole('searchbox', { name: COPY.gallery.search }), {
      target: { value: 'heroi-477' },
    })
    await waitFor(
      () => {
        expect(openButtons(container).length).toBe(1)
      },
      { timeout: 30_000, interval: 20 },
    )
    log('busca até 1 resultado', performance.now() - searchStart)
    expect(openButtons(container)[0]?.getAttribute('aria-label')).toContain('heroi-477')
  }, 120_000)
})
