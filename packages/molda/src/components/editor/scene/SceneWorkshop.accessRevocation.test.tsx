import { expect, test } from 'bun:test'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { COPY } from '../../../core/copy'
import { structuredBytes } from '../../../core/structuredBytes'
import { type MoldaToolFamilyId, moldaToolFamilyIds } from '../../../core/toolFamilies'
import { createDocumentEditorStore } from '../../../state/editorStore'
import { animatedScene } from '../../../testing/sceneAnimation'
import { sceneViewportProbe } from '../../../testing/sceneViewportProbe'
import { MoldaToolAccessProvider } from '../../toolAccess'
import { SceneWorkshop } from './SceneWorkshop'

function mount(denied: MoldaToolFamilyId[] = []) {
  const source = animatedScene()
  const editor = createDocumentEditorStore({
    asset: source,
    sizeOf: structuredBytes,
    persistence: { save: async () => undefined },
    autosaveMs: 60000,
  })
  const probe = sceneViewportProbe()
  const draw = (denied: MoldaToolFamilyId[]) => (
    <MoldaToolAccessProvider
      access={{
        allow: moldaToolFamilyIds(['basic', 'intermediate', 'professional']).filter(
          (id) => !denied.includes(id),
        ),
      }}
    >
      <SceneWorkshop editor={editor} viewportFactory={probe.factory} />
    </MoldaToolAccessProvider>
  )
  const view = render(draw(denied))
  return {
    source,
    editor,
    view,
    deny: (...families: MoldaToolFamilyId[]) => view.rerender(draw(families)),
    dispose: () => {
      view.unmount()
      editor.getState().dispose()
    },
  }
}

test('revoking animation creation closes rename and regranting cannot resurrect its draft', async () => {
  const f = mount()
  try {
    fireEvent.click(screen.getByRole('button', { name: COPY.scene.animationMode }))
    const clip = await screen.findByRole('button', { name: 'Escolher movimento Acenar' })
    fireEvent.doubleClick(clip)
    const field = screen.getByRole('textbox', { name: COPY.scene.animationRename })
    fireEvent.change(field, { target: { value: 'Nome sem acesso' } })
    const form = field.closest('form')!
    f.deny('animate.create')
    expect(screen.queryByRole('textbox', { name: COPY.scene.animationRename })).toBeNull()
    fireEvent.submit(form)
    expect(f.editor.getState().content).toBe(f.source)
    expect(f.editor.getState().contentRevision).toBe(0)
    expect(screen.getByRole('button', { name: COPY.scene.animationPlay })).toBeDefined()
    f.deny()
    expect(screen.queryByRole('textbox', { name: COPY.scene.animationRename })).toBeNull()
    fireEvent.doubleClick(screen.getByRole('button', { name: 'Escolher movimento Acenar' }))
    expect(
      screen.getByRole('textbox', { name: COPY.scene.animationRename }).getAttribute('value'),
    ).toBe('Acenar')
  } finally {
    f.dispose()
  }
})

test('revoking cut closes a prepared plane without modifying history and regranting starts a fresh session', async () => {
  const f = mount()
  try {
    fireEvent.click(screen.getByRole('button', { name: 'Escolher corpo' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cortar' }))
    const bar = screen.getByRole('region', { name: 'Cortar a peça' })
    fireEvent.click(within(bar).getByText('Precisão do corte'))
    fireEvent.click(within(bar).getByRole('button', { name: 'Conferir plano' }))
    const confirm = within(bar).getByRole('button', { name: 'Cortar' })
    f.deny('model.cut')
    expect(screen.queryByRole('region', { name: 'Cortar a peça' })).toBeNull()
    await act(async () => {
      fireEvent.click(confirm)
    })
    expect(f.editor.getState().content).toBe(f.source)
    expect(f.editor.getState().canUndo).toBe(false)
    f.deny()
    expect(screen.queryByRole('region', { name: 'Cortar a peça' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Cortar' }))
    const fresh = screen.getByRole('region', { name: 'Cortar a peça' })
    expect(within(fresh).getByRole('button', { name: 'Cortar' }).hasAttribute('disabled')).toBe(
      true,
    )
  } finally {
    f.dispose()
  }
})

test.each([
  'model.coordinates',
  'model.pivot',
] as const)('numeric fields respect the independent %s family', (denied) => {
  const f = mount([denied])
  try {
    fireEvent.click(screen.getByRole('button', { name: 'Escolher corpo' }))
    const pivot = screen.queryByRole('spinbutton', { name: 'Pivô · o ponto onde a peça gira X' })
    const position = screen.queryByRole('spinbutton', { name: 'Posição X' })
    expect(!!pivot).toBe(denied !== 'model.pivot')
    expect(!!position).toBe(denied !== 'model.coordinates')
    const field = denied === 'model.pivot' ? position : pivot
    if (!field) throw new Error('Campo autorizado ausente')
    fireEvent.change(field, { target: { value: '9' } })
    fireEvent.blur(field)
    expect(f.editor.getState().contentRevision).toBe(1)
    act(() => f.editor.getState().undo())
    expect(f.editor.getState().content.nodes).toEqual(f.source.nodes)
    expect(f.editor.getState().canUndo).toBe(false)
  } finally {
    f.dispose()
  }
})

test('revoking pivot while a numeric draft is focused cannot commit it on blur', () => {
  const f = mount()
  try {
    fireEvent.click(screen.getByRole('button', { name: 'Escolher corpo' }))
    fireEvent.click(screen.getByRole('button', { name: 'Pivô' }))
    const field = screen.getByRole('spinbutton', { name: 'Pivô · o ponto onde a peça gira X' })
    field.focus()
    fireEvent.change(field, { target: { value: '9' } })
    f.deny('model.pivot')
    fireEvent.blur(field)
    expect(
      screen.queryByRole('spinbutton', { name: 'Pivô · o ponto onde a peça gira X' }),
    ).toBeNull()
    expect(f.editor.getState().content).toBe(f.source)
    expect(f.editor.getState().canUndo).toBe(false)
  } finally {
    f.dispose()
  }
})
