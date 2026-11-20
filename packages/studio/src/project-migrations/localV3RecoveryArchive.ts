import { sha256Hex } from '@sistemazero/core/creations'
import { isDocumentRecord, ProjectDocumentError } from '../core/projectDocument'
import { decodeProjectJsonGraph } from '../state/projectJsonGraphDecode'
import { nativeRecovery } from '../state/projectRecoveryGuards'
import type { RecoveryWrite } from '../state/projectStorageCoordinator'
import {
  projectAssetsKey,
  projectBackupKey,
  projectBlocksKey,
  projectFilesKey,
  projectMetaKey,
  projectRecoveryKey,
  projectStateKey,
  projectThumbKey,
} from '../state/projectStorageKeys'
import { localSnapshotsEqual } from './localTransaction'

/**
 * O arquivo imutável que a migração grava de cada cópia de saída v3 antes de reaplicá-la em v4
 * (`archiveLocalV3Recovery`): o original v3 inteiro, codificado pelo grafo do Core.
 *
 * ⚠️ Ele NÃO é o arquivo de origem de recuperação (`recoverySourceArchiveKey`, formato
 * `kind: 'recovery-source'`), que guarda a cópia v4 que uma revisão posterior superou. Até
 * 20/11/2026 os dois usavam a mesma chave (P1 da revisão daquele dia): a revisão que superava a
 * cópia migrada era recusada como "outra revisão", e a cópia mais velha do mesmo escritor deixava
 * de ser reconhecida como contida na revisão gravada (virava "(edição recuperada)" duplicada).
 * Agora cada um tem a sua chave; os navegadores que gravaram antes guardam este arquivo na chave
 * da origem, e os leitores de lá o reconhecem por `isV3RecoveryArchiveOf`.
 */
export interface V3RecoveryArchive {
  version: 1
  sourceVersion: 3
  projectId: string
  writer: string
  token: string
  sha256: string
  encoded: string
}

/** A chave deste arquivo; nunca coincide com a do arquivo de origem (`recovery-<hash>`). */
export async function v3RecoveryArchiveKey(
  projectId: string,
  writer: string,
  token: string,
): Promise<string> {
  const digest = await sha256Hex(JSON.stringify([projectId, writer, token]))
  return projectBackupKey(projectId, `v3-recovery-${digest}`, 4)
}

export function isV3RecoveryArchive(value: unknown): value is V3RecoveryArchive {
  return (
    isDocumentRecord(value) &&
    value.version === 1 &&
    value.sourceVersion === 3 &&
    value.kind === undefined &&
    typeof value.projectId === 'string' &&
    typeof value.writer === 'string' &&
    typeof value.token === 'string' &&
    typeof value.encoded === 'string'
  )
}

/** O arquivo da cópia v3 daquela revisão exata (projeto, escritor e token). */
export function isV3RecoveryArchiveOf(
  value: unknown,
  revision: { projectId: string; writer: string; token: string },
): value is V3RecoveryArchive {
  return (
    isV3RecoveryArchive(value) &&
    value.projectId === revision.projectId &&
    value.writer === revision.writer &&
    value.token === revision.token
  )
}

/** Uma cópia de saída gravada pela v3 (as partições dela usam as chaves v3). */
export function isV3ExitCopy(value: unknown): boolean {
  if (!isDocumentRecord(value) || !isDocumentRecord(value.write)) return false
  const puts = value.write.puts
  return (
    Array.isArray(puts) &&
    puts.some(
      (pair) =>
        Array.isArray(pair) && typeof pair[0] === 'string' && pair[0].startsWith('sz:v3:project-'),
    )
  )
}

/** O original v3 guardado no arquivo, conferido pelo contrato da recuperação v3. */
export function v3RecoveryOf(archive: V3RecoveryArchive): RecoveryWrite {
  const original = nativeRecovery(
    decodeProjectJsonGraph(archive.encoded),
    projectRecoveryKey(archive.projectId, archive.writer, 3),
    3,
  )
  if (original.head.token !== archive.token)
    throw new ProjectDocumentError(
      'migration-pending',
      'O arquivo da cópia antiga não corresponde à sua revisão. Ele foi preservado.',
      archive.projectId,
    )
  return original
}

/**
 * A mesma revisão nas chaves v4: troca só as chaves das partições (e as das origens que ela
 * supera) e marca o meta como v4. Identidade, cabeça e ancestralidade ficam iguais.
 */
export function projectV3RecoveryToV4(original: RecoveryWrite): RecoveryWrite {
  const id = original.projectId
  const pending = (message: string) => new ProjectDocumentError('migration-pending', message, id)
  const keyFunctions = [
    projectMetaKey,
    projectFilesKey,
    projectStateKey,
    projectBlocksKey,
    projectAssetsKey,
    projectThumbKey,
  ]
  const mapping = new Map(keyFunctions.map((key) => [key(id, 3), key(id, 4)]))
  return {
    ...original,
    head: { ...original.head },
    write: {
      puts: original.write.puts!.map(([key, value]) => {
        if (key !== projectThumbKey(id, 3) && (!isDocumentRecord(value) || value.id !== id))
          throw pending(
            'Uma partição do rascunho pertence a outro projeto. O original foi preservado.',
          )
        if (key === projectMetaKey(id, 3)) {
          if (!isDocumentRecord(value) || value.storageVersion !== 3)
            throw pending('O layout do rascunho antigo é incompatível. O original foi preservado.')
          value = { ...value, storageVersion: 4 }
        }
        return [mapping.get(String(key))!, value]
      }),
      ...(original.write.deletes
        ? { deletes: original.write.deletes.map((key) => mapping.get(String(key))!) }
        : {}),
    },
    ...(original.replacesRecovery
      ? {
          replacesRecovery: original.replacesRecovery.map((source) => ({
            ...source,
            key: projectRecoveryKey(id, source.key.slice(projectRecoveryKey(id, '', 3).length), 4),
          })),
        }
      : {}),
  }
}

/**
 * O arquivo v3 guarda exatamente esta cópia v4? (Ela é a projeção do original arquivado.)
 * Arquivo ilegível ou de outro conteúdo responde `false`: quem pergunta preserva os dois.
 */
export function v3RecoveryArchiveHolds(archive: unknown, projected: unknown): boolean {
  if (!isV3RecoveryArchive(archive)) return false
  try {
    return localSnapshotsEqual(projectV3RecoveryToV4(v3RecoveryOf(archive)), projected)
  } catch {
    // Um arquivo que não decodifica ou não projeta não guarda esta cópia; nada é apagado.
    return false
  }
}
