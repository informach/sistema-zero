import { readSceneDocument } from '../scene/readDocument'
import { id, number, record } from '../scene/validation'
import { prepareSceneRecovery } from '../state/sceneRecoveryCodec'
import { announceWorkerLoaded } from './workerHandshake'

declare const self: Pick<Worker, 'onmessage' | 'postMessage'>
self.onmessage = async (event: MessageEvent<unknown>) => {
  try {
    const request = record(event.data, 'recovery', ['document', 'baseRevision', 'session'])
    const source = readSceneDocument(request.document)
    if (source.status !== 'valid') throw new Error('Não consegui preparar a cópia de segurança.')
    const result = await prepareSceneRecovery(
      source.document,
      number(request.baseRevision, 'revision', 1, Number.MAX_SAFE_INTEGER, true),
      id(request.session, 'session'),
    )
    self.postMessage({ type: 'result', result })
  } catch {
    self.postMessage({
      type: 'error',
      message: 'Não consegui proteger as últimas mudanças. Guarde uma cópia do projeto.',
    })
  }
}
announceWorkerLoaded()
