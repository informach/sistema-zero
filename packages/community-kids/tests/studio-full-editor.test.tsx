import { afterAll, expect, mock, test } from 'bun:test'
import type { StudioTier } from '@sistemazero/member-shell/lib/studio-tier'
import type {
  StudioMoldaLibraryAdapter,
  StudioPintaLibraryAdapter,
  StudioShareAdapter,
} from '@sistemazero/studio'
import { render, waitFor } from '@testing-library/react'

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
  useRouter: () => router,
}))

const { StudioFullEditor } = await import('../src/components/kids/studio-full-editor')

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
