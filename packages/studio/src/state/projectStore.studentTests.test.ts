import { afterEach, describe, expect, it } from 'bun:test'
import type { StudioStudentTest } from '@sistemazero/core/studio/student-tests'
import { createEmptyProject } from '#core'
import { isPythonProject, javaScriptProject } from '../core/editableProject'
import type { PythonClassicProjectDocument } from '../core/pythonProject'
import { documentFixture } from './fixtures/projectDocuments'
import { useProjectStore } from './projectStore'

/** Os testes guardados no projeto da store (só o projeto em JavaScript os tem). */
function savedTests() {
  const project = useProjectStore.getState().project
  return project ? javaScriptProject(project)?.studentTests : undefined
}

/**
 * Os testes da aba "Meus testes" no projeto (`setStudentTests`): a lista inteira de uma vez, só no
 * clássico em JavaScript, conferida pelo mesmo esquema que o Members usa no envio. A store
 * DEFAULT serve aqui (como no teste da capa).
 */
const teste = (id: string): StudioStudentTest => ({
  id,
  name: 'Enter começa o jogo',
  rule: {
    type: 'behavior',
    steps: [{ action: 'press', key: 'Enter' }],
    expect: { target: { kind: 'value', path: 'estado' }, compare: 'equals', value: 'jogando' },
  },
})

afterEach(() => {
  useProjectStore.setState({ project: null, isDirty: false, saveError: null })
})

describe('setStudentTests', () => {
  it('guarda a lista no projeto e marca a mudança; a lista vazia tira a chave', () => {
    useProjectStore.setState({ project: createEmptyProject('p1', 'Jogo'), isDirty: false })
    expect(useProjectStore.getState().setStudentTests([teste('a'), teste('b')])).toBeNull()
    expect(savedTests()?.map((t) => t.id)).toEqual(['a', 'b'])
    expect(useProjectStore.getState().isDirty).toBe(true)
    expect(useProjectStore.getState().setStudentTests([])).toBeNull()
    expect(useProjectStore.getState().project).not.toHaveProperty('studentTests')
  })

  it('recusa lista com forma inválida ou id repetido, sem mexer no projeto', () => {
    useProjectStore.setState({ project: createEmptyProject('p1', 'Jogo'), isDirty: false })
    expect(useProjectStore.getState().setStudentTests([teste('a'), teste('a')])).not.toBeNull()
    expect(useProjectStore.getState().setStudentTests([{ ...teste('a'), name: '' }])).not.toBeNull()
    expect(useProjectStore.getState().project).not.toHaveProperty('studentTests')
    expect(useProjectStore.getState().isDirty).toBe(false)
  })

  it('o Python clássico guarda os testes no documento dele, também o teste de função', () => {
    const python = documentFixture('python', 'classic') as PythonClassicProjectDocument
    useProjectStore.setState({ project: python, isDirty: false })
    const dobro: StudioStudentTest = {
      id: 'dobro',
      name: 'O dobro',
      rule: { type: 'functionReturns', name: 'dobro', cases: [{ args: [2], expected: 4 }] },
    }
    expect(useProjectStore.getState().setStudentTests([dobro, teste('a')])).toBeNull()
    const project = useProjectStore.getState().project
    expect(
      project && isPythonProject(project) && project.kind === 'classic'
        ? project.studentTests
        : null,
    ).toEqual([dobro, teste('a')])
    expect(useProjectStore.getState().isDirty).toBe(true)
    expect(useProjectStore.getState().setStudentTests([])).toBeNull()
    expect(useProjectStore.getState().project).not.toHaveProperty('studentTests')
  })

  it('fica fora do Pro', () => {
    useProjectStore.setState({
      project: { ...createEmptyProject('p1', 'Jogo'), kind: 'pro' },
      isDirty: false,
    })
    expect(useProjectStore.getState().setStudentTests([teste('a')])).not.toBeNull()
    expect(useProjectStore.getState().project).not.toHaveProperty('studentTests')
  })
})
