import type {
  PintaCausalEntry,
  PintaCausalOperation,
} from '@sistemazero/core/creations/pinta-causal'
import type { PintaCausalLocalPort, PintaEditorWriteContext } from '@sistemazero/pinta'
import {
  assetFromJson,
  isTilesetKind,
  MAX_BACKUP_FILE_BYTES,
  observePintaReferences,
  type PintaAsset,
  pintaLocalRevisionOf,
  pintaValuesEqual,
} from '@sistemazero/pinta/assets'
import { pintaCausalChangedSurvivingSlots } from '@sistemazero/pinta/assets/causal'
import type { PintaCausalCloud, PintaCloudSnapshot } from './pinta-causal-cloud'
import { readPintaCausalJson } from './pinta-causal-pull'

type Draft = Parameters<PintaCausalLocalPort['stage']>[0]
type Transition = Draft['transitions'][number]
type Unit = Awaited<ReturnType<PintaCausalLocalPort['stage']>>
type QueueState = Awaited<ReturnType<PintaCausalLocalPort['inspect']>>
type Read = Draft['readSet'][number]

export interface PintaCausalRemapBase {
  snapshot: PintaCloudSnapshot
  source: PintaAsset
  entries: ReadonlyMap<string, PintaCausalEntry>
  verifiedConsumers: ReadonlySet<string>
  assets: readonly PintaAsset[]
}

export async function preparePintaCausalRemap(options: {
  source: PintaAsset
  snapshot: PintaCloudSnapshot
  local: readonly PintaAsset[]
  localState: QueueState
  cloud: PintaCausalCloud
  signal: AbortSignal
}): Promise<PintaCausalRemapBase> {
  const { source, snapshot, localState, cloud, signal } = options
  const entries = new Map(snapshot.entries.map((entry) => [entry.itemId, entry]))
  const catalog = new Map(options.local.map((asset) => [asset.id, asset]))
  const verifiedConsumers = new Set<string>()
  let sourceBase = catalog.get(source.id) ?? source
  const budget = { remaining: MAX_BACKUP_FILE_BYTES }
  for (const entry of snapshot.entries) {
    if (entry.itemId !== source.id && entry.kind !== 'tilemap' && entry.kind !== 'map-set') continue
    signal.throwIfAborted()
    const known = localState.confirmed.get(entry.itemId)
    const local = catalog.get(entry.itemId)
    if (
      local &&
      entry.coverage === 'certified' &&
      entry.sha256 !== null &&
      known?.revision === entry.revision &&
      known.sha256 === entry.sha256 &&
      known.localRevision === pintaLocalRevisionOf(local)
    ) {
      if (entry.itemId === source.id) {
        if (pintaLocalRevisionOf(local) !== pintaLocalRevisionOf(source))
          throw Error('A folha aberta mudou desde a sua última leitura.')
        sourceBase = local
      } else verifiedConsumers.add(entry.itemId)
      continue
    }
    const archived = await cloud.download(entry, snapshot.epoch, signal)
    const { asset, warnings } = assetFromJson(await readPintaCausalJson(archived, signal, budget))
    if (
      entry.coverage !== 'certified' ||
      entry.sha256 === null ||
      !asset ||
      warnings.length ||
      asset.id !== entry.itemId ||
      asset.kind !== entry.kind ||
      asset.name !== entry.name
    )
      throw Error('Não consegui conferir um dos mapas que pode usar estas peças.')
    if (local && !pintaValuesEqual(local, asset))
      throw Error('Uma versão local ainda precisa ser guardada antes de mudar as peças.')
    if (entry.itemId === source.id) {
      if (!local || pintaLocalRevisionOf(local) !== pintaLocalRevisionOf(source))
        throw Error('A folha aberta mudou desde a sua última leitura.')
      sourceBase = local
    } else verifiedConsumers.add(entry.itemId)
    catalog.set(asset.id, local ?? asset)
  }
  await cloud.verifyEpoch(snapshot.epoch, signal)
  return { snapshot, source: sourceBase, entries, verifiedConsumers, assets: [...catalog.values()] }
}

function slotMask(indices: readonly number[]): string {
  const bits = new Uint8Array(32)
  for (const index of indices) {
    if (index < 0 || index >= 256 || !Number.isInteger(index))
      throw Error('Posição de peça inválida.')
    bits[index >> 3] = (bits[index >> 3] ?? 0) | (1 << (index & 7))
  }
  return [...bits].map((bit) => bit.toString(16).padStart(2, '0')).join('')
}

function maskedSlots(mask: string | undefined): number[] {
  if (!mask) return []
  return Array.from({ length: 256 }, (_, index) => index).filter((index) => {
    const start = (index >> 3) * 2
    return (Number.parseInt(mask.slice(start, start + 2), 16) & (1 << (index & 7))) !== 0
  })
}

export interface PintaQueuedSlots {
  opId: string
  rootId: string
  source: PintaAsset
  /** Runtime-only identities from the existing undo snapshot. */
  before: readonly symbol[]
  after: readonly symbol[]
}

function sheetOperation(
  before: PintaAsset,
  after: PintaAsset,
  context: PintaEditorWriteContext | undefined,
  previous?: PintaQueuedSlots,
  pending?: PintaCausalOperation,
): PintaCausalOperation {
  if (!isTilesetKind(before) || !isTilesetKind(after)) return { type: 'update' }
  const slots = context?.slotLineage
  const layout =
    previous && slots?.before === previous.after
      ? {
          oldToNew: previous.before.map((slot) => slots.after.indexOf(slot)),
          count: slots.after.length,
        }
      : context?.layout
  const oldToNew = layout ? [...layout.oldToNew] : before.tiles.map((_, index) => index)
  const painted = pintaCausalChangedSurvivingSlots(before, after, oldToNew)
  if (!painted) throw Error('Não consegui conferir as posições das peças.')
  const composed =
    pending?.type === 'remap' ? pending.oldToNew.map((index) => oldToNew[index] ?? -1) : oldToNew
  const inheritedPaint = maskedSlots(
    pending?.type === 'remap'
      ? pending.paintedSlots
      : pending?.type === 'paint'
        ? pending.slots
        : undefined,
  ).flatMap((index) => {
    const next = oldToNew[index] ?? -1
    return next < 0 ? [] : [next]
  })
  const paintedSlots = [...inheritedPaint, ...painted]
  const sameIndices = composed.every((next, old) => next === old)
  if (pending?.type === 'append' && !layout && paintedSlots.length === 0) return pending
  if (sameIndices && after.tiles.length === composed.length && pending?.type !== 'append')
    return paintedSlots.length
      ? { type: 'paint', slots: slotMask(paintedSlots) }
      : { type: 'update' }
  if (sameIndices && after.tiles.length > composed.length && paintedSlots.length === 0)
    return { type: 'append', count: after.tiles.length }
  if (pending?.type === 'append')
    throw Error('As peças novas ainda precisam ser guardadas antes desta mudança.')
  return {
    type: 'remap',
    oldToNew: composed,
    count: after.tiles.length,
    ...(paintedSlots.length ? { paintedSlots: slotMask(paintedSlots) } : {}),
  }
}

/** Uses the displayed revision stamps and carries every overlapped queued member forward. */
export async function stagePintaCausalWrite(options: {
  local: PintaCausalLocalPort
  catalog: readonly PintaAsset[]
  assets?: readonly PintaAsset[]
  deletion?: { id: string; before?: PintaAsset }
  context?: PintaEditorWriteContext
  remapBase?: PintaCausalRemapBase
  queuedSlots?: PintaQueuedSlots
  inverseOf?: string
}): Promise<{ pending: Unit; slots?: PintaQueuedSlots }> {
  const { local, context, remapBase, queuedSlots, deletion } = options
  const state = await local.inspect()
  const epoch = remapBase?.snapshot.epoch ?? state.writeEpoch ?? state.epoch
  if (epoch === null) throw Error('Ainda estou conferindo os desenhos guardados na conta.')
  const output = new Map((options.assets ?? []).map((asset) => [asset.id, asset]))
  const authoredIds = new Set(output.keys())
  const held = new Map<string, Unit['members'][number]>()
  const replaces: { opId: string; preparation: string }[] = []
  const carriedReads: Read[] = []
  for (const group of state.pending) {
    if (group.baseEpoch !== epoch)
      throw Error('Há uma versão anterior para conferir antes desta mudança.')
    const previous = await local.prepare(group.opId)
    if (!previous || previous.pending.preparation !== group.preparation)
      throw Error('Uma das mudanças guardadas foi atualizada em outra janela.')
    for (const member of group.members) held.set(member.itemId, member)
    for (const asset of previous.assets) if (!output.has(asset.id)) output.set(asset.id, asset)
    carriedReads.push(...group.readSet.filter((edge) => !authoredIds.has(edge.consumerId)))
    replaces.push({ opId: group.opId, preparation: group.preparation })
  }
  const deleted = new Set(
    [...held.values()]
      .filter((member) => member.action === 'delete')
      .map((member) => member.itemId),
  )
  if (deletion) deleted.add(deletion.id)
  if ([...deleted].some((id) => output.has(id))) throw Error('Essa mudança usa um desenho apagado.')
  const ids = [...output.keys(), ...deleted]
  const bases = await local.capture(ids)
  const observed = new Map(context?.resources.map((ref) => [ref.id, ref.localRevision]))
  const readSet: Read[] = carriedReads
  const catalog = [...options.catalog, ...(remapBase?.assets ?? []), ...output.values()]
  const transitions: Transition[] = []
  const root = options.assets?.[0]
  const baseRoot = bases.find((base) => base.id === root?.id)?.before
  const prior = root && held.get(root.id)
  const previousSlots =
    root &&
    queuedSlots?.rootId === root.id &&
    replaces.some((unit) => unit.opId === queuedSlots.opId)
      ? queuedSlots
      : undefined
  const predecessor = state.sealed?.intent.baseEpoch === epoch ? state.sealed : null
  function observedPredecessor(id: string, revision: string | null | undefined) {
    const local = predecessor?.local.members.find((member) => member.itemId === id)
    const sent = predecessor?.intent.members.find((member) => member.itemId === id)
    if (!predecessor || !local || !sent || local.localRevision !== revision) return undefined
    return {
      opId: predecessor.local.opId,
      localRevision: local.localRevision,
      sha256: sent.action === 'put' ? sent.sha256 : null,
    }
  }
  const localRevs = new Map(bases.map((base) => [base.id, base.beforeRevision]))
  const originals = new Map(remapBase?.assets.map((asset) => [asset.id, asset]))
  for (const base of bases) {
    const after = output.get(base.id) ?? null
    const prepared = remapBase?.entries.get(base.id)
    const pending = held.get(base.id)
    const confirmed = state.confirmed.get(base.id)
    const baseAfter = pending?.baseAfter ?? observedPredecessor(base.id, base.beforeRevision)
    const baseRevision =
      pending?.baseRevision ??
      prepared?.revision ??
      (confirmed?.deleted ? 0 : (confirmed?.revision ?? 0))
    if (!after && baseRevision === 0 && !baseAfter)
      throw Error('Esse desenho ainda está aguardando a primeira sincronização.')
    const origin = authoredIds.has(base.id)
      ? after
      : deletion?.id === base.id
        ? deletion.before
        : undefined
    if (origin && base.beforeRevision !== (pintaLocalRevisionOf(origin) ?? null)) {
      if (base.before || !prepared) throw Error('Um dos desenhos mudou em outra janela.')
    }
    let operation: PintaCausalOperation | undefined
    if (after) {
      if (baseRevision === 0 && !baseAfter) operation = { type: 'create' }
      else if (base.id === root?.id && baseRoot && isTilesetKind(root)) {
        const rootObservation =
          previousSlots && context?.slotLineage?.before === previousSlots.after
            ? previousSlots
            : undefined
        operation = sheetOperation(
          rootObservation?.source ?? baseRoot,
          after,
          context,
          rootObservation,
          rootObservation ? undefined : prior?.operation,
        )
      } else operation = pending?.operation ?? { type: 'update' }
      if (authoredIds.has(after.id)) {
        const original =
          base.id !== root?.id && remapBase?.verifiedConsumers.has(base.id)
            ? originals.get(base.id)
            : undefined
        const plannedReferences = new Set(
          original && remapBase
            ? observePintaReferences(original, remapBase.assets).map(({ id }) => id)
            : [],
        )
        for (const ref of observePintaReferences(after, catalog)) {
          if (output.has(ref.id)) {
            const targetBefore = localRevs.get(ref.id)
            if (
              targetBefore &&
              !(remapBase && root?.id === ref.id) &&
              observed.get(ref.id) !== targetBefore
            )
              throw Error('Um recurso usado pelo desenho mudou desde que foi aberto.')
            readSet.push({ source: 'unit', consumerId: after.id, targetId: ref.id })
            continue
          }
          const pinned = plannedReferences.has(ref.id) ? remapBase?.entries.get(ref.id) : undefined
          if (pinned?.coverage === 'certified' && pinned.sha256) {
            readSet.push({
              source: 'snapshot',
              consumerId: after.id,
              targetId: ref.id,
              revision: pinned.revision,
              sha256: pinned.sha256,
              ...(pinned.layoutRevision ? { layoutRevision: pinned.layoutRevision } : {}),
            })
            continue
          }
          const sent = observedPredecessor(ref.id, observed.get(ref.id))
          if (sent?.sha256) {
            readSet.push({
              source: 'predecessor',
              consumerId: after.id,
              targetId: ref.id,
              base: sent,
            })
            continue
          }
          const mark = state.confirmed.get(ref.id)
          if (!mark || mark.deleted || !mark.sha256 || observed.get(ref.id) !== mark.localRevision)
            throw Error('Um recurso usado pelo desenho mudou desde que foi aberto.')
          readSet.push({
            source: 'snapshot',
            consumerId: after.id,
            targetId: ref.id,
            revision: mark.revision,
            sha256: mark.sha256,
            ...(mark.layoutRevision ? { layoutRevision: mark.layoutRevision } : {}),
          })
        }
      }
    }
    transitions.push({
      ...base,
      after,
      baseRevision,
      ...(operation ? { operation } : {}),
      ...(baseAfter ? { baseAfter } : {}),
    })
  }
  readSet.sort((a, b) => {
    const left = `${a.consumerId}\u0000${a.targetId}`
    const right = `${b.consumerId}\u0000${b.targetId}`
    return left < right ? -1 : left > right ? 1 : 0
  })
  const pending = await local.stage({
    opId: replaces[0]?.opId ?? crypto.randomUUID(),
    baseEpoch: epoch,
    transitions,
    readSet,
    replaces,
    ...(predecessor ? { follows: predecessor.local.opId } : {}),
    ...(options.inverseOf ? { inverseOf: options.inverseOf } : {}),
    requireKnownInventory: !!remapBase || !!deletion,
  })
  const slotLineage = context?.slotLineage
  const slotSource = previousSlots?.source ?? remapBase?.source ?? baseRoot
  return {
    pending,
    ...(root && slotLineage && slotSource
      ? {
          slots: {
            rootId: root.id,
            opId: pending.opId,
            source: slotSource,
            before: previousSlots?.before ?? slotLineage.before,
            after: slotLineage.after,
          },
        }
      : {}),
  }
}
