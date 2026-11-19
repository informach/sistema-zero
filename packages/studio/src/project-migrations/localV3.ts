import { isDocumentRecord, ProjectDocumentError } from '../core/projectDocument'
import { prepareEditableStudioProject } from '../state/editableProjectValidation'
import { readValues, type IdbWrite } from '../state/idbTransaction'
import { encodeProjectJsonGraph } from '../state/projectJsonGraph'
import {
  applicationBudget,
  journal,
  PRO_APPLICATION_LIMITS,
} from '../state/projectStorageCoordinator'
import {
  applicationBudgetKey,
  projectApplicationsKey,
  projectAssetsKey,
  projectBackupKey,
  projectBlocksKey,
  projectFilesKey,
  projectHeadKey,
  projectMetaKey,
  projectMigrationKey,
  projectStateKey,
  projectThumbKey,
} from '../state/projectStorageKeys'
import { assembleProjectRecord, projectStorageEntries } from '../state/projectStorageRecords'
import { isLocalHead, type LocalHead } from '../state/projectStorageRevision'
import type { ProjectStorageScope } from '../state/projectStorageRuntime'
import { encodeProjectStorageValue } from '../state/projectStorageTransport'
import { promoteLocalMigration } from './localTransaction'

const pending = (id: string, message: string) =>
  new ProjectDocumentError('migration-pending', message, id)
async function digest(text: string): Promise<string> {
  return Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))),
    (byte) => byte.toString(16).padStart(2, '0'),
  ).join('')
}
function headIsSafe(value: unknown): value is LocalHead {
  return (
    isDocumentRecord(value) &&
    isLocalHead(value) &&
    value.token.length > 0 &&
    value.sequence >= 0 &&
    (value.deleted === undefined || value.deleted === true)
  )
}

/** The existing CAS promotes a complete source; expensive preparation is outside it. */
export async function migrateLocalV3Project(
  id: string,
  scope: ProjectStorageScope,
): Promise<string | undefined> {
  try {
    return await migrate(id, scope)
  } catch (error) {
    if (error instanceof ProjectDocumentError) throw error
    throw pending(
      id,
      `Não foi possível migrar o projeto local; o original foi preservado. ${error instanceof Error ? error.message : ''}`,
    )
  }
}

async function migrate(id: string, scope: ProjectStorageScope): Promise<string | undefined> {
  const sourceKeys = [
    projectMetaKey(id, 3),
    projectFilesKey(id, 3),
    projectStateKey(id, 3),
    projectBlocksKey(id, 3),
    projectAssetsKey(id, 3),
    projectThumbKey(id, 3),
    projectHeadKey(id, 3),
    projectApplicationsKey(id, 3),
    applicationBudgetKey(3),
    projectMigrationKey(id, 3),
  ]
  const currentKeys = [
    projectMetaKey(id, 4),
    projectHeadKey(id, 4),
    projectMigrationKey(id, 4),
    applicationBudgetKey(4),
    projectApplicationsKey(id, 4),
  ]
  const keys = [...sourceKeys, ...currentKeys]
  for (let attempt = 0; attempt < 3; attempt++) {
    const values = await readValues(scope.store, keys)
    const [
      meta,
      files,
      state,
      blocks,
      assets,
      thumb,
      sourceHead,
      sourceApplications,
      sourceBudget,
    ] = values
    const [currentMeta, currentHead, currentMarker, currentBudget, currentApplications] =
      values.slice(sourceKeys.length)
    if (
      currentMeta !== undefined &&
      (!isDocumentRecord(currentMeta) || currentMeta.id !== id || currentMeta.storageVersion !== 4)
    )
      throw pending(id, 'O documento atual usa uma identidade ou versão incompatível.')
    if (currentHead !== undefined && !headIsSafe(currentHead))
      throw pending(id, 'A cabeça atual usa uma versão incompatível.')
    if (currentMarker !== undefined && !isDocumentRecord(currentMarker))
      throw pending(id, 'A origem da migração precisa ser conferida.')
    const hasParts = [meta, files, state, blocks, assets].some((value) => value !== undefined)
    if (!hasParts && sourceHead === undefined) {
      // The profile-wide budget alone is not evidence of this project. Its own
      // history, thumbnail or migration marker is, and must never be skipped.
      if (thumb !== undefined || sourceApplications !== undefined || values[9] !== undefined)
        throw pending(
          id,
          'Há registros da versão anterior sem documento ou revisão. A fonte foi preservada para recuperação.',
        )
      return
    }
    if (!headIsSafe(sourceHead))
      throw pending(id, 'A cabeça da versão anterior está ausente ou incompatível.')
    if (!hasParts && !sourceHead.deleted) {
      if (currentMeta !== undefined || currentHead !== undefined) return
      throw pending(
        id,
        'A revisão da versão anterior não tem suas partições. O carregamento de cópias mais antigas foi bloqueado.',
      )
    }
    if (!hasParts && (currentMeta !== undefined || currentHead !== undefined)) return
    if (hasParts && sourceHead.deleted)
      throw pending(
        id,
        'Há conteúdo junto de uma cabeça excluída; as duas fontes foram preservadas.',
      )
    if (hasParts && (!isDocumentRecord(meta) || meta.storageVersion !== 3))
      throw pending(id, 'As partes da versão anterior estão incompletas ou incompatíveis.')
    if (
      hasParts &&
      [meta, files, state, blocks, assets, thumb].some(
        (part, index) =>
          (index < 3 || part !== undefined) && (!isDocumentRecord(part) || part.id !== id),
      )
    )
      throw pending(
        id,
        'Uma partição da versão anterior pertence a outra identidade ou está ausente.',
      )
    const snapshot = Object.fromEntries(sourceKeys.map((key, index) => [key, values[index]]))
    const encodedSource = encodeProjectJsonGraph(snapshot)
    const sourceHash = await digest(encodedSource)
    const backupKey = projectBackupKey(id, sourceHash, 4)
    const [existingBackup] = await readValues(scope.store, [backupKey])
    if (
      existingBackup !== undefined &&
      (!isDocumentRecord(existingBackup) ||
        existingBackup.version !== 1 ||
        encodeProjectJsonGraph(existingBackup.records) !== encodedSource)
    )
      throw pending(id, 'O backup da versão anterior precisa ser conferido.')
    const puts: Array<[IDBValidKey, unknown]> =
      existingBackup === undefined
        ? [
            [
              backupKey,
              {
                version: 1,
                sourceVersion: 3,
                sourceId: id,
                sourceHash,
                capturedAt: Date.now(),
                records: snapshot,
              },
            ],
          ]
        : []
    const expected: Array<[IDBValidKey, unknown]> = keys.map((key, index) => [key, values[index]])
    expected.push([backupKey, existingBackup])
    if (!hasParts) {
      puts.push(
        [projectHeadKey(id, 4), sourceHead],
        [
          projectMigrationKey(id, 4),
          {
            ...(isDocumentRecord(currentMarker) ? currentMarker : {}),
            legacyV3: { sourceHash, backupKey, deleted: true },
          },
        ],
      )
      const prepared: IdbWrite = {
        puts: puts.map(([key, value]) => [key, encodeProjectStorageValue(key, value)]),
      }
      if (await promoteLocalMigration(scope.store, expected, prepared, scope.identity)) return
      continue
    }
    const fields = new Map<string, unknown>()
    for (const part of [meta, files, state, blocks, assets]) {
      if (!isDocumentRecord(part)) continue
      for (const [key, value] of Object.entries(part)) {
        if (
          fields.has(key) &&
          !Object.is(fields.get(key), value) &&
          encodeProjectJsonGraph(fields.get(key)) !== encodeProjectJsonGraph(value)
        )
          throw pending(
            id,
            `Há valores diferentes para ${key} nas partes do projeto; as fontes foram preservadas.`,
          )
        fields.set(key, value)
      }
    }
    const raw = assembleProjectRecord(id, meta, files, state, assets, blocks)
    if (!raw || raw.id !== id) throw pending(id, 'As partes da versão anterior estão incompletas.')
    const project = await prepareEditableStudioProject(raw)
    if (!project) throw pending(id, 'Não foi possível abrir integralmente a versão anterior.')
    const applications = journal(sourceApplications)
    if (
      applications.length > PRO_APPLICATION_LIMITS.operations ||
      applications.some(
        (record) =>
          record.projectId !== id || !Number.isSafeInteger(record.bytes) || record.bytes < 0,
      ) ||
      new Set(applications.map((record) => record.operationId)).size !== applications.length
    )
      throw pending(id, 'O histórico da versão anterior está incompleto ou acima do orçamento.')
    const bytes = applications.reduce((sum, record) => sum + record.bytes, 0)
    const legacyTotals = applicationBudget(sourceBudget)
    const declaredBytes = Object.hasOwn(legacyTotals, id) ? legacyTotals[id] : undefined
    if (
      bytes > PRO_APPLICATION_LIMITS.projectBytes ||
      (applications.length > 0 && declaredBytes === undefined) ||
      (declaredBytes !== undefined && declaredBytes !== bytes)
    )
      throw pending(id, 'O orçamento e o histórico da versão anterior não correspondem.')
    if (currentApplications !== undefined && currentMeta === undefined)
      throw pending(id, 'Há um histórico atual sem documento; nenhuma revisão foi sobrescrita.')
    const recovery =
      currentMeta !== undefined || currentHead !== undefined || currentMarker !== undefined
    const identityHash = await digest(
      encodeProjectJsonGraph({ document: raw, head: sourceHead, applications, thumb }),
    )
    const targetId = recovery ? `recuperado-${id.slice(0, 28)}-${identityHash.slice(0, 24)}` : id
    const targetKeys = [
      projectMetaKey(targetId, 4),
      projectHeadKey(targetId, 4),
      projectApplicationsKey(targetId, 4),
    ]
    const target = recovery
      ? await readValues(scope.store, targetKeys)
      : [currentMeta, currentHead, currentApplications]
    if (
      target[0] !== undefined &&
      (!isDocumentRecord(target[0]) || target[0].id !== targetId || target[0].storageVersion !== 4)
    )
      throw pending(id, 'O documento de destino usa uma identidade ou versão incompatível.')
    if (target[1] !== undefined && !headIsSafe(target[1]))
      throw pending(id, 'A cópia de destino usa uma versão incompatível.')
    if (target[2] !== undefined && target[0] === undefined)
      throw pending(id, 'O histórico do destino precisa ser conferido.')
    const targetExists = target[0] !== undefined || target[1] !== undefined
    if (recovery)
      expected.push(...targetKeys.map((key, index): [IDBValidKey, unknown] => [key, target[index]]))
    puts.push([
      projectMigrationKey(id, 4),
      {
        ...(isDocumentRecord(currentMarker) ? currentMarker : {}),
        legacyV3: { sourceHash, backupKey, lastTargetId: targetId, historyArchived: recovery },
      },
    ])
    if (!targetExists) {
      const converted = recovery
        ? {
            ...project,
            id: targetId,
            name: `${project.name.slice(0, 175)} (edição recuperada)`,
            updatedAt: Date.now(),
          }
        : project
      puts.push(...projectStorageEntries(converted, 4), [
        projectHeadKey(targetId, 4),
        recovery
          ? {
              version: 1,
              token: crypto.randomUUID(),
              writer: '',
              base: null,
              sequence: 0,
            }
          : sourceHead,
      ])
      if (thumb !== undefined) {
        if (!isDocumentRecord(thumb))
          throw pending(id, 'A miniatura da versão anterior está incompleta.')
        puts.push([projectThumbKey(targetId, 4), { ...thumb, id: targetId }])
      }
      if (recovery)
        puts.push([
          projectMigrationKey(targetId, 4),
          { legacyV3Source: { sourceId: id, backupKey, historyArchived: true } },
        ])
      else if (sourceApplications !== undefined)
        puts.push([projectApplicationsKey(targetId, 4), applications])
    }
    const totals = {
      ...legacyTotals,
      ...applicationBudget(currentBudget),
      ...(!recovery && applications.length ? { [id]: bytes } : {}),
    }
    if (
      Object.values(totals).reduce((sum, size) => sum + size, 0) >
      PRO_APPLICATION_LIMITS.profileBytes
    )
      throw pending(
        id,
        'O histórico combinado deste perfil está cheio; as duas versões foram preservadas.',
      )
    puts.push([applicationBudgetKey(4), totals])
    const prepared: IdbWrite = {
      puts: puts.map(([key, value]) => [key, encodeProjectStorageValue(key, value)]),
      // Keep head/history/ledger: an already open v3 tab can preserve its next edit.
      deletes: sourceKeys.slice(0, 6),
    }
    if (await promoteLocalMigration(scope.store, expected, prepared, scope.identity))
      return targetExists ? undefined : targetId
  }
  throw pending(
    id,
    'Outra aba está alterando a fonte; as versões foram preservadas. Feche-a e abra o projeto novamente.',
  )
}
