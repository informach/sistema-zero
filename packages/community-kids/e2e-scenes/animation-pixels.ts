import type { Locator } from '@playwright/test'

/** Rasterizes a snapshot of the actual SVG on a transparent surface, independent of the app theme. */
export async function animationPixels(locator: Locator) {
  return locator.evaluate(async (element: SVGSVGElement) => {
    const bounds = element.getBoundingClientRect()
    const width = Math.round(bounds.width * devicePixelRatio)
    const height = Math.round(bounds.height * devicePixelRatio)
    const clone = element.cloneNode(true) as SVGSVGElement
    clone.setAttribute('width', String(width))
    clone.setAttribute('height', String(height))
    clone.style.width = `${width}px`
    clone.style.height = `${height}px`
    const image = new Image()
    const url = URL.createObjectURL(
      new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' }),
    )
    try {
      image.src = url
      await image.decode()
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext('2d')!
      context.drawImage(image, 0, 0, width, height)
      const { data } = context.getImageData(0, 0, width, height)
      let hash = 0,
        left = width,
        right = -1,
        count = 0,
        sum = 0
      for (let i = 0; i < data.length; i++) hash = (hash * 31 + data[i]!) | 0
      for (let y = 0; y < height; y++)
        for (let x = 0; x < width; x++) {
          if (data[(y * width + x) * 4 + 3]! <= 32) continue
          left = Math.min(left, x)
          right = Math.max(right, x)
          count++
          sum += x
        }
      return {
        hash,
        count,
        left: left / width,
        right: (right + 1) / width,
        center: sum / count / width,
        width,
      }
    } finally {
      URL.revokeObjectURL(url)
    }
  })
}
