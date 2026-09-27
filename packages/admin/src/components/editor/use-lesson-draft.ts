'use client'

import type { LessonDraft } from '@sistemazero/core/learning'
import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { apiGet, apiSend } from '@/lib/api'
import { LessonDraftSession } from '@/lib/lesson-draft-session'
import { readDraftRecovery, writeDraftRecovery } from '@/lib/lesson-draft-storage'
import type { LessonBlockContent } from '@/lib/types'

export function useLessonDraft(lessonId: string, authorId: string) {
  const session = useMemo(() => {
    const key = `${authorId}:${lessonId}`
    const path = `/api/members/lessons/${encodeURIComponent(lessonId)}/draft`
    return new LessonDraftSession<LessonBlockContent>({
      read: () => apiGet<LessonDraft<LessonBlockContent>>(path),
      send: (command) =>
        apiSend<Pick<LessonDraft, 'revision' | 'updatedAt'>>(path, 'PATCH', command),
      readLocal: () => readDraftRecovery(key),
      writeLocal: (recovery) => writeDraftRecovery(key, recovery),
      archiveLocal: (recovery) => writeDraftRecovery(`${key}:conflict:${Date.now()}`, recovery),
    })
  }, [lessonId, authorId])
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot)
  useEffect(() => {
    void session.load()
    return () => session.dispose()
  }, [session])
  useEffect(() => {
    const leave = (event: BeforeUnloadEvent) => {
      if (session.getSnapshot().status === 'saved') return
      event.preventDefault()
    }
    const reconnect = () => {
      if (session.getSnapshot().status === 'error')
        void session.flush().catch(() => {
          /* The session displays the synchronization error. */
        })
    }
    window.addEventListener('beforeunload', leave)
    window.addEventListener('online', reconnect)
    return () => {
      window.removeEventListener('beforeunload', leave)
      window.removeEventListener('online', reconnect)
    }
  }, [session])
  return { ...state, session }
}
