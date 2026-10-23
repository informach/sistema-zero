import { mock } from 'bun:test'

// Controle explícito, fora da descoberta normal: a simulação parcial deixada por outro teste
// não pode retirar a persistência real de paletas da fixture que o host Molda executa.
const modulePath = import.meta.resolve('../../../pinta/src/index.ts')
const original = await import(modulePath)
const createPersistence = original.createPintaPersistence
mock.module(modulePath, () => ({
  ...original,
  createPintaPersistence: (options?: Parameters<typeof createPersistence>[0]) => ({
    ...createPersistence(options),
    loadPaletteLibrary: undefined,
    savePaletteLibrary: undefined,
  }),
}))
await import('../molda-client.test')
