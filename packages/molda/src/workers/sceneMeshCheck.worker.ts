import { diagnoseSceneMesh, repairSceneMesh } from '../scene/meshDiagnosis'
import { readSceneGeometry } from '../scene/readGeometry'
import { SceneValidationError } from '../scene/validation'
import { type MeshCheckRequest, readMeshCheckRequest } from './sceneMeshCheckProtocol'
import { packSceneMesh, sceneMeshPacketTransfers } from './sceneMeshPacket'
import { announceWorkerLoaded } from './workerHandshake'

declare const self: Pick<Worker, 'onmessage' | 'postMessage'>
self.onmessage = (event: MessageEvent<unknown>) => {
  let source: MeshCheckRequest | null = null
  try {
    source = readMeshCheckRequest(event.data)
    const token = { documentId: source.documentId, revision: source.revision }
    if (source.action === 'inspect') {
      self.postMessage({
        ...token,
        type: 'result',
        result: { kind: 'report', issues: diagnoseSceneMesh(source.mesh) },
      })
      return
    }
    const repaired = readSceneGeometry(repairSceneMesh(source.mesh, source.fix))
    if (repaired.kind !== 'mesh') throw new Error('Missing mesh')
    const packet = packSceneMesh(repaired)
    self.postMessage(
      { ...token, type: 'result', result: { kind: 'repair', packet } },
      sceneMeshPacketTransfers(packet),
    )
  } catch (error) {
    if (!source) throw error
    self.postMessage({
      documentId: source.documentId,
      revision: source.revision,
      type: 'error',
      message:
        error instanceof SceneValidationError ? error.message : 'Não consegui conferir essa malha.',
    })
  }
}
announceWorkerLoaded()
