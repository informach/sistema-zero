import { afterAll, afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { cleanup, render, waitFor } from '@testing-library/react'
import { createRef } from 'react'
import { createEmptyProject } from '#core'
import type { StudioHandle } from './types'

// bun:test não isola module mocks por arquivo: restaura o Shell real no
// afterAll para não vazar o stub para os próximos arquivos da suíte.
const realShell = { ...(await import('../components/layout/Shell')) }

// idb-keyval mockado (sem restore, de propósito): o IndexedDB real não existe
// no happy-dom e o registry de módulos é compartilhado pela suíte toda.
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

const { useProjectStore, sanitizeProjectForHost, PROJECT_FILE_LIMITS } = await import(
  '../state/projectStore'
)
const { useUIStore } = await import('../state/uiStore')

// O Shell vira um PROBE: renderiza por DENTRO do provider da instância, então
// os hooks aqui leem as stores POR INSTÂNCIA (as estáticas useXStore.getState
// leem a default — não servem para inspecionar um <Studio>).
function ShellProbe(): React.JSX.Element {
  const projectId = useProjectStore((s) => s.project?.id ?? '')
  const mode = useProjectStore((s) => s.project?.mode ?? '')
  const isDirty = useProjectStore((s) => s.isDirty)
  const previewRunning = useUIStore((s) => s.previewRunning)
  return (
    <div
      data-testid="editor-shell"
      data-project={projectId}
      data-mode={mode}
      data-dirty={String(isDirty)}
      data-preview={String(previewRunning)}
    />
  )
}

mock.module('../components/layout/Shell', () => ({
  Shell: ShellProbe,
}))

const { Studio } = await import('./Studio')
const { setAutosaveDelayForTests } = await import('../persistence/service')

afterAll(() => {
  mock.module('../components/layout/Shell', () => realShell)
})

describe('Studio', () => {
  beforeEach(() => {
    // A store DEFAULT é compartilhada pela suíte inteira (singleton de módulo):
    // outro ARQUIVO pode ter deixado um projeto residual nela, e a ordem dos
    // arquivos varia entre SOs (no Linux, extraFilesPreservation.test rodava
    // antes e a asserção de isolamento abaixo via o resíduo — CI vermelho).
    // Zera para a prova de isolamento valer por si.
    useProjectStore.setState({ project: null, isDirty: false, saveError: null })
  })

  afterEach(() => {
    cleanup()
  })

  it('hidrata o initialProject na store DA INSTÂNCIA, sem sujar e com preview ligado', async () => {
    const project = createEmptyProject('project-1', 'Projeto 1')

    const { getByTestId } = render(<Studio initialProject={project} />)

    await waitFor(() => {
      expect(getByTestId('editor-shell').getAttribute('data-project')).toBe('project-1')
    })
    expect(getByTestId('editor-shell').getAttribute('data-dirty')).toBe('false')
    expect(getByTestId('editor-shell').getAttribute('data-preview')).toBe('true')
    // A store default (fora de qualquer Studio) permanece intocada — prova do
    // isolamento por instância.
    expect(useProjectStore.getState().project).toBeNull()
  })

  it('duas instâncias na mesma página não compartilham estado', async () => {
    const a = createEmptyProject('project-a', 'A')
    const b = createEmptyProject('project-b', 'B')

    const { getAllByTestId } = render(
      <>
        <Studio initialProject={a} />
        <Studio initialProject={b} />
      </>,
    )

    await waitFor(() => {
      const probes = getAllByTestId('editor-shell')
      expect(probes.map((p) => p.getAttribute('data-project'))).toEqual(['project-a', 'project-b'])
    })
  })

  it('renderiza aviso quando o initialProject é inválido', () => {
    const { getByText } = render(
      <Studio initialProject={{ id: 'x' } as Parameters<typeof Studio>[0]['initialProject']} />,
    )
    expect(getByText(/Projeto inválido/)).toBeTruthy()
  })

  it('persistence none entrega onChange no debounce e o handle expõe o projeto', async () => {
    setAutosaveDelayForTests(10)
    const changes: string[] = []
    const handleRef = createRef<StudioHandle>()
    render(
      <Studio
        ref={handleRef}
        initialProject={createEmptyProject('project-h', 'Handle')}
        persistence="none"
        onChange={(project) => changes.push(project.mode)}
      />,
    )

    await waitFor(() => {
      expect(handleRef.current?.getProject()?.id).toBe('project-h')
    })
    expect(handleRef.current?.isDirty()).toBe(false)

    handleRef.current?.setMode('code')
    expect(handleRef.current?.isDirty()).toBe(true)

    await waitFor(() => {
      expect(changes).toContain('code')
    })
    // Snapshot entregue ao host conta como salvo.
    await waitFor(() => {
      expect(handleRef.current?.isDirty()).toBe(false)
    })
    setAutosaveDelayForTests(null)
  })

  it('escopa o tema no root via data-sz-theme', async () => {
    const project = createEmptyProject('project-3', 'Projeto 3')
    const { container } = render(<Studio initialProject={project} theme="light" />)

    await waitFor(() => {
      expect(container.querySelector('[data-sz-theme="light"]')).toBeTruthy()
    })
    expect(document.documentElement.getAttribute('data-sz-theme')).toBeNull()
  })

  it('re-render do host com allowedModes inline NÃO descarta edições não salvas', async () => {
    const handleRef = createRef<StudioHandle>()
    const project = createEmptyProject('project-keep', 'Manter')
    // Array INLINE: o host recria a referência a cada render, mas o conteúdo é o
    // mesmo. Antes, isso re-rodava resolveStudioConfig → re-sanitize → re-hidrata.
    const { getByTestId, rerender } = render(
      <Studio ref={handleRef} initialProject={project} allowedModes={['blocks', 'code']} />,
    )

    await waitFor(() => {
      expect(getByTestId('editor-shell').getAttribute('data-project')).toBe('project-keep')
    })

    // Edição não salva do aluno (troca de modo marca sujo).
    handleRef.current?.setMode('code')
    await waitFor(() => {
      expect(getByTestId('editor-shell').getAttribute('data-dirty')).toBe('true')
    })
    expect(getByTestId('editor-shell').getAttribute('data-mode')).toBe('code')

    // Re-render do host com um NOVO array inline de conteúdo igual.
    rerender(<Studio ref={handleRef} initialProject={project} allowedModes={['blocks', 'code']} />)

    // A edição e o estado sujo sobrevivem (não re-hidratou do snapshot original).
    expect(getByTestId('editor-shell').getAttribute('data-mode')).toBe('code')
    expect(getByTestId('editor-shell').getAttribute('data-dirty')).toBe('true')
    expect(handleRef.current?.isDirty()).toBe(true)
  })

  it('ligar professional numa instância montada re-coage o modo ativo proibido', async () => {
    const project = createEmptyProject('project-coerce', 'Coerção')
    // Começa não-pro: modo blocks é permitido.
    const { getByTestId, rerender } = render(<Studio initialProject={project} />)

    await waitFor(() => {
      expect(getByTestId('editor-shell').getAttribute('data-mode')).toBe('blocks')
    })

    // Host liga o modo profissional na MESMA instância: config.allowedModes vira
    // ['code'], então a aba ativa 'blocks' fica proibida. A coerção precisa
    // recomputar (memo keyado nos modos RESOLVIDOS, não na prop allowedModes) e
    // cair no primeiro permitido ('code').
    rerender(<Studio initialProject={project} features={{ professional: true }} />)

    await waitFor(() => {
      expect(getByTestId('editor-shell').getAttribute('data-mode')).toBe('code')
    })
  })

  it('onReady dispara 1x por projeto e re-arma após replaceProject', async () => {
    const handleRef = createRef<StudioHandle>()
    const readyIds: string[] = []
    render(
      <Studio
        ref={handleRef}
        initialProject={createEmptyProject('project-r1', 'R1')}
        onReady={() => readyIds.push(handleRef.current?.getProject()?.id ?? '')}
      />,
    )

    await waitFor(() => {
      expect(readyIds).toEqual(['project-r1'])
    })

    // Troca o projeto pelo handle → unload + re-hidrata: onReady re-dispara.
    handleRef.current?.replaceProject(createEmptyProject('project-r2', 'R2'))
    await waitFor(() => {
      expect(readyIds).toEqual(['project-r1', 'project-r2'])
    })
  })
})

describe('sanitizeProjectForHost — teto combinado de arquivos', () => {
  it('derruba extras quando canônicos + extras excedem o limite total', () => {
    // Canônicos e extras são limitados INDEPENDENTE (cada grupo ≤ maxTotalChars),
    // então a soma podia chegar a ~2x o limite. Cada arquivo aqui passa nos
    // limites individuais, mas a SOMA estoura — os extras devem ser podados.
    const fileChars = PROJECT_FILE_LIMITS.maxFileChars
    const big = 'a'.repeat(fileChars)
    const project = sanitizeProjectForHost({
      id: 'oversized',
      name: 'Grande',
      files: { 'index.html': big, 'style.css': big, 'script.js': big }, // 3x = total canônico
      extraFiles: [
        { name: 'extra-a.js', content: big }, // estouraria o combinado
        { name: 'extra-b.js', content: big },
      ],
    })

    expect(project).not.toBeNull()
    const extras = project?.extraFiles ?? []
    // Pelo menos um extra foi podado para caber no limite combinado.
    expect(extras.length).toBeLessThan(2)
    const total =
      (project?.files['index.html'].length ?? 0) +
      (project?.files['style.css'].length ?? 0) +
      (project?.files['script.js'].length ?? 0) +
      extras.reduce((sum, f) => sum + f.content.length, 0)
    expect(total).toBeLessThanOrEqual(PROJECT_FILE_LIMITS.maxTotalChars)
  })
})
