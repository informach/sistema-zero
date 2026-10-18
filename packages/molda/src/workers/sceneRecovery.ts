import type { MoldaSceneDocument } from '../scene/document'
import * as v from '../scene/validation'
import { isScenePixelHash } from '../state/sceneBlob'
import {
  type PreparedSceneRecovery,
  readRecoveryBlock,
  readSceneRecoveryRecord,
} from '../state/sceneRecoveryCodec'
import { runWorkerTask } from './workerTask'

export function prepareSceneRecoveryInWorker(
  document: MoldaSceneDocument,
  baseRevision: number,
  session: string,
) {
  return runWorkerTask<PreparedSceneRecovery, never>({
    createWorker: () =>
      new Worker(new URL('./sceneRecovery.worker.ts', import.meta.url), { type: 'module' }),
    request: { document, baseRevision, session },
    readReply(raw) {
      const row = v.record(raw, 'reply')
      if (row.type === 'error') return { type: 'error', message: v.text(row.message, 'error', 256) }
      v.record(row, 'reply', ['type', 'result'])
      v.requireScene(row.type === 'result', 'reply', 'Resposta de recuperação inválida.')
      const result = v.record(row.result, 'result', ['record', 'blocks'])
      const record = readSceneRecoveryRecord(result.record)
      v.requireScene(
        record.id === document.id &&
          record.session === session &&
          record.baseRevision === baseRevision &&
          record.updatedAt === document.updatedAt,
        'owner',
        'Esta cópia pertence a outro ajuste.',
      )
      v.requireScene(
        result.blocks instanceof Map && result.blocks.size <= 640_512,
        'blocks',
        'Cópia de recuperação inválida.',
      )
      const blocks = new Map<string, ReturnType<typeof readRecoveryBlock>>()
      for (const [hash, block] of result.blocks) {
        v.requireScene(isScenePixelHash(hash), 'hash', 'Referência de recuperação inválida.')
        blocks.set(hash, readRecoveryBlock(block))
      }
      return { type: 'result', result: { record, blocks } }
    },
  })
}
