import { describe, expect, test } from 'bun:test'
import {
  loadPreparedStudioProProject,
  loadStudioProModule,
} from '../src/components/studio/studio-pro-loader'

describe('loadStudioProModule', () => {
  test('converte falha do chunk em estado recuperável, sem rejeição não tratada', async () => {
    const result = await loadStudioProModule(async () => {
      throw new Error('chunk indisponível')
    })

    expect(result.module).toBeNull()
    if (result.module === null) {
      expect(result.error).toBeInstanceOf(Error)
    }
  })
  test('link direto espera a nuvem e captura o namespace antes de aguardar', async () => {
    const calls: string[] = []
    await loadPreparedStudioProProject({
      module: {
        setStudioStorageNamespace: (namespace) => {
          calls.push(`namespace:${namespace}`)
        },
        createLocalPersistenceAdapter: () => {
          calls.push('adapter')
          return {
            load: async (id) => {
              calls.push(`load:${id}`)
              return null
            },
            save: async () => {},
          }
        },
      },
      viewerId: 'kid-one',
      projectId: 'pro-one',
      active: () => true,
      prepare: async () => {
        calls.push('cloud')
      },
    })
    expect(calls).toEqual(['namespace:kid-one', 'adapter', 'cloud', 'load:pro-one'])
  })
  test('troca de perfil durante a descida cancela a leitura antiga', async () => {
    let active = true
    let loaded = false
    const result = await loadPreparedStudioProProject({
      module: {
        setStudioStorageNamespace: () => {},
        createLocalPersistenceAdapter: () => ({
          load: async () => {
            loaded = true
            return null
          },
          save: async () => {},
        }),
      },
      viewerId: 'kid-one',
      projectId: 'pro-one',
      active: () => active,
      prepare: async () => {
        active = false
      },
    })
    expect(result).toBeNull()
    expect(loaded).toBe(false)
  })
  test('erro da preparação não é confundido com projeto inexistente', async () => {
    await expect(
      loadPreparedStudioProProject({
        module: {
          setStudioStorageNamespace: () => {},
          createLocalPersistenceAdapter: () => ({ load: async () => null, save: async () => {} }),
        },
        viewerId: 'kid-one',
        projectId: 'pro-one',
        active: () => true,
        prepare: async () => {
          throw new Error('nuvem indisponível')
        },
      }),
    ).rejects.toThrow('nuvem indisponível')
  })
})
