import { expect, test } from 'bun:test'
import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { COPY } from '../../../core/copy'
import { addScenePrimitive, groupSceneNodes } from '../../../scene/commands'
import { indexSceneDocument } from '../../../scene/documentIndex'
import { migrateLegacyModel } from '../../../scene/migrateLegacy'
import { makeModel } from '../../../testing/fixtures'
import { SceneHierarchy } from './SceneHierarchy'

const source = addScenePrimitive(
  addScenePrimitive(migrateLegacyModel(makeModel()).document, 'box', 'meio'),
  'box',
  'ponta',
)
const index = indexSceneDocument(source).scene

function HierarchySelection({ tree = index }: { tree?: typeof index }) {
  const [selected, setSelected] = useState<string[]>([])
  return (
    <>
      <SceneHierarchy
        index={tree}
        selected={selected}
        onSelect={(id, additive) =>
          setSelected((before) =>
            additive
              ? before.includes(id)
                ? before.filter((entry) => entry !== id)
                : [...before, id]
              : [id],
          )
        }
        onSelectRange={(ids) => setSelected([...ids])}
      />
      <button type="button" onClick={() => setSelected([tree.roots[1]!])}>
        Seleção do palco
      </button>
      <output data-testid="selected">{selected.join(',')}</output>
    </>
  )
}

function row(name: string) {
  return screen.getByRole('button', { name: COPY.scene.select(name) })
}

function chosen() {
  return ['corpo', 'asa', 'meio', 'ponta'].filter(
    (name) => row(name).getAttribute('aria-pressed') === 'true',
  )
}

test('Shift+clique alterna peças individuais; clique comum reinicia a seleção', () => {
  const view = render(<HierarchySelection />)
  try {
    fireEvent.click(row('corpo'))
    fireEvent.click(row('meio'), { shiftKey: true })
    expect(chosen()).toEqual(['corpo', 'meio'])
    fireEvent.click(row('corpo'), { shiftKey: true })
    expect(chosen()).toEqual(['meio'])
    fireEvent.click(row('asa'))
    expect(chosen()).toEqual(['asa'])
  } finally {
    view.unmount()
  }
})

test('dois Ctrl+cliques escolhem o intervalo inclusivo em ambos os sentidos', () => {
  const view = render(<HierarchySelection />)
  try {
    fireEvent.click(row('corpo'), { ctrlKey: true })
    expect(chosen()).toEqual(['corpo'])
    fireEvent.click(row('ponta'), { ctrlKey: true })
    expect(chosen()).toEqual(['corpo', 'asa', 'meio', 'ponta'])

    fireEvent.click(row('meio'), { ctrlKey: true })
    expect(chosen()).toEqual(['meio'])
    fireEvent.click(row('corpo'), { ctrlKey: true })
    expect(chosen()).toEqual(['corpo', 'asa', 'meio'])

    fireEvent.click(row('ponta'), { ctrlKey: true })
    fireEvent.click(row('asa'))
    fireEvent.click(row('meio'), { ctrlKey: true })
    expect(chosen()).toEqual(['meio'])

    fireEvent.click(row('corpo'), { ctrlKey: true })
    fireEvent.click(screen.getByRole('button', { name: 'Seleção do palco' }))
    fireEvent.click(row('ponta'), { ctrlKey: true })
    expect(chosen()).toEqual(['ponta'])
  } finally {
    view.unmount()
  }
})

test('o intervalo segue a ordem da lista e pula as peças de um grupo fechado', () => {
  const grouped = indexSceneDocument(
    groupSceneNodes(source, ['body', 'wing'], { name: 'grupo', nextId: () => 'group' }),
  ).scene
  const view = render(<HierarchySelection tree={grouped} />)
  try {
    fireEvent.click(screen.getByRole('button', { name: COPY.scene.hide('grupo') }))
    fireEvent.click(row('meio'), { ctrlKey: true })
    fireEvent.click(row('grupo'), { ctrlKey: true })
    expect(screen.getByTestId('selected').textContent).toBe(grouped.roots.join(','))
  } finally {
    view.unmount()
  }
})
