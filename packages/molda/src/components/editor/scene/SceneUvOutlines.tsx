import { useMemo } from 'react'
import type { Vec2 } from '../../../scene/document'

export function uvOutlinePath(points: readonly Vec2[], width: number, height: number) {
  return `${points
    .map((point, index) => `${index ? 'L' : 'M'}${point[0] * width} ${point[1] * height}`)
    .join('')}Z`
}

/** Two paths keep dense meshes from creating a DOM element for every face. */
export function SceneUvOutlines({
  faces,
  ids,
  width,
  height,
  scale,
  interactive = false,
}: {
  faces: readonly { id: string; points: Vec2[] }[]
  ids: readonly string[]
  width: number
  height: number
  scale: number
  interactive?: boolean
}) {
  const paths = useMemo(() => {
    const selected = new Set(ids)
    const paths: [string[], string[]] = [[], []]
    for (const face of faces)
      paths[selected.has(face.id) ? 1 : 0].push(uvOutlinePath(face.points, width, height))
    return paths.map((group) => group.join(''))
  }, [faces, ids, width, height])
  return (
    <>
      <path
        d={paths[0]}
        pointerEvents={interactive ? 'all' : undefined}
        fill="none"
        stroke="currentColor"
        strokeOpacity={0.35}
        strokeWidth={1 / scale}
      />
      <path
        d={paths[1]}
        pointerEvents={interactive ? 'all' : undefined}
        fill="var(--color-mld-accent)"
        fillOpacity={0.12}
        stroke="var(--color-mld-accent)"
        strokeWidth={2 / scale}
      />
    </>
  )
}
