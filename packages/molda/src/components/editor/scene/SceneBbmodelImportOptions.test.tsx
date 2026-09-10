import { expect, test } from 'bun:test'
import { fireEvent, render, screen } from '@testing-library/react'
import { BBMODEL_ANIMATION_IMPORT_COPY as movement } from '../../../core/bbmodelAnimationImportCopy'
import { BBMODEL_IMPORT_COPY as copy } from '../../../core/bbmodelImportCopy'
import {
  type BbmodelNativeOptions,
  readBbmodelNativeOptions,
} from '../../../import/bbmodelNativeOptions'
import {
  BBMODEL_APPEARANCE_FIELDS,
  BBMODEL_CLIP_FIELDS,
  BBMODEL_GEOMETRY_FIELDS,
  BBMODEL_MOVEMENT_FIELDS,
  BBMODEL_OMISSION_FIELDS,
} from './bbmodelImportFields'
import { SceneBbmodelImportOptions } from './SceneBbmodelImportOptions'

test('bbmodel option fields cover every normalized codec choice and only update their declared leaf', () => {
  const options = readBbmodelNativeOptions({ sourcePreference: 'prefer-embedded' }),
    before = structuredClone(options),
    fields = [
      ...BBMODEL_APPEARANCE_FIELDS,
      ...BBMODEL_GEOMETRY_FIELDS,
      ...BBMODEL_OMISSION_FIELDS,
      ...BBMODEL_MOVEMENT_FIELDS,
      ...BBMODEL_CLIP_FIELDS,
    ],
    paths = Object.entries(options).flatMap(([group, value]) =>
      typeof value === 'string' ? [group] : Object.keys(value).map((key) => `${group}.${key}`),
    ),
    represented = fields.map((field) => field.name.split('-').slice(1).join('.'))
  represented.push(
    'sourcePreference',
    'nodeMaterials.color',
    'nodeMaterials.doubleSided',
    'clips.fps',
  )
  expect(new Set(represented)).toEqual(new Set(paths))
  expect(represented.length).toBe(paths.length)
  expect(new Set(fields.map((field) => field.label)).size).toBe(fields.length)
  for (const field of fields) {
    const [, group, key] = field.name.split('-')
    if (!group || !key) throw new Error('Declared group and key expected')
    for (const [choice] of field.choices) {
      const output = field.change(options, choice),
        normalized = readBbmodelNativeOptions(output),
        expected: Record<string, unknown> = structuredClone(options),
        values = expected[group]
      if (!values || typeof values !== 'object') throw new Error('Nested group expected')
      Object.assign(values, { [key]: choice })
      expect(expected).toEqual(normalized)
      expect(field.value(output)).toBe(choice)
      expect(options).toEqual(before)
    }
    expect(field.change(options, 'unknown')).toBe(options)
  }
})

test('bbmodel movement controls expose every integer FPS and keep controller omission independent', () => {
  const options = readBbmodelNativeOptions({
      sourcePreference: 'prefer-embedded',
      remainder: { animations: 'convert' },
    }),
    changes: BbmodelNativeOptions[] = [],
    view = render(
      <SceneBbmodelImportOptions options={options} change={(value) => changes.push(value)} />,
    )
  try {
    for (let fps = 1; fps <= 120; fps++) {
      fireEvent.change(screen.getByLabelText(movement.fps), { target: { value: String(fps) } })
      const actual = changes.at(-1)
      if (!actual) throw new Error('Expected FPS change')
      expect(readBbmodelNativeOptions(actual)).toEqual({
        ...options,
        clips: { ...options.clips, fps },
      })
      view.rerender(
        <SceneBbmodelImportOptions
          options={readBbmodelNativeOptions(actual)}
          change={(value) => changes.push(value)}
        />,
      )
    }
    fireEvent.change(screen.getByLabelText(copy.animations), { target: { value: 'omit' } })
    expect(changes.at(-1)?.remainder).toEqual({
      ...options.remainder,
      animations: 'omit',
      controllers: 'reject',
    })
    fireEvent.change(screen.getByLabelText(copy.controllers), { target: { value: 'omit' } })
    expect(changes.at(-1)?.remainder).toEqual({ ...options.remainder, controllers: 'omit' })
    expect(options.remainder.controllers).toBe('reject')
    view.rerender(
      <SceneBbmodelImportOptions
        options={{ ...options, remainder: { ...options.remainder, animations: 'reject' } }}
        change={(value) => changes.push(value)}
      />,
    )
    expect(screen.queryByLabelText(movement.fps)).toBeNull()
  } finally {
    view.unmount()
  }
})
test('bbmodel opacity editing preserves exact unrounded linear RGB and color editing preserves exact opacity', () => {
  const options = readBbmodelNativeOptions({
      sourcePreference: 'prefer-embedded',
      nodeMaterials: {
        untextured: 'uniform',
        color: [0.123456789, 0.234567891, 0.345678912, 0.333333333],
      },
    }),
    changes: BbmodelNativeOptions[] = [],
    view = render(
      <SceneBbmodelImportOptions options={options} change={(value) => changes.push(value)} />,
    )
  try {
    fireEvent.change(screen.getByLabelText(copy.alpha), { target: { value: '27' } })
    expect(changes.at(-1)!.nodeMaterials!.color).toEqual([
      0.123456789, 0.234567891, 0.345678912, 0.27,
    ])
    fireEvent.change(screen.getByLabelText(copy.color), { target: { value: '#336699' } })
    expect(changes.at(-1)!.nodeMaterials!.color![3]).toBe(0.333333333)
    expect(options.nodeMaterials.color).toEqual([
      0.123456789, 0.234567891, 0.345678912, 0.333333333,
    ])
  } finally {
    view.unmount()
  }
})
