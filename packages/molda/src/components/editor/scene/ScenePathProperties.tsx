import { useState } from 'react'
import { COPY } from '../../../core/copy'
import type { Vec3 } from '../../../core/model'
import type { ScenePathGeometry } from '../../../scene/document'
import type { ScenePathSettings } from '../../../scene/pathCommands'
import { ScenePathForm } from './ScenePathForm'
import { SceneVectorForm } from './SceneVectorForm'

export function ScenePathProperties({
  geometry,
  onSettings,
  onPoint,
}: {
  geometry: ScenePathGeometry
  onSettings(settings: ScenePathSettings): void
  onPoint(point: string, position: Vec3): void
}) {
  const [chosen, setPoint] = useState(geometry.points[0]!.id)
  const point = geometry.points.find((p) => p.id === chosen) ?? geometry.points[0]!
  return (
    <details>
      <summary className="min-h-11 cursor-pointer py-3 text-sm font-bold">
        {COPY.scene.pathSettings}
      </summary>
      <div className="space-y-4">
        <ScenePathForm
          key={`${geometry.radius}:${geometry.around}:${geometry.endCaps}:${geometry.closed}`}
          settings={geometry}
          points={geometry.points.length}
          action={COPY.scene.applyPathSettings}
          onApply={onSettings}
        />
        <label className="block space-y-1 text-sm">
          <span>{COPY.scene.pathPoint}</span>
          <select
            name="pathPoint"
            value={point.id}
            onChange={(event) => setPoint(event.target.value)}
            className="min-h-11 w-full rounded-lg border border-mld-border bg-mld-bg px-3 text-mld-text focus-visible:outline-2 focus-visible:outline-mld-accent"
          >
            {geometry.points.map((point, i) => (
              <option key={point.id} value={point.id}>
                {COPY.scene.pathPointName(i + 1)}
              </option>
            ))}
          </select>
        </label>
        <SceneVectorForm
          key={`${point.id}:${point.position.join(':')}`}
          label={COPY.scene.pathPointPosition}
          hint={COPY.scene.pathPointHint}
          values={point.position}
          onApply={(values) => onPoint(point.id, values)}
        />
      </div>
    </details>
  )
}
