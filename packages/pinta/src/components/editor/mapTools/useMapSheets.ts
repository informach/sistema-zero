/**
 * As folhas das peças do mapa: uma imagem 1:1 por conjunto de peças, refeita só quando
 * AQUELE conjunto muda. Pixel monta na hora; vetor carrega e avisa quando chega.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { COPY } from '../../../core/copy'
import type { AnyTilesetAsset } from '../../../core/project'
import { loadVectorSheet, pixelSheetCanvas } from '../../../tiles/sheetCanvas'

export interface MapSheets {
  /** A folha pronta deste conjunto de peças (`null` = ainda carregando ou sem canvas). */
  sheetOf: (id: string) => HTMLCanvasElement | null
  /** Sobe a cada folha que fica pronta: quem pinta o mapa repinta. */
  version: number
}

export function useMapSheets(
  mapTilesets: readonly AnyTilesetAsset[],
  showToast: (message: string) => void,
): MapSheets {
  const sheetsRef = useRef(
    new Map<string, { source: AnyTilesetAsset; canvas: HTMLCanvasElement | null }>(),
  )
  const [version, setVersion] = useState(0)
  useEffect(() => {
    const sheets = sheetsRef.current
    const wanted = new Set(mapTilesets.map((t) => t.id))
    for (const id of [...sheets.keys()]) if (!wanted.has(id)) sheets.delete(id)
    const cleanups: Array<() => void> = []
    let built = false
    for (const source of mapTilesets) {
      if (sheets.get(source.id)?.source === source) continue
      if (source.kind === 'tileset') {
        sheets.set(source.id, { source, canvas: pixelSheetCanvas(source) })
        built = true
        continue
      }
      sheets.set(source.id, { source, canvas: null })
      const stop = loadVectorSheet(
        source,
        (canvas) => {
          const entry = sheets.get(source.id)
          if (entry?.source !== source) return
          entry.canvas = canvas
          setVersion((v) => v + 1)
        },
        () => showToast(COPY.tiles.sheetError),
      )
      // Carregamento cancelado esquece a entrada, para a próxima rodada recomeçar.
      cleanups.push(() => {
        stop()
        const entry = sheets.get(source.id)
        if (entry?.source === source && !entry.canvas) sheets.delete(source.id)
      })
    }
    if (built) setVersion((v) => v + 1)
    return () => {
      for (const cleanup of cleanups) cleanup()
    }
  }, [mapTilesets, showToast])
  const sheetOf = useCallback((id: string) => sheetsRef.current.get(id)?.canvas ?? null, [])
  return { sheetOf, version }
}
