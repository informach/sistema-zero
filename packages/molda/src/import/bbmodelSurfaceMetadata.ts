import {
  BBMODEL_INPUT_LIMITS,
  BbmodelInputError,
  bbmodelIdentifier,
  bbmodelRecord,
} from './bbmodelInput'
import type { BbmodelNodeMetadata } from './bbmodelNodeMetadata'
import { bbmodelBoolean, bbmodelKeyPath, bbmodelKeys, bbmodelNumber } from './bbmodelValues'

interface KnownSurface {
  node: number
  sourcePath: string
  name: string | null
  /** Source marker index, NOT RGB. Missing cube color may depend on source session/random creation. */
  markerColor: number | null
}
export type BbmodelSurfaceMetadata =
  | (KnownSurface & { kind: 'group' })
  | (KnownSurface & { kind: 'cube'; shade: boolean })
  | (KnownSurface & {
      kind: 'mesh'
      shading: string
      renderOrder: string
      /** Literal saved edge keys; do not split ambiguous underscore-joined vertex IDs. */
      seams: ReadonlyMap<string, string>
    })
  | { kind: 'unresolved'; node: number; sourcePath: string }

/**
 * ALL-node source stage after readBbmodelNodeMetadata, before native selection/adaptation.
 * Finite marker values and unknown nonempty enum labels stay explicit for later policy decisions.
 * No XYZ/UV, seam-edge reconstruction, color lookup, shader approval or native material creation.
 */
export function readBbmodelSurfaceMetadata(
  metadata: readonly BbmodelNodeMetadata[],
): BbmodelSurfaceMetadata[] {
  if (metadata.length > BBMODEL_INPUT_LIMITS.nodes)
    throw new BbmodelInputError('budget', 'nodes', 'Há peças demais para ler sua aparência.')
  let seamCount = 0
  // Bound every known mesh's seam declarations before numeric fields or result-map allocation.
  const planned = metadata.map((info) => {
    if (info.kind !== 'mesh') return { info, seamSource: null, seamKeys: [] }
    const path = `${info.sourcePath}.seams`,
      seamSource = info.source.seams === undefined ? {} : bbmodelRecord(info.source.seams, path),
      seamKeys = bbmodelKeys(seamSource, BBMODEL_INPUT_LIMITS.geometrySeams - seamCount, path)
    seamCount += seamKeys.length
    return { info, seamSource, seamKeys }
  })
  return planned.map(({ info, seamSource, seamKeys }): BbmodelSurfaceMetadata => {
    if (info.kind === 'unresolved')
      return { kind: 'unresolved', node: info.node, sourcePath: info.sourcePath }
    const { source, sourcePath: path } = info,
      common = {
        node: info.node,
        sourcePath: path,
        name: info.name,
        markerColor:
          source.color === undefined ? null : bbmodelNumber(source.color, `${path}.color`),
      }
    if (info.kind === 'group') return { ...common, kind: 'group' }
    if (info.kind === 'cube')
      return { ...common, kind: 'cube', shade: bbmodelBoolean(source.shade, `${path}.shade`, true) }
    return {
      ...common,
      kind: 'mesh',
      shading:
        source.shading === undefined
          ? 'flat'
          : bbmodelIdentifier(source.shading, `${path}.shading`),
      renderOrder:
        source.render_order === undefined
          ? 'default'
          : bbmodelIdentifier(source.render_order, `${path}.render_order`),
      seams: new Map(
        seamKeys.map((key) => [
          key,
          bbmodelIdentifier(seamSource![key], bbmodelKeyPath(`${path}.seams`, key)),
        ]),
      ),
    }
  })
}
