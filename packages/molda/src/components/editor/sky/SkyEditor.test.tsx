import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { COPY } from '../../../core/copy'
import type { MoldaAsset, MoldaSkyAsset } from '../../../core/model'
import { createMemoryPersistence } from '../../../state/memoryPersistence'
import { resetMoldaPersistenceForTests } from '../../../state/persistence'
import { installFakeSkyPreview } from '../../../testing/fakeSkyPreview'
import { makeSky } from '../../../testing/fixtures'
import { MoldaApp } from '../../MoldaApp'

let fake: ReturnType<typeof installFakeSkyPreview>

beforeEach(() => {
  resetMoldaPersistenceForTests()
  fake = installFakeSkyPreview()
})

afterEach(() => {
  fake.uninstall()
})

function skyOf(asset: MoldaAsset | undefined): MoldaSkyAsset {
  if (asset?.kind !== 'sky') throw new Error('não é céu')
  return asset
}

async function openSky(): Promise<ReturnType<typeof createMemoryPersistence>> {
  const persistence = createMemoryPersistence([makeSky()])
  render(<MoldaApp persistence={persistence} adapter={{ initialAssetId: 'sky-1' }} />)
  await screen.findByRole('button', { name: COPY.editor.sky.download.hdr })
  return persistence
}

describe('SkyEditor', () => {
  test('a prévia recebe a imagem do render e acompanha os controles', async () => {
    await openSky()
    await waitFor(() => expect(fake.instances[0]?.images.length).toBeGreaterThan(0), {
      timeout: 3000,
    })
    const first = fake.instances[0]?.images.at(-1)
    expect(first?.width).toBe(256)
    expect(first?.height).toBe(128)
    const slider = screen.getByRole('slider', {
      name: COPY.editor.sky.elevation,
    }) as HTMLInputElement
    expect(slider.value).toBe('6')
    fireEvent.pointerDown(slider)
    fireEvent.change(slider, { target: { value: '40' } })
    await waitFor(() => expect((fake.instances[0]?.images.length ?? 0) > 1).toBe(true), {
      timeout: 3000,
    })
  })

  test('um arrasto de slider é UM passo de desfazer e vira "Do seu jeito"', async () => {
    const persistence = await openSky()
    const slider = screen.getByRole('slider', {
      name: COPY.editor.sky.intensity,
    }) as HTMLInputElement
    fireEvent.pointerDown(slider)
    fireEvent.change(slider, { target: { value: '50' } })
    fireEvent.change(slider, { target: { value: '70' } })
    fireEvent.pointerUp(slider)
    await waitFor(() =>
      expect(
        (screen.getByRole('button', { name: COPY.editor.undo }) as HTMLButtonElement).disabled,
      ).toBe(false),
    )
    expect(screen.getByText(COPY.skyPresets.custom)).toBeDefined()
    await waitFor(() => expect(skyOf(persistence.snapshot()[0]).params.sunIntensity).toBe(70), {
      timeout: 3000,
    })
    expect(skyOf(persistence.snapshot()[0]).params.preset).toBe('custom')
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
    await waitFor(() =>
      expect(
        (screen.getByRole('slider', { name: COPY.editor.sky.intensity }) as HTMLInputElement).value,
      ).toBe('30'),
    )
    expect(
      (screen.getByRole('button', { name: COPY.editor.undo }) as HTMLButtonElement).disabled,
    ).toBe(true)
  })

  test('preset, cores, sortear nuvens e download', async () => {
    const persistence = await openSky()
    fireEvent.click(screen.getByRole('button', { name: COPY.skyPresets.noite }))
    await waitFor(() => expect(skyOf(persistence.snapshot()[0]).params.preset).toBe('noite'), {
      timeout: 3000,
    })
    const top = screen.getByLabelText(COPY.editor.sky.top) as HTMLInputElement
    fireEvent.focus(top)
    fireEvent.change(top, { target: { value: '#112233' } })
    fireEvent.blur(top)
    await waitFor(() => expect(skyOf(persistence.snapshot()[0]).params.topColor).toBe('#112233'), {
      timeout: 3000,
    })
    const seedBefore = skyOf(persistence.snapshot()[0]).params.clouds.seed
    fireEvent.click(screen.getByRole('button', { name: new RegExp(COPY.editor.sky.shuffle) }))
    await waitFor(
      () => expect(skyOf(persistence.snapshot()[0]).params.clouds.seed).not.toBe(seedBefore),
      { timeout: 3000 },
    )
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.sky.download.hdr }))
    expect(await screen.findByText(COPY.editor.sky.download.preparing)).toBeDefined()
    const ready = COPY.editor.sky.download.ready
    const failed = COPY.editor.sky.download.failed
    expect(
      await screen.findByText((text) => text === ready || text === failed, undefined, {
        timeout: 8000,
      }),
    ).toBeDefined()
  })

  test('sair do editor descarta a prévia', async () => {
    await openSky()
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.backToGallery }))
    await screen.findByRole('heading', { level: 1, name: COPY.gallery.title })
    expect(fake.instances[0]?.disposed).toBe(true)
  })
})
