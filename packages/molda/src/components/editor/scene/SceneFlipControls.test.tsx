import { expect, test } from 'bun:test'
import { act, fireEvent, render, within } from '@testing-library/react'
import { COPY } from '../../../core/copy'
import { structuredBytes } from '../../../core/structuredBytes'
import { addScenePrimitive, setSceneNodeFlag } from '../../../scene/commands'
import { createSceneProject } from '../../../scene/createProject'
import { flipSceneNodes } from '../../../scene/flipNodes'
import { createDocumentEditorStore } from '../../../state/editorStore'
import { sceneViewportProbe } from '../../../testing/sceneViewportProbe'
import { MoldaToolAccessProvider } from '../../toolAccess'
import { SceneWorkshop } from './SceneWorkshop'

test.each([
  true,
  false,
])('whole-piece flip obeys piece access (%s), keeps selection and commits one undo', (allowed) => {
  const source = addScenePrimitive(
    createSceneProject({ kind: 'empty', name: 'Virar' }),
    'wedge',
    'rampa',
  )
  const nodeId = source.nodes[0]!.id
  const editor = createDocumentEditorStore({
    asset: source,
    sizeOf: structuredBytes,
    persistence: { save: async () => undefined },
    autosaveMs: 60000,
  })
  const probe = sceneViewportProbe()
  const view = render(
    <MoldaToolAccessProvider access={allowed ? undefined : { allow: [] }}>
      <SceneWorkshop editor={editor} viewportFactory={probe.factory} />
    </MoldaToolAccessProvider>,
  )
  try {
    fireEvent.click(view.getByRole('button', { name: COPY.scene.select('rampa') }))
    const disclosure = [
      ...view.container.querySelectorAll<HTMLDetailsElement>('details.mld-disclosure'),
    ].find((d) => d.querySelector('summary')?.textContent?.trim() === COPY.scene.flipTitle)
    if (!allowed) {
      expect(disclosure).toBeUndefined()
      expect(editor.getState().content).toBe(source)
      return
    }
    if (!disclosure) throw new Error('Missing Flip controls')
    act(() => {
      disclosure.open = true
    })
    const controls = within(disclosure)
    fireEvent.click(controls.getByRole('button', { name: COPY.scene.flipAxis('X') }))
    expect(editor.getState().content.nodes).toEqual(flipSceneNodes(source, [nodeId], 'x').nodes)
    expect(editor.getState().content.geometries).toBe(source.geometries)
    expect(
      view.getByRole('button', { name: COPY.scene.select('rampa') }).getAttribute('aria-pressed'),
    ).toBe('true')
    act(() => editor.getState().undo())
    expect(editor.getState().content.nodes).toEqual(source.nodes)
    expect(editor.getState().canUndo).toBe(false)
    act(() => editor.getState().commit(setSceneNodeFlag(source, [nodeId], 'locked', true)))
    expect(
      controls.getByRole('button', { name: COPY.scene.flipAxis('X') }).closest('fieldset')
        ?.disabled,
    ).toBe(true)
  } finally {
    view.unmount()
    editor.getState().dispose()
  }
})
