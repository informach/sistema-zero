import type { PintaPaletteHead } from '@sistemazero/core/creations/pinta-palette-writer'

export class PintaPaletteWriteError extends Error {
  constructor(
    readonly reason: 'protocol-required' | 'head-changed' | 'ticket-invalid' | 'account-deleting',
    readonly head?: PintaPaletteHead,
  ) {
    super(reason)
  }
}
