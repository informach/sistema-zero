import { skyImageToHdr } from '../export/skyHdr'
import { renderSky } from '../sky/render'
import type { SkyExportReply, SkyExportRequest } from './skyExportProtocol'
import { announceWorkerLoaded } from './workerHandshake'

// Only APIs common to DedicatedWorkerGlobalScope and the independent Bun worker.
declare const self: Pick<Worker, 'onmessage' | 'postMessage'>

self.onmessage = (event: MessageEvent<SkyExportRequest>): void => {
  const { documentId, revision, params, size } = event.data
  const token = { documentId, revision }
  const send = (reply: SkyExportReply): void => self.postMessage(reply)
  try {
    send({ ...token, type: 'progress', progress: 'rendering' })
    const image = renderSky(params, size.width, size.height)
    send({ ...token, type: 'progress', progress: 'encoding' })
    const result = skyImageToHdr(image)
    const reply: SkyExportReply = { ...token, type: 'result', result }
    // Only a newly encoded, worker-owned output is transferred.
    if (result.ok && result.bytes.buffer instanceof ArrayBuffer)
      self.postMessage(reply, [result.bytes.buffer])
    else send(reply)
  } catch (error) {
    send({
      ...token,
      type: 'error',
      message: error instanceof Error ? error.message : 'Sky export failed',
    })
  }
}
announceWorkerLoaded()
