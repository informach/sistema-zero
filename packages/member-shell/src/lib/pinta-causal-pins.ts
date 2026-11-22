import type { PintaCausalLocalPort } from '@sistemazero/pinta'
import {
  observePintaReferences,
  type PintaAsset,
  pintaLocalRevisionOf,
} from '@sistemazero/pinta/assets'
import type { PintaCausalRemapBase } from './pinta-causal-authoring'

type Stage = Parameters<PintaCausalLocalPort['stage']>[0]
type StageUnbased = Parameters<PintaCausalLocalPort['stageUnbased']>[0]
type Basis = NonNullable<Stage['pins']>['bases'][number]
type LocalState = Awaited<ReturnType<PintaCausalLocalPort['inspect']>>
type Read = Stage['readSet'][number] | (StageUnbased['readSet'][number] & { source: 'local' })

/** Pin the authors' reachable catalog without changing the members sent to the account. */
export async function encodePintaObservedResources(options: {
  local: PintaCausalLocalPort
  state: LocalState
  candidates: readonly PintaAsset[]
  catalog: readonly PintaAsset[]
  readSet: readonly Read[]
  remote?: PintaCausalRemapBase
  signal: AbortSignal
}): Promise<NonNullable<Stage['pins']>> {
  const authored = new Map(options.candidates.map((asset) => [asset.id, asset]))
  const available = new Map(options.catalog.map((asset) => [asset.id, asset]))
  const remote = new Map(options.remote?.assets.map((asset) => [asset.id, asset]))
  const pinned = new Map<string, { basis: Basis; asset: PintaAsset }>()
  const visited = new Set<string>()
  const todo: PintaAsset[] = [...options.candidates]
  const reads = new Map(
    options.readSet.map((edge) => [`${edge.consumerId}/${edge.targetId}`, edge]),
  )
  function failed(): never {
    throw Error('Um recurso usado pelo desenho mudou desde que foi aberto.')
  }

  function attach(id: string, edge: Read | undefined): void {
    if (edge?.source === 'unit' || (!edge && authored.has(id))) return
    const live = available.get(id)
    const current = live ? pintaLocalRevisionOf(live) : undefined
    const basis: Basis = { itemId: id, localRevision: current ?? null }
    let asset = live
    switch (edge?.source) {
      case 'snapshot': {
        const mark = options.state.confirmed.get(id)
        basis.remote = {
          revision: edge.revision,
          sha256: edge.sha256,
          ...(edge.layoutRevision ? { layoutRevision: edge.layoutRevision } : {}),
        }
        if (
          !mark ||
          mark.deleted ||
          current !== mark.localRevision ||
          mark.revision !== edge.revision ||
          mark.sha256 !== edge.sha256 ||
          (mark.layoutRevision ?? undefined) !== edge.layoutRevision
        ) {
          const pulled = options.remote?.entries.get(id)
          if (
            pulled?.revision !== edge.revision ||
            pulled.sha256 !== edge.sha256 ||
            (pulled.layoutRevision ?? undefined) !== edge.layoutRevision
          )
            failed()
          asset = remote.get(id)
          basis.localRevision = null
        }
        break
      }
      case 'predecessor':
        if (current !== edge.base.localRevision) failed()
        break
      case 'local':
        if (authored.has(id)) return
        if (edge.localRevision === null && !asset) return
        if (!edge.localRevision || current !== edge.localRevision) failed()
        break
      default:
        if (!current) {
          const pulled = options.remote?.entries.get(id)
          if (!pulled?.sha256) {
            if (!asset) return
            failed()
          }
          asset = remote.get(id)
          basis.remote = {
            revision: pulled.revision,
            sha256: pulled.sha256,
            ...(pulled.layoutRevision ? { layoutRevision: pulled.layoutRevision } : {}),
          }
        }
    }
    if (!asset) failed()
    const previous = pinned.get(id)
    if (previous) {
      if (
        previous.basis.localRevision !== basis.localRevision ||
        (previous.basis.remote &&
          basis.remote &&
          previous.basis.remote.sha256 !== basis.remote.sha256)
      )
        failed()
      return
    }
    pinned.set(id, { basis, asset })
    todo.push(asset)
  }
  for (const edge of options.readSet) attach(edge.targetId, edge)
  const complete = [...available.values(), ...remote.values(), ...authored.values()]
  for (const asset of todo) {
    const scope = authored.get(asset.id) === asset ? 'after' : 'read'
    const key = `${scope}/${asset.id}`
    if (visited.has(key)) continue
    visited.add(key)
    for (const { id } of observePintaReferences(asset, complete))
      attach(id, scope === 'after' ? reads.get(`${asset.id}/${id}`) : undefined)
  }
  const entries = [...pinned.values()]
  const candidate = await options.local.encodeCandidates(
    entries.map(({ asset }) => options.local.captureCandidate(asset)),
    options.signal,
  )
  return { bases: entries.map(({ basis }) => basis), candidate }
}
