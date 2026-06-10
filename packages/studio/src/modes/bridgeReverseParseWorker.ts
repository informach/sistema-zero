import {
  type BridgeReverseParseWorkerRequest,
  type BridgeReverseParseWorkerResponse,
  runBridgeReverseParse,
} from './bridgeReverseParse'

self.onmessage = (event: MessageEvent<BridgeReverseParseWorkerRequest>) => {
  const { requestId, ...input } = event.data
  try {
    const response: BridgeReverseParseWorkerResponse = {
      requestId,
      result: runBridgeReverseParse(input),
    }
    self.postMessage(response)
  } catch (err) {
    const response: BridgeReverseParseWorkerResponse = {
      requestId,
      error: err instanceof Error ? err.message : String(err),
    }
    self.postMessage(response)
  }
}
