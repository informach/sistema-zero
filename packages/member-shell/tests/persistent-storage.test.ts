import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import {
  requestPersistentStorage,
  resetPersistentStorageForTests,
} from '../src/lib/persistent-storage'

/**
 * O pedido de armazenamento persistente é best-effort e 1× por sessão. O custo de errar aqui é
 * quebrar a CARGA do editor (a chamada mora no começo do effect de carga dos blocos) — então o
 * contrato é: nunca lança, nunca repete, no-op sem a API.
 */

const originalNavigator = globalThis.navigator

function setNavigator(value: unknown) {
  Object.defineProperty(globalThis, 'navigator', { value, configurable: true, writable: true })
}

beforeEach(() => {
  resetPersistentStorageForTests()
})

afterEach(() => {
  setNavigator(originalNavigator)
})

describe('requestPersistentStorage', () => {
  test('chama navigator.storage.persist() uma vez e só uma, mesmo com N chamadas', () => {
    let calls = 0
    setNavigator({
      storage: {
        persist: () => {
          calls++
          return Promise.resolve(true)
        },
      },
    })
    requestPersistentStorage()
    requestPersistentStorage()
    requestPersistentStorage()
    expect(calls).toBe(1)
  })

  test('sem navigator (SSR) é no-op silencioso', () => {
    setNavigator(undefined)
    expect(() => requestPersistentStorage()).not.toThrow()
  })

  test('sem navigator.storage / sem persist é no-op silencioso', () => {
    setNavigator({})
    expect(() => requestPersistentStorage()).not.toThrow()
    resetPersistentStorageForTests()
    setNavigator({ storage: {} })
    expect(() => requestPersistentStorage()).not.toThrow()
  })

  test('persist() rejeitando não vira unhandled rejection nem lança', async () => {
    let rejected = false
    setNavigator({
      storage: {
        persist: () => {
          rejected = true
          return Promise.reject(new Error('negado'))
        },
      },
    })
    expect(() => requestPersistentStorage()).not.toThrow()
    // Dá um tick para a rejeição propagar — o .catch interno tem que engoli-la.
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(rejected).toBe(true)
  })

  test('persist() LANÇANDO síncrono (implementação exótica) também não derruba', () => {
    setNavigator({
      storage: {
        persist: () => {
          throw new Error('boom')
        },
      },
    })
    expect(() => requestPersistentStorage()).not.toThrow()
  })
})
