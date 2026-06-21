'use client'

import { ChevronLeft, ChevronRight, Coins, Lock } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { AVATAR_LAYER_LABELS, AVATAR_LAYERS, AVATAR_PART_INFO } from '@/lib/avatar-catalog'
import { cn } from '@/lib/cn'
import type { AvatarPartView, AvatarStateView } from '@/lib/types'
import { KidsAvatar } from './kids-avatar'
import { KidsMascot } from './mascot'

/**
 * Editor do avatar (overlay): preview ao vivo + um carrossel por camada. Peça
 * travada mostra o preço e o botão "Comprar" (gasta moedas Zappy); "Salvar" só
 * libera quando todas as peças escolhidas são grátis ou já compradas. Carrega o
 * estado do members (`GET /api/members/avatar`) e salva via `PUT`.
 */
export function AvatarEditor({ onClose }: { onClose: () => void }) {
  const [state, setState] = useState<AvatarStateView | null>(null)
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [balance, setBalance] = useState(0)
  const [busy, setBusy] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let alive = true
    fetch('/api/members/avatar')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: AvatarStateView | null) => {
        if (!alive || !data) return
        setState(data)
        setDraft({ ...data.equipped })
        setBalance(data.balance)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  const byLayer = useMemo(() => {
    const map = new Map<string, AvatarPartView[]>()
    for (const p of state?.parts ?? []) {
      const list = map.get(p.layer) ?? []
      list.push(p)
      map.set(p.layer, list)
    }
    return map
  }, [state])

  const ownedById = useMemo(
    () => new Map((state?.parts ?? []).map((p) => [p.id, p.owned])),
    [state],
  )

  const lockedSelected = AVATAR_LAYERS.some((layer) => {
    const id = draft[layer]
    return id ? ownedById.get(id) === false : false
  })

  function cycle(layer: string, dir: 1 | -1) {
    const list = byLayer.get(layer) ?? []
    if (list.length === 0) return
    const current = draft[layer]
    const idx = Math.max(
      0,
      list.findIndex((p) => p.id === current),
    )
    const next = list[(idx + dir + list.length) % list.length]
    if (next) setDraft((d) => ({ ...d, [layer]: next.id }))
  }

  async function buy(part: AvatarPartView) {
    if (busy) return
    setBusy(part.id)
    try {
      const res = await fetch(`/api/members/avatar/parts/${encodeURIComponent(part.id)}/buy`, {
        method: 'POST',
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        toast.error(
          res.status === 402 ? 'Você ainda não tem moedas suficientes!' : 'Não consegui comprar.',
        )
        return
      }
      // Marca como possuída e atualiza o saldo (resposta autoritativa do members).
      setState((s) =>
        s
          ? {
              ...s,
              parts: s.parts.map((p) =>
                p.id === part.id ? { ...p, owned: true, locked: false } : p,
              ),
            }
          : s,
      )
      if (typeof body?.balance === 'number') setBalance(body.balance)
      toast.success('Peça desbloqueada! 🎉')
    } catch {
      toast.error('Não consegui comprar agora.')
    } finally {
      setBusy(null)
    }
  }

  async function save() {
    if (saving || lockedSelected) return
    setSaving(true)
    try {
      const res = await fetch('/api/members/avatar', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ parts: draft }),
      })
      if (!res.ok) throw new Error('save failed')
      toast.success('Avatar salvo! 😄')
      onClose()
    } catch {
      toast.error('Não consegui salvar agora. Tente de novo!')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="sz-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Personalizar avatar"
    >
      <div className="sz-modal flex w-full max-w-md flex-col rounded-3xl bg-card p-6 shadow-xl">
        <h2 className="sz-display text-center text-2xl">Meu avatar</h2>

        <div className="mt-3 flex flex-col items-center">
          {state ? (
            <KidsAvatar config={{ parts: draft }} size="xl" label="Prévia do seu avatar" />
          ) : (
            <KidsMascot expression="thinking" className="size-28" />
          )}
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-(--kids-lime-tint) px-3 py-1 [font-family:var(--font-display)] font-bold text-sm">
            <Coins className="size-4" /> {balance}
          </span>
        </div>

        <div className="mt-4 flex max-h-[42vh] flex-col gap-2 overflow-y-auto pr-1 scrollbar-subtle">
          {AVATAR_LAYERS.map((layer) => {
            const selectedId = draft[layer]
            const selected = state?.parts.find((p) => p.id === selectedId)
            const info = selectedId ? AVATAR_PART_INFO[selectedId] : undefined
            const isLocked = selected ? !selected.owned : false
            return (
              <div
                key={layer}
                className="flex items-center gap-2 rounded-2xl border-2 border-border px-2 py-1.5"
              >
                <span className="w-24 shrink-0 truncate font-semibold text-muted-foreground text-xs">
                  {AVATAR_LAYER_LABELS[layer]}
                </span>
                <button
                  type="button"
                  onClick={() => cycle(layer, -1)}
                  aria-label={`${AVATAR_LAYER_LABELS[layer]}: anterior`}
                  className="grid size-11 place-items-center rounded-full bg-muted text-foreground transition-transform active:scale-90"
                >
                  <ChevronLeft className="size-5" />
                </button>
                <span className="flex-1 truncate text-center [font-family:var(--font-display)] font-bold text-sm">
                  {info?.labelPt ?? '—'}
                </span>
                <button
                  type="button"
                  onClick={() => cycle(layer, 1)}
                  aria-label={`${AVATAR_LAYER_LABELS[layer]}: próximo`}
                  className="grid size-11 place-items-center rounded-full bg-muted text-foreground transition-transform active:scale-90"
                >
                  <ChevronRight className="size-5" />
                </button>
                {isLocked && selected ? (
                  <button
                    type="button"
                    onClick={() => buy(selected)}
                    // Desabilita durante QUALQUER compra (não só a desta peça): com
                    // `busy === id` os outros botões ficavam clicáveis mas o onClick
                    // era engolido por `if (busy) return` — dead-click sem feedback.
                    disabled={!!busy}
                    className="inline-flex shrink-0 items-center gap-1 rounded-full bg-(--kids-lime-tint) px-2.5 py-1 [font-family:var(--font-display)] font-bold text-xs disabled:opacity-60"
                  >
                    <Lock className="size-3.5" />
                    {selected.price}
                  </button>
                ) : null}
              </div>
            )
          })}
        </div>

        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={save}
            disabled={saving || lockedSelected}
            className={cn(
              'sz-btn-gradient h-12 text-base',
              (saving || lockedSelected) && 'opacity-60',
            )}
          >
            {saving ? 'Salvando…' : lockedSelected ? 'Compre a peça travada 🔒' : 'Salvar avatar'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground text-sm transition-colors hover:text-foreground"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
