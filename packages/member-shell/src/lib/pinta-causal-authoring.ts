import type {
  PintaCausalEntry,
  PintaCausalOperation,
} from '@sistemazero/core/creations/pinta-causal'
import type {
  PintaCausalLocalPort as NativeCausalPort,
  PintaEditorWriteContext,
} from '@sistemazero/pinta'
import {
  isObjectLayer,
  isTilesetKind,
  MAX_BACKUP_FILE_BYTES,
  observePintaReferences,
  type PintaWorkshopAsset,
  pintaAssetDependencyIds,
  pintaLocalRevisionOf,
  pintaValuesEqual,
  tilemapTilesetIds,
} from '@sistemazero/pinta/assets'
import { pintaCausalChangedSurvivingSlots } from '@sistemazero/pinta/assets/causal'
import type { PintaCausalCloud, PintaCloudSnapshot } from './pinta-causal-cloud'
import { encodePintaObservedResources } from './pinta-causal-pins'
import { decodeCausalEntry, readPintaCausalJson } from './pinta-causal-pull'

type Draft = Parameters<PintaCausalLocalPort['stage']>[0]
type Transition = Draft['transitions'][number]
type Unit = Awaited<ReturnType<PintaCausalLocalPort['stage']>>
type QueueState = Awaited<ReturnType<PintaCausalLocalPort['inspect']>>
type Read = Draft['readSet'][number]
type RemapEntry = Pick<PintaCausalEntry, 'revision' | 'sha256' | 'layoutRevision' | 'coverage'>

type PintaCausalLocalPort = NativeCausalPort<PintaWorkshopAsset>

export interface PintaCausalRemapBase {
  epoch: string
  source: PintaWorkshopAsset
  entries: ReadonlyMap<string, RemapEntry>
  verifiedConsumers: ReadonlySet<string>
  assets: readonly PintaWorkshopAsset[]
}

function frozenOrigins(state: QueueState, epoch: string) {
  const origins = new Map<string, { opId: string; localRevision: string; sha256: string | null }>()
  const record = (unit: Unit, puts: ReadonlyMap<string, string>) => {
    if (unit.baseEpoch !== epoch) return
    for (const { itemId, localRevision } of unit.members)
      origins.set(itemId, { opId: unit.opId, localRevision, sha256: puts.get(itemId) ?? null })
  }
  if (state.sealed)
    record(
      state.sealed.local,
      new Map(
        state.sealed.intent.members.flatMap((member) =>
          member.action === 'put' ? [[member.itemId, member.sha256] as const] : [],
        ),
      ),
    )
  for (const pending of state.pending) {
    const candidate = state.prepared?.get(pending.opId)
    if (candidate)
      record(pending, new Map(candidate.puts.map(({ itemId, sha256 }) => [itemId, sha256])))
  }
  return origins
}

function embeddedUses(asset: PintaWorkshopAsset | null | undefined): string[] {
  const map = asset?.kind === 'map-set' ? asset.map : asset?.kind === 'tilemap' ? asset : null
  if (!map?.resources?.length) return []
  const embedded = new Set(map.resources.map((version) => version.asset.id))
  return [
    ...tilemapTilesetIds(map).map((id) => ['grid', id] as const),
    ...map.layers
      .filter(isObjectLayer)
      .flatMap((layer) =>
        layer.objects.flatMap((obj) => (obj.art ? [[obj.id, obj.art.assetId] as const] : [])),
      ),
  ]
    .filter(([, id]) => embedded.has(id))
    .map(([role, id]) => `${role}\u0000${id}`)
}

export function pintaPinBoundary(
  before: PintaWorkshopAsset | null | undefined,
  after: PintaWorkshopAsset,
): boolean {
  const prior = new Set(embeddedUses(before))
  return embeddedUses(after).some((use) => !prior.has(use))
}

/** Complete verified local index, advanced only by this device's contiguous receipts. */
export function preparePintaOfflineRemap(
  source: PintaWorkshopAsset,
  assets: readonly PintaWorkshopAsset[],
  state: QueueState,
): PintaCausalRemapBase {
  const epoch = state.writeEpoch ?? state.epoch
  if (epoch === null) throw Error('Ainda não consegui conferir a conta.')
  const catalog = new Map(assets.map((asset) => [asset.id, asset]))
  if (pintaLocalRevisionOf(catalog.get(source.id) ?? source) !== pintaLocalRevisionOf(source))
    throw Error('A folha aberta mudou desde a sua última leitura.')
  const frozen = frozenOrigins(state, epoch)
  const entries = new Map<string, RemapEntry>()
  const verifiedConsumers = new Set<string>()
  for (const [id, mark] of state.confirmed) {
    if (mark.deleted) continue
    const current = catalog.get(id)
    const revision = current && pintaLocalRevisionOf(current)
    const prior = frozen.get(id)
    if (prior && !prior.sha256 && !current) continue
    if (
      !mark.sha256 ||
      !current ||
      (mark.localRevision !== revision && prior?.localRevision !== revision)
    )
      throw Error('Preciso conferir os desenhos da conta antes de mudar estas peças.')
    entries.set(id, { ...mark, coverage: 'certified' })
    if (id !== source.id && (current.kind === 'tilemap' || current.kind === 'map-set'))
      verifiedConsumers.add(id)
  }
  for (const [id, prior] of frozen) {
    const current = catalog.get(id)
    if (
      prior.sha256 &&
      current &&
      pintaLocalRevisionOf(current) === prior.localRevision &&
      (current.kind === 'tilemap' || current.kind === 'map-set')
    )
      verifiedConsumers.add(id)
  }
  return { epoch, source: catalog.get(source.id) ?? source, entries, verifiedConsumers, assets }
}

export async function preparePintaCausalRemap(options: {
  source: PintaWorkshopAsset
  snapshot: PintaCloudSnapshot
  local: readonly PintaWorkshopAsset[]
  decodeCandidate?: PintaCausalLocalPort['decodeCandidate']
  localState: QueueState
  cloud: PintaCausalCloud
  signal: AbortSignal
}): Promise<PintaCausalRemapBase> {
  const { source, snapshot, localState, cloud, signal } = options
  const entries = new Map(snapshot.entries.map((entry) => [entry.itemId, entry]))
  const catalog = new Map(options.local.map((asset) => [asset.id, asset]))
  const frozen = frozenOrigins(localState, snapshot.epoch)
  const verifiedConsumers = new Set<string>()
  let sourceBase = catalog.get(source.id) ?? source
  const budget = { remaining: MAX_BACKUP_FILE_BYTES }
  async function fetchVerified(entry: PintaCausalEntry): Promise<PintaWorkshopAsset> {
    const archived = await cloud.download(entry, snapshot.epoch, signal)
    const asset = decodeCausalEntry(
      await readPintaCausalJson(archived, signal, budget),
      entry,
      options.decodeCandidate,
    )
    if (entry.coverage !== 'certified' || !entry.sha256 || !asset)
      throw Error('Não consegui conferir um dos desenhos que usa estas peças.')
    return asset
  }
  for (const entry of snapshot.entries) {
    if (entry.itemId !== source.id && entry.kind !== 'tilemap' && entry.kind !== 'map-set') continue
    signal.throwIfAborted()
    const known = localState.confirmed.get(entry.itemId)
    const local = catalog.get(entry.itemId)
    const prior = frozen.get(entry.itemId)
    if (prior && !prior.sha256 && !local) continue
    if (prior?.sha256 && local && prior.localRevision === pintaLocalRevisionOf(local)) {
      if (entry.itemId === source.id) {
        if (pintaLocalRevisionOf(local) !== pintaLocalRevisionOf(source))
          throw Error('A folha aberta mudou desde a sua última leitura.')
        sourceBase = local
      } else verifiedConsumers.add(entry.itemId)
      continue
    }
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
    const asset = await fetchVerified(entry)
    if (local && !pintaValuesEqual(local, asset))
      throw Error('Uma versão local ainda precisa ser guardada antes de mudar as peças.')
    if (entry.itemId === source.id) {
      if (!local || pintaLocalRevisionOf(local) !== pintaLocalRevisionOf(source))
        throw Error('A folha aberta mudou desde a sua última leitura.')
      sourceBase = local
    } else verifiedConsumers.add(entry.itemId)
    catalog.set(asset.id, local ?? asset)
  }
  for (const [id, prior] of frozen) {
    const local = catalog.get(id)
    if (
      prior.sha256 &&
      local &&
      prior.localRevision === pintaLocalRevisionOf(local) &&
      (local.kind === 'tilemap' || local.kind === 'map-set')
    )
      verifiedConsumers.add(id)
  }
  const universe = [...catalog.values()]
  const related = universe.filter((asset) => pintaAssetDependencyIds(asset).includes(source.id))
  const reached = new Set(related.map(({ id }) => id))
  reached.add(source.id)
  related.push(sourceBase)
  for (const asset of related) {
    for (const { id } of observePintaReferences(asset, [...catalog.values()])) {
      if (reached.has(id)) continue
      reached.add(id)
      const entry = entries.get(id)
      const current = catalog.get(id)
      const known = localState.confirmed.get(id)
      const revision = current && pintaLocalRevisionOf(current)
      if (
        !entry ||
        (current &&
          entry.sha256 &&
          known?.revision === entry.revision &&
          known.sha256 === entry.sha256 &&
          known.localRevision === revision) ||
        (current && frozen.get(id)?.localRevision === revision)
      ) {
        if (current) related.push(current)
        continue
      }
      const remote = await fetchVerified(entry)
      if (current && !pintaValuesEqual(current, remote))
        throw Error('Uma versão local ainda precisa ser guardada antes de mudar as peças.')
      if (!current) catalog.set(id, remote)
      related.push(current ?? remote)
    }
  }
  await cloud.verifyEpoch(snapshot.epoch, signal)
  return {
    epoch: snapshot.epoch,
    source: sourceBase,
    entries,
    verifiedConsumers,
    assets: [...catalog.values()],
  }
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
  source: PintaWorkshopAsset
  /** Runtime-only identities from the existing undo snapshot. */
  before: readonly symbol[]
  after: readonly symbol[]
}

function sheetOperation(
  before: PintaWorkshopAsset,
  after: PintaWorkshopAsset,
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
  signal: AbortSignal
  catalog: readonly PintaWorkshopAsset[]
  assets?: readonly PintaWorkshopAsset[]
  authors?: ReadonlyMap<string, PintaWorkshopAsset>
  deletion?: { id: string; before?: PintaWorkshopAsset }
  context?: PintaEditorWriteContext
  remapBase?: PintaCausalRemapBase
  inverseReadBase?: PintaCausalRemapBase
  queuedSlots?: PintaQueuedSlots
  inverseOf?: string
  independent?: true
}): Promise<{ pending: Unit; slots?: PintaQueuedSlots }> {
  const { local, context, remapBase, queuedSlots, deletion } = options
  const state = await local.inspect()
  const epoch = remapBase?.epoch ?? state.writeEpoch ?? state.epoch
  if (epoch === null) throw Error('Ainda estou conferindo os desenhos guardados na conta.')
  const output = new Map((options.assets ?? []).map((asset) => [asset.id, asset]))
  const authoredIds = new Set(output.keys())
  const observed = new Map(context?.resources.map((ref) => [ref.id, ref.localRevision]))
  const recovered = new Set<string>()
  const localCatalog = new Map(options.catalog.map((asset) => [asset.id, asset]))
  for (const asset of output.values()) {
    for (const ref of observePintaReferences(asset, options.catalog)) {
      if (output.has(ref.id)) continue
      const target = localCatalog.get(ref.id)
      const revision = state.recovered?.get(ref.id)
      if (
        !target ||
        !revision ||
        revision !== pintaLocalRevisionOf(target) ||
        (!recovered.has(asset.id) && observed.get(ref.id) !== revision)
      )
        continue
      recovered.add(ref.id)
      output.set(ref.id, target)
    }
  }
  const held = new Map<string, Unit['members'][number]>()
  const replaces: { opId: string; preparation: string }[] = []
  const carriedReads: Read[] = []
  for (const group of state.pending) {
    if (state.prepared?.has(group.opId)) continue
    if (group.baseEpoch !== epoch)
      throw Error('Há uma versão anterior para conferir antes desta mudança.')
    const previous = await local.prepare(group.opId)
    if (!previous || previous.pending.preparation !== group.preparation)
      throw Error('Uma das mudanças guardadas foi atualizada em outra janela.')
    for (const member of group.members) held.set(member.itemId, member)
    for (const asset of previous.assets)
      if (!output.has(asset.id) && deletion?.id !== asset.id) output.set(asset.id, asset)
    carriedReads.push(
      ...group.readSet.filter(
        (edge) => !authoredIds.has(edge.consumerId) && deletion?.id !== edge.consumerId,
      ),
    )
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
  const predecessor =
    state.pending
      .filter(({ opId, baseEpoch }) => baseEpoch === epoch && state.prepared?.has(opId))
      .at(-1) ?? (state.sealed?.intent.baseEpoch === epoch ? state.sealed.local : undefined)
  const origins = frozenOrigins(state, epoch)
  function observedPredecessor(id: string, revision: string | null | undefined) {
    const source = origins.get(id)
    return source?.localRevision === revision ? source : undefined
  }
  const localRevs = new Map(bases.map((base) => [base.id, base.beforeRevision]))
  const referencePlan = remapBase ?? options.inverseReadBase
  const originals = new Map(referencePlan?.assets.map((asset) => [asset.id, asset]))
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
    const origin =
      authoredIds.has(base.id) || recovered.has(base.id)
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
      if (authoredIds.has(after.id) || recovered.has(after.id)) {
        const original =
          base.id !== root?.id && referencePlan?.verifiedConsumers.has(base.id)
            ? originals.get(base.id)
            : undefined
        const plannedReferences = new Set(
          original && referencePlan
            ? observePintaReferences(original, referencePlan.assets).map(({ id }) => id)
            : [],
        )
        for (const ref of observePintaReferences(after, catalog)) {
          if (output.has(ref.id)) {
            const targetBefore = localRevs.get(ref.id)
            if (
              targetBefore &&
              !((remapBase || options.inverseOf) && root?.id === ref.id) &&
              !(recovered.has(after.id) && state.recovered?.get(ref.id) === targetBefore) &&
              observed.get(ref.id) !== targetBefore
            )
              throw Error('Um recurso usado pelo desenho mudou desde que foi aberto.')
            readSet.push({ source: 'unit', consumerId: after.id, targetId: ref.id })
            continue
          }
          const sent = observedPredecessor(
            ref.id,
            observed.get(ref.id) ?? (plannedReferences.has(ref.id) ? ref.localRevision : undefined),
          )
          if (sent?.sha256) {
            readSet.push({
              source: 'predecessor',
              consumerId: after.id,
              targetId: ref.id,
              base: sent,
            })
            continue
          }
          const pinned = plannedReferences.has(ref.id)
            ? referencePlan?.entries.get(ref.id)
            : undefined
          const mark = state.confirmed.get(ref.id)
          const oldBasisStillCurrent =
            referencePlan &&
            pinned &&
            (mark
              ? !mark.deleted &&
                mark.revision === pinned.revision &&
                mark.sha256 === pinned.sha256 &&
                mark.layoutRevision === pinned.layoutRevision
              : BigInt(epoch) === BigInt(referencePlan.epoch) + 1n)
          if (
            pinned?.coverage === 'certified' &&
            pinned.sha256 &&
            (remapBase || oldBasisStillCurrent)
          ) {
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
  const shadow = await local.encodeCandidates([...output.values()], options.signal)
  const pins = await encodePintaObservedResources({
    local,
    state,
    candidates: [...output.values()],
    catalog: options.catalog,
    readSet,
    remote: referencePlan,
    signal: options.signal,
  })
  const pending = await local.stage({
    shadow,
    pins,
    authors: options.authors,
    opId: replaces[0]?.opId ?? crypto.randomUUID(),
    baseEpoch: epoch,
    transitions,
    readSet,
    replaces,
    ...(predecessor ? { follows: predecessor.opId } : {}),
    ...(options.independent ? { independent: true as const } : {}),
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
