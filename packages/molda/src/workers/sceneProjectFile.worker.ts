import { readSceneProjectFile, SceneProjectFileError } from '../import/sceneProjectFile'
import {
  readSceneProjectFileRequest,
  readSceneProjectFileTaskId,
  sceneProjectFileReply,
} from './sceneProjectFileProtocol'

declare const self: Pick<Worker, 'onmessage' | 'postMessage'>
self.onmessage = (event: MessageEvent<unknown>) => {
  let taskId: string | null = null
  try {
    taskId = readSceneProjectFileTaskId(event.data)
    const request = readSceneProjectFileRequest(event.data, false)
    self.postMessage({ taskId, type: 'progress', progress: 'validating' })
    const document = readSceneProjectFile(request.bytes)
    self.postMessage(sceneProjectFileReply(taskId, document))
  } catch (error) {
    if (!taskId || !(error instanceof SceneProjectFileError)) throw error
    self.postMessage({ taskId, type: 'error', reason: error.reason })
  }
}
