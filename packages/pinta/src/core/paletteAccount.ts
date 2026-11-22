import type {
  PintaPaletteHead,
  PintaPaletteUploadCapability,
} from '@sistemazero/core/creations/pinta-palette-writer'
import type { PaletteLibrary } from './paletteLibrary'

export interface PaletteSubmission {
  ticket: PintaPaletteUploadCapability
  revision: number
  sent: PaletteLibrary
}
export interface PaletteAccountToken {
  head?: PintaPaletteHead
  minimum: number
  generation: string
  revision: number | null
}

export interface PaletteAccountSnapshot extends PaletteAccountToken {
  /** Authored contents eligible for upload. */
  candidate: PaletteLibrary | null
  submission?: PaletteSubmission
  rejected?: boolean
  needsHead?: boolean
  dirty: boolean
}

export interface PaletteAccount {
  inspect(minimum?: number, ready?: () => boolean): Promise<PaletteAccountSnapshot>
  observeConflict(
    expected: PaletteAccountToken,
    minimum: number,
    ready: () => boolean,
  ): Promise<boolean>
  prepare(
    expected: PaletteAccountToken,
    submission: PaletteSubmission,
    ready: () => boolean,
    replaces?: string,
  ): Promise<boolean>
  release(
    expected: PaletteAccountToken,
    nonce: string,
    revision: number,
    ready: () => boolean,
    invalid?: boolean,
  ): Promise<boolean>
  receive(
    expected: PaletteAccountToken,
    remote: { library: PaletteLibrary; revision: number; updatedAt: number } | null,
    ready: () => boolean,
    now: number,
    previousSyncAt?: number,
    head?: PintaPaletteHead,
  ): Promise<PaletteAccountSnapshot | null>
  acknowledge(
    expected: PaletteAccountToken,
    sent: PaletteLibrary,
    revision: number,
    ready: () => boolean,
    head?: PintaPaletteHead,
    nonce?: string,
  ): Promise<PaletteAccountSnapshot | null>
}
