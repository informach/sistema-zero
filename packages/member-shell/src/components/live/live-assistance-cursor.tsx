'use client'
import type { LiveAssistanceView } from '@sistemazero/core/live'
import { MousePointer2 } from 'lucide-react'
import { type RefObject, useEffect, useState } from 'react'
import { cursorPosition } from '../../lib/live/cursor'

export function LiveAssistanceCursor({
  root,
  assistance,
  revision,
}: {
  root: RefObject<HTMLDivElement | null>
  assistance: LiveAssistanceView
  revision: number
}) {
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null)
  useEffect(() => {
    const update = () => {
      const cursor = assistance.cursor
      setPosition(
        root.current &&
          cursor?.target &&
          cursor.revision === revision &&
          Date.parse(cursor.expiresAt) > Date.now()
          ? cursorPosition(root.current, cursor.target, cursor.x, cursor.y)
          : null,
      )
    }
    update()
    const timer = setInterval(update, 150)
    return () => clearInterval(timer)
  }, [root, assistance, revision])
  if (!position) return null
  return (
    <div
      role="img"
      aria-label={`Cursor de ${assistance.teacherName}`}
      className="pointer-events-none absolute z-20 text-purple-600"
      style={position}
    >
      <MousePointer2 size={26} fill="currentColor" />
      <span className="ml-5 rounded-full bg-purple-700 px-2 py-1 text-xs font-bold text-white">
        Professora
      </span>
    </div>
  )
}
