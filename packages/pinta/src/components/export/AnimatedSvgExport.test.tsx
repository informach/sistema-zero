import { describe, expect, it } from 'bun:test'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { COPY } from '../../core/copy'
import { createVectorSpriteAsset, type PintaVectorAnimation } from '../../core/project'
import type { VectorShape } from '../../vector/model'
import { DEFAULT_STYLE, makeRect } from '../../vector/shapes'
import { AnimatedSvgExport } from './AnimatedSvgExport'

function animationWith(frames: readonly (readonly VectorShape[])[]): {
  asset: ReturnType<typeof createVectorSpriteAsset>
  animation: PintaVectorAnimation
} {
  const asset = createVectorSpriteAsset({ name: 'heroi', frameSize: 64 })
  const original = asset.animations[0]
  if (!original) throw new Error('animação esperada')
  const animation = { ...original, frames: frames.map((frame) => [...frame]) }
  return { asset: { ...asset, animations: [animation] }, animation }
}

describe('AnimatedSvgExport', () => {
  it('troca a prévia, revoga cada Blob URL e baixa exatamente o SVG mostrado', async () => {
    const first = makeRect({ x: 0, y: 0 }, { x: 10, y: 10 }, DEFAULT_STYLE)
    if (first.type !== 'rect') throw new Error('retângulo esperado')
    const input = animationWith([[first], [{ ...first, id: 'segundo', x: 20 }]])
    const originalCreate = Object.getOwnPropertyDescriptor(URL, 'createObjectURL')
    const originalRevoke = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL')
    const blobs: Blob[] = []
    const revoked: string[] = []
    const downloads: string[] = []
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: (blob: Blob) => {
        blobs.push(blob)
        return `blob:preview-${blobs.length}`
      },
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: (url: string) => revoked.push(url),
    })

    try {
      const view = render(
        <AnimatedSvgExport
          {...input}
          onDownload={(svg) => {
            downloads.push(svg)
          }}
        />,
      )
      const preview = await screen.findByRole('img', {
        name: COPY.exportDialog.animatedSvgPreview,
      })
      expect(preview.getAttribute('src')).toBe('blob:preview-1')

      fireEvent.click(screen.getByRole('checkbox', { name: /Movimento mais suave/ }))
      await waitFor(() => expect(preview.getAttribute('src')).toBe('blob:preview-2'))
      expect(revoked).toContain('blob:preview-1')

      fireEvent.click(screen.getByRole('button', { name: COPY.exportDialog.animatedSvgDownload }))
      expect(downloads).toHaveLength(1)
      expect(downloads[0]).toContain('calcMode="discrete"')

      view.unmount()
      expect(revoked).toContain('blob:preview-2')
    } finally {
      if (originalCreate) Object.defineProperty(URL, 'createObjectURL', originalCreate)
      else Reflect.deleteProperty(URL, 'createObjectURL')
      if (originalRevoke) Object.defineProperty(URL, 'revokeObjectURL', originalRevoke)
      else Reflect.deleteProperty(URL, 'revokeObjectURL')
    }
  })

  it.each([
    {
      name: 'vazia',
      frames: [] as VectorShape[][],
      message: COPY.exportDialog.animatedSvgEmpty,
    },
    {
      name: 'com texto',
      frames: [
        [
          {
            id: 'texto',
            type: 'text',
            x: 0,
            y: 12,
            text: 'Oi',
            fontSize: 12,
            fill: '#000000',
            stroke: null,
            opacity: 1,
            rotation: 0,
          } as VectorShape,
        ],
      ],
      message: COPY.exportDialog.animatedSvgText,
    },
    {
      name: 'com figura',
      frames: [
        [
          {
            id: 'figura',
            type: 'image',
            x: 0,
            y: 0,
            w: 10,
            h: 10,
            src: 'data:image/png;base64,AAAA',
            fill: 'none',
            stroke: null,
            opacity: 1,
            rotation: 0,
          } as VectorShape,
        ],
      ],
      message: COPY.exportDialog.animatedSvgImage,
    },
  ])('explica e desliga o download quando a animação está $name', ({ frames, message }) => {
    const input = animationWith(frames)
    render(<AnimatedSvgExport {...input} onDownload={() => undefined} />)
    expect(screen.getByText(message)).toBeTruthy()
    expect(
      screen
        .getByRole('button', { name: COPY.exportDialog.animatedSvgDownload })
        .hasAttribute('disabled'),
    ).toBe(true)
    expect(screen.queryByRole('img', { name: COPY.exportDialog.animatedSvgPreview })).toBeNull()
  })
})
