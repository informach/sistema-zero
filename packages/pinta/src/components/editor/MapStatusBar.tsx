/**
 * Rodapé do editor de mapa: tamanho atual (colunas × linhas) e a célula sob o
 * cursor. O hover chega por callback-ref (o pai chama `register(setHover)` e
 * dispara no pointermove SEM re-renderizar o editor inteiro — senão os até 64
 * thumbs do picker repintariam a 60fps).
 */
import type { JSX } from 'react'
import { useEffect, useState } from 'react'
import { COPY } from '../../core/copy'
import type { CellPos } from '../../tiles/cellGeometry'

export function MapStatusBar({
  cols,
  rows,
  register,
}: {
  cols: number
  rows: number
  register: (fn: (cell: CellPos | null) => void) => void
}): JSX.Element {
  const [hover, setHover] = useState<CellPos | null>(null)
  useEffect(() => {
    register(setHover)
    return () => register(() => {})
  }, [register])
  return (
    <span className="text-sm font-bold text-pin-muted tabular-nums">
      {COPY.tiles.statusSize(cols, rows)}
      {hover ? (
        <span className="ml-3">{COPY.tiles.statusCell(hover.col + 1, hover.row + 1)}</span>
      ) : null}
    </span>
  )
}
