import { describe, expect, test } from 'bun:test'
import { buildProProject } from '../../studio/src/core/proProject'
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
      namespace: 'kid-one',
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
      namespace: 'kid-one',
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
        namespace: 'kid-one',
        projectId: 'pro-one',
        active: () => true,
        prepare: async () => {
          throw new Error('nuvem indisponível')
        },
      }),
    ).rejects.toThrow('nuvem indisponível')
  })
})

for (const result of ['allowed', 'denied', 'cancelled'] as const) {
  test(`Pro document authority ${result} is resolved after loading and before transferring the opening`, async () => {
    const project = buildProProject(
      'real-document',
      'Arena',
      { 'src/main.ts': { kind: 'file', content: '' } },
      'dev',
      'canvas-survival',
    )
    const controller = new AbortController()
    let releaseCount = 0
    let releaseOwner = () => {}
    const calls: string[] = []
    const pending = loadPreparedStudioProProject({
      module: {
        setStudioStorageNamespace() {},
        createLocalPersistenceAdapter: () => ({
          beginOpening: () => () => {
            releaseCount++
          },
          load: async () => {
            calls.push('load')
            return project
          },
          save: async () => {},
        }),
      },
      namespace: 'viewer',
      projectId: project.id,
      active: () => !controller.signal.aborted,
      signal: controller.signal,
      onOpening: ({ release }) => {
        releaseOwner = release
      },
      authorize: async (loaded, signal) => {
        expect(loaded).toBe(project)
        expect(signal).toBe(controller.signal)
        expect(releaseCount).toBe(0)
        calls.push('authorize')
        if (result === 'denied') throw new Error('JavaScript no longer earned')
        if (result === 'cancelled') controller.abort()
      },
    })
    if (result === 'denied') await expect(pending).rejects.toThrow('JavaScript no longer earned')
    else expect(await pending).toBe(result === 'allowed' ? project : null)
    expect(calls).toEqual(['load', 'authorize'])
    expect(releaseCount).toBe(result === 'allowed' ? 0 : 1)
    releaseOwner()
    releaseOwner()
    expect(releaseCount).toBe(1)
  })
}
