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
let props: Record<string, unknown> = {}
let sends: unknown[] = []
let paths: string[] = []
let environmentRequests: unknown[] = []
const environment = { signal: new AbortController().signal, marca: 'ambiente-do-desafio' }
let respond = async () => ({
  passou: true,
  resultados: [{ id: 'o1', passou: true }],
  concluidoAgora: true,
  extraAgora: false,
})
mock.module('@sistemazero/studio', () => ({
  STUDIO_PRO_BUILD_LIMITS: { maxBffRequestBytes: 1 },
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
    capturar(props)
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
function capturar(valor: Record<string, unknown>) {
  props = valor
}
mock.module('@sistemazero/studio/challenge-runtime', () => ({
  createArquipelagoChallengeRuntimeEnvironment: async (opcoes: {
    context: unknown
    userId: string
    request(pedido: unknown, signal: AbortSignal): Promise<unknown>
  }) => {
    environmentRequests.push({ context: opcoes.context, userId: opcoes.userId })
    await opcoes.request({ operation: 'analyze' }, new AbortController().signal)
    return environment
  },
}))
mock.module('../../src/lib/api', () => ({
  apiSend: async (path: string, _method: string, body: unknown) => {
    paths.push(path)
    if (path.endsWith('/ambiente')) return { decisao: true }
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
  paths = []
  environmentRequests = []
  props = {}
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
test('C02: o JavaScript em texto abre na Ponte com a paleta do jogo e sem ambiente Python', async () => {
  stored = { ...createBlankProjectSnapshot('saved', 'Ondas'), mode: 'bridge' }
  await render()
  expect(mode).toBe('bridge')
  expect(grants).toEqual(['mover'])
  expect(props.runtimeEnvironment).toBeUndefined()
  expect(props.proRuntime).toBeUndefined()
  expect(environmentRequests).toEqual([])
})
test('C02b: o Python abre com o ambiente do desafio, pedido ao jogo, sem a paleta do JavaScript', async () => {
  stored = {
    ...createBlankProjectSnapshot('saved', 'Mira'),
    programmingLanguage: 'python',
    mode: 'bridge',
  } as unknown as EditableStudioProject
  const ui = await render()
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0))
  })
  expect(environmentRequests).toEqual([
    {
      userId: data.jogadorId,
      context: {
        audience: 'kids',
        desafioId: data.id,
        revisao: 2,
        projectId: initial?.id,
      },
    },
  ])
  expect(paths).toEqual([`/api/arquipelago/desafios/${data.id}/ambiente`])
  expect(props.runtimeEnvironment).toBe(environment)
  expect(mode).toBe('bridge')
  expect(grants).toBeUndefined()
  expect(props.pythonLevel).toBe(3)
  await ui.click('Verificar projeto')
  expect(sends[0]).toMatchObject({ revisao: 2 })
})
test('C02b: o Pro abre no código com o compilador do desafio e sem a paleta do JavaScript', async () => {
  stored = {
    ...createBlankProjectSnapshot('saved', 'Grade'),
    kind: 'pro',
    mode: 'code',
  } as unknown as EditableStudioProject
  await render()
  expect(mode).toBe('code')
  expect(props.allowedModes).toEqual(['code'])
  expect(grants).toBeUndefined()
  expect(props.features).toEqual({ extensions: false, professional: true })
  expect(typeof (props.proRuntime as { build?: unknown })?.build).toBe('function')
  expect(environmentRequests).toEqual([])
})
