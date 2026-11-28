import { PINTA_INVENTORY_READER_VERSION } from '@sistemazero/core/creations'

/** One public workshop capability contract. Earlier native files keep their minimum required
 * envelope through the canonical codec; native-9 authoring uses the same causal outbox. */
export const PINTA_WORKSHOP_CAPABILITIES = Object.freeze({
  reader: PINTA_INVENTORY_READER_VERSION,
  writer: 8,
  nativeCeiling: 9 as const,
})

if (PINTA_WORKSHOP_CAPABILITIES.writer > PINTA_WORKSHOP_CAPABILITIES.reader)
  throw new Error('O gravador do Pinta passa do leitor negociado pelo serviço.')
