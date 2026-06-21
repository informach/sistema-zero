'use client'

import { ArrowLeft, Coins, Loader2, Lock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  AVATAR_CATEGORIES,
  AVATAR_CATEGORY_LABELS,
  AVATAR_CATEGORY_PALETTES,
  AVATAR_PART_INFO,
  type AvatarCategory,
  type AvatarSlot,
} from '@/lib/avatar3d-catalog'
import { cn } from '@/lib/cn'
import type { AvatarPartView, AvatarStateView } from '@/lib/types'
import { KidsMascot } from '../mascot'
import { AvatarScene, type CaptureFn } from './avatar-scene'

type Slots = Record<string, AvatarSlot>

/**
 * Configurador de avatar 3D (tela cheia). Personagem ao vivo + lojinha por categoria
 * (peça grátis OU comprada com Zappy) + paleta de cores. "Salvar" persiste a config 3D
 * E tira a foto (snapshot) que vira o avatar em todo o app. Estado no members (portão).
 */
export function AvatarConfigurator({ dark }: { dark: boolean }) {
  const router = useRouter()
  const [state, setState] = useState<AvatarStateView | null>(null)
  const [slots, setSlots] = useState<Slots>({})
  const [balance, setBalance] = useState(0)
  const [category, setCategory] = useState<AvatarCategory>('head')
  const [busy, setBusy] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const captureRef = useRef<CaptureFn | null>(null)
  const onReady = useCallback((c: CaptureFn) => {
    captureRef.current = c
  }, [])

  useEffect(() => {
    let alive = true
    fetch('/api/members/avatar')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: AvatarStateView | null) => {
        if (!alive || !data) return
        setState(data)
        setSlots({ ...data.equipped } as Slots)
        setBalance(data.balance)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  const ownedById = useMemo(
    () => new Map((state?.parts ?? []).map((p) => [p.id, p.owned])),
    [state],
  )
  const partsByCategory = useMemo(() => {
    const map = new Map<string, AvatarPartView[]>()
    for (const p of state?.parts ?? []) {
      const list = map.get(p.category) ?? []
      list.push(p)
      map.set(p.category, list)
    }
    return map
  }, [state])

  // Salvar só libera quando toda peça escolhida é grátis ou comprada.
  const hasLocked = AVATAR_CATEGORIES.some((c) => {
    const id = slots[c]?.asset
    return id ? ownedById.get(id) === false : false
  })

  function selectPart(part: AvatarPartView) {
    if (!part.owned) {
      void buy(part)
      return
    }
    setSlots((s) => ({ ...s, [part.category]: { ...s[part.category], asset: part.id } }))
  }

  function selectColor(color: string) {
    setSlots((s) => ({ ...s, [category]: { ...(s[category] ?? { asset: '' }), color } }))
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
      // Compra já equipa (a criança quer ver na hora).
      setSlots((sl) => ({ ...sl, [part.category]: { ...sl[part.category], asset: part.id } }))
      toast.success('Desbloqueado! 🎉')
    } catch {
      toast.error('Não consegui comprar agora.')
    } finally {
      setBusy(null)
    }
  }

  async function save() {
    if (saving || hasLocked) return
    setSaving(true)
    try {
      const eq = await fetch('/api/members/avatar', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slots }),
      })
      if (!eq.ok) throw new Error('equip')
      // Foto (best-effort): a config já salvou; falha de foto não derruba o save.
      const capture = captureRef.current
      if (capture) {
        try {
          const blob = await capture()
          if (blob) {
            const fd = new FormData()
            fd.append('file', new File([blob], 'avatar.png', { type: 'image/png' }))
            await fetch('/api/members/avatar/snapshot', { method: 'POST', body: fd })
          }
        } catch {
          // ignora — foto é cosmética; a próxima vez tenta de novo
        }
      }
      toast.success('Avatar salvo! 😄')
      router.push('/perfil')
      router.refresh()
    } catch {
      toast.error('Não consegui salvar agora. Tente de novo!')
    } finally {
      setSaving(false)
    }
  }

  const palette = AVATAR_CATEGORY_PALETTES[category]
  const currentColor = slots[category]?.color
  const items = partsByCategory.get(category) ?? []

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Cena 3D ao fundo */}
      <div className="absolute inset-0">
        {state ? (
          <AvatarScene slots={slots} onReady={onReady} dark={dark} />
        ) : (
          <div className="flex h-full items-center justify-center">
            <KidsMascot expression="thinking" className="size-24 animate-pulse" />
          </div>
        )}
      </div>

      {/* Barra superior */}
      <div className="relative z-10 flex items-center justify-between p-4">
        <button
          type="button"
          onClick={() => router.push('/perfil')}
          aria-label="Voltar"
          className="grid size-11 place-items-center rounded-full bg-card/90 text-foreground shadow-md backdrop-blur transition-transform active:scale-90"
        >
          <ArrowLeft className="size-5" />
        </button>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-(--kids-lime-tint) px-3 py-1.5 [font-family:var(--font-display)] font-bold text-sm shadow-md">
          <Coins className="size-4" /> {balance}
        </span>
      </div>

      {/* Painel inferior: categorias + itens + cores + salvar */}
      <div className="relative z-10 mt-auto flex flex-col gap-3 rounded-t-3xl bg-card/95 p-4 shadow-2xl backdrop-blur">
        {/* Abas de categoria */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-subtle">
          {AVATAR_CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={cn(
                'shrink-0 rounded-full px-3 py-2 font-semibold text-sm transition-colors',
                c === category
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground',
              )}
            >
              {AVATAR_CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>

        {/* Itens da categoria */}
        <div className="flex max-h-[28vh] flex-wrap gap-2 overflow-y-auto scrollbar-subtle">
          {items.map((part) => {
            const info = AVATAR_PART_INFO[part.id]
            const selected = slots[part.category]?.asset === part.id
            return (
              <button
                key={part.id}
                type="button"
                onClick={() => selectPart(part)}
                disabled={!!busy}
                className={cn(
                  'relative flex min-w-[5.5rem] flex-1 flex-col items-center gap-1 rounded-2xl border-2 px-2 py-2.5 text-center transition-all disabled:opacity-60',
                  selected ? 'border-primary bg-primary/10' : 'border-border bg-muted/40',
                )}
              >
                <span className="line-clamp-1 [font-family:var(--font-display)] font-bold text-xs">
                  {info?.labelPt ?? part.id}
                </span>
                {part.locked ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-(--kids-lime-tint) px-2 py-0.5 font-bold text-[0.7rem]">
                    <Lock className="size-3" /> {part.price}
                  </span>
                ) : (
                  <span className="text-[0.7rem] text-muted-foreground">
                    {selected ? 'Usando' : part.tier === 'free' ? 'Grátis' : 'Seu'}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Paleta de cores (só categorias com paleta) */}
        {palette && palette.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-subtle">
            {palette.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => selectColor(color)}
                aria-label={`Cor ${color}`}
                className={cn(
                  'size-10 shrink-0 rounded-full border-2 transition-transform active:scale-90',
                  currentColor === color ? 'border-foreground' : 'border-transparent',
                )}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={save}
          disabled={saving || hasLocked || !state}
          className={cn('sz-btn-gradient h-12 text-base', (saving || hasLocked) && 'opacity-60')}
        >
          {saving ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="size-5 animate-spin" /> Salvando…
            </span>
          ) : hasLocked ? (
            'Compre a peça travada 🔒'
          ) : (
            'Salvar avatar 📸'
          )}
        </button>
      </div>
    </div>
  )
}
