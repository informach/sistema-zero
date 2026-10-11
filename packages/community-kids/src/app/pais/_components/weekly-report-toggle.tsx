'use client'

import { sessionFetch as fetch } from '@sistemazero/member-shell/lib/session-fetch'
import { Mail } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { ParentReportPrefsView } from '@/lib/types'

/**
 * O resumo da semana por e-mail (opt-out por conta). Um interruptor de verdade: a caixa nativa
 * com papel de `switch`, então teclado e leitor de tela funcionam sem nada a mais.
 */
export function WeeklyReportToggle() {
  const [prefs, setPrefs] = useState<ParentReportPrefsView | null>(null)
  const [failed, setFailed] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let alive = true
    fetch('/api/parents/report-prefs')
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data: ParentReportPrefsView) => {
        if (alive) setPrefs(data)
      })
      .catch(() => {
        if (alive) setFailed(true)
      })
    return () => {
      alive = false
    }
  }, [])

  async function toggle(receive: boolean) {
    setSaving(true)
    try {
      const res = await fetch('/api/parents/report-prefs', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ disabled: !receive }),
      })
      if (!res.ok) throw new Error('save failed')
      setPrefs((await res.json()) as ParentReportPrefsView)
    } catch {
      toast.error('Não foi possível salvar. Tente de novo.')
    } finally {
      setSaving(false)
    }
  }

  if (failed || prefs === null) return null
  const on = !prefs.disabled
  return (
    <label className="kids-carta flex cursor-pointer items-start justify-between gap-4 p-5 text-sm">
      <span className="min-w-0">
        <span className="flex items-center gap-2 font-extrabold">
          <Mail className="size-4" aria-hidden="true" /> Receber o resumo da semana por e-mail
        </span>
        <span className="mt-1 block text-muted-foreground">
          Toda sexta no fim da tarde enviamos como foi a semana das crianças.
        </span>
      </span>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input
          type="checkbox"
          role="switch"
          aria-checked={on}
          checked={on}
          disabled={saving}
          onChange={(event) => void toggle(event.target.checked)}
          className="peer absolute inset-0 z-10 size-full cursor-pointer opacity-0"
        />
        <span
          aria-hidden="true"
          className="h-7 w-12 rounded-full bg-muted transition-colors peer-checked:bg-primary peer-focus-visible:outline-2 peer-focus-visible:outline-primary peer-focus-visible:outline-offset-2 peer-disabled:opacity-60"
        />
        <span
          aria-hidden="true"
          className="absolute top-1 left-1 size-5 rounded-full bg-card shadow transition-transform peer-checked:translate-x-5"
        />
      </span>
    </label>
  )
}
