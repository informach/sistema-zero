import { afterAll, afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { cleanup, render, waitFor } from '@testing-library/react'
import { createEmptyProject } from '#core'

// bun:test não isola module mocks por arquivo: captura o Shell real antes e
// restaura no afterAll para não vazar o probe para os próximos arquivos.
const realShell = { ...(await import('../components/layout/Shell')) }

// idb-keyval mockado (sem restore, de propósito): IndexedDB não existe no
// happy-dom e o registry de módulos é compartilhado pela suíte toda.
mock.module('idb-keyval', () => ({
  createStore: mock(() => ({ name: 'test-store' })),
  del: mock(async () => undefined),
  delMany: mock(async () => undefined),
  get: mock(async (): Promise<unknown> => undefined),
  getMany: mock(async (): Promise<unknown[]> => []),
  keys: mock(async (): Promise<unknown[]> => []),
  set: mock(async () => undefined),
  setMany: mock(async () => undefined),
}))

const { useStudioConfig } = await import('./config')
const { useStudioActivity } = await import('./activity')
const { useStudioTutor } = await import('./tutor')
const { useProjectStore } = await import('../state/projectStore')

// Shell vira um PROBE que lê a CONFIG resolvida da instância (renderiza DENTRO
// dos providers do StudioCore).
function ConfigProbe(): React.JSX.Element {
  const config = useStudioConfig()
  const activity = useStudioActivity()
  const tutor = useStudioTutor()
  const projectId = useProjectStore((s) => s.project?.id ?? '')
  return (
    <div
      data-testid="config-probe"
      data-project={projectId}
      data-terminal={String(config.terminal)}
      data-ai={String(config.ai)}
      data-professional={String(config.professional)}
      data-export={String(config.export)}
      data-extensions={String(config.extensions)}
      data-preview={String(config.preview)}
      data-level={config.learning.level}
      data-activity={activity ? 'present' : 'none'}
      data-tutor={tutor.config ? 'present' : 'none'}
    />
  )
}

mock.module('../components/layout/Shell', () => ({ Shell: ConfigProbe }))

const { StudioEditor } = await import('./StudioEditor')

afterAll(() => {
  mock.module('../components/layout/Shell', () => realShell)
})

describe('StudioEditor', () => {
  beforeEach(() => {
    useProjectStore.setState({ project: null, isDirty: false, saveError: null })
  })

  afterEach(() => {
    cleanup()
  })

  it('abre com os defaults do editor (preview/console/extensões/export ON; terminal/IA/profissional OFF)', async () => {
    const { getByTestId } = render(
      <StudioEditor
        initialProject={createEmptyProject('editor-1', 'Editor 1')}
        persistence="none"
      />,
    )

    await waitFor(() => {
      expect(getByTestId('config-probe').getAttribute('data-project')).toBe('editor-1')
    })
    const probe = getByTestId('config-probe')
    expect(probe.getAttribute('data-preview')).toBe('true')
    expect(probe.getAttribute('data-export')).toBe('true')
    expect(probe.getAttribute('data-extensions')).toBe('true')
    // terminal/IA são opt-in (exigem COOP/COEP no host); profissional idem.
    expect(probe.getAttribute('data-terminal')).toBe('false')
    expect(probe.getAttribute('data-ai')).toBe('false')
    expect(probe.getAttribute('data-professional')).toBe('false')
  })

  it('abre a paleta CHEIA (topo da escada) — sem curadoria de aula', async () => {
    const { getByTestId } = render(
      <StudioEditor
        initialProject={createEmptyProject('editor-2', 'Editor 2')}
        persistence="none"
      />,
    )

    await waitFor(() => {
      expect(getByTestId('config-probe').getAttribute('data-project')).toBe('editor-2')
    })
    expect(getByTestId('config-probe').getAttribute('data-level')).toBe('avancado-3d')
  })

  it('o host liga terminal/IA via features', async () => {
    const { getByTestId } = render(
      <StudioEditor
        initialProject={createEmptyProject('editor-3', 'Editor 3')}
        persistence="none"
        features={{ terminal: true, ai: true }}
      />,
    )

    await waitFor(() => {
      expect(getByTestId('config-probe').getAttribute('data-project')).toBe('editor-3')
    })
    expect(getByTestId('config-probe').getAttribute('data-terminal')).toBe('true')
    expect(getByTestId('config-probe').getAttribute('data-ai')).toBe('true')
  })

  it('nunca provê atividade — o editor puro não paga pela feature de aula', async () => {
    const { getByTestId } = render(
      <StudioEditor
        initialProject={createEmptyProject('editor-4', 'Editor 4')}
        persistence="none"
      />,
    )

    await waitFor(() => {
      expect(getByTestId('config-probe').getAttribute('data-project')).toBe('editor-4')
    })
    expect(getByTestId('config-probe').getAttribute('data-activity')).toBe('none')
  })

  it('provê o tutor somente quando o host do editor injeta o adapter', async () => {
    const adapter = {
      loadHistory: async () => [],
      deleteHistory: async () => undefined,
      ask: async () => {
        throw new Error('não chamado neste teste')
      },
      feedback: async () => undefined,
    }
    const { getByTestId } = render(
      <StudioEditor
        initialProject={createEmptyProject('editor-zappy', 'Editor Zappy')}
        persistence="none"
        tutor={{ adapter }}
      />,
    )

    await waitFor(() => {
      expect(getByTestId('config-probe').getAttribute('data-project')).toBe('editor-zappy')
    })
    expect(getByTestId('config-probe').getAttribute('data-tutor')).toBe('present')
  })
})
