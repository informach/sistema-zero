'use client'

import { cn } from '@/lib/cn'
import { buildHeatmapGrid, cellTitle, DOW_LABELS } from '@/lib/heatmap'
import type { BestTimesView } from '@/lib/types'

/** Cores por intensidade (0..4) — tokens do tema, dark-safe. */
const INTENSITY_CLASSES = [
  'bg-muted/50',
  'bg-primary/15',
  'bg-primary/35',
  'bg-primary/60',
  'bg-primary',
] as const

/**
 * Heatmap 7×24 CUSTOM (CSS grid, sem lib): linha = dia da semana, coluna =
 * hora em SP; a cor é a média de views por post normalizada pelo melhor
 * horário do período. Tooltip nativo (`title`) por célula.
 */
export function BestTimesHeatmap({ view }: { view: BestTimesView }) {
  if (view.totalPosts === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border bg-card/50">
        <p className="px-6 text-center text-sm text-muted-foreground">
          O mapa de horários nasce das publicações já publicadas no período. Publique mais para ele
          aparecer.
        </p>
      </div>
    )
  }
  const grid = buildHeatmapGrid(view)
  return (
    <div className="space-y-2 overflow-x-auto">
      <div
        className="grid min-w-[560px] gap-0.5"
        style={{ gridTemplateColumns: 'auto repeat(24, minmax(0, 1fr))' }}
      >
        <span aria-hidden />
        {Array.from({ length: 24 }, (_, hour) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: a grade é FIXA (24 horas) — o índice É a hora.
            key={`h-${hour}`}
            className="text-center text-[9px] tabular-nums text-muted-foreground"
          >
            {hour % 3 === 0 ? hour : ''}
          </span>
        ))}
        {grid.map((row, dow) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: a grade é FIXA (7 dias × 24 horas) — o índice é o próprio dado.
          <div key={`d-${dow}`} className="contents">
            <span className="pr-1.5 text-right text-[10px] leading-4 text-muted-foreground">
              {DOW_LABELS[dow]}
            </span>
            {row.map((cell) => (
              <div
                key={`c-${cell.dow}-${cell.hour}`}
                title={cellTitle(cell)}
                className={cn('h-4 rounded-[3px]', INTENSITY_CLASSES[cell.intensity])}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-end gap-1.5 text-[10px] text-muted-foreground">
        menos
        {INTENSITY_CLASSES.map((cls, index) => (
          <span key={cls} className={cn('size-3 rounded-[3px]', cls)} title={`nível ${index}`} />
        ))}
        mais views por post
      </div>
    </div>
  )
}
