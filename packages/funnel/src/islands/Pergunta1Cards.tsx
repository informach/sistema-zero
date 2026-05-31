import { useEffect, useRef, useState } from 'react'
import { PERGUNTA_1 } from '../content/quiz-config'
import { apiPatch, apiPost } from '../lib/api-fetch'

export default function Pergunta1Cards() {
  const [busy, setBusy] = useState(false)
  // Criação do lead compartilhada num único promise: evita a corrida (mount +
  // clique rápido antes do Set-Cookie voltar) que criava dois leads órfãos.
  const leadReady = useRef<Promise<unknown> | null>(null)

  // Inicia o lead já na entrada (cookie + evento entrou_landing).
  useEffect(() => {
    leadReady.current ??= apiPost('/api/leads')
    leadReady.current.catch(() => {})
  }, [])

  async function escolher(value: string) {
    if (busy) return
    setBusy(true)
    try {
      leadReady.current ??= apiPost('/api/leads') // garante o lead (idempotente)
      await leadReady.current
      await apiPatch('/api/leads', {
        key: 'segmento',
        value,
        lastStep: 'quiz_pergunta_1',
        eventName: 'respondeu_pergunta_1',
      })
      window.location.href = '/quiz'
    } catch {
      leadReady.current = null // permite recriar numa nova tentativa
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {PERGUNTA_1.opcoes.map((opt) => (
        <button
          key={opt.value}
          type="button"
          disabled={busy}
          onClick={() => escolher(opt.value)}
          className="group relative flex min-h-44 flex-col justify-end overflow-hidden rounded-2xl border border-line p-5 text-left transition hover:border-lime disabled:opacity-60"
          style={{
            backgroundImage: `linear-gradient(to top, rgba(13,17,23,0.94) 10%, rgba(13,17,23,0.45) 70%, rgba(38,44,54,0.6)), url(${opt.image})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <span className="absolute left-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-lime text-sm font-bold text-[#0b0f14]">
            {opt.value}
          </span>
          <span className="text-base font-semibold text-ink">{opt.label}</span>
        </button>
      ))}
    </div>
  )
}
