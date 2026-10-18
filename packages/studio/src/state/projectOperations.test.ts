import { describe, expect, it } from 'bun:test'
import { createEmptyProject } from '#core'
import type { EditableStudioProject as Project } from '../core/editableProject'
import { createPersistenceService } from '../persistence/service'
import { flushProjectOperations, registerProjectOperation } from './projectOperations'
import { createProjectStore, sanitizeProjectForHost } from './projectStore'

const pro = (id: string): Project => ({
  ...createEmptyProject(id, 'Pro'),
  kind: 'pro',
  mode: 'code',
  tree: { 'main.ts': { kind: 'file', content: 'before' } },
  proMeta: { templateId: 'vanilla-vite', devScript: 'dev' },
})

describe('limites de snapshot do Pro', () => {
  it('excluir o último arquivo pelo terminal sobrevive à reabertura como Pro', () => {
    const store = createProjectStore()
    store.getState().setProject(pro('empty-pro'))
    const before = store.getState().project!.tree!
    expect(store.getState().reconcileProFiles('empty-pro', before, {})).toBeNull()
    const reopened = sanitizeProjectForHost(store.getState().project)
    expect(reopened?.kind).toBe('pro')
    expect(reopened?.tree).toEqual({})
  })
  it('save aguarda o filesystem e captura a versão reconciliada', async () => {
    const store = createProjectStore()
    store.getState().setProject(pro('flush-pro'))
    const saved: Project[] = []
    let release = () => {}
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const unregister = registerProjectOperation(store, {
      projectId: 'flush-pro',
      flush: async () => {
        await gate
        const current = store.getState().project!
        expect(
          store.getState().reconcileProFiles(current.id, current.tree!, {
            ...current.tree,
            'package-lock.json': { kind: 'file', content: 'new lock' },
          }),
        ).toBeNull()
      },
    })
    const service = createPersistenceService(store, {
      load: async () => null,
      save: async (project) => {
        saved.push(project)
      },
    })
    const pending = service.save()
    expect(saved).toEqual([])
    release()
    await pending
    expect(saved[0]?.tree?.['package-lock.json']).toEqual({ kind: 'file', content: 'new lock' })
    unregister()
  })
  it('fila não cruza instâncias e projeto trocado não é exportado como se fosse o anterior', async () => {
    const first = createProjectStore()
    const second = createProjectStore()
    first.getState().setProject(pro('one'))
    second.getState().setProject(pro('two'))
    let calls = 0
    const unregister = registerProjectOperation(first, {
      projectId: 'one',
      flush: async () => {
        calls++
        first.getState().setProject(pro('changed'))
      },
    })
    await flushProjectOperations(second)
    expect(calls).toBe(0)
    await expect(flushProjectOperations(first)).rejects.toThrow('projeto mudou')
    unregister()
  })
  it('falha de reconciliação impede confirmação de save e aparece no estado', async () => {
    const store = createProjectStore()
    store.getState().setProject(pro('error'))
    let saved = false
    const unregister = registerProjectOperation(store, {
      projectId: 'error',
      flush: async () => {
        throw new Error('filesystem indisponível')
      },
    })
    const service = createPersistenceService(store, {
      load: async () => null,
      save: async () => {
        saved = true
      },
    })
    await expect(service.save()).rejects.toThrow('filesystem indisponível')
    expect(saved).toBe(false)
    expect(store.getState().saveError).toContain('filesystem indisponível')
    unregister()
  })
  it('aplicação atômica rejeita revisão velha e árvore inválida', () => {
    const store = createProjectStore()
    store.getState().setProject(pro('revision'))
    const before = store.getState().project!.tree!
    store.getState().setProFileContent('main.ts', 'new edit')
    expect(store.getState().reconcileProFiles('revision', before, before)).toContain('mudou')
    expect(
      store.getState().reconcileProFiles('revision', store.getState().project!.tree!, {
        '../escape.ts': { kind: 'file', content: 'bad' },
      }),
    ).toContain('não é válida')
    expect(store.getState().project?.tree?.['main.ts']).toEqual({
      kind: 'file',
      content: 'new edit',
    })
  })
})
