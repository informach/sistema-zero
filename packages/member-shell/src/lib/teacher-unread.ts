'use client'
import { useEffect, useState } from 'react'
import { apiGet } from './api'

export function refreshTeacherUnread() {
  window.dispatchEvent(new Event('sz:teacher-unread'))
}

export function useTeacherUnread(scope: string) {
  const [count, setCount] = useState(0)
  // biome-ignore lint/correctness/useExhaustiveDependencies: navegar entre recados deve atualizar a leitura imediatamente.
  useEffect(() => {
    let active = true
    let sequence = 0
    const refresh = async () => {
      if (document.hidden) return
      const request = ++sequence
      try {
        const result = await apiGet<{ count: number }>('/api/members/teacher-threads/unread-count')
        if (active && request === sequence) setCount(result.count)
      } catch {
        /* O próximo foco ou ciclo tenta novamente. */
      }
    }
    void refresh()
    const timer = setInterval(() => void refresh(), 30_000)
    window.addEventListener('focus', refresh)
    window.addEventListener('sz:teacher-unread', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      active = false
      clearInterval(timer)
      window.removeEventListener('focus', refresh)
      window.removeEventListener('sz:teacher-unread', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [scope])
  return count
}
