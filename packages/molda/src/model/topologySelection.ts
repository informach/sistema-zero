/** Read-only topology, independent of document versions, coordinates, paint and UI. */
export interface SelectionTopology {
  vertices: readonly string[]
  edges: ReadonlyMap<string, readonly [string, string]>
  /** Ordered boundary edge IDs for each face. */
  faces: ReadonlyMap<string, readonly string[]>
}

export const MESH_SELECTION_ACTIONS = [
  'all',
  'none',
  'connected',
  'grow',
  'shrink',
  'invert',
  'ring',
  'loop',
] as const
export type MeshSelectionAction = (typeof MESH_SELECTION_ACTIONS)[number]
export type TopologySelectionMode = 'vertex' | 'edge' | 'face'

/** Incidence graph, not an all-pairs adjacency matrix: high-valence poles stay linear. */
function incidence(topology: SelectionTopology, mode: TopologySelectionMode) {
  const links = new Map<string, readonly string[]>()
  const members = new Map<string, string[]>()
  function add(id: string, connectors: readonly string[]) {
    links.set(id, connectors)
    for (const connector of connectors) {
      const group = members.get(connector)
      if (group) group.push(id)
      else members.set(connector, [id])
    }
  }
  if (mode === 'face') {
    for (const [id, edges] of topology.faces) add(id, edges)
  } else if (mode === 'edge') {
    for (const [id, vertices] of topology.edges) add(id, vertices)
  } else {
    const touching = new Map<string, string[]>()
    for (const [id, edge] of topology.edges) {
      for (const vertex of edge) {
        const list = touching.get(vertex)
        if (list) list.push(id)
        else touching.set(vertex, [id])
      }
    }
    for (const id of topology.vertices) add(id, touching.get(id) ?? [])
  }
  return { links, members }
}

export function selectTopology(
  topology: SelectionTopology,
  mode: TopologySelectionMode,
  selection: readonly string[],
  action: MeshSelectionAction,
): string[] {
  if (action === 'none') return []
  const { links, members } = incidence(topology, mode)
  const selected = [...new Set(selection)].filter((id) => links.has(id))
  if (action === 'ring' || action === 'loop')
    return mode === 'edge' ? traceEdges(topology, selected, action) : selected
  const chosen = new Set(selected)
  if (action === 'all') return [...links.keys()]
  if (action === 'invert') return [...links.keys()].filter((id) => !chosen.has(id))
  if (action === 'shrink') {
    const boundary = new Set<string>()
    for (const [connector, group] of members)
      if (group.some((id) => !chosen.has(id))) boundary.add(connector)
    return selected.filter((id) => !links.get(id)!.some((link) => boundary.has(link)))
  }
  const queue = [...chosen]
  const visitedConnectors = new Set<string>()
  const seeds = queue.length
  for (let i = 0; i < (action === 'grow' ? seeds : queue.length); i++) {
    for (const link of links.get(queue[i]!)!) {
      if (visitedConnectors.has(link)) continue
      visitedConnectors.add(link)
      for (const neighbor of members.get(link) ?? []) {
        if (chosen.has(neighbor)) continue
        chosen.add(neighbor)
        queue.push(neighbor)
      }
    }
  }
  return [...links.keys()].filter((id) => chosen.has(id))
}

/** Quad rings cross opposite sides; loops continue through unambiguous four-edge vertices. */
function traceEdges(
  topology: SelectionTopology,
  selection: readonly string[],
  action: 'ring' | 'loop',
) {
  const edgeFaces = new Map<string, string[]>()
  const vertexEdges = new Map<string, string[]>()
  for (const [id, edge] of topology.edges) {
    for (const vertex of edge) {
      const touching = vertexEdges.get(vertex)
      if (touching) touching.push(id)
      else vertexEdges.set(vertex, [id])
    }
  }
  for (const [faceId, edges] of topology.faces) {
    for (const edge of edges) {
      const touching = edgeFaces.get(edge)
      if (touching) touching.push(faceId)
      else edgeFaces.set(edge, [faceId])
    }
  }
  const chosen = new Set(selection)
  const queue = [...chosen]
  const include = (id: string) => {
    if (!chosen.has(id) && topology.edges.has(id)) {
      chosen.add(id)
      queue.push(id)
    }
  }
  for (let i = 0; i < queue.length; i++) {
    const id = queue[i]!
    const touching = edgeFaces.get(id) ?? []
    if (touching.length === 0 || touching.length > 2) continue
    if (action === 'ring') {
      for (const face of touching) {
        const cycle = topology.faces.get(face)!
        if (cycle.length === 4) include(cycle[(cycle.indexOf(id) + 2) % 4]!)
      }
    } else {
      if (touching.length !== 2 || touching.some((face) => topology.faces.get(face)?.length !== 4))
        continue
      for (const vertex of topology.edges.get(id) ?? []) {
        const incident = vertexEdges.get(vertex) ?? []
        if (incident.length !== 4) continue
        const candidates = incident.filter(
          (other) =>
            other !== id && !(edgeFaces.get(other) ?? []).some((face) => touching.includes(face)),
        )
        if (candidates.length !== 1) continue
        const next = candidates[0]!
        const nextFaces = edgeFaces.get(next) ?? []
        if (
          nextFaces.length === 2 &&
          nextFaces.every((face) => topology.faces.get(face)?.length === 4)
        )
          include(next)
      }
    }
  }
  return [...topology.edges.keys()].filter((id) => chosen.has(id))
}
