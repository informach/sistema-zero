import { meshUvSelectedSeams } from '../scene/meshUv'
import { autoMeshUv } from '../scene/meshUvAuto'
import { unfoldMeshUv } from '../scene/meshUvUnfold'
import { SceneValidationError } from '../scene/validation'
import { readSceneUvRequest, type SceneUvRequest, sceneUvReply } from './sceneUvProtocol'
import { announceWorkerLoaded } from './workerHandshake'

declare const self: Pick<Worker, 'onmessage' | 'postMessage'>
self.onmessage = (event: MessageEvent<unknown>) => {
  let source: SceneUvRequest | null = null
  try {
    source = readSceneUvRequest(event.data)
    const cuts = source.unfold?.preserveCuts
      ? [...new Set([...source.unfold.cuts, ...meshUvSelectedSeams(source.mesh, source.faceIds)])]
      : source.unfold?.cuts
    const result = source.unfold
      ? unfoldMeshUv(source.mesh, source.faceIds, source.padding, cuts)
      : autoMeshUv(source.mesh, source.faceIds, source.padding)
    const reply = sceneUvReply(source, result)
    self.postMessage(reply, [reply.uv.buffer as ArrayBuffer])
  } catch (error) {
    if (!source) throw error
    self.postMessage({
      type: 'error',
      sourceKey: source.sourceKey,
      geometryId: source.mesh.id,
      message:
        error instanceof SceneValidationError
          ? error.message
          : 'Não consegui organizar essas faces.',
    })
  }
}
announceWorkerLoaded()
