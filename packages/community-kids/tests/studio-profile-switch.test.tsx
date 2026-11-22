// "Trocar de perfil" com uma edição ainda não gravada (lote 1, item 8, 22/11/2026). O item do menu
// do avatar é um <Link href="/perfis">: a rota troca dentro do app e o editor DESMONTA, e é na
// desmontagem que o Estúdio grava a edição pendente (a ordem dos efeitos do StudioCore está provada
// em `studio/src/studio/__tests__/Studio.cases.tsx`). Aqui fica a metade do app: o editor completo
// do Kids prende o adaptador local ao perfil de ANTES, então a gravação da saída cai no banco
// daquela criança mesmo que o armazenamento já tenha passado para o perfil seguinte.
import { afterAll, afterEach, expect, mock, test } from 'bun:test'
import type { StudioTier } from '@sistemazero/member-shell/lib/studio-tier'
import type { Project, StudioPersistenceAdapter, StudioShareAdapter } from '@sistemazero/studio'
import { cleanup, render, waitFor } from '@testing-library/react'
import { IDBFactory } from 'fake-indexeddb'
import { useEffect } from 'react'

const idbDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'indexedDB')
Object.defineProperty(globalThis, 'indexedDB', { value: new IDBFactory(), configurable: true })

const actualNavigation = await import('next/navigation')
mock.module('next/navigation', () => ({
  ...actualNavigation,
  usePathname: () => '/estudio',
  useRouter: () => ({
    push: () => {},
    replace: () => {},
    refresh: () => {},
    prefetch: async () => {},
  }),
}))

const { createEmptyProject } = await import('../../studio/src/core/project')
const { createLocalPersistenceAdapter, replaceLocalProject } = await import(
  '../../studio/src/persistence/local'
)
const { setProjectStorageNamespace } = await import('../../studio/src/state/projectStorageRuntime')
const { StudioFullEditor } = await import('../src/components/kids/studio-full-editor')

afterEach(() => {
  cleanup()
  setProjectStorageNamespace('')
})
afterAll(() => {
  mock.module('next/navigation', () => actualNavigation)
  if (idbDescriptor) Object.defineProperty(globalThis, 'indexedDB', idbDescriptor)
  else Reflect.deleteProperty(globalThis, 'indexedDB')
})

type EditorProps = Parameters<typeof StudioFullEditor>[0]

const tier = {
  level: 'iniciante',
  allowedExtensions: [],
  initialExtensions: [],
  allowedModes: ['blocks'],
  allowLevelReveal: false,
} as unknown as StudioTier

test('trocar de perfil com uma edição pendente: a saída grava no perfil de antes', async () => {
  const project = createEmptyProject('troca-de-perfil', 'Jogo da Ana')
  await replaceLocalProject(project, { namespace: 'perfil-ana' })

  // O host liga o armazenamento da criança ANTES de abrir o editor (`setStudioStorageNamespace`).
  setProjectStorageNamespace('perfil-ana')
  let opened = false
  const mod = {
    createLocalPersistenceAdapter,
    // O editor só faz o que o StudioCore faz ao desmontar com a edição suja: grava pelo adaptador
    // que o host entregou.
    StudioEditor: (props: { initialProject: Project; persistence: StudioPersistenceAdapter }) => {
      useEffect(() => {
        opened = true
        return () => {
          void props.persistence.save({
            ...props.initialProject,
            name: 'Jogo da Ana (editado)',
            updatedAt: Date.now(),
          })
        }
      }, [props.initialProject, props.persistence])
      return null
    },
  } as unknown as EditorProps['mod']

  const view = render(
    <StudioFullEditor
      mod={mod}
      projectId={project.id}
      viewerId="perfil-ana"
      onExit={() => {}}
      share={{} as StudioShareAdapter}
      tutor={undefined}
      theme="light"
      tier={tier}
      showExamples={false}
      professional={false}
      taskSession={undefined}
    />,
  )
  await waitFor(() => expect(opened).toBe(true))

  // A rota troca: o armazenamento já é do perfil seguinte quando o editor desmonta.
  setProjectStorageNamespace('perfil-bia')
  view.unmount()

  const daAna = createLocalPersistenceAdapter({ namespace: 'perfil-ana' })
  const daBia = createLocalPersistenceAdapter({ namespace: 'perfil-bia' })
  await waitFor(async () =>
    expect((await daAna.load(project.id))?.name).toBe('Jogo da Ana (editado)'),
  )
  expect(await daBia.load(project.id)).toBeNull()
})
