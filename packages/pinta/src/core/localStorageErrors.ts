import type { PintaWorkshopAsset } from './assetMemory'
import type { PintaAsset } from './project'

export class PintaLocalStorageError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PintaLocalStorageError'
  }
}
/** Copies have already committed atomically; callers may continue editing the recovered ID. */
export class PintaLocalConflictError<
  Asset extends PintaWorkshopAsset = PintaAsset,
> extends PintaLocalStorageError {
  constructor(readonly forks: ReadonlyMap<string, Asset>) {
    super('Guardei suas mudanças numa cópia para proteger as duas versões.')
  }
}
export class PintaStorageBudgetError extends Error {
  constructor(readonly projectedBytes: number) {
    super('A galeria ultrapassaria o limite portátil de 32 MiB.')
    this.name = 'PintaStorageBudgetError'
  }
}
