/**
 * O relógio das peças animadas: a cada quadro da tela confere se ALGUMA animação trocou de
 * quadro e só então pede a repintura (o mapa parado não gasta nada).
 */
import { useEffect } from 'react'
import type { AnyTilesetAsset } from '../../../core/project'

/** Em que quadro está cada animação neste instante (muda só quando algum quadro troca). */
export function animationFrameKey(tilesets: readonly AnyTilesetAsset[], time: number): string {
  return tilesets
    .flatMap((t) =>
      Object.values(t.animations ?? {}).map((frames) => {
        const total = frames.reduce((s, f) => s + f.duration, 0)
        if (total <= 0) return 0
        let at = time % total
        for (let i = 0; i < frames.length; i++) {
          at -= frames[i]?.duration ?? 0
          if (at < 0) return i
        }
        return 0
      }),
    )
    .join(',')
}

export function useMapAnimation(
  tilesets: readonly AnyTilesetAsset[],
  onFrame: (time: number) => void,
): void {
  useEffect(() => {
    if (!tilesets.some((t) => t.animations && Object.keys(t.animations).length)) return
    let frame = 0,
      last = ''
    const tick = (time: number): void => {
      const key = animationFrameKey(tilesets, time)
      if (key !== last) {
        last = key
        onFrame(time)
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [tilesets, onFrame])
}
