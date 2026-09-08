'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useTransition } from 'react'

export function PublicationStatus({ state }: { state: 'pending' | 'delivered' }) {
  const router = useRouter()
  const [refreshing, startTransition] = useTransition()
  const refreshed = useRef(0)
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState !== 'visible' || refreshed.current >= 3) return
      refreshed.current += 1
      startTransition(() => router.refresh())
      if (refreshed.current >= 3) clearInterval(timer)
    }, 5000)
    return () => clearInterval(timer)
  }, [router])
  return (
    <section
      id="publicar"
      className="scroll-mt-20 rounded-2xl border border-primary/25 bg-card p-6"
    >
      <p role="status" className="font-bold text-primary">
        Seu jogo já foi recebido
      </p>
      <h2 className="sz-display mt-2 text-xl">Estamos atualizando sua carreira</h2>
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
        {state === 'pending'
          ? 'A confirmação da publicação está a caminho. Seu jogo está guardado; você pode continuar navegando.'
          : 'A publicação foi confirmada. Estamos buscando sua conquista atualizada.'}
      </p>
      <div className="mt-4 flex flex-wrap gap-4">
        <button
          type="button"
          disabled={refreshing}
          onClick={() => startTransition(() => router.refresh())}
          className="min-h-11 rounded-xl bg-primary px-4 py-2 font-bold text-primary-foreground disabled:opacity-50"
        >
          {refreshing ? 'Atualizando…' : 'Atualizar carreira'}
        </button>
        <Link
          href="/mural-dos-criadores"
          className="inline-flex min-h-11 items-center font-bold text-primary"
        >
          Abrir o Mural
        </Link>
        <Link href="/recados" className="inline-flex min-h-11 items-center font-bold text-primary">
          Pedir ajuda ao professor
        </Link>
      </div>
    </section>
  )
}
