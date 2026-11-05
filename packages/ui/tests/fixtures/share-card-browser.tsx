import jsQR from 'jsqr'
import { createRoot } from 'react-dom/client'
import { Dialog } from '../../src/components/ui/dialog'
import { ShareCard } from '../../src/components/ui/share-card'
import { createShareCardImage, type ShareCardContent } from '../../src/lib/share-card-image'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Falta a raiz da prova.')
const root = createRoot(rootElement)
Object.assign(window, {
  fixture: {
    createShareCardImage,
    show(content: ShareCardContent) {
      root.render(
        <Dialog open onClose={() => root.render(<p>Fechado</p>)} title="Campanha">
          <ShareCard {...content} />
        </Dialog>,
      )
    },
    async decode(url: string) {
      const image = new Image()
      image.src = url
      await image.decode()
      const canvas = document.createElement('canvas')
      canvas.width = image.width
      canvas.height = image.height
      const context = canvas.getContext('2d')
      if (!context) throw new Error('Sem Canvas.')
      context.drawImage(image, 0, 0)
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height)
      return {
        url: jsQR(pixels.data, pixels.width, pixels.height)?.data,
        width: image.width,
        height: image.height,
      }
    },
  },
})
