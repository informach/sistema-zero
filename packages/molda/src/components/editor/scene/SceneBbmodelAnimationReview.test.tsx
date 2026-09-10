import { expect, test } from 'bun:test'
import { fireEvent, render, screen } from '@testing-library/react'
import { BBMODEL_ANIMATION_IMPORT_COPY as copy } from '../../../core/bbmodelAnimationImportCopy'
import {
  bbmodelAnimatedImportFixture,
  bbmodelAnimatedSource,
  BBMODEL_ANIMATED_TARGET as target,
} from '../../../testing/bbmodelAnimatedImportFixture'
import { directBbmodelImport } from '../../../testing/bbmodelImportFixture'
import { SceneBbmodelAnimationReview } from './SceneBbmodelAnimationReview'

test('bbmodel movement review pages through every omission by original name without mounting a giant list or interpreting text', () => {
  const source = bbmodelAnimatedSource(),
    input = bbmodelAnimatedImportFixture({
      ...source,
      animations: Array.from({ length: 26 }, (_, i) => ({
        uuid: `clip${i}`,
        name: i === 0 ? '<script>never_execute()</script>' : `Pular ${i}`,
        length: 1,
        animators: { [target]: { type: 'bone', rotation_global: i > 0, keyframes: [] } },
      })),
    })
  input.options.clips = { adaptation: 'continuous-sampled', unresolved: 'omit-clip' }
  const ready = directBbmodelImport(input),
    report = ready.report.animations
  if (!report) throw new Error('Report expected')
  const before = structuredClone(ready),
    view = render(<SceneBbmodelAnimationReview report={report} document={ready.document} />)
  try {
    expect(screen.getByText(copy.summary(1, 25))).toBeDefined()
    expect(screen.getByText('<script>never_execute()</script>')).toBeDefined()
    expect(screen.getByText(copy.emptyClip)).toBeDefined()
    expect(view.container.querySelector('script')).toBeNull()
    expect(screen.getByRole('button', { name: copy.previous }).hasAttribute('disabled')).toBe(true)
    for (let page = 0; page < 6; page++) {
      expect(screen.getAllByRole('listitem')).toHaveLength(page === 5 ? 1 : 5)
      expect(screen.getByRole('status').textContent).toBe(
        copy.page(page * 5 + 1, Math.min(page * 5 + 5, 26), 26),
      )
      if (page < 5) fireEvent.click(screen.getByRole('button', { name: copy.next }))
    }
    expect(screen.getByText('Pular 25')).toBeDefined()
    expect(screen.getByRole('button', { name: copy.next }).hasAttribute('disabled')).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: copy.previous }))
    expect(screen.getByText('Pular 20')).toBeDefined()
    expect(ready).toEqual(before)
    const empty = directBbmodelImport(bbmodelAnimatedImportFixture({ ...source, animations: [] }))
    if (!empty.report.animations) throw new Error('Empty report expected')
    view.rerender(
      <SceneBbmodelAnimationReview report={empty.report.animations} document={empty.document} />,
    )
    expect(screen.getByText(copy.empty)).toBeDefined()
    expect(screen.queryByRole('listitem')).toBeNull()
  } finally {
    view.unmount()
  }
})

test('bbmodel review explains real discarded metadata, pre/post, zero size and values below draw precision', () => {
  const source = bbmodelAnimatedSource(),
    input = bbmodelAnimatedImportFixture({
      ...source,
      groups: [{ uuid: target, name: 'Corpo' }],
      animations: [
        {
          uuid: 'details',
          name: 'Detalhes',
          length: 1,
          markers: [{}],
          custom: false,
          animators: {
            [target]: {
              type: 'bone',
              keyframes: [
                { channel: 'position', time: 0, data_points: [{ x: 1e-50 }] },
                { channel: 'scale', time: 0, data_points: [{ x: 0 }, { x: 1 }] },
              ],
            },
          },
        },
      ],
    })
  input.options.clips = {
    adaptation: 'continuous-sampled',
    metadata: 'discard',
    unmapped: 'discard',
    discontinuities: 'sample-pre',
    zeroScale: 'preserve-zero',
  }
  const ready = directBbmodelImport(input),
    report = ready.report.animations
  if (!report) throw new Error('Report expected')
  const view = render(<SceneBbmodelAnimationReview report={report} document={ready.document} />)
  try {
    for (const message of [
      copy.discontinuous,
      copy.zeroes,
      copy.tiny,
      copy.reportHint,
      copy.discarded(2, 1),
    ])
      expect(screen.getByText(message)).toBeDefined()
    expect(screen.queryByRole('button', { name: copy.next })).toBeNull()
  } finally {
    view.unmount()
  }
})
