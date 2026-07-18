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
})
