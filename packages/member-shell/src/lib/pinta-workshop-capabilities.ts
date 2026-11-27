import { PINTA_INVENTORY_READER_VERSION } from '@sistemazero/core/creations'

/** LG05 reader A: preserve native-9 documents received from the account, while the public
 * editor and its outbox still write native 8/cloud 7. These are capabilities, never flags. */
export const PINTA_WORKSHOP_CAPABILITIES = Object.freeze({
  reader: PINTA_INVENTORY_READER_VERSION,
  writer: 7,
  nativeCeiling: 8 as const,
})

if (PINTA_WORKSHOP_CAPABILITIES.writer > PINTA_WORKSHOP_CAPABILITIES.reader)
  throw new Error('O gravador do Pinta passa do leitor negociado pelo serviço.')
