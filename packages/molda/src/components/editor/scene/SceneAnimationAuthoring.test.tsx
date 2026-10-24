import { expect, test } from 'bun:test'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { StrictMode } from 'react'
import { COPY } from '../../../core/copy'
import { structuredBytes } from '../../../core/structuredBytes'
import { setSceneAnimationKey } from '../../../scene/animationCommands'
import type { MoldaSceneDocument } from '../../../scene/document'
import { identityMatrix, quaternionFromEulerXYZ } from '../../../scene/matrix'
import { createDocumentEditorStore } from '../../../state/editorStore'
import { moldaPreferenceKey } from '../../../state/interfacePreferences'
import { animatedScene } from '../../../testing/sceneAnimation'
import { sceneViewportProbe } from '../../../testing/sceneViewportProbe'
import { SceneWorkshop } from './SceneWorkshop'
import { TIMELINE_STORAGE } from './timelineLayout'

function setup(source: MoldaSceneDocument = animatedScene()) {
  const editor = createDocumentEditorStore({
    asset: source,
    sizeOf: structuredBytes,
    persistence: { save: async () => undefined },
    autosaveMs: 60_000,
  })
  const probe = sceneViewportProbe()
  const view = render(
    <StrictMode>
      <SceneWorkshop editor={editor} viewportFactory={probe.factory} />
    </StrictMode>,
  )
  return {
    editor,
    probe,
    close: () => {
      view.unmount()
      editor.getState().dispose()
    },
  }
}

test('native control activation keeps Space and Enter while the canvas retains playback shortcuts', async () => {
  const f = setup()
  try {
    fireEvent.click(screen.getByRole('button', { name: COPY.scene.animationMode }))
    const play = await screen.findByRole('button', { name: COPY.scene.animationPlay })
    const previous = screen.getByRole('checkbox', { name: 'Ver pose anterior' })
    expect(fireEvent.keyDown(previous, { key: ' ' })).toBe(true)
    expect(fireEvent.keyDown(play, { key: ' ' })).toBe(true)
    expect(fireEvent.keyDown(play, { key: 'Enter' })).toBe(true)
    expect(screen.queryByRole('button', { name: COPY.scene.animationPause })).toBeNull()
    const workshop = screen.getByRole('region', { name: COPY.scene.title })
    expect(fireEvent.keyDown(workshop, { key: ' ' })).toBe(false)
    expect(screen.getByRole('button', { name: COPY.scene.animationPause })).toBeTruthy()
    expect(fireEvent.keyDown(workshop, { key: ' ' })).toBe(false)
    expect(screen.getByRole('button', { name: COPY.scene.animationPlay })).toBeTruthy()
    expect(f.editor.getState().canUndo).toBe(false)
  } finally {
    f.close()
  }
})

test('New creates an empty two-second movement without selection, grouping, or implicit keys', async () => {
  const source = { ...animatedScene(), animations: [] }
  const f = setup(source)
  try {
    fireEvent.click(screen.getByRole('button', { name: COPY.scene.animationMode }))
    fireEvent.click(await screen.findByRole('button', { name: COPY.scene.animationCreate }))
    const next = f.editor.getState().content
    expect(next.nodes).toBe(source.nodes)
    expect(next.animations).toHaveLength(1)
    expect(next.animations![0]).toMatchObject({ duration: 2, loop: false, tracks: [] })
    expect(f.editor.getState().contentRevision).toBe(1)
    act(() => f.editor.getState().undo())
    expect(f.editor.getState().content.animations).toEqual([])
    expect(f.editor.getState().canUndo).toBe(false)
  } finally {
    f.close()
  }
})

test('repeat in the timeline applies immediately with advanced animation tools enabled', async () => {
  const f = setup()
  try {
    fireEvent.click(screen.getByRole('button', { name: COPY.scene.animationMode }))
    const timeline = within(
      await screen.findByRole('region', { name: COPY.scene.animationTimeline }),
    )
    const repeat = timeline.getByRole('checkbox', { name: COPY.scene.animationLoop })
    expect((repeat as HTMLInputElement).checked).toBe(true)
    fireEvent.click(repeat)
    expect(f.editor.getState().content.animations![0]!.loop).toBe(false)
    expect((repeat as HTMLInputElement).checked).toBe(false)
    fireEvent.click(repeat)
    expect(f.editor.getState().content.animations![0]!.loop).toBe(true)
    act(() => f.editor.getState().undo())
    expect(f.editor.getState().content.animations![0]!.loop).toBe(false)
  } finally {
    f.close()
  }
})

test('duration in the timeline retimes every pose and can be undone', async () => {
  const f = setup()
  try {
    fireEvent.click(screen.getByRole('button', { name: COPY.scene.animationMode }))
    const timeline = within(
      await screen.findByRole('region', { name: COPY.scene.animationTimeline }),
    )
    const duration = timeline.getByRole('spinbutton', { name: 'Duração do movimento' })
    const before = f.editor.getState().content.animations![0]!
    fireEvent.change(duration, { target: { value: '4' } })
    fireEvent.blur(duration)
    const after = f.editor.getState().content.animations![0]!
    expect(after.duration).toBe(4)
    expect(after.tracks[0]!.keys.map((key) => key.time)).toEqual(
      before.tracks[0]!.keys.map((key) => key.time * 2),
    )
    act(() => f.editor.getState().undo())
    expect(f.editor.getState().content.animations![0]).toEqual(before)
  } finally {
    f.close()
  }
})

test('the loop repair action keeps the last pose and gives it time to return', async () => {
  const source = animatedScene()
  source.animations[0]!.tracks[0]!.keys = [
    { time: 0, value: [0, 0, 0], interpolation: 'smooth' },
    { time: 2, value: [4, 0, 0], interpolation: 'smooth' },
  ]
  const f = setup(source)
  try {
    fireEvent.click(screen.getByRole('button', { name: COPY.scene.animationMode }))
    const repair = await screen.findByRole('button', { name: 'Fazer a volta ao começo' })
    fireEvent.click(repair)
    expect(
      f.editor.getState().content.animations![0]!.tracks[0]!.keys.map((key) => key.time),
    ).toEqual([0, 1, 2])
    expect(screen.queryByRole('button', { name: 'Fazer a volta ao começo' })).toBeNull()
    act(() => f.editor.getState().undo())
    expect(f.editor.getState().content.animations![0]!.tracks[0]!.keys).toEqual(
      source.animations[0]!.tracks[0]!.keys,
    )
  } finally {
    f.close()
  }
})

test('a spinning piece can switch every turn segment to constant pace in one action', async () => {
  const source = animatedScene()
  source.animations[0]!.tracks.push({
    nodeId: 'body',
    channel: 'rotation',
    keys: [0, 90, 180, 270, 360].map((degrees, index) => ({
      time: index * 0.5,
      value: quaternionFromEulerXYZ([0, 0, degrees]),
      interpolation: 'smooth',
    })),
  })
  const f = setup(source)
  try {
    fireEvent.click(screen.getByRole('button', { name: COPY.scene.select('corpo') }))
    fireEvent.click(screen.getByRole('button', { name: COPY.scene.animationMode }))
    fireEvent.click(await screen.findByRole('button', { name: 'Canais de corpo' }))
    const strip = screen.getByRole('button', {
      name: COPY.scene.animationStrip(COPY.scene.animationChannels.rotation, 5),
    })
    fireEvent.keyDown(strip, { key: 'Home' })
    fireEvent.keyDown(strip, { key: 'ArrowRight' })
    const pose = within(screen.getByRole('region', { name: 'Pose escolhida' }))
    expect(pose.getByText(/Suave faz o giro frear/)).toBeTruthy()
    expect(pose.getByRole('button', { name: 'Suave (freia)' })).toBeTruthy()
    expect(pose.getByRole('button', { name: 'Ritmo constante' })).toBeTruthy()
    fireEvent.click(pose.getByRole('button', { name: 'Girar sem frear' }))
    const track = f.editor
      .getState()
      .content.animations![0]!.tracks.find((entry) => entry.channel === 'rotation')!
    expect(track.keys.every((key) => key.interpolation === 'linear')).toBe(true)
    expect(f.editor.getState().content.animations![0]!.tracks[0]).toBe(
      source.animations[0]!.tracks[0],
    )
    expect(pose.queryByRole('button', { name: 'Girar sem frear' })).toBeNull()
    act(() => f.editor.getState().undo())
    expect(f.editor.getState().content.animations![0]!.tracks[1]!.keys).toEqual(
      source.animations[0]!.tracks[1]!.keys,
    )
  } finally {
    f.close()
  }
})

test('a two-pose spinning wheel can complete its loop from the pose card', async () => {
  const source = animatedScene()
  source.animations[0]!.duration = 1
  source.animations[0]!.tracks = [
    {
      nodeId: 'body',
      channel: 'rotation',
      keys: [
        { time: 0, value: [0, 0, 0, 1], interpolation: 'smooth' },
        { time: 1, value: quaternionFromEulerXYZ([0, 90, 0]), interpolation: 'smooth' },
      ],
    },
  ]
  const f = setup(source)
  try {
    fireEvent.click(screen.getByRole('button', { name: COPY.scene.select('corpo') }))
    fireEvent.click(screen.getByRole('button', { name: COPY.scene.animationMode }))
    fireEvent.click(await screen.findByRole('button', { name: 'Canais de corpo' }))
    const strip = screen.getByRole('button', {
      name: COPY.scene.animationStrip(COPY.scene.animationChannels.rotation, 2),
    })
    fireEvent.keyDown(strip, { key: 'Home' })
    fireEvent.keyDown(strip, { key: 'ArrowRight' })
    const pose = within(screen.getByRole('region', { name: 'Pose escolhida' }))
    expect(pose.getByText(/termina antes de completar uma volta/)).toBeTruthy()
    fireEvent.click(pose.getByRole('button', { name: 'Girar sem frear' }))
    expect(
      f.editor.getState().content.animations![0]!.tracks[0]!.keys.map((key) => key.time),
    ).toEqual([0, 0.25, 0.5, 0.75, 1])
    act(() => f.editor.getState().undo())
    expect(f.editor.getState().content.animations![0]!.tracks[0]!.keys).toEqual(
      source.animations[0]!.tracks[0]!.keys,
    )
  } finally {
    f.close()
  }
})

test('mark pose stays in the timeline header while automatic marking stays in the inspector', async () => {
  const f = setup()
  try {
    fireEvent.click(screen.getByRole('button', { name: COPY.scene.select('corpo') }))
    fireEvent.click(screen.getByRole('button', { name: COPY.scene.animationMode }))
    const inspector = within(await screen.findByRole('region', { name: 'Ajustes do contexto' }))
    const pose = within(inspector.getByRole('region', { name: COPY.scene.animationMode }))
    const timeline = within(screen.getByRole('region', { name: COPY.scene.animationTimeline }))
    expect(timeline.getByRole('button', { name: 'Marcar pose' })).toBeTruthy()
    expect(timeline.getByRole('checkbox', { name: COPY.scene.animationLoop })).toBeTruthy()
    expect(pose.queryByRole('button', { name: 'Marcar pose' })).toBeNull()
    expect(pose.queryByRole('button', { name: 'Descartar ajustes' })).toBeNull()
    expect(pose.queryByRole('region', { name: 'Pose escolhida' })).toBeNull()
    expect(pose.getByText(/Marcação automática/).closest('details')?.open).toBe(false)
    expect(pose.getByText('Ajustar com números').closest('details')?.open).toBe(false)
    expect(pose.getByRole('checkbox', { name: 'Marcar sozinho' })).toBeTruthy()
    expect(pose.getByLabelText(COPY.scene.animationAxes.translation[0]!)).toBeTruthy()
    expect(pose.getByText('Mais ferramentas de pose')).toBeTruthy()
    expect(timeline.queryByRole('checkbox', { name: 'Marcar sozinho' })).toBeNull()
    fireEvent.click(timeline.getByRole('button', { name: 'Canais de corpo' }))
    fireEvent.keyDown(
      timeline.getByRole('button', {
        name: COPY.scene.animationStrip(COPY.scene.animationChannels.translation, 3),
      }),
      { key: 'ArrowRight' },
    )
    expect(pose.getByRole('region', { name: 'Pose escolhida' })).toBeTruthy()
    expect(pose.getByRole('button', { name: 'Suave' })).toBeTruthy()
    expect(pose.getByRole('button', { name: 'Ritmo constante' })).toBeTruthy()
    expect(pose.getByRole('button', { name: 'De uma vez' })).toBeTruthy()
    expect(pose.getByText('Mudar tempo da pose').closest('details')?.open).toBe(false)
    expect(timeline.getByRole('button', { name: 'Marcar pose' })).toBeTruthy()
  } finally {
    f.close()
  }
})

test('nearby poses show different times without rounding both to the same label', async () => {
  let source: MoldaSceneDocument = animatedScene()
  for (const time of [1.121, 1.124])
    source = setSceneAnimationKey(source, 'clip', {
      nodeId: 'body',
      channel: 'translation',
      key: { time, value: [0, time, 0], interpolation: 'smooth' },
    })
  const f = setup(source)
  try {
    fireEvent.click(screen.getByRole('button', { name: COPY.scene.animationMode }))
    fireEvent.click(await screen.findByRole('button', { name: 'Canais de corpo' }))
    const strip = screen.getByRole('button', {
      name: COPY.scene.animationStrip(COPY.scene.animationChannels.translation, 5),
    })
    fireEvent.keyDown(strip, { key: 'Home' })
    fireEvent.keyDown(strip, { key: 'ArrowRight' })
    const first = screen
      .getByRole('region', { name: 'Pose escolhida' })
      .querySelector('h3')?.textContent
    fireEvent.keyDown(strip, { key: 'ArrowRight' })
    const second = screen
      .getByRole('region', { name: 'Pose escolhida' })
      .querySelector('h3')?.textContent
    expect(first).not.toBe(second)
  } finally {
    f.close()
  }
})

test('eight channel keys remain five summary times; copying previews a free destination and commits one undo', async () => {
  const original = animatedScene()
  let source: MoldaSceneDocument = {
    ...original,
    animations: [{ ...original.animations[0]!, tracks: [] }],
  }
  for (const time of [0, 0.5, 2])
    source = setSceneAnimationKey(source, 'clip', {
      nodeId: 'body',
      channel: 'translation',
      key: { time, value: [0, time, 0], interpolation: 'linear' },
    })
  for (const time of [0, 1])
    source = setSceneAnimationKey(source, 'clip', {
      nodeId: 'body',
      channel: 'rotation',
      key: { time, value: [0, 0, 0, 1], interpolation: 'linear' },
    })
  for (const time of [0, 0.5, 1.5])
    source = setSceneAnimationKey(source, 'clip', {
      nodeId: 'body',
      channel: 'scale',
      key: { time, value: [1, 1, 1], interpolation: 'linear' },
    })
  const f = setup(source)
  try {
    fireEvent.click(screen.getByRole('button', { name: COPY.scene.animationMode }))
    await screen.findByRole('button', { name: 'Canais de corpo' })
    expect(screen.getByRole('button', { name: COPY.scene.select('corpo') }).textContent).toContain(
      '8 poses',
    )
    expect(screen.getByRole('button', { name: COPY.scene.animationStrip('corpo', 5) })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Canais de asa' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Canais de corpo' }))
    const strip = screen.getByRole('button', {
      name: COPY.scene.animationStrip(COPY.scene.animationChannels.translation, 3),
    })
    fireEvent.keyDown(strip, { key: 'Home' })
    fireEvent.keyDown(strip, { key: 'ArrowRight' })
    const card = within(screen.getByRole('region', { name: 'Pose escolhida' }))
    expect((card.getByLabelText('Tempo da pose escolhida') as HTMLInputElement).value).toBe('0.5')
    fireEvent.click(card.getByRole('button', { name: 'Copiar pose' }))
    expect(f.editor.getState().content).toBe(source)
    expect(
      (card.getByRole('button', { name: 'Confirmar cópia' }) as HTMLButtonElement).disabled,
    ).toBe(true)
    fireEvent.change(card.getByLabelText('Tempo da cópia'), { target: { value: '.75' } })
    expect(f.editor.getState().canUndo).toBe(false)
    fireEvent.click(card.getByRole('button', { name: 'Confirmar cópia' }))
    expect(f.editor.getState().contentRevision).toBe(1)
    const tracks = f.editor.getState().content.animations![0]!.tracks
    expect(
      tracks.find((track) => track.channel === 'translation')!.keys.map((key) => key.time),
    ).toEqual([0, 0.5, 0.75, 2])
    expect(tracks.filter((track) => track.channel !== 'translation')).toEqual(
      source.animations![0]!.tracks.filter((track) => track.channel !== 'translation'),
    )
    expect((card.getByLabelText('Tempo da pose escolhida') as HTMLInputElement).value).toBe('0.75')
    act(() => f.editor.getState().undo())
    expect(f.editor.getState().content.animations).toEqual(source.animations)
    expect(f.editor.getState().canUndo).toBe(false)
    const before = f.editor.getState().content
    fireEvent.keyDown(screen.getByRole('region', { name: COPY.scene.title }), { key: 'Delete' })
    expect(f.editor.getState().content).toBe(before)
  } finally {
    f.close()
  }
})

test('timeline height is a recoverable preference and never document history', async () => {
  localStorage.removeItem(moldaPreferenceKey(TIMELINE_STORAGE))
  const f = setup()
  try {
    fireEvent.click(screen.getByRole('button', { name: COPY.scene.animationMode }))
    const separator = await screen.findByRole('separator', { name: 'Altura da linha do tempo' })
    const before = f.editor.getState().content
    expect(separator.getAttribute('aria-valuenow')).toBe('306')
    fireEvent.keyDown(separator, { key: 'ArrowUp' })
    expect(separator.getAttribute('aria-valuenow')).toBe('342')
    expect(localStorage.getItem(moldaPreferenceKey(TIMELINE_STORAGE))).toBe('342')
    fireEvent.doubleClick(separator)
    expect(separator.getAttribute('aria-valuenow')).toBe('306')
    fireEvent.doubleClick(separator)
    expect(separator.getAttribute('aria-valuenow')).toBe('60')
    fireEvent.keyDown(separator, { key: 'Enter' })
    expect(separator.getAttribute('aria-valuenow')).toBe('306')
    expect(f.editor.getState().content).toBe(before)
    expect(f.editor.getState().canUndo).toBe(false)
  } finally {
    f.close()
    localStorage.removeItem(moldaPreferenceKey(TIMELINE_STORAGE))
  }
})

test.each([
  false,
  true,
])('recording a transformed pose selects its channel immediately (automatic=%s)', async (automatic) => {
  const f = setup()
  try {
    fireEvent.click(screen.getByRole('button', { name: COPY.scene.select('corpo') }))
    fireEvent.click(screen.getByRole('button', { name: COPY.scene.animationMode }))
    await screen.findByRole('button', { name: 'Marcar pose' })
    fireEvent.click(screen.getByRole('button', { name: 'Mover' }))
    if (automatic) fireEvent.click(screen.getByRole('checkbox', { name: 'Marcar sozinho' }))
    const transform = f.probe.ports.at(-1)!.callbacks.transform!
    const move = identityMatrix()
    move[12] = 2
    act(() => {
      expect(transform.begin()).toBe(true)
      expect(transform.preview(move)).toBe(true)
      transform.end(true)
    })
    if (!automatic) fireEvent.click(screen.getByRole('button', { name: 'Marcar pose' }))
    const card = within(screen.getByRole('region', { name: 'Pose escolhida' }))
    expect((card.getByLabelText('Tempo da pose escolhida') as HTMLInputElement).value).toBe('0')
    expect(card.getByText('Mover · corpo')).toBeTruthy()
    act(() => f.editor.getState().undo())
    expect(f.editor.getState().canUndo).toBe(false)
  } finally {
    f.close()
  }
})
