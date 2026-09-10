import { expect, spyOn, test } from 'bun:test'
import { fireEvent, render, screen } from '@testing-library/react'
import { StrictMode } from 'react'
import { COPY } from '../../../core/copy'
import type { Vec2 } from '../../../scene/document'
import { editMeshUv } from '../../../scene/meshUvOperations'
import { makeSceneGridGeometry } from '../../../testing/sceneFixtures'
import { SceneUvCanvas } from './SceneUvCanvas'

test('cut focus draws the chosen edge and corner numbers without enabling UV movement', () => {
  const mesh = makeSceneGridGeometry(1),
    before = structuredClone(mesh),
    selected: string[] = []
  const strokes: Array<{ width: number; points: number[][] }> = []
  let path: number[][] = []
  const context = {
    lineWidth: 0,
    clearRect: () => {},
    strokeRect: () => {},
    beginPath: () => {
      path = []
    },
    moveTo: (x: number, y: number) => {
      path.push([x, y])
    },
    lineTo: (x: number, y: number) => {
      path.push([x, y])
    },
    closePath: () => {},
    fill: () => {},
    arc: () => {},
    fillText: () => {},
    stroke: () => {
      strokes.push({ width: context.lineWidth, points: path })
    },
  }
  const draw = spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    (() => context) as unknown as HTMLCanvasElement['getContext'],
  )
  const view = render(
    <StrictMode>
      <SceneUvCanvas
        mesh={mesh}
        ids={['f_0_0']}
        activeEdge={{ faceId: 'f_0_0', corner: 1 }}
        onSelect={(id) => {
          selected.push(id)
        }}
        controlLabel={COPY.scene.uvCutCanvasControl}
      />
    </StrictMode>,
  )
  const canvas = screen.getByRole('img', { name: COPY.scene.uvCanvas })
  const rect = spyOn(canvas, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 200, 200))
  try {
    const edge = strokes.at(-1)!
    expect(edge.width).toBe(7)
    expect(edge.points).toHaveLength(2)
    expect(edge.points[0]![0]).toBeCloseTo(486.4, 10)
    expect(edge.points[0]![1]).toBeCloseTo(486.4, 10)
    expect(edge.points[1]![0]).toBeCloseTo(486.4, 10)
    expect(edge.points[1]![1]).toBeCloseTo(25.6, 10)
    fireEvent.click(screen.getByRole('button', { name: COPY.scene.uvCutCanvasControl }), {
      clientX: 100,
      clientY: 100,
    })
    expect(selected).toEqual(['f_0_0'])
    expect(screen.queryByText(COPY.scene.uvCornerKeyboard)).toBeNull()
    expect(mesh).toEqual(before)
  } finally {
    view.unmount()
    rect.mockRestore()
    draw.mockRestore()
  }
})

test('UV corner input keeps the canvas frozen, accounts for pointer offset/final sample and cancels interrupted owners', () => {
  const mesh = makeSceneGridGeometry(1),
    ids = ['f_0_0']
  const commits: Vec2[] = []
  let draws = 0
  const context = spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((() => ({
    clearRect: () => {
      draws++
    },
    strokeRect: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    closePath: () => {},
    fill: () => {},
    stroke: () => {},
    arc: () => {},
    fillText: () => {},
  })) as unknown as HTMLCanvasElement['getContext'])
  const control = {
    sourceKey: 'original',
    faceId: 'f_0_0',
    corner: 0,
    step: 0.01,
    onChoose: () => {},
    onApply: (_corner: number, uv: Vec2) => {
      commits.push(uv)
    },
  }
  const view = render(
    <StrictMode>
      <SceneUvCanvas mesh={mesh} ids={ids} onSelect={() => {}} corner={control} />
    </StrictMode>,
  )
  const button = screen.getByRole('button', { name: COPY.scene.uvCanvasControl })
  const canvas = screen.getByRole('img', { name: COPY.scene.uvCanvas })
  const rect = spyOn(canvas, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 200, 200))
  const captured = new Set<number>()
  Object.assign(button, {
    setPointerCapture: (id: number) => captured.add(id),
    hasPointerCapture: (id: number) => captured.has(id),
    releasePointerCapture: (id: number) => captured.delete(id),
  })
  const pointer = (
    kind: 'pointerDown' | 'pointerMove' | 'pointerUp',
    x: number,
    y: number,
    id = 1,
  ) => fireEvent[kind](button, { pointerId: id, button: 0, clientX: x, clientY: y })
  try {
    const initialDraws = draws
    pointer('pointerDown', 12, 188)
    pointer('pointerMove', 28, 172)
    expect(commits).toEqual([])
    expect(draws).toBe(initialDraws)
    expect(button.querySelector('svg polygon') !== null).toBe(true)
    pointer('pointerUp', 30, 170)
    expect(commits).toHaveLength(1)
    expect(commits[0]![0]).toBeCloseTo(0.1, 14)
    expect(commits[0]![1]).toBeCloseTo(0.1, 14)
    expect(captured.size).toBe(0)
    pointer('pointerDown', 12, 188)
    pointer('pointerUp', 12, 188)
    expect(commits[1]).toEqual([0, 0])
    expect(
      editMeshUv(mesh, ids, { kind: 'corner', faceId: 'f_0_0', corner: 0, uv: commits[1]! }),
    ).toBe(mesh)
    for (const cancel of [
      () => pointer('pointerMove', 201, 190),
      () => pointer('pointerDown', 12, 188, 2),
      () => fireEvent(window, new Event('blur')),
      () => fireEvent.blur(button),
    ]) {
      pointer('pointerDown', 12, 188)
      cancel()
      pointer('pointerUp', 30, 170)
    }
    expect(commits).toHaveLength(2)
    pointer('pointerDown', 12, 188)
    view.rerender(
      <StrictMode>
        <SceneUvCanvas
          mesh={mesh}
          ids={ids}
          onSelect={() => {}}
          corner={{ ...control, sourceKey: 'new-revision' }}
        />
      </StrictMode>,
    )
    pointer('pointerUp', 30, 170)
    expect(commits).toHaveLength(2)
    pointer('pointerDown', 12, 188)
    view.rerender(
      <StrictMode>
        <SceneUvCanvas
          mesh={{ ...mesh, faces: { ...mesh.faces } }}
          ids={ids}
          onSelect={() => {}}
          corner={{ ...control, sourceKey: 'new-revision' }}
        />
      </StrictMode>,
    )
    pointer('pointerUp', 30, 170)
    expect(commits).toHaveLength(2)
    Object.assign(button, {
      setPointerCapture: () => {
        throw new Error('No capture')
      },
    })
    pointer('pointerDown', 12, 188)
    pointer('pointerUp', 30, 170)
    expect(commits).toHaveLength(2)
  } finally {
    view.unmount()
    rect.mockRestore()
    context.mockRestore()
  }
})

test('UV corner keyboard placement supports precise increments, Escape and one explicit confirmation', () => {
  const mesh = makeSceneGridGeometry(1),
    commits: Vec2[] = []
  const view = render(
    <SceneUvCanvas
      mesh={mesh}
      ids={['f_0_0']}
      onSelect={() => {}}
      corner={{
        sourceKey: 'original',
        faceId: 'f_0_0',
        corner: 0,
        step: 0.123456789123456,
        onChoose: () => {},
        onApply: (_corner, uv) => {
          commits.push(uv)
        },
      }}
    />,
  )
  const button = screen.getByRole('button', { name: COPY.scene.uvCanvasControl })
  const key = (key: string) => fireEvent.keyDown(button, { key })
  try {
    key(' ')
    key('ArrowRight')
    key('ArrowUp')
    expect(commits).toEqual([])
    key('Escape')
    expect(button.querySelector('svg') === null).toBe(true)
    key(' ')
    key('ArrowLeft')
    key('Enter')
    expect(commits).toEqual([[-0.123456789123456, 0]])
    key(' ')
    key('ArrowUp')
    view.unmount()
    expect(commits).toHaveLength(1)
  } finally {
    view.unmount()
  }
})
