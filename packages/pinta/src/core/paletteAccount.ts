import type { PaletteLibrary } from './paletteLibrary'

export interface PaletteAccountToken {
  minimum: number
  generation: string
  revision: number | null
}

export interface PaletteAccountSnapshot extends PaletteAccountToken {
  /** Authored contents eligible for upload. */
  candidate: PaletteLibrary | null
  dirty: boolean
}

export interface PaletteAccount {
  inspect(minimum?: number, ready?: () => boolean): Promise<PaletteAccountSnapshot>
  observeConflict(
    expected: PaletteAccountToken,
    minimum: number,
    ready: () => boolean,
  ): Promise<boolean>
  receive(
    expected: PaletteAccountToken,
    remote: { library: PaletteLibrary; revision: number; updatedAt: number } | null,
    ready: () => boolean,
    now: number,
    previousSyncAt?: number,
  ): Promise<PaletteAccountSnapshot | null>
  acknowledge(
    expected: PaletteAccountToken,
    sent: PaletteLibrary,
    revision: number,
    ready: () => boolean,
  ): Promise<PaletteAccountSnapshot | null>
}
