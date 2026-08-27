import { describe, expect, it } from 'bun:test'
import { fireEvent, render, screen } from '@testing-library/react'
import { COPY } from '../../core/copy'
import { type PintaAsset, sanitizePintaAsset } from '../../core/project'
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

/** Metade esquerda vermelha, direita azul (o caso de mais de uma cor). */
function twoColorImage(): RGBAImage {
  const data = new Uint8ClampedArray(16 * 16 * 4)
  for (let y = 0; y < 16; y += 1) {
    for (let x = 0; x < 16; x += 1) {
      const i = (y * 16 + x) * 4
      if (x < 8) data[i] = 255
      else data[i + 2] = 255
      data[i + 3] = 255
    }
  }
  return { data, width: 16, height: 16 }
}

/** Imagem 100% transparente (todo alfa 0). */
function clearImage(): RGBAImage {
  return { data: new Uint8ClampedArray(16 * 16 * 4), width: 16, height: 16 }
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

    // Passo 2: tamanho de peça + prévia (o recado das cores aparece, com a
    // contagem da paleta que a foto virou — vermelho sólido = 1 cor).
    expect(screen.getByText(new RegExp(COPY.importImage.colorsNote))).toBeTruthy()
    expect(screen.getByText(new RegExp(COPY.importImage.photoPalette(1)))).toBeTruthy()
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
      // A foto NASCE com a paleta própria (teto 16), nunca mais arcade + extras.
      expect(asset.paletteId).toBe('custom')
      expect(asset.customPalette?.name).toBe(COPY.importImage.photoPaletteName)
      expect(asset.customPalette?.colors[0]).toBe('')
      expect(asset.customPalette?.colors.filter(Boolean)).toEqual(['#ff0000'])
      expect(asset.extraColors).toBeUndefined()
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
      expect(asset.paletteId).toBe('custom')
      expect(asset.customPalette?.colors.filter(Boolean)).toEqual(['#ff0000'])
      expect(asset.extraColors).toBeUndefined()
    }
  })

  it('foto → PERSONAGEM → Médio (32) → nome → importa um pixel-sprite com o quadro casando o bitmap', () => {
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
    // O cartão Personagem é o PRIMEIRO dos alvos (é o caso mais comum: um PNG que
    // vira boneco). O 1º botão do diálogo é o "Fechar" do próprio Dialog.
    const targetTitles = [
      COPY.importImage.asSprite.title,
      COPY.importImage.asBackground.title,
      COPY.importImage.asTileset.title,
    ]
    const cards = screen
      .getAllByRole('button')
      .filter((b) => targetTitles.some((t) => b.textContent?.includes(t)))
    expect(cards.map((b) => b.textContent)).toHaveLength(3)
    expect(cards[0]?.textContent).toContain(COPY.importImage.asSprite.title)
    fireEvent.click(
      screen.getByRole('button', { name: new RegExp(COPY.importImage.asSprite.title) }),
    )

    // O Médio (32) já vem marcado; a nota "entra inteira, sem cortar" aparece.
    expect(screen.getByText(COPY.importImage.spriteSizeTitle)).toBeTruthy()
    const medium = screen.getByRole('button', { name: new RegExp(`^${COPY.sizes[32]}`) })
    expect(medium.getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByText(new RegExp(COPY.importImage.spriteFitNote))).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: COPY.importImage.next }))

    fireEvent.change(screen.getByPlaceholderText(COPY.newAsset.namePlaceholder), {
      target: { value: 'meu-heroi' },
    })
    fireEvent.click(screen.getByRole('button', { name: COPY.importImage.create }))

    expect(imported).not.toBeNull()
    const asset = imported as unknown as PintaAsset
    expect(asset.kind).toBe('pixel-sprite')
    expect(asset.name).toBe('meu-heroi')
    if (asset.kind === 'pixel-sprite') {
      expect(asset.frameWidth).toBe(32)
      expect(asset.frameHeight).toBe(32)
      const cel = asset.animations[0]?.frames[0]?.[0]
      expect(cel?.width).toBe(32)
      expect(cel?.height).toBe(32)
      // Um cel por camada (o quadro nasce com a camada única da fábrica).
      expect(asset.animations[0]?.frames[0]).toHaveLength(asset.layers.length)
      // A imagem 16×16 vermelha foi AMPLIADA para preencher o quadro: nenhum pixel transparente.
      expect(Array.from(cel?.data ?? []).every((index) => index !== 0)).toBe(true)
      expect(asset.paletteId).toBe('custom')
      expect(asset.customPalette?.name).toBe(COPY.importImage.photoPaletteName)
      expect(asset.customPalette?.colors.filter(Boolean)).toEqual(['#ff0000'])
      expect(asset.extraColors).toBeUndefined()
    }
    // O que entra pelo import é o que o sanitize aceita — senão sumiria da galeria.
    // (Round-trip com structuredClone, nunca JSON: o IndexedDB usa structured clone.)
    const sanitized = sanitizePintaAsset(structuredClone(asset))
    expect(sanitized).not.toBeNull()
    expect(sanitized?.kind === 'pixel-sprite' && sanitized.customPalette?.colors[1]).toBe('#ff0000')
  })

  it('foto → PERSONAGEM → tamanho PERSONALIZADO deitado (16×8) → importa sem cortar (contain)', () => {
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
      screen.getByRole('button', { name: new RegExp(COPY.importImage.asSprite.title) }),
    )
    // Personalizado semeia os DOIS campos a partir do preset marcado ("32" → 32 e 32).
    fireEvent.click(screen.getByRole('button', { name: COPY.newAsset.customSize.card }))
    const width = screen.getByLabelText(COPY.newAsset.customSize.width) as HTMLInputElement
    const height = screen.getByLabelText(COPY.newAsset.customSize.height) as HTMLInputElement
    expect(width.value).toBe('32')
    expect(height.value).toBe('32')

    // Fora da faixa (8..128) trava o Avançar.
    fireEvent.change(width, { target: { value: '4' } })
    const next = screen.getByRole('button', { name: COPY.importImage.next }) as HTMLButtonElement
    expect(next.disabled).toBe(true)

    fireEvent.change(width, { target: { value: '16' } })
    fireEvent.change(height, { target: { value: '8' } })
    expect(next.disabled).toBe(false)
    fireEvent.click(next)

    fireEvent.change(screen.getByPlaceholderText(COPY.newAsset.namePlaceholder), {
      target: { value: 'nave' },
    })
    fireEvent.click(screen.getByRole('button', { name: COPY.importImage.create }))

    const asset = imported as unknown as PintaAsset
    expect(asset.kind).toBe('pixel-sprite')
    if (asset.kind === 'pixel-sprite') {
      expect(asset.frameWidth).toBe(16)
      expect(asset.frameHeight).toBe(8)
      const cel = asset.animations[0]?.frames[0]?.[0]
      expect(cel?.width).toBe(16)
      expect(cel?.height).toBe(8)
      // A foto quadrada 16×16 entra INTEIRA num quadro deitado: vira 8×8 no meio,
      // com 4 colunas transparentes de cada lado (contain, nunca cover).
      const data = Array.from(cel?.data ?? [])
      const row = data.slice(0, 16)
      expect(row.slice(0, 4).every((i) => i === 0)).toBe(true)
      expect(row.slice(4, 12).every((i) => i !== 0)).toBe(true)
      expect(row.slice(12).every((i) => i === 0)).toBe(true)
    }
    expect(sanitizePintaAsset(structuredClone(asset))).not.toBeNull()
  })

  it('foto 100% transparente cai em ARCADE sem customPalette (nunca custom sem cor pintável)', () => {
    let imported: PintaAsset | null = null
    render(
      <ImportImageDialog
        open
        image={clearImage()}
        onClose={() => {}}
        onImport={(asset) => {
          imported = asset
        }}
      />,
    )
    fireEvent.click(
      screen.getByRole('button', { name: new RegExp(COPY.importImage.asBackground.title) }),
    )
    fireEvent.click(screen.getByRole('button', { name: COPY.importImage.next }))
    fireEvent.change(screen.getByPlaceholderText(COPY.newAsset.namePlaceholder), {
      target: { value: 'vazia' },
    })
    fireEvent.click(screen.getByRole('button', { name: COPY.importImage.create }))

    const asset = imported as unknown as PintaAsset
    expect(asset.kind).toBe('pixel-background')
    if (asset.kind === 'pixel-background') {
      expect(asset.paletteId).toBe('arcade')
      expect(asset.customPalette).toBeUndefined()
      // Bitmap todo transparente: nenhum índice pintado apontando arcade.
      expect(Array.from(asset.cels[0]?.data ?? [1]).every((index) => index === 0)).toBe(true)
    }
    expect(sanitizePintaAsset(structuredClone(asset))).not.toBeNull()
  })

  it('foto de DUAS cores: nota no plural e a paleta sai com as duas exatas (round-trip)', () => {
    let imported: PintaAsset | null = null
    render(
      <ImportImageDialog
        open
        image={twoColorImage()}
        onClose={() => {}}
        onImport={(asset) => {
          imported = asset
        }}
      />,
    )
    fireEvent.click(
      screen.getByRole('button', { name: new RegExp(COPY.importImage.asBackground.title) }),
    )
    expect(screen.getByText(new RegExp(COPY.importImage.photoPalette(2)))).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: COPY.importImage.next }))
    fireEvent.change(screen.getByPlaceholderText(COPY.newAsset.namePlaceholder), {
      target: { value: 'bandeira' },
    })
    fireEvent.click(screen.getByRole('button', { name: COPY.importImage.create }))

    const asset = imported as unknown as PintaAsset
    expect(asset.kind).toBe('pixel-background')
    if (asset.kind === 'pixel-background') {
      expect(asset.paletteId).toBe('custom')
      expect(asset.customPalette?.colors.filter(Boolean).sort()).toEqual(['#0000ff', '#ff0000'])
      expect(asset.extraColors).toBeUndefined()
    }
    // O round-trip do sanitize preserva a paleta nos alvos além do personagem.
    const sanitized = sanitizePintaAsset(structuredClone(asset))
    expect(
      sanitized?.kind === 'pixel-background' &&
        sanitized.customPalette?.colors.filter(Boolean).sort(),
    ).toEqual(['#0000ff', '#ff0000'])
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
