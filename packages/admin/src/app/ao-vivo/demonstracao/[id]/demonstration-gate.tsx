'use client'
import type { LiveRoomView } from '@sistemazero/core/live'
import { LiveDemonstration } from '@sistemazero/member-shell/components/live/live-workspace'
import { liveRequest } from '@sistemazero/member-shell/lib/live/client'
import { useEffect, useState } from 'react'

export function DemonstrationGate({ sessionId }: { sessionId: string }) {
  const [room, setRoom] = useState<LiveRoomView | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    liveRequest<LiveRoomView>(
      `/api/live/sessions/${sessionId}`,
      undefined,
      'GET',
      controller.signal,
    )
      .then((next) => {
        if (next.role !== 'teacher') throw new Error('Esta demonstração é de quem conduz a turma.')
        setRoom(next)
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setError(cause.message)
      })
    return () => controller.abort()
  }, [sessionId])
  if (error)
    return (
      <p role="alert" className="p-6">
        {error}
      </p>
    )
  return room ? (
    <LiveDemonstration room={room} />
  ) : (
    <p role="status" className="p-6">
      Preparando demonstração…
    </p>
  )
}
