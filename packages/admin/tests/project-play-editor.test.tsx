import { expect, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import type { ProjectPlayActivity } from '@sistemazero/core/learning'
import { montarProjetoCadeTodoMundoCompleto } from '../../../docs/aulas-interativas/qa/cade-todo-mundo-projeto'
import { newProjectPlayActivity } from '../src/lib/project-play-authoring'

if (typeof document === 'undefined')
  GlobalRegistrator.register({ settings: { handleDisabledFileLoadingAsSuccess: true } })
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { ProjectPlayEditor } = await import('../src/components/editor/project-play-editor')

test('importação pendente usa os campos e o callback atuais, sem desfazer outra edição', async () => {
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  let value = newProjectPlayActivity()
  let version = 'antes'
  let callbackVersion = ''
  let finish: (text: string) => void = () => {}
  const pending = new Promise<string>((resolve) => {
    finish = resolve
  })
  const file = new File([], 'jogo.json')
  Object.defineProperty(file, 'text', { value: () => pending })
  const render = () => {
    const capturedVersion = version
    root.render(
      <ProjectPlayEditor
        value={value}
        onChange={(next) => {
          callbackVersion = capturedVersion
          value = next
          render()
        }}
      />,
    )
  }
  try {
    await act(async () => render())
    const input = host.querySelector<HTMLInputElement>('input[type="file"]')
    if (!input) throw new Error('Upload ausente')
    Object.defineProperty(input, 'files', { configurable: true, value: [file] })
    await act(async () => input.dispatchEvent(new Event('change', { bubbles: true })))
    value = { ...value, stage: { width: 640, height: 360 } }
    version = 'depois'
    await act(async () => render())
    await act(async () => {
      finish(JSON.stringify(montarProjetoCadeTodoMundoCompleto()))
      await pending
    })
    expect(value.stage).toEqual({ width: 640, height: 360 })
    expect(callbackVersion).toBe('depois')
  } finally {
    await act(async () => root.unmount())
    host.remove()
  }
})

test('formulário importa, preserva o projeto diante de erro e configura alvos manualmente', async () => {
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  let value: ProjectPlayActivity = newProjectPlayActivity()
  const render = () =>
    root.render(
      <ProjectPlayEditor
        value={value}
        onChange={(next) => {
          value = next
          render()
        }}
      />,
    )
  const upload = async (text: string) => {
    const input = host.querySelector<HTMLInputElement>('input[type="file"]')
    if (!input) throw new Error('Upload ausente')
    Object.defineProperty(input, 'files', {
      configurable: true,
      value: [new File([text], 'jogo.szproject.json', { type: 'application/json' })],
    })
    await act(async () => {
      input.dispatchEvent(new Event('change', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 50))
    })
  }
  const click = async (text: string) => {
    const button = [...host.querySelectorAll('button')].find((b) => b.textContent === text)
    if (!button) throw new Error(`Botão ausente: ${text}`)
    await act(async () => button.click())
  }
  try {
    await act(async () => render())
    expect(value.completion).toBe('participation')
    const project = montarProjetoCadeTodoMundoCompleto()
    await upload(JSON.stringify(project))
    expect(host.textContent).toContain(`Projeto carregado: ${project.name}`)
    const saved = value.project
    await upload('{')
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('JSON')
    expect(value.project).toBe(saved)
    const select = host.querySelector('select')
    if (!select) throw new Error('Critério ausente')
    await act(async () => {
      select.value = 'targets'
      select.dispatchEvent(new Event('change', { bubbles: true }))
    })
    expect(value.completion).toBe('targets')
    expect(host.textContent).toContain('inclua pelo menos um')
    await click('Adicionar alvo')
    expect(value.targets).toHaveLength(1)
    expect(host.querySelectorAll('input[type="number"]')).toHaveLength(6)
    await click('Remover alvo 1')
    expect(value.targets).toHaveLength(0)
  } finally {
    await act(async () => root.unmount())
    host.remove()
  }
})
