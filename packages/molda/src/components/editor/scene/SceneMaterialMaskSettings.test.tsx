import { expect, test } from 'bun:test'
import { fireEvent, render, screen } from '@testing-library/react'
import { COPY } from '../../../core/copy'
import { createSceneEditorStore } from '../../../state/sceneEditorStore'
import { createScenePersistence } from '../../../state/scenePersistence'
import { nativeDatabase } from '../../../testing/nativeDatabase'
import { makeSceneGlbFixture } from '../../../testing/sceneGlbFixture'
import { SceneMaterialSettings } from './SceneMaterialSettings'
import type { SceneAppearanceApply } from './sceneAppearanceForm'

test('exact mask controls commit once, undo/redo, retain blobs, restore focus on removal and respect locks', async () => {
  const db = await nativeDatabase()
  const persistence = createScenePersistence(db.store)
  const source = makeSceneGlbFixture(1, 1, 2, 2)
  await persistence.save(source, null)
  const editor = createSceneEditorStore(source, 1, persistence, { autosaveMs: 60_000 })
  let locked = false
  const apply: SceneAppearanceApply = (command) => {
    const next = command(editor.getState().asset)
    editor.getState().commit(next)
    view.rerender(ui())
    return next
  }
  const ui = () => (
    <SceneMaterialSettings
      material={editor.getState().asset.materials[0]!}
      colors={[]}
      lockedMaterial={locked}
      apply={apply}
    />
  )
  const view = render(ui())
  try {
    const summary = screen.getByText(COPY.scene.materialMask)
    fireEvent.click(summary)
    fireEvent.change(screen.getByLabelText(COPY.scene.materialMaskCutoff), {
      target: { value: '0.123456789123' },
    })
    fireEvent.change(screen.getByLabelText(COPY.scene.materialMaskOpacity), {
      target: { value: '0.37123456789' },
    })
    const submit = screen.getByRole('button', { name: COPY.scene.materialMaskApply })
    submit.focus()
    fireEvent.click(submit)
    const mask = { cutoff: 0.123456789123, opacity: 0.37123456789 }
    expect(editor.getState().asset.materials[0]!.alphaMask).toEqual(mask)
    expect(document.activeElement).toBe(submit)
    editor.getState().undo()
    expect({ ...editor.getState().asset, updatedAt: source.updatedAt }).toEqual(source)
    expect(editor.getState().asset.updatedAt).toBeGreaterThan(source.updatedAt)
    expect(editor.getState().canUndo).toBe(false)
    editor.getState().redo()
    await editor.getState().flush()
    const read = await persistence.read(source.id)
    expect(read.status).toBe('active')
    if (read.status !== 'active') throw new Error('Missing persisted material')
    expect(read.document.materials[0]!.alphaMask).toEqual(mask)
    expect(read.document.images).toEqual(source.images)
    const remove = screen.getByRole('button', { name: COPY.scene.materialMaskRemove })
    remove.focus()
    fireEvent.click(remove)
    expect(editor.getState().asset.materials[0]!.alphaMask).toBeUndefined()
    expect(document.activeElement).toBe(summary)
    locked = true
    view.rerender(ui())
    expect(screen.getByLabelText(COPY.scene.materialMaskCutoff).closest('fieldset')?.disabled).toBe(
      true,
    )
    expect(
      screen.getByLabelText(COPY.scene.materialMaskOpacity).closest('fieldset')?.disabled,
    ).toBe(true)
    expect(
      screen
        .getByRole('button', { name: COPY.scene.materialMaskApply, hidden: true })
        .closest('fieldset')?.disabled,
    ).toBe(true)
  } finally {
    view.unmount()
    editor.getState().dispose()
    db.close()
  }
})
