import { useLayoutEffect, useRef } from 'react'
import { cancelRender, continueRender, delayRender } from 'remotion'

export interface CompositionFont {
  family: string
  url?: string
  required: boolean
}

/** Every composition declares its fonts before its frame preflight can measure text. */
export function useCompositionFonts(fonts: CompositionFont[]) {
  const ready = useRef<Promise<void>>(Promise.resolve())
  const key = JSON.stringify(fonts)
  useLayoutEffect(() => {
    const declarations: CompositionFont[] = JSON.parse(key)
    const handle = delayRender('Carregando fontes da composição')
    let live = true,
      released = false
    const faces: FontFace[] = []
    const release = () => {
      if (!released) {
        released = true
        continueRender(handle)
      }
    }
    ready.current = (async () => {
      for (const font of declarations) {
        if (font.required && !font.url)
          throw new Error('Uma fonte da composição ainda não foi carregada')
        if (font.url) {
          const face = new FontFace(font.family, `url(${JSON.stringify(font.url)})`)
          faces.push(face)
          await face.load()
          if (live) document.fonts.add(face)
        }
        await Promise.all(
          ['600', '800'].map((weight) => document.fonts.load(`${weight} 16px ${font.family}`)),
        )
      }
      await document.fonts.ready
    })()
    void ready.current
      .then(() => {
        if (live) release()
      })
      .catch((error) => {
        if (live) cancelRender(error)
      })
    return () => {
      live = false
      release()
      for (const face of faces) document.fonts.delete(face)
    }
  }, [key])
  return ready
}
