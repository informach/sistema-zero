'use client'
import type { LiveAssistanceView } from '@sistemazero/core/live'
import type { StudioHandle } from '@sistemazero/studio'
import { MousePointer2 } from 'lucide-react'
import { type RefObject, useEffect, useState } from 'react'
import { cursorPosition } from '../../lib/live/cursor'

export function LiveAssistanceCursor({
  root,
  assistance,
  revision,
  editor,
}: {
  root: RefObject<HTMLDivElement | null>
  assistance: LiveAssistanceView
  revision: number
  editor: RefObject<Pick<StudioHandle, 'getCodeCursorPosition' | 'onCodeCursorChange'> | null>
}) {
  const cursorKey = JSON.stringify([
    assistance.id,
    assistance.teacherId,
    revision,
    assistance.cursor,
  ])
  const [position, setPosition] = useState<{
    key: string
    point: { left: number; top: number }
  } | null>(null)
  useEffect(() => {
    let active = true,
      generation = 0
    const update = async () => {
      const currentGeneration = ++generation
      const cursor = assistance.cursor
      let point: { left: number; top: number } | null = null
      const element = root.current
      if (
        element &&
        cursor?.target &&
        cursor.revision === revision &&
        Date.parse(cursor.expiresAt) > Date.now()
      ) {
        if (cursor.target.kind === 'code') {
          const viewportPoint = await editor.current
            ?.getCodeCursorPosition(cursor.target)
            .catch(() => null)
          const rect = element.getBoundingClientRect()
          if (
            viewportPoint &&
            viewportPoint.left >= rect.left &&
            viewportPoint.left <= rect.right &&
            viewportPoint.top >= rect.top &&
            viewportPoint.top <= rect.bottom
          )
            point = { left: viewportPoint.left - rect.left, top: viewportPoint.top - rect.top }
        } else point = cursorPosition(element, cursor.target, cursor.x, cursor.y)
      }
      if (active && currentGeneration === generation)
        setPosition(
          cursor && Date.parse(cursor.expiresAt) > Date.now() && point
            ? { key: cursorKey, point }
            : null,
        )
    }
    const unsubscribe = editor.current?.onCodeCursorChange(() => {
      // Revoke the already painted position immediately, before resolving another hash/layout.
      setPosition(null)
      void update()
    })
    void update()
    const timer = setInterval(() => void update(), 150)
    return () => {
      active = false
      unsubscribe?.()
      clearInterval(timer)
    }
  }, [root, assistance, revision, editor, cursorKey])
  if (
    !position ||
    position.key !== cursorKey ||
    !assistance.cursor ||
    Date.parse(assistance.cursor.expiresAt) <= Date.now()
  )
    return null
  return (
    <div
      role="img"
      aria-label={`Cursor de ${assistance.teacherName}`}
      className="pointer-events-none absolute z-20 text-purple-600"
      style={position.point}
    >
      <MousePointer2 size={26} fill="currentColor" />
      <span className="ml-5 rounded-full bg-purple-700 px-2 py-1 text-xs font-bold text-white">
        Professora
      </span>
    </div>
  )
}
