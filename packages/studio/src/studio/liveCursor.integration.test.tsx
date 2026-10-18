import { afterEach, expect, test } from 'bun:test'
import type { LiveAssistanceView } from '@sistemazero/core/live'
import { act, cleanup, render } from '@testing-library/react'
import { LiveAssistanceCursor } from '../../../member-shell/src/components/live/live-assistance-cursor'

afterEach(cleanup)

for (const invalidation of ['revision', 'buffer'] as const)
  test(`a ${invalidation} change revokes the painted pointer before a delayed resolution finishes`, async () => {
    const host = document.createElement('div')
    document.body.append(host)
    host.getBoundingClientRect = () => new DOMRect(0, 0, 600, 400)
    const root = { current: host }
    let invalidate = () => {},
      delayed = false,
      finish!: (value: null) => void
    const pending = new Promise<null>((resolve) => {
      finish = resolve
    })
    const editor = {
      current: {
        getCodeCursorPosition: async () => (delayed ? pending : { left: 100, top: 120 }),
        onCodeCursorChange: (listener: () => void) => {
          invalidate = listener
          return () => {
            invalidate = () => {}
          }
        },
      },
    }
    const assistance: LiveAssistanceView = {
      id: 'help',
      teacherId: 'teacher',
      teacherName: 'Ana',
      status: 'active',
      requestedAt: new Date().toISOString(),
      checkpointRevision: 0,
      cursor: {
        x: 0,
        y: 0,
        revision: 1,
        expiresAt: new Date(Date.now() + 10_000).toISOString(),
        target: {
          kind: 'code',
          id: 'main.py',
          start: 0,
          end: 0,
          sourceSha256: 'a'.repeat(64),
          modelVersion: 1,
        },
      },
    }
    const view = render(
      <LiveAssistanceCursor root={root} editor={editor} assistance={assistance} revision={1} />,
      { container: host },
    )
    await act(async () => {})
    expect(host.querySelector('[role="img"]')).not.toBeNull()
    delayed = true
    await act(async () => {
      if (invalidation === 'buffer') invalidate()
      else
        view.rerender(
          <LiveAssistanceCursor
            root={root}
            editor={editor}
            assistance={{ ...assistance, cursor: { ...assistance.cursor!, revision: 2 } }}
            revision={2}
          />,
        )
    })
    expect(host.querySelector('[role="img"]')).toBeNull()
    await act(async () => {
      finish(null)
      await pending
    })
    expect(host.querySelector('[role="img"]')).toBeNull()
  })
