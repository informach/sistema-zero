import { expect, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import {
  isInteractiveBlock,
  type LearningAnswers,
  type LearningResult,
  publicInteractiveBlock,
} from '@sistemazero/core/learning'
import manifest from '../../../docs/aulas-interativas/aulas/cade-todo-mundo-aula-1.manifesto.json'

// Este teste cobre o host e o contrato de mensagens. A execução do canvas é
// verificada no navegador real; o DOM de teste não executa scripts do iframe.
if (typeof document === 'undefined')
  GlobalRegistrator.register({
    settings: { handleDisabledFileLoadingAsSuccess: true },
  })
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { ProjectPlayActivityView } = await import(
  '../../member-shell/src/components/project-play-activity'
)
const { InteractiveLessonBlock } = await import(
  '../../member-shell/src/components/learning-activity'
)
const { LessonPreviewProvider } = await import(
  '../../member-shell/src/components/lesson-preview-context'
)

async function mount(initial: LearningAnswers = {}, participation = false) {
  const content: unknown = manifest.blocks.find((block) => block.key === 'jogo-pronto')?.content
  if (!isInteractiveBlock(content) || content.activity.type !== 'project-play')
    throw new Error('Jogo ausente')
  const activity = structuredClone(content.activity)
  if (participation) {
    activity.completion = 'participation'
    activity.targets = []
  }
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  let answers = initial
  const render = () =>
    root.render(
      <ProjectPlayActivityView
        activity={activity}
        answers={answers}
        onChange={(next) => {
          answers = next
          render()
        }}
      />,
    )
  await act(async () => render())
  const message = async (data: unknown, validSource = true) => {
    const source = validSource ? host.querySelector('iframe')?.contentWindow : window
    if (!source) throw new Error('Iframe ausente')
    await act(async () => window.dispatchEvent(new MessageEvent('message', { data, source })))
  }
  // O compilador do player é assíncrono. O load do placeholder não deixa o
  // modo de participação pronto para reiniciar; aguarde o documento jogável.
  const deadline = Date.now() + 3000
  while (host.querySelector('iframe')?.getAttribute('aria-busy') !== 'false') {
    if (Date.now() >= deadline) throw new Error('O documento do jogo não ficou pronto.')
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5))
    })
  }
  await message({ type: 'sz:g2d:ready' })
  await act(async () => host.querySelector('iframe')?.dispatchEvent(new Event('load')))
  return {
    get answers() {
      return answers
    },
    host,
    message,
    click: async (x: number, y: number) => message({ type: 'sz:g2d:group-click', x, y }),
    restart: async () => {
      const button = [...host.querySelectorAll('button')].find((b) =>
        b.textContent?.includes('Jogar de novo'),
      )
      if (!button) throw new Error('Botão ausente')
      const oldFrame = host.querySelector('iframe')
      await act(async () => button.click())
      expect(host.querySelector('iframe') === oldFrame).toBe(false)
      await message({ type: 'sz:g2d:ready' })
    },
    close: async () => {
      await act(async () => root.unmount())
      host.remove()
    },
  }
}

test('participação vem apenas do iframe do jogo e reiniciar preserva a conclusão', async () => {
  const view = await mount({}, true)
  try {
    expect(view.answers).toEqual({})
    await view.message({ type: 'sz:game-interaction' }, false)
    await view.click(137, 224)
    expect(view.answers).toEqual({})
    await view.message({ type: 'sz:game-interaction' })
    expect(view.answers).toEqual({ participated: true })
    await view.restart()
    expect(view.answers).toEqual({ participated: true })
  } finally {
    await view.close()
  }
})
test('a prévia reinicia sem somar descobertas de partidas incompletas', async () => {
  const view = await mount()
  try {
    await view.click(137, 224)
    await view.click(137, 224)
    expect(view.answers.foundTargets).toEqual(['arbusto'])
    await view.restart()
    expect(view.answers.foundTargets).toEqual([])
    await view.click(310, 226)
    expect(view.answers.foundTargets).toEqual(['pedras'])
    await view.message({ type: 'sz:g2d:group-click', x: 483, y: 210 }, false)
    expect(view.answers.foundTargets).toEqual(['pedras'])
  } finally {
    await view.close()
  }
})

test('jogar novamente preserva os achados que já concluíram o bloco', async () => {
  const completed = { foundTargets: ['arbusto', 'pedras', 'flores'] }
  const view = await mount(completed)
  try {
    await view.restart()
    expect(view.answers).toEqual(completed)
    await view.click(137, 224)
    expect(view.answers).toEqual(completed)
    const button = [...view.host.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Ampliar'),
    )
    if (!button) throw new Error('Botão ausente')
    await act(async () => button.click())
    expect(view.host.querySelector('[role="dialog"]')).not.toBeNull()
    await view.message({ type: 'sz:escape' }, false)
    expect(view.host.querySelector('[role="dialog"]')).not.toBeNull()
    await view.message({ type: 'sz:escape' })
    expect(view.host.querySelector('[role="dialog"]')).toBeNull()
  } finally {
    await view.close()
  }
})

test('a atividade não bloqueia voltar à aula enquanto a conclusão está sendo salva', async () => {
  const content: unknown = manifest.blocks.find((block) => block.key === 'jogo-pronto')?.content
  if (!isInteractiveBlock(content)) throw new Error('Jogo ausente')
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  let finish = () => {}
  const pending = new Promise<LearningResult>((resolve) => {
    finish = () =>
      resolve({ passed: true, participated: true, verifiedBy: 'client', feedback: 'Pronto!' })
  })
  try {
    await act(async () =>
      root.render(
        <LessonPreviewProvider
          value={{
            answers: { jogo: { foundTargets: ['arbusto', 'pedras', 'flores'] } },
            hintsUsed: {},
            results: {},
            workspaces: {},
            onWorkspaceChange: () => {},
            onProjectCheck: async () => '',
            onChange: () => {},
            onQuiz: async () => {},
            onAttempt: () => pending,
          }}
        >
          <InteractiveLessonBlock
            block={{
              id: 'jogo',
              kind: 'interactive',
              sortOrder: 0,
              content: publicInteractiveBlock(content),
            }}
            previewContent={content}
          />
        </LessonPreviewProvider>,
      ),
    )
    expect(host.querySelector('fieldset:disabled')).not.toBeNull()
    const button = [...host.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Ampliar jogo'),
    )
    if (!button) throw new Error('Botão ausente')
    expect(button.matches(':disabled')).toBe(false)
    await act(async () => button.click())
    expect(host.querySelector('[role="dialog"]')).not.toBeNull()
    expect(button.textContent).toContain('Voltar à aula')
    expect(button.matches(':disabled')).toBe(false)
    await act(async () => button.click())
    expect(host.querySelector('[role="dialog"]')).toBeNull()
  } finally {
    await act(async () => {
      finish()
      await pending
    })
    await act(async () => root.unmount())
    host.remove()
  }
})
