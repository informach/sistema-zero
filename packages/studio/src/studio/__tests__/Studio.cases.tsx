import { afterAll, afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { act, cleanup, render, waitFor } from '@testing-library/react'
import { createRef, StrictMode, useEffect } from 'react'
import { createEmptyProject, isBlockTypeAllowed } from '#core'
import { fakeUseStore } from '../../testing/fakeIdbStore'
import { useStudioConfig } from '../config'
import { useT } from '../i18n'
import type { StudioHandle } from '../types'

// bun:test não isola module mocks por arquivo: restaura o Shell real no
// afterAll para não vazar o stub para os próximos arquivos da suíte.
const realShell = { ...(await import('../../components/layout/Shell')) }
const realThumbCapture = { ...(await import('../../cover/thumbCapture')) }
const captureAndStoreProjectThumb = mock(async () => undefined)

mock.module('../../cover/thumbCapture', () => ({
  ...realThumbCapture,
  captureAndStoreProjectThumb,
}))

// idb-keyval mockado (sem restore, de propósito): o IndexedDB real não existe
// no happy-dom e o registry de módulos é compartilhado pela suíte toda.
mock.module('idb-keyval', () => ({
  createStore: mock((dbName: string) => fakeUseStore(dbName)),
  del: mock(async () => undefined),
  delMany: mock(async () => undefined),
  get: mock(async (): Promise<unknown> => undefined),
  getMany: mock(async (): Promise<unknown[]> => []),
  keys: mock(async (): Promise<unknown[]> => []),
  set: mock(async () => undefined),
  setMany: mock(async () => undefined),
}))

const { useProjectStore, useProjectStoreApi, sanitizeProjectForHost, PROJECT_FILE_LIMITS } =
  await import('../../state/projectStore')
const { useUIStore } = await import('../../state/uiStore')
const { usePendingEditorEdits } = await import('../../state/studioStores')

let observedProjectStore: ReturnType<typeof useProjectStoreApi> | undefined
let pendingEditorCode: string | null = null
let pendingEditorRegistered = false

// O Shell vira um PROBE: renderiza por DENTRO do provider da instância, então
// os hooks aqui leem as stores POR INSTÂNCIA (as estáticas useXStore.getState
// leem a default — não servem para inspecionar um <Studio>).
function ShellProbe(): React.JSX.Element {
  observedProjectStore = useProjectStoreApi()
  const t = useT()
  const { learning } = useStudioConfig()
  const projectId = useProjectStore((s) => s.project?.id ?? '')
  const mode = useProjectStore((s) => s.project?.mode ?? '')
  const isDirty = useProjectStore((s) => s.isDirty)
  const setFile = useProjectStore((s) => s.setFile)
  const previewRunning = useUIStore((s) => s.previewRunning)
  const pendingEdits = usePendingEditorEdits()
  useEffect(() => {
    if (!pendingEdits || pendingEditorCode === null) return
    const code = pendingEditorCode
    pendingEditorRegistered = true
    const unregister = pendingEdits.register(() => setFile('script.js', code))
    return () => {
      pendingEditorRegistered = false
      unregister()
    }
  }, [pendingEdits, setFile])
  return (
    <div
      data-testid="editor-shell"
      data-project={projectId}
      data-mode={mode}
      data-dirty={String(isDirty)}
      data-preview={String(previewRunning)}
      data-blocks-label={t('mode.blocks')}
      data-granted-blocks={JSON.stringify(learning.grantedBlockIds)}
      data-granted-extensions={JSON.stringify(learning.allowExtensions)}
      data-offered-course-check={JSON.stringify(
        ['sz_js_if_else', 'sz_val_number'].filter((id) =>
          isBlockTypeAllowed(id, 'iniciante-2d', learning),
        ),
      )}
    />
  )
}

mock.module('../../components/layout/Shell', () => ({
  Shell: ShellProbe,
}))

const { Studio } = await import('../Studio')
const { setAutosaveDelayForTests } = await import('../../persistence/service')

afterAll(() => {
  mock.module('../../components/layout/Shell', () => realShell)
  mock.module('../../cover/thumbCapture', () => realThumbCapture)
})

describe('Studio', () => {
  beforeEach(() => {
    observedProjectStore = undefined
    pendingEditorCode = null
    pendingEditorRegistered = false
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

  it('course and extension grants change without replacing source or lesson curation', async () => {
    const project = createEmptyProject('course-grants', 'Curso Python')
    const handle = createRef<StudioHandle>()
    const view = render(
      <Studio
        ref={handle}
        initialProject={project}
        persistence="none"
        grantedBlockIds={['sz_js_if_else']}
        allowExtensions={[]}
      />,
    )
    await waitFor(() => expect(view.getByTestId('editor-shell').dataset.project).toBe(project.id))
    expect(view.getByTestId('editor-shell').dataset.offeredCourseCheck).toBe('["sz_js_if_else"]')
    view.rerender(
      <Studio
        ref={handle}
        initialProject={project}
        persistence="none"
        grantedBlockIds={['sz_js_if_else', 'sz_val_number']}
        allowExtensions={['game-2d']}
      />,
    )
    await waitFor(() =>
      expect(view.getByTestId('editor-shell').dataset.offeredCourseCheck).toBe(
        '["sz_js_if_else","sz_val_number"]',
      ),
    )
    expect(view.getByTestId('editor-shell').dataset.grantedExtensions).toBe('["game-2d"]')
    expect(handle.current?.getProject()?.files).toEqual(project.files)
    view.rerender(
      <Studio ref={handle} initialProject={project} persistence="none" grantedBlockIds={[]} />,
    )
    expect(view.getByTestId('editor-shell').dataset.grantedBlocks).toBe('[]')
    expect(view.getByTestId('editor-shell').dataset.offeredCourseCheck).toBe('[]')
    expect(handle.current?.getProject()?.files).toEqual(project.files)
  })

  it.each([
    'javascript',
    'python',
  ] as const)('revoking and restoring %s extensions preserves the open source and visual draft', async (language) => {
    const fixture =
      language === 'python'
        ? await (await import('../../state/fixtures/pythonEnvironment')).pythonEnvironmentFixture(
            'classic',
          )
        : null
    const project = fixture?.project ?? createEmptyProject('authority-lifecycle', 'Meu jogo')
    const extensionId = language === 'python' ? 'turtle' : 'game-2d'
    project.installedExtensions = [{ id: extensionId, version: '1.0.0', installedAt: 1 }]
    const handle = createRef<StudioHandle>()
    const onReady = mock(() => {})
    const props = {
      ref: handle,
      initialProject: project,
      persistence: 'none' as const,
      autoRun: false,
      onReady,
      runtimeEnvironment: fixture?.environment,
    }
    const view = render(<Studio {...props} allowExtensions={[extensionId]} />)
    await waitFor(() => expect(view.getByTestId('editor-shell').dataset.project).toBe(project.id))
    const store = observedProjectStore
    if (!store) throw new Error('Missing instance store')
    await act(async () => {
      if (language === 'python') {
        expect(store.getState().setPythonFile('main.py', 'speed = 7\n')).toBeNull()
        const current = store.getState().project
        if (current?.programmingLanguage !== 'python' || current.kind !== 'classic')
          throw new Error('Missing Python document')
        const { createPythonWorkspaceDraft, updatePythonWorkspaceDraft } = await import(
          '../../python/blocks/workspaceDraft'
        )
        const draft = createPythonWorkspaceDraft(
          current,
          'main.py',
          { blocks: { languageVersion: 0, blocks: [] } },
          [],
        )
        expect(
          store
            .getState()
            .applyPythonSourceFiles(
              current,
              current.files,
              updatePythonWorkspaceDraft(current, 'main.py', draft),
            ),
        ).toBeNull()
      } else {
        store.getState().setFile('script.js', 'const speed = 7;')
        store.getState().setBlocksState({
          blocks: {
            languageVersion: 0,
            blocks: [{ type: 'sz_val_number', id: 'edited', fields: { NUM: 7 } }],
          },
        })
      }
    })
    const edited = store.getState().project
    expect(edited?.files).not.toEqual(project.files)
    expect(edited?.blocksState).toBeTruthy()
    view.rerender(<Studio {...props} allowExtensions={[]} />)
    await waitFor(() => expect(view.queryByTestId('editor-shell')).toBeNull())
    expect(
      view.getByText(/Este projeto usa ferramentas que você ainda vai conquistar/),
    ).toBeTruthy()
    expect(store.getState().project).toBe(edited)
    expect(handle.current?.getProject()?.blocksState).toEqual(edited?.blocksState)
    view.rerender(<Studio {...props} allowExtensions={[extensionId]} />)
    await waitFor(() => expect(view.getByTestId('editor-shell').dataset.project).toBe(project.id))
    expect(store.getState().project).toBe(edited)
    expect(handle.current?.getProject()?.files).toEqual(edited?.files)
    expect(handle.current?.getProject()?.blocksState).toEqual(edited?.blocksState)
    expect(onReady).toHaveBeenCalledTimes(1)
    const dirty = store.getState().isDirty
    view.rerender(<Studio {...props} allowExtensions={[extensionId]} allowedModes={['bridge']} />)
    await waitFor(() => expect(view.getByTestId('editor-shell').dataset.mode).toBe('bridge'))
    expect(store.getState().project?.files).toBe(edited?.files)
    expect(store.getState().project?.blocksState).toBe(edited?.blocksState)
    expect(store.getState().isDirty).toBe(dirty)
    view.rerender(
      <Studio {...props} allowExtensions={[extensionId]} allowedModes={['blocks', 'bridge']} />,
    )
    expect(store.getState().project?.mode).toBe('bridge')
    expect(store.getState().project?.files).toBe(edited?.files)
    expect(store.getState().project?.blocksState).toBe(edited?.blocksState)
    expect(onReady).toHaveBeenCalledTimes(1)
  })

  it.each([
    'javascript',
    'python',
  ] as const)('a blocked initial %s document opens once when its extension is granted', async (language) => {
    const fixture =
      language === 'python'
        ? await (await import('../../state/fixtures/pythonEnvironment')).pythonEnvironmentFixture(
            'classic',
          )
        : null
    const project = fixture?.project ?? createEmptyProject('initial-locked', 'Meu jogo')
    const extensionId = language === 'python' ? 'turtle' : 'game-2d'
    project.installedExtensions = [{ id: extensionId, version: '1.0.0', installedAt: 1 }]
    const ref = createRef<StudioHandle>()
    const onReady = mock(() => {})
    const props = {
      ref,
      initialProject: project,
      persistence: 'none' as const,
      autoRun: false,
      onReady,
      runtimeEnvironment: fixture?.environment,
    }
    const view = render(<Studio {...props} allowExtensions={[]} />)
    await waitFor(() =>
      expect(
        view.getByText(/Este projeto usa ferramentas que você ainda vai conquistar/),
      ).toBeTruthy(),
    )
    expect(view.queryByTestId('editor-shell')).toBeNull()
    expect(ref.current?.getProject()).toBeNull()
    expect(onReady).not.toHaveBeenCalled()
    view.rerender(<Studio {...props} allowExtensions={[extensionId]} />)
    await waitFor(() => expect(view.getByTestId('editor-shell').dataset.project).toBe(project.id))
    expect(ref.current?.getProject()?.files).toEqual(project.files)
    expect(onReady).toHaveBeenCalledTimes(1)
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

  it('duas instâncias podem renderizar locales diferentes sem last-mount-wins', async () => {
    const { getAllByTestId } = render(
      <>
        <Studio initialProject={createEmptyProject('locale-pt', 'PT')} locale="pt-BR" />
        <Studio initialProject={createEmptyProject('locale-en', 'EN')} locale="en" />
      </>,
    )

    await waitFor(() => {
      expect(
        getAllByTestId('editor-shell').map((probe) => probe.getAttribute('data-blocks-label')),
      ).toEqual(['Blocos', 'Blocks'])
    })
  })

  it('renderiza aviso quando o initialProject é inválido', async () => {
    const { getByText } = render(
      <Studio initialProject={{ id: 'x' } as Parameters<typeof Studio>[0]['initialProject']} />,
    )
    await waitFor(() => expect(getByText(/nome e arquivos válidos/)).toBeTruthy())
  })

  it('preserva, mas não abre projeto com extensão ainda não liberada pelo host', async () => {
    const project = createEmptyProject('project-locked-extension', 'Projeto 3D futuro')
    project.installedExtensions = [{ id: 'game-3d', version: '1.0.0', installedAt: 1 }]

    const { getByText, queryByTestId } = render(
      <Studio initialProject={project} allowExtensions={['game-2d']} />,
    )

    await waitFor(() =>
      expect(getByText(/Este projeto usa ferramentas que você ainda vai conquistar/)).toBeTruthy(),
    )
    await waitFor(() => expect(queryByTestId('editor-shell')).toBeNull())
    expect(project.installedExtensions).toEqual([
      { id: 'game-3d', version: '1.0.0', installedAt: 1 },
    ])
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

    // D2: projeto básico só alterna entre Blocos e Ponte (Código é só do pro).
    act(() => handleRef.current?.setMode('bridge'))
    expect(handleRef.current?.isDirty()).toBe(true)

    await waitFor(() => {
      expect(changes).toContain('bridge')
    })
    // Snapshot entregue ao host conta como salvo.
    await waitFor(() => {
      expect(handleRef.current?.isDirty()).toBe(false)
    })
    setAutosaveDelayForTests(null)
  })

  it.each([
    'javascript',
    'python',
  ] as const)('notifica mudanças do projeto %s e de autoria pelo handle público, com descarte da assinatura', async (language) => {
    const project =
      language === 'python'
        ? (
            await (
              await import('../../state/fixtures/pythonEnvironment')
            ).pythonEnvironmentFixture('classic')
          ).project
        : createEmptyProject('project-event', 'Meu jogo')
    const ref = createRef<StudioHandle>()
    const props = { ref, initialProject: project, autoRun: false, persistence: 'none' as const }
    const view = render(<Studio {...props} editingAccess="author" />)
    await waitFor(() => expect(ref.current?.getProject()?.id).toBe(project.id))
    const handle = ref.current
    if (!handle?.onProjectChange) throw new Error('Missing project change subscription')
    const changed = mock(() => {})
    const dispose = handle.onProjectChange(changed)
    act(() => handle.setMode('bridge'))
    expect(changed).toHaveBeenCalled()
    expect(ref.current?.getProject()?.mode).toBe('bridge')
    changed.mockClear()
    view.rerender(<Studio {...props} editingAccess="observer" />)
    expect(changed).toHaveBeenCalled()
    view.rerender(<Studio {...props} editingAccess="author" />)
    changed.mockClear()
    act(() => ref.current?.replaceProject({ ...project, name: 'Versão recuperada' }))
    await waitFor(() => expect(ref.current?.getProject()?.name).toBe('Versão recuperada'))
    expect(changed).toHaveBeenCalled()
    dispose()
    changed.mockClear()
    act(() => ref.current?.setMode('bridge'))
    expect(changed).not.toHaveBeenCalled()
  })

  it.each([
    'javascript',
    'python',
  ] as const)('mantém a curadoria de modo ao receber uma revisão %s, sem inventar edição', async (language) => {
    const project =
      language === 'python'
        ? (
            await (
              await import('../../state/fixtures/pythonEnvironment')
            ).pythonEnvironmentFixture('classic')
          ).project
        : createEmptyProject('observed-curation', 'Projeto da oficina')
    project.mode = 'bridge'
    const ref = createRef<StudioHandle>()
    render(
      <Studio
        ref={ref}
        initialProject={project}
        editingAccess="observer"
        allowedModes={['blocks']}
        autoRun={false}
        persistence="none"
      />,
    )
    await waitFor(() => expect(ref.current?.getProject()?.mode).toBe('blocks'))
    const handle = ref.current
    if (!handle) throw new Error('Editor not ready')
    await act(async () => {
      await handle.prepareHandoff()
      await handle.applyObservedRevision(project, 2)
    })
    expect(ref.current?.getProject()?.mode).toBe('blocks')
    expect(ref.current?.getProject()?.files).toEqual(project.files)
    expect(ref.current?.isDirty()).toBe(false)
    expect(project.mode).toBe('bridge')
  })

  it('getProject materializa uma edição pendente antes de expor o snapshot', async () => {
    pendingEditorCode = 'console.log("versão mais recente")'
    const handleRef = createRef<StudioHandle>()
    const project = createEmptyProject('project-current-blocks', 'Blocos atuais')
    project.mode = 'bridge'
    render(<Studio ref={handleRef} initialProject={project} persistence="none" />)

    await waitFor(() => {
      expect(pendingEditorRegistered).toBe(true)
      expect(handleRef.current?.getProject()?.id).toBe('project-current-blocks')
    })

    const submittedProject = handleRef.current?.getProject()
    expect(submittedProject?.files?.['script.js']).toBe(pendingEditorCode)
    // Na Ponte, o texto muda antes do reverse-parse assentar IR/blocos. Um
    // snapshot externo não pode levar os derivados antigos junto: ao reabrir,
    // eles regenerariam o código anterior por cima desta versão.
    expect(submittedProject?.ir).toBeNull()
    expect(submittedProject?.blocksState).toBeNull()
  })

  it('escopa o tema no root via data-sz-theme', async () => {
    const project = createEmptyProject('project-3', 'Projeto 3')
    const { container } = render(<Studio initialProject={project} theme="light" />)

    await waitFor(() => {
      expect(container.querySelector('[data-sz-theme="light"]')).toBeTruthy()
    })
    expect(document.documentElement.getAttribute('data-sz-theme')).toBeNull()
  })

  it('não captura capa durante a desmontagem simulada do StrictMode', async () => {
    captureAndStoreProjectThumb.mockClear()
    const project = createEmptyProject('project-strict-cover', 'Strict cover')

    const { getByTestId, unmount } = render(
      <StrictMode>
        <Studio initialProject={project} />
      </StrictMode>,
    )

    await waitFor(() => {
      expect(getByTestId('editor-shell').getAttribute('data-project')).toBe(project.id)
    })
    expect(captureAndStoreProjectThumb).not.toHaveBeenCalled()

    unmount()
    expect(captureAndStoreProjectThumb).toHaveBeenCalledTimes(1)
  })

  it('re-render do host com allowedModes inline NÃO descarta edições não salvas', async () => {
    const handleRef = createRef<StudioHandle>()
    const project = createEmptyProject('project-keep', 'Manter')
    // Array INLINE: o host recria a referência a cada render, mas o conteúdo é o
    // mesmo. Antes, isso re-rodava resolveStudioConfig → re-sanitize → re-hidrata.
    const { getByTestId, rerender } = render(
      <Studio ref={handleRef} initialProject={project} allowedModes={['blocks', 'bridge']} />,
    )

    await waitFor(() => {
      expect(getByTestId('editor-shell').getAttribute('data-project')).toBe('project-keep')
    })

    // Edição não salva do aluno (troca de modo marca sujo). D2: básico = Blocos/Ponte.
    act(() => handleRef.current?.setMode('bridge'))
    await waitFor(() => {
      expect(getByTestId('editor-shell').getAttribute('data-dirty')).toBe('true')
    })
    expect(getByTestId('editor-shell').getAttribute('data-mode')).toBe('bridge')

    // Re-render do host com um NOVO array inline de conteúdo igual.
    rerender(
      <Studio ref={handleRef} initialProject={project} allowedModes={['blocks', 'bridge']} />,
    )

    // A edição e o estado sujo sobrevivem (não re-hidratou do snapshot original).
    expect(getByTestId('editor-shell').getAttribute('data-mode')).toBe('bridge')
    expect(getByTestId('editor-shell').getAttribute('data-dirty')).toBe('true')
    expect(handleRef.current?.isDirty()).toBe(true)
  })

  it('apertar allowedModes numa instância montada re-coage o modo ativo proibido', async () => {
    const project = createEmptyProject('project-coerce', 'Coerção')
    // Começa com Blocos e Ponte permitidos; abre no modo padrão 'blocks'.
    const { getByTestId, rerender } = render(
      <Studio initialProject={project} allowedModes={['blocks', 'bridge']} />,
    )

    await waitFor(() => {
      expect(getByTestId('editor-shell').getAttribute('data-mode')).toBe('blocks')
    })

    // Host restringe os modos para só 'bridge': a aba ativa 'blocks' fica proibida.
    // A coerção recomputa (memo keyado nos modos RESOLVIDOS) e cai no primeiro
    // permitido ('bridge').
    rerender(<Studio initialProject={project} allowedModes={['bridge']} />)

    await waitFor(() => {
      expect(getByTestId('editor-shell').getAttribute('data-mode')).toBe('bridge')
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
    act(() => handleRef.current?.replaceProject(createEmptyProject('project-r2', 'R2')))
    await waitFor(() => {
      expect(readyIds).toEqual(['project-r1', 'project-r2'])
    })
  })

  it('o projeto trocado pelo host é gravado; o aberto pela prop, não', async () => {
    // "Trazer o que eu enviei" (aula) troca o projeto e conta com o autosave para gravar por cima
    // do rascunho do aparelho. Abrir não é editar: o projeto da prop não vira gravação.
    setAutosaveDelayForTests(10)
    const saved: string[] = []
    const handleRef = createRef<StudioHandle>()
    try {
      render(
        <Studio
          ref={handleRef}
          initialProject={createEmptyProject('project-open', 'Aberto')}
          persistence="none"
          onChange={(project) => saved.push(project.id)}
        />,
      )
      await waitFor(() => expect(handleRef.current?.getProject()?.id).toBe('project-open'))
      await new Promise((resolve) => setTimeout(resolve, 40))
      expect(saved).toEqual([])

      act(() =>
        handleRef.current?.replaceProject(createEmptyProject('project-open', 'Do professor')),
      )
      await waitFor(() => expect(saved).toEqual(['project-open']))
      expect(handleRef.current?.getProject()?.name).toBe('Do professor')
    } finally {
      setAutosaveDelayForTests(null)
    }
  })
})

describe('sanitizeProjectForHost — teto combinado de arquivos', () => {
  it('recusa o projeto inteiro se a soma exigir apagar arquivos', () => {
    const big = 'a'.repeat(PROJECT_FILE_LIMITS.maxFileChars)
    const source = {
      ...createEmptyProject('oversized', 'Grande'),
      files: { 'index.html': big, 'style.css': big, 'script.js': big },
      extraFiles: [
        { name: 'extra-a.js', content: big },
        { name: 'extra-b.js', content: big },
      ],
    }
    expect(() => sanitizeProjectForHost(source)).toThrow('Nenhuma cópia foi gravada')
    expect(source.extraFiles).toHaveLength(2)
  })
})
