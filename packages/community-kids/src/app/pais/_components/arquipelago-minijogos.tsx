'use client'
import { type Minijogo, MinijogosSchema } from '@sistemazero/member-shell/lib/arquipelago-contracts'
import { sessionFetch } from '@sistemazero/member-shell/lib/session-fetch'
import { lazy, Suspense, useEffect, useState } from 'react'

const Player = lazy(() =>
  import('@sistemazero/member-shell/components/arquipelago-minijogo-player').then((m) => ({
    default: m.ArquipelagoMinijogoPlayer,
  })),
)

/** Falha ou ausência de minijogos esconde somente esta parte do cartão. */
export function MinijogosDaCrianca({
  perfilId,
  nome,
  inicial,
}: {
  perfilId: string
  nome: string
  inicial?: Minijogo[]
}) {
  const [lista, setLista] = useState<Minijogo[]>(inicial ?? [])
  const [jogo, setJogo] = useState<string | null>(null)
  const rota = `/api/parents/arquipelago/minijogos/${encodeURIComponent(perfilId)}`
  useEffect(() => {
    if (inicial) {
      setLista(inicial)
      return
    }
    const c = new AbortController()
    setLista([])
    void (async () => {
      try {
        const r = await sessionFetch(rota, { signal: c.signal, cache: 'no-store' })
        if (!r.ok) return
        const d = MinijogosSchema.parse(await r.json())
        if (!c.signal.aborted) setLista(d.minijogos)
      } catch {}
    })()
    return () => c.abort()
  }, [rota, inicial])
  if (!lista.length) return null
  return (
    <section className="rounded-2xl border border-border p-4">
      <h3 className="font-bold">Minijogos que {nome} fez</h3>
      <ul className="mt-3 flex flex-col gap-3">
        {lista.map((m) => (
          <li key={m.desafioId} className="flex items-center justify-between gap-3">
            <span className="break-words">{m.titulo}</span>
            <button
              type="button"
              className="sz-btn-gradient min-h-11 px-4"
              aria-label={`Jogar ${m.titulo}`}
              onClick={() => setJogo(m.desafioId)}
            >
              Jogar
            </button>
          </li>
        ))}
      </ul>
      {jogo && (
        <Suspense fallback={<p role="status">Abrindo minijogo.</p>}>
          <Player
            key={jogo}
            userId={perfilId}
            audience="kids"
            environmentUrl={`${rota}?id=${encodeURIComponent(jogo)}`}
            url={`${rota}?id=${encodeURIComponent(jogo)}`}
            onClose={() => setJogo(null)}
          />
        </Suspense>
      )}
    </section>
  )
}

/** Independente da leitura da semana, que pode estar indisponível. */
export function MinijogosDaFamilia() {
  const [criancas, setCriancas] = useState<
    { perfilId: string; nome: string; minijogos: Minijogo[] }[]
  >([])
  useEffect(() => {
    const c = new AbortController()
    void (async () => {
      try {
        const r = await sessionFetch('/api/parents/arquipelago/minijogos', {
          signal: c.signal,
          cache: 'no-store',
        })
        if (!r.ok) return
        const d = await r.json()
        if (!Array.isArray(d.criancas) || c.signal.aborted) return
        setCriancas(
          d.criancas.flatMap((v: { perfilId?: unknown; nome?: unknown; minijogos?: unknown }) => {
            const jogos = MinijogosSchema.safeParse({ minijogos: v.minijogos })
            return typeof v.perfilId === 'string' &&
              /^[0-9a-f-]{36}$/i.test(v.perfilId) &&
              typeof v.nome === 'string' &&
              jogos.success
              ? [{ perfilId: v.perfilId, nome: v.nome, minijogos: jogos.data.minijogos }]
              : []
          }),
        )
      } catch {}
    })()
    return () => c.abort()
  }, [])
  return (
    <>
      {criancas.map((c) => (
        <MinijogosDaCrianca
          key={c.perfilId}
          perfilId={c.perfilId}
          nome={c.nome}
          inicial={c.minijogos}
        />
      ))}
    </>
  )
}
