import { sha256Hex } from '@sistemazero/core/creations'
import type { EditableStudioProject } from '../core/editableProject'
import { hasRegionalPintaReference } from '../core/pintaRegionalReference'
import {
  promoteLocalRegionalProject,
  readLegacyRegionalSource,
} from '../project-migrations/localRegionalAuthority'
import { prepareEditableStudioProject } from './editableProjectValidation'
import type { IdbWrite } from './idbTransaction'
import { projectRecoveryKey } from './projectStorageKeys'
import {
  installLocalRevision,
  isLocalHead,
  localHead,
  ProjectWriteConflict,
  readLocalRevision,
} from './projectStorageRevision'
import type { ProjectStorageScope } from './projectStorageRuntime'
import { retainedApplications } from './retainedProjectApplications'
import { detachedHead } from './retainedProjectEditor'
import { legacyProjectKeys } from './retainedProjectKeys'
import { prepareRetainedParts, RETAINED_PARTS, type RetainedPart } from './retainedProjectParts'
import { commitRetainedProject } from './retainedProjectStore'
import { hasSynchronousExitJournal } from './synchronousExitJournalProbe'

/** First regional write uses the retained authority directly. A predecessor is
 * adopted on its exact head, without ever putting PNG5 into its mutable V4 parts.
 */
export async function initializeRetainedProject(
  scope: ProjectStorageScope,
  project: EditableStudioProject,
  write: IdbWrite,
) {
  if (!project.assets?.some(hasRegionalPintaReference)) return undefined
  const id = project.id
  const prepared = await prepareEditableStudioProject(project)
  if (!prepared || prepared.id !== id) throw new ProjectWriteConflict()
  const source = await readLegacyRegionalSource(scope, id)
  if (Object.values(source.values).some((value) => value !== undefined)) {
    if (!isLocalHead(source.values.head) || source.values.head.deleted)
      throw new ProjectWriteConflict()
    const stamp = readLocalRevision(project)
    if (
      !stamp ||
      stamp.lineage.scope !== scope.identity ||
      stamp.lineage.durableToken !== source.values.head.token
    )
      throw new ProjectWriteConflict()
    return promoteLocalRegionalProject({
      scope,
      id,
      expectedV4Token: source.values.head.token,
      assets: project.assets,
    })
  }
  const values: Partial<Record<RetainedPart, unknown>> = {}
  const keys = legacyProjectKeys(id)
  for (const name of RETAINED_PARTS) {
    const part = write.puts?.find(([key]) => key === keys[name])
    if (part && name !== 'head') values[name] = part[1]
  }
  const stamp = readLocalRevision(project)
  if (stamp && (stamp.lineage.scope !== scope.identity || stamp.lineage.durableToken !== null))
    throw new ProjectWriteConflict()
  const head = stamp ? localHead(stamp) : detachedHead('')
  const additions = stamp
    ? [...stamp.lineage.pending.values()]
        .filter((entry) => entry.sequence <= stamp.sequence)
        .map((entry) => entry.record)
    : []
  const applications = additions.length
    ? retainedApplications(id, undefined, source.oldBudget, additions)
    : undefined
  if (applications) values.applications = applications.records
  values.head = { physicalVersion: 5, head }
  const candidate = await prepareRetainedParts(values)
  const { head: _head, ...authored } = candidate.parts
  const prefix = projectRecoveryKey(id, '')
  const manifest = await commitRetainedProject(scope, {
    id,
    expectedToken: null,
    origin: await sha256Hex(JSON.stringify(authored)),
    candidate,
    source: source.guards,
    applicationBudget: applications?.budget,
    absent: [IDBKeyRange.bound(prefix, `${prefix}\uffff`)],
    ready: () => !hasSynchronousExitJournal(scope.exitJournalStorage, scope.identity, id),
  })
  if (stamp) {
    stamp.lineage.durableToken = head.token
    for (const record of additions) {
      stamp.lineage.pending.delete(record.operationId)
      stamp.lineage.saved.add(record.operationId)
    }
  } else installLocalRevision(project, scope.identity, head)
  return manifest
}
