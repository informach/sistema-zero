import { afterAll, expect, mock, test } from 'bun:test'
import type { StudioTier } from '@sistemazero/member-shell/lib/studio-tier'
import type {
  StudioMoldaLibraryAdapter,
  StudioPintaLibraryAdapter,
  StudioShareAdapter,
} from '@sistemazero/studio'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'

const actualNavigation = await import('next/navigation')
const router = {
  back: mock(() => {}),
  forward: mock(() => {}),
  refresh: mock(() => {}),
  push: mock(() => {}),
  replace: mock(() => {}),
  prefetch: mock(async () => {}),
}

mock.module('next/navigation', () => ({
  ...actualNavigation,
  usePathname: () => '/estudio',
  useRouter: () => router,
}))

const { StudioFullEditor } = await import('../src/components/kids/studio-full-editor')
const { FocusModeProvider, useFocusMode } = await import('../src/components/kids/focus-mode')

afterAll(() => {
  mock.module('next/navigation', () => actualNavigation)
})

type EditorProps = Parameters<typeof StudioFullEditor>[0]

/** As props que o host entregou ao último `<StudioEditor>` montado. */
let lastEditorProps: Record<string, unknown> | undefined

/** Só o que o host usa do módulo do Estúdio: o adapter local e o editor (que aqui só anota as props). */
const mod = {
  createLocalPersistenceAdapter: () => ({
    load: async () => ({ id: 'p1', name: 'Nave', kind: 'classic', updatedAt: 1 }),
  }),
  StudioEditor: (props: Record<string, unknown>) => {
    lastEditorProps = props
    return null
  },
} as unknown as EditorProps['mod']

const tier = {
  level: 'iniciante',
  allowedExtensions: [],
  initialExtensions: [],
  allowedModes: ['blocks'],
  allowLevelReveal: false,
} as unknown as StudioTier

function renderEditor(libraries: {
  pinta?: StudioPintaLibraryAdapter
  molda?: StudioMoldaLibraryAdapter
}) {
  lastEditorProps = undefined
  return render(
    <StudioFullEditor
      mod={mod}
      projectId="p1"
      onExit={() => {}}
      share={{} as StudioShareAdapter}
      tutor={undefined}
      theme="light"
      tier={tier}
      showExamples={false}
      professional={false}
      taskSession={undefined}
      pintaLibrary={libraries.pinta}
      moldaLibrary={libraries.molda}
    />,
  )
}

test('"Editar o desenho" só vai ao Estúdio COM a posse do Pinta, e "Editar a criação" só com a do Molda (produtos vendidos à parte)', async () => {
  // Sem os produtos: nenhum dos dois botões existe (antes o do Pinta ia sempre e levava a
  // criança sem o Pinta a uma tela bloqueada).
  const withoutTools = renderEditor({})
  await waitFor(() => expect(lastEditorProps).toBeDefined())
  expect(lastEditorProps?.onEditDrawing).toBeUndefined()
  expect(lastEditorProps?.onEditCreation).toBeUndefined()
  withoutTools.unmount()

  const pinta = {} as StudioPintaLibraryAdapter
  const withPinta = renderEditor({ pinta })
  await waitFor(() => expect(lastEditorProps).toBeDefined())
  expect(typeof lastEditorProps?.onEditDrawing).toBe('function')
  expect(lastEditorProps?.onEditCreation).toBeUndefined()
  expect(lastEditorProps?.pintaLibrary).toBe(pinta)
  withPinta.unmount()

  const molda = {} as StudioMoldaLibraryAdapter
  renderEditor({ molda })
  await waitFor(() => expect(lastEditorProps).toBeDefined())
  expect(lastEditorProps?.onEditDrawing).toBeUndefined()
  expect(typeof lastEditorProps?.onEditCreation).toBe('function')
  expect(lastEditorProps?.moldaLibrary).toBe(molda)
})

function StudioPresenceHarness() {
  const [editorOpen, setEditorOpen] = useState(false)
  const { navCollapsed, toggleNav } = useFocusMode()
  return (
    <>
      <output data-testid="menu-recolhido">{String(navCollapsed)}</output>
      <button type="button" onClick={toggleNav}>
        Abrir menu de teste
      </button>
      <button type="button" onClick={() => setEditorOpen(true)}>
        Abrir projeto de teste
      </button>
      <button type="button" onClick={() => setEditorOpen(false)}>
        Voltar à galeria de teste
      </button>
      {editorOpen ? (
        <StudioFullEditor
          mod={mod}
          projectId="p1"
          onExit={() => setEditorOpen(false)}
          share={{} as StudioShareAdapter}
          tutor={undefined}
          theme="light"
          tier={tier}
          showExamples={false}
          professional={false}
          taskSession={undefined}
          pintaLibrary={undefined}
          moldaLibrary={undefined}
        />
      ) : null}
    </>
  )
}

test('o projeto aberto no Estúdio recolhe o menu e devolve a escolha ao voltar à galeria', async () => {
  render(
    <FocusModeProvider viewerId="perfil-1">
      <StudioPresenceHarness />
    </FocusModeProvider>,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Abrir menu de teste' }))
  expect(screen.getByTestId('menu-recolhido').textContent).toBe('false')

  fireEvent.click(screen.getByRole('button', { name: 'Abrir projeto de teste' }))
  await waitFor(() => expect(screen.getByTestId('menu-recolhido').textContent).toBe('true'))

  fireEvent.click(screen.getByRole('button', { name: 'Voltar à galeria de teste' }))
  expect(screen.getByTestId('menu-recolhido').textContent).toBe('false')
})
