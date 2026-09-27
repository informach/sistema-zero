import { prepareMeshExtrusion } from '../scene/meshExtrude'
import { insetMeshFaces } from '../scene/meshInset'
import { subdivideMeshFaces } from '../scene/meshSubdivide'
import { prepareMeshThickness } from '../scene/meshThickness'
import { readSceneGeometry } from '../scene/readGeometry'
import { SceneValidationError } from '../scene/validation'
import { packSceneMesh, sceneMeshPacketTransfers } from './sceneMeshPacket'
import {
  readSceneSurfaceApply,
  readSceneSurfaceInit,
  type SceneSurfaceInit,
  type SceneSurfaceMessage,
} from './sceneSurfaceProtocol'
import { announceWorkerLoaded } from './workerHandshake'

declare const self: Pick<Worker, 'onmessage' | 'postMessage'>
let source: SceneSurfaceInit | null = null
let surface: ReturnType<typeof prepareMeshExtrusion> | null = null
self.onmessage = (event: MessageEvent<unknown>) => {
  let requestId = 0
  try {
    if (!source) {
      source = readSceneSurfaceInit(event.data)
      if (source.tool === 'extrude') surface = prepareMeshExtrusion(source.mesh, source.faceIds)
      if (source.tool === 'thickness') surface = prepareMeshThickness(source.mesh, source.faceIds)
      self.postMessage({
        type: 'ready',
        documentId: source.documentId,
        revision: source.revision,
      } satisfies SceneSurfaceMessage)
      return
    }
    const request = readSceneSurfaceApply(event.data)
    requestId = request.requestId
    let next = 0
    const allocate = () => `surface:${source!.idSeed}:${++next}`
    const result =
      source.tool === 'subdivide'
        ? subdivideMeshFaces(source.mesh, source.faceIds, request.amount, allocate)
        : surface
          ? surface.apply(request.amount, allocate)
          : insetMeshFaces(source.mesh, source.faceIds, request.amount, allocate)
    // Validate the resource budget before cloning a potentially oversized response to the UI.
    const mesh = readSceneGeometry(result)
    if (mesh.kind !== 'mesh') throw new Error('Missing mesh')
    const packet = packSceneMesh(mesh)
    self.postMessage(
      {
        type: 'result',
        documentId: source.documentId,
        revision: source.revision,
        requestId,
        packet,
      } satisfies SceneSurfaceMessage,
      sceneMeshPacketTransfers(packet),
    )
  } catch (error) {
    if (!source) throw error
    self.postMessage({
      type: 'error',
      documentId: source.documentId,
      revision: source.revision,
      requestId,
      message:
        error instanceof SceneValidationError
          ? error.message
          : 'Não consegui calcular esse ajuste.',
    } satisfies SceneSurfaceMessage)
  }
}
announceWorkerLoaded()
