import { splitSceneSolid } from '../scene/solidCut'
import { SceneValidationError } from '../scene/validation'
import { packSceneMesh, sceneMeshPacketTransfers } from './sceneMeshPacket'
import { readSolidCutRequest, type SolidCutRequest } from './sceneSolidCutProtocol'
import { announceWorkerLoaded } from './workerHandshake'

declare const self: Pick<Worker, 'onmessage' | 'postMessage'>
self.onmessage = (event: MessageEvent<unknown>) => {
  let request: SolidCutRequest | null = null
  try {
    request = readSolidCutRequest(event.data)
    const pieces = splitSceneSolid(request.mesh, request.plane, request.capId).map(packSceneMesh)
    self.postMessage(
      { type: 'result', documentId: request.documentId, revision: request.revision, pieces },
      pieces.flatMap(sceneMeshPacketTransfers),
    )
  } catch (error) {
    if (!request) throw error
    self.postMessage({
      type: 'error',
      documentId: request.documentId,
      revision: request.revision,
      message:
        error instanceof SceneValidationError
          ? error.message
          : 'Não foi possível fechar as duas peças. O modelo foi preservado.',
    })
  }
}
announceWorkerLoaded()
