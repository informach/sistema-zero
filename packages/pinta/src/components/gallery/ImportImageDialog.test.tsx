import { describe, expect, it } from 'bun:test'
import { fireEvent, render, screen } from '@testing-library/react'
import { COPY } from '../../core/copy'
import type { PintaAsset } from '../../core/project'
import type { RGBAImage } from '../../import/quantize'
import { ImportImageDialog } from './ImportImageDialog'

/** Imagem 16×16 sólida vermelha (decode já feito — o teste injeta o RGBA). */
function redImage(): RGBAImage {
  const data = new Uint8ClampedArray(16 * 16 * 4)
  for (let i = 0; i < 16 * 16; i += 1) {
    data[i * 4] = 255
    data[i * 4 + 3] = 255
  }
  return { data, width: 16, height: 16 }
}

describe('ImportImageDialog', () => {
  it('foto → PEÇAS → tamanho → nome → importa um tileset', () => {
    let imported: PintaAsset | null = null
    render(
      <ImportImageDialog
        open
        image={redImage()}
        onClose={() => {}}
        onImport={(asset) => {
          imported = asset
        }}
      />,
    )
    // Passo 1: o que a imagem vira.
    expect(screen.getByText(COPY.importImage.title)).toBeTruthy()
    fireEvent.click(
      screen.getByRole('button', { name: new RegExp(COPY.importImage.asTileset.title) }),
    )

    // Passo 2: tamanho de peça + prévia (o recado das cores aparece).
    expect(screen.getByText(new RegExp(COPY.importImage.colorsNote))).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: COPY.importImage.next }))

    // Passo 3: nome + criar.
    const input = screen.getByPlaceholderText(COPY.newAsset.namePlaceholder)
    fireEvent.change(input, { target: { value: 'minhas-pecas' } })
    fireEvent.click(screen.getByRole('button', { name: COPY.importImage.create }))

    expect(imported).not.toBeNull()
    const asset = imported as unknown as PintaAsset
    expect(asset.kind).toBe('tileset')
    expect(asset.name).toBe('minhas-pecas')
    if (asset.kind === 'tileset') {
      expect(asset.tiles.length).toBeGreaterThan(0)
      // arrays de colisão alinhados às peças
      expect(asset.solid).toHaveLength(asset.tiles.length)
      expect(asset.platform).toHaveLength(asset.tiles.length)
    }
  })

  it('foto → CENÁRIO → tamanho PERSONALIZADO → nome → importa nas dimensões digitadas', () => {
    let imported: PintaAsset | null = null
    render(
      <ImportImageDialog
        open
        image={redImage()}
        onClose={() => {}}
        onImport={(asset) => {
          imported = asset
        }}
      />,
    )
    fireEvent.click(
      screen.getByRole('button', { name: new RegExp(COPY.importImage.asBackground.title) }),
    )

    // Personalizado revela o formulário (semeado do preset médio 240×180).
    fireEvent.click(screen.getByRole('button', { name: COPY.newAsset.customSize.card }))
    const width = screen.getByLabelText(COPY.newAsset.customSize.width) as HTMLInputElement
    const height = screen.getByLabelText(COPY.newAsset.customSize.height) as HTMLInputElement
    expect(width.value).toBe('240')
    expect(height.value).toBe('180')

    // Inválido trava o Avançar (sem prévia p/ quantizar).
    fireEvent.change(width, { target: { value: '4' } })
    const next = screen.getByRole('button', { name: COPY.importImage.next }) as HTMLButtonElement
    expect(next.disabled).toBe(true)

    fireEvent.change(width, { target: { value: '32' } })
    fireEvent.change(height, { target: { value: '24' } })
    expect(next.disabled).toBe(false)
    fireEvent.click(next)

    fireEvent.change(screen.getByPlaceholderText(COPY.newAsset.namePlaceholder), {
      target: { value: 'foto-do-ceu' },
    })
    fireEvent.click(screen.getByRole('button', { name: COPY.importImage.create }))

    expect(imported).not.toBeNull()
    const asset = imported as unknown as PintaAsset
    expect(asset.kind).toBe('pixel-background')
    if (asset.kind === 'pixel-background') {
      expect(asset.cels[0]?.width).toBe(32)
      expect(asset.cels[0]?.height).toBe(24)
    }
  })

  it('fechar no Personalizado e reabrir volta ao preset médio (o diálogo fica montado)', () => {
    const props = { image: redImage(), onClose: () => {}, onImport: () => {} }
    const { rerender } = render(<ImportImageDialog open {...props} />)
    fireEvent.click(
      screen.getByRole('button', { name: new RegExp(COPY.importImage.asBackground.title) }),
    )
    fireEvent.click(screen.getByRole('button', { name: COPY.newAsset.customSize.card }))
    expect(screen.getByLabelText(COPY.newAsset.customSize.width)).toBeTruthy()

    // Fechar roda o reset ANTES do onClose do host; reabrir não pode cair no
    // card Personalizado com campos vazios (Avançar travado, sem prévia).
    fireEvent.click(screen.getByRole('button', { name: COPY.a11y.close }))
    rerender(<ImportImageDialog open {...props} />)
    fireEvent.click(
      screen.getByRole('button', { name: new RegExp(COPY.importImage.asBackground.title) }),
    )
    expect(screen.queryByLabelText(COPY.newAsset.customSize.width)).toBeNull()
    const medium = screen.getByRole('button', { name: '240 × 180' })
    expect(medium.getAttribute('aria-pressed')).toBe('true')
  })
})
