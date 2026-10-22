import type { StudioProjectCuration } from '@sistemazero/core/studio/project-capabilities'
import type { StudioRuntimeSelection } from '@sistemazero/core/studio/project-environment'
import type {
  StudioProjectCapability,
  StudioRuntimeReleaseStatus,
} from '@sistemazero/core/studio/runtime-catalog'

type Curation = Readonly<
  Omit<StudioProjectCuration, 'allowBlocks' | 'allowCategories' | 'allowedModes'>
> & {
  readonly allowBlocks?: readonly string[]
  readonly allowCategories?: readonly string[]
  readonly allowedModes?: readonly NonNullable<StudioProjectCuration['allowedModes']>[number][]
}

export interface StudioRuntimeAuthoritySnapshot {
  readonly available: boolean
  readonly pythonAuthoring: readonly {
    readonly runtime: Readonly<StudioRuntimeSelection>
    readonly blockIds: readonly string[]
  }[]
  readonly grantedExtensionIds: readonly string[]
  readonly capabilities: readonly StudioProjectCapability[]
  readonly releaseStatus: StudioRuntimeReleaseStatus
  readonly curation: Curation | null
}

export interface StudioRuntimeAuthority {
  getSnapshot(): StudioRuntimeAuthoritySnapshot
  subscribe(listener: () => void): () => void
}

const sorted = <T extends string>(items: readonly T[]) => Object.freeze([...new Set(items)].sort())

function copy(input: StudioRuntimeAuthoritySnapshot): StudioRuntimeAuthoritySnapshot {
  const curation = input.curation
  return Object.freeze({
    available: input.available,
    pythonAuthoring: Object.freeze(
      input.pythonAuthoring
        .map(({ runtime, blockIds }) =>
          Object.freeze({
            runtime: Object.freeze({
              profileId: runtime.profileId,
              releaseId: runtime.releaseId,
              manifestSha256: runtime.manifestSha256,
            }),
            blockIds: sorted(blockIds),
          }),
        )
        .sort((a, b) => JSON.stringify(a.runtime).localeCompare(JSON.stringify(b.runtime))),
    ),
    grantedExtensionIds: sorted(input.grantedExtensionIds),
    capabilities: sorted(input.capabilities),
    releaseStatus: input.releaseStatus,
    curation: curation
      ? Object.freeze({
          pythonLevel: curation.pythonLevel,
          level: curation.level,
          allowLevelReveal: curation.allowLevelReveal,
          allowBlocks: curation.allowBlocks && sorted(curation.allowBlocks),
          allowCategories: curation.allowCategories && sorted(curation.allowCategories),
          allowedModes: curation.allowedModes && sorted(curation.allowedModes),
        })
      : null,
  })
}

/** Owns only host authority, never the editable project or execution/session lifecycle. */
export function createStudioRuntimeAuthority(initial: StudioRuntimeAuthoritySnapshot) {
  let snapshot = copy(initial)
  let key = JSON.stringify(snapshot)
  const listeners = new Set<() => void>()
  const authority: StudioRuntimeAuthority = {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
  return {
    authority,
    update(input: StudioRuntimeAuthoritySnapshot) {
      const next = copy(input)
      const nextKey = JSON.stringify(next)
      if (nextKey === key) return
      snapshot = next
      key = nextKey
      for (const listener of [...listeners]) {
        try {
          listener()
        } catch (error) {
          // Finish notifying the other consumers; report subscriber failures on the next turn.
          queueMicrotask(() => {
            if (typeof globalThis.reportError === 'function') globalThis.reportError(error)
            else throw error
          })
        }
      }
    },
  }
}
