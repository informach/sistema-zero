import { afterEach, expect, mock, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import type { DesafioAberto } from '@sistemazero/arquipelago-contracts'
import type { EditableStudioProject, StudioHandle } from '@sistemazero/studio'
import { createBlankProjectSnapshot } from '@sistemazero/studio/blank-project'
import type { Ref } from 'react'

GlobalRegistrator.register()
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
const { act, useEffect, useImperativeHandle } = await import('react')
const { createRoot } = await import('react-dom/client')
let saves = 0,
  failSave = false
let changed: (() => void) | undefined
let initial: EditableStudioProject | null = null
let stored: EditableStudioProject | null = null
let grants: unknown
let mode: string | undefined
let sends: unknown[] = []
let respond = async () => ({
  passou: true,
  resultados: [{ id: 'o1', passou: true }],
  concluidoAgora: true,
  extraAgora: false,
})
mock.module('@sistemazero/studio', () => ({
  createLocalPersistenceAdapter: () => ({
    load: async () => stored,
    save: async (project: EditableStudioProject) => {
      stored = project
    },
    beginOpening: () => () => {},
  }),
  StudioLesson: (props: {
    ref: Ref<StudioHandle>
    initialProject: EditableStudioProject
    grantedBlockIds: unknown
    initialMode: string
    onReady(): void
  }) => {
    initial = props.initialProject
    grants = props.grantedBlockIds
    mode = props.initialMode
    useImperativeHandle(props.ref, () => ({
      getProject: () => initial,
      save: async () => {
        saves++
        if (failSave) throw new Error('disk full')
        stored = initial
      },
      onProjectChange: (fn) => {
        changed = fn
        return () => {
          changed = undefined
        }
      },
      getCodeCursorAnchor: async () => null,
      getCodeCursorPosition: async () => null,
      onCodeCursorChange: () => () => {},
      replaceProject: (p) => {
        initial = p
      },
      prepareHandoff: async () => {
        if (!initial) throw Error('no project')
        return initial
      },
      applyObservedRevision: async () => {},
      resumeAuthorship: () => {},
      setMode: () => {},
      isDirty: () => false,
    }))
    useEffect(() => {
      props.onReady()
    }, [])
    return <div>Estúdio da tarefa</div>
  },
}))
mock.module('../../src/lib/api', () => ({
  apiSend: async (_path: string, _method: string, body: unknown) => {
    expect(saves).toBeGreaterThan(0)
    sends.push(body)
    return respond()
  },
}))
const { ArquipelagoChallengeDialog } = await import(
  '../../src/components/arquipelago-challenge-dialog'
)
const data: DesafioAberto = {
  id: 'db9ca185-3ce4-4eba-a07d-8cdba7a145fd',
  jogadorId: 'cabcfbd0-251b-4236-89aa-4e44fc03204d',
  revisao: 2,
  blocosPermitidos: ['mover'],
  titulo: 'Andar',
  enunciado: 'Ande',
  dicas: [],
  desafioExtra: null,
  objetivos: [{ id: 'o1', label: 'Ande para a direita', kind: 'game' }],
  projetoInicial: createBlankProjectSnapshot('initial', 'Andar'),
  ultimosResultados: [],
  concluido: false,
}
let cleanup: (() => Promise<void>) | undefined
afterEach(async () => {
  await cleanup?.()
  saves = 0
  failSave = false
  sends = []
  stored = null
  respond = async () => ({
    passou: true,
    resultados: [{ id: 'o1', passou: true }],
    concluidoAgora: true,
    extraAgora: false,
  })
})
async function render() {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container),
    finished: boolean[] = []
  await act(async () =>
    root.render(
      <ArquipelagoChallengeDialog
        desafio={data}
        audience="kids"
        onFinish={(c) => finished.push(c)}
      />,
    ),
  )
  cleanup = async () => {
    await act(async () => root.unmount())
    container.remove()
  }
  const click = async (label: string) => {
    const button = [...container.querySelectorAll('button')].find((b) => b.textContent === label)
    if (!button) throw Error(label)
    await act(async () => button.click())
  }
  return { container, finished, click }
}
test('restores draft and supplies the granted palette without free-product access', async () => {
  stored = {
    ...createBlankProjectSnapshot('saved', 'old'),
    files: { 'index.html': '', 'style.css': '', 'script.js': 'const progresso = 42' },
  }
  await render()
  expect(initial?.files?.['script.js']).toContain('42')
  expect(initial?.id).toContain('-r2')
  expect(grants).toEqual(['mover'])
})
test('verification flushes before posting the published revision and returns confirmed completion', async () => {
  const ui = await render()
  await ui.click('Verificar projeto')
  expect(sends[0]).toMatchObject({ revisao: 2, projeto: { id: initial?.id } })
  expect(ui.container.textContent).toContain('1/1')
  await ui.click('Voltar ao jogo')
  expect(ui.finished).toEqual([true])
})
test('failed save neither submits nor closes the draft', async () => {
  const ui = await render()
  failSave = true
  await ui.click('Verificar projeto')
  await ui.click('Voltar ao jogo')
  expect(sends).toEqual([])
  expect(ui.finished).toEqual([])
  expect(ui.container.textContent).toContain('rascunho')
})
test('verification failure preserves editor and does not claim completion', async () => {
  const ui = await render()
  respond = async () => {
    throw new Error('A revisão mudou. Abra novamente.')
  }
  await ui.click('Verificar projeto')
  expect(ui.container.textContent).toContain('A revisão mudou')
  await ui.click('Voltar ao jogo')
  expect(ui.finished).toEqual([false])
})
test('edits made during verification invalidate displayed feedback', async () => {
  const ui = await render()
  respond = async () => {
    changed?.()
    return {
      passou: true,
      resultados: [{ id: 'o1', passou: true }],
      concluidoAgora: true,
      extraAgora: false,
    }
  }
  await ui.click('Verificar projeto')
  expect(ui.container.textContent).toContain('O projeto mudou')
})
test('C02: o JavaScript em texto abre na Ponte; Python e Pro explicam que ainda não abrem no jogo', async () => {
  stored = { ...createBlankProjectSnapshot('saved', 'Ondas'), mode: 'bridge' }
  await render()
  expect(mode).toBe('bridge')
  await fechar()
  mode = undefined
  initial = null
  for (const outro of [{ programmingLanguage: 'python' as const }, { kind: 'pro' as const }]) {
    stored = { ...createBlankProjectSnapshot('saved', 'Outro'), ...outro } as EditableStudioProject
    const ui = await render()
    expect(ui.container.textContent).toContain('ainda não abrem dentro do jogo')
    expect(mode).toBeUndefined()
    await fechar()
  }
})
async function fechar() {
  const atual = cleanup
  cleanup = undefined
  await atual?.()
}
