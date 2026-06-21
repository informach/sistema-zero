import { afterAll, afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { cleanup, render, waitFor } from '@testing-library/react'
import { createRef } from 'react'
import { createEmptyProject } from '#core'
import type { StudioHandle } from './types'

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
const { useProjectStore } = await import('../state/projectStore')

// Shell vira um PROBE que lê a CONFIG e a ATIVIDADE resolvidas da instância
// (renderiza DENTRO dos providers do StudioCore). As estáticas useXStore.getState
// leem a store default — não servem para inspecionar a config de uma instância.
function ConfigProbe(): React.JSX.Element {
  const config = useStudioConfig()
  const activity = useStudioActivity()
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
      data-level={config.learning.level}
      data-reveal={String(config.learning.allowLevelReveal)}
      data-activity={activity ? 'present' : 'none'}
    />
  )
}

mock.module('../components/layout/Shell', () => ({ Shell: ConfigProbe }))

const { StudioLesson } = await import('./StudioLesson')

afterAll(() => {
  mock.module('../components/layout/Shell', () => realShell)
})

describe('StudioLesson', () => {
  beforeEach(() => {
    // A store DEFAULT é singleton de módulo compartilhado pela suíte — zera para
    // as asserções valerem por si (ver Studio.test.tsx).
    useProjectStore.setState({ project: null, isDirty: false, saveError: null })
  })

  afterEach(() => {
    cleanup()
  })

  it('aplica os defaults restritos da aula (terminal/IA/profissional/export OFF) sem features', async () => {
    const { getByTestId } = render(
      <StudioLesson initialProject={createEmptyProject('lesson-1', 'Aula 1')} persistence="none" />,
    )

    await waitFor(() => {
      expect(getByTestId('config-probe').getAttribute('data-project')).toBe('lesson-1')
    })
    const probe = getByTestId('config-probe')
    expect(probe.getAttribute('data-terminal')).toBe('false')
    expect(probe.getAttribute('data-ai')).toBe('false')
    expect(probe.getAttribute('data-professional')).toBe('false')
    expect(probe.getAttribute('data-export')).toBe('false')
  })

  it('as features do chamador sobrescrevem os defaults restritos', async () => {
    const { getByTestId } = render(
      <StudioLesson
        initialProject={createEmptyProject('lesson-2', 'Aula 2')}
        persistence="none"
        features={{ export: true }}
      />,
    )

    await waitFor(() => {
      expect(getByTestId('config-probe').getAttribute('data-project')).toBe('lesson-2')
    })
    // O override liga export; os demais defaults restritos seguem.
    expect(getByTestId('config-probe').getAttribute('data-export')).toBe('true')
    expect(getByTestId('config-probe').getAttribute('data-terminal')).toBe('false')
  })

  it('as props de aprendizado fluem para config.learning', async () => {
    const { getByTestId } = render(
      <StudioLesson
        initialProject={createEmptyProject('lesson-3', 'Aula 3')}
        persistence="none"
        level="iniciante"
        allowLevelReveal={false}
      />,
    )

    await waitFor(() => {
      expect(getByTestId('config-probe').getAttribute('data-project')).toBe('lesson-3')
    })
    expect(getByTestId('config-probe').getAttribute('data-level')).toBe('iniciante')
    expect(getByTestId('config-probe').getAttribute('data-reveal')).toBe('false')
  })

  it('sem activity, o contexto de atividade é null (painel não renderiza nada)', async () => {
    const { getByTestId } = render(
      <StudioLesson initialProject={createEmptyProject('lesson-4', 'Aula 4')} persistence="none" />,
    )

    await waitFor(() => {
      expect(getByTestId('config-probe').getAttribute('data-project')).toBe('lesson-4')
    })
    expect(getByTestId('config-probe').getAttribute('data-activity')).toBe('none')
  })

  it('com activity, o contexto entrega a atividade ao layout', async () => {
    const { getByTestId } = render(
      <StudioLesson
        initialProject={createEmptyProject('lesson-5', 'Aula 5')}
        persistence="none"
        activity={{ instructions: 'Faça um botão que conta cliques', checks: [] }}
      />,
    )

    await waitFor(() => {
      expect(getByTestId('config-probe').getAttribute('data-project')).toBe('lesson-5')
    })
    expect(getByTestId('config-probe').getAttribute('data-activity')).toBe('present')
  })

  it('re-render do host com allowedModes/allowBlocks inline NÃO descarta edições não salvas', async () => {
    const handleRef = createRef<StudioHandle>()
    const project = createEmptyProject('lesson-keep', 'Manter')
    // Arrays INLINE: o host recria a referência a cada render — o wrapper NÃO pode
    // vencer a memoização de chave primitiva do StudioCore (senão re-hidrataria).
    const { getByTestId, rerender } = render(
      <StudioLesson
        ref={handleRef}
        initialProject={project}
        persistence="none"
        allowedModes={['blocks', 'bridge']}
        allowBlocks={['sz_variables_set']}
      />,
    )

    await waitFor(() => {
      expect(getByTestId('config-probe').getAttribute('data-project')).toBe('lesson-keep')
    })

    // Edição não salva (troca de modo marca sujo). D2: básico = Blocos/Ponte.
    handleRef.current?.setMode('bridge')
    await waitFor(() => {
      expect(handleRef.current?.isDirty()).toBe(true)
    })

    rerender(
      <StudioLesson
        ref={handleRef}
        initialProject={project}
        persistence="none"
        allowedModes={['blocks', 'bridge']}
        allowBlocks={['sz_variables_set']}
      />,
    )

    // A edição sobrevive ao re-render (não re-hidratou do snapshot original).
    expect(handleRef.current?.isDirty()).toBe(true)
    expect(handleRef.current?.getProject()?.mode).toBe('bridge')
  })
})
