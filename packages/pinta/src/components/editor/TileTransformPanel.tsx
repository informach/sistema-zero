import type { JSX } from 'react'
import { COPY } from '../../core/copy'
import { singleTileStamp, type TileStamp } from '../../tiles/stamp'
import { type TileTransform, transformStamp } from '../../tiles/transform'
import { IconButton } from '../ui/Button'
import { FlipHorizontal, FlipVertical, RotateCw } from '../ui/icons'
import { Panel } from '../ui/Panel'
export function TileTransformPanel({
  stamp,
  tile,
  onChange,
}: {
  stamp: TileStamp | null
  tile: number
  onChange: (stamp: TileStamp) => void
}): JSX.Element {
  const actions: [TileTransform, string, typeof FlipHorizontal][] = [
    ['horizontal', COPY.tools.flipH, FlipHorizontal],
    ['vertical', COPY.tools.flipV, FlipVertical],
    ['rotate', COPY.tools.rotate, RotateCw],
  ]
  return (
    <Panel title={COPY.tiles.turnTile}>
      <div className="flex gap-1">
        {actions.map(([operation, label, Icon]) => (
          <IconButton
            key={operation}
            aria-label={label}
            title={label}
            onClick={() => onChange(transformStamp(stamp ?? singleTileStamp(tile), operation))}
          >
            <Icon aria-hidden="true" />
          </IconButton>
        ))}
      </div>
    </Panel>
  )
}
