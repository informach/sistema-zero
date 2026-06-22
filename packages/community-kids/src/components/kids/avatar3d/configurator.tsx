'use client'

import { ArrowLeft, Camera, Coins, Loader2, Lock, Shuffle, X } from 'lucide-react'
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
import { useAvatarThumbnail } from './avatar-thumbs'

type Slots = Record<string, AvatarSlot>
type Mode = 'customize' | 'photo'

/** Poses do `Poses.glb` (valor = nome da animação; rótulo PT didático). */
const POSES = [
  { id: 'Idle', label: 'Parado' },
  { id: 'Chill', label: 'Relax' },
  { id: 'Cool', label: 'Estiloso' },
  { id: 'Punch', label: 'Soco' },
  { id: 'Ninja', label: 'Ninja' },
  { id: 'King', label: 'Rei' },
  { id: 'Busy', label: 'Ocupado' },
] as const

/** Uma peça na grade — com MINIATURA renderizada (igual WawaSensei). "Nenhum" mostra "✕". */
function ItemTile({
  part,
  selected,
  disabled,
  onSelect,
}: {
  part: AvatarPartView
  selected: boolean
  disabled: boolean
  onSelect: () => void
}) {
  const isNone = part.id.endsWith('-none')
  const { url: thumb, loading } = useAvatarThumbnail(isNone ? null : part.id)
  const label = AVATAR_PART_INFO[part.id]?.labelPt ?? part.id
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-label={label}
      title={label}
      aria-pressed={selected}
      className={cn(
        'relative grid aspect-square place-items-center overflow-hidden rounded-2xl border-2 bg-muted/40 transition-all disabled:opacity-60',
        selected ? 'border-primary ring-2 ring-primary/40' : 'border-border',
      )}
    >
      {isNone ? (
        <X className="size-7 text-muted-foreground" />
      ) : thumb ? (
        <img src={thumb} alt="" className="size-full object-contain" draggable={false} />
      ) : loading ? (
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      ) : (
        // Miniatura falhou (sem GLB / WebGL indisponível): cai no rótulo de texto.
        <span className="line-clamp-2 px-1 text-center [font-family:var(--font-display)] font-bold text-[0.7rem] text-muted-foreground">
          {label}
        </span>
      )}
      {part.locked ? (
        <span className="absolute inset-x-1 bottom-1 inline-flex items-center justify-center gap-1 rounded-full bg-(--kids-lime-tint) px-1.5 py-0.5 font-bold text-[0.7rem] shadow">
          <Lock className="size-3" /> {part.price}
        </span>
      ) : null}
    </button>
  )
}

/**
 * Configurador de avatar 3D (tela cheia), bem próximo do WawaSensei: personagem ao vivo +
 * lojinha por categoria com MINIATURAS, paleta de cores, e duas abas — **Personalizar**
 * (vestir) e **Cabine de fotos** (escolher pose + posicionar a câmera e tirar a foto). A
 * "foto" (snapshot) vira o avatar em todo o app; a config 3D também é salva. Estado no members.
 */
export function AvatarConfigurator({ dark }: { dark: boolean }) {
  const router = useRouter()
  const [state, setState] = useState<AvatarStateView | null>(null)
  const [slots, setSlots] = useState<Slots>({})
  const [balance, setBalance] = useState(0)
  // Equipe (passe livre) = moedas ilimitadas: a lojinha mostra ∞ e nunca trava por saldo.
  const [coinsUnlimited, setCoinsUnlimited] = useState(false)
  const [mode, setMode] = useState<Mode>('customize')
  const [pose, setPose] = useState<string>('Idle')
  const [category, setCategory] = useState<AvatarCategory>('head')
  const [busy, setBusy] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [sceneReady, setSceneReady] = useState(false)
  const captureRef = useRef<CaptureFn | null>(null)
  const lastFitKey = useRef<string | null>(null)
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
        setCoinsUnlimited(data.balanceUnlimited === true)
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

  /** "Surpreenda-me": sorteia uma peça GRÁTIS/possuída + cor por categoria (nunca peça travada). */
  function randomize() {
    setSlots((prev) => {
      const next: Slots = { ...prev }
      for (const cat of AVATAR_CATEGORIES) {
        const owned = (partsByCategory.get(cat) ?? []).filter((p) => p.owned)
        const pick = owned[Math.floor(Math.random() * owned.length)]
        if (!pick) continue
        const palette = AVATAR_CATEGORY_PALETTES[cat]
        const color = palette?.length
          ? palette[Math.floor(Math.random() * palette.length)]
          : prev[cat]?.color
        next[cat] = color ? { asset: pick.id, color } : { asset: pick.id }
      }
      return next
    })
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
      if (body?.unlimited === true) setCoinsUnlimited(true)
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
    if (saving || hasLocked || !state || !sceneReady) return
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
  const activePose = mode === 'photo' ? pose : 'Idle'
  const sceneKey = useMemo(
    () =>
      AVATAR_CATEGORIES.map((c) => {
        const slot = slots[c]
        return `${c}:${slot?.asset ?? ''}:${slot?.color ?? ''}`
      }).join('|'),
    [slots],
  )
  const fitKey = `${mode}:${category}:${activePose}:${sceneKey}`
  const preparingScene = !!state && !sceneReady

  useEffect(() => {
    if (lastFitKey.current === fitKey) return
    lastFitKey.current = fitKey
    setSceneReady(false)
  }, [fitKey])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Cena 3D ao fundo */}
      <div className="absolute inset-0">
        {state ? (
          <AvatarScene
            slots={slots}
            onReady={onReady}
            onCaptureReady={setSceneReady}
            fitKey={fitKey}
            dark={dark}
            mode={mode}
            pose={activePose}
            category={category}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <KidsMascot expression="thinking" className="size-24 animate-pulse" />
          </div>
        )}
      </div>

      {/* Barra superior */}
      <div className="relative z-10 flex items-center justify-between gap-2 p-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push('/perfil')}
            aria-label="Voltar"
            className="grid size-11 place-items-center rounded-full bg-card/90 text-foreground shadow-md backdrop-blur transition-transform active:scale-90"
          >
            <ArrowLeft className="size-5" />
          </button>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-(--kids-lime-tint) px-3 py-1.5 [font-family:var(--font-display)] font-bold text-sm shadow-md">
            <Coins className="size-4" /> {coinsUnlimited ? '∞' : balance}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={randomize}
            disabled={!state || !!busy}
            aria-label="Surpreenda-me"
            title="Surpreenda-me"
            className="grid size-11 place-items-center rounded-full bg-card/90 text-foreground shadow-md backdrop-blur transition-transform active:scale-90 disabled:opacity-50"
          >
            <Shuffle className="size-5" />
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving || hasLocked || !state || !sceneReady}
            className={cn(
              'inline-flex h-11 items-center gap-2 rounded-full px-4 font-bold text-sm shadow-md transition-transform active:scale-95',
              hasLocked
                ? 'bg-card/90 text-muted-foreground'
                : 'sz-btn-gradient text-primary-foreground',
              (saving || !state || !sceneReady) && 'opacity-60',
            )}
          >
            {saving || preparingScene ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <Camera className="size-5" />
            )}
            <span className="hidden sm:inline">
              {saving
                ? 'Salvando…'
                : hasLocked
                  ? 'Peça travada 🔒'
                  : preparingScene
                    ? 'Preparando foto…'
                    : mode === 'photo'
                      ? 'Tirar foto'
                      : 'Salvar'}
            </span>
          </button>
        </div>
      </div>

      {/* Painel inferior */}
      <div className="relative z-10 mt-auto flex flex-col gap-3 rounded-t-3xl bg-card/95 p-4 shadow-2xl backdrop-blur">
        {mode === 'customize' ? (
          <>
            {/* Cores (acima dos itens, como no WawaSensei) */}
            {palette && palette.length > 0 ? (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-subtle">
                {palette.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => selectColor(color)}
                    aria-label={`Cor ${color}`}
                    className={cn(
                      'size-9 shrink-0 rounded-full border-2 transition-transform active:scale-90',
                      currentColor === color ? 'border-foreground' : 'border-transparent',
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            ) : null}

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

            {/* Grade de itens com miniatura */}
            <div className="grid max-h-[26vh] grid-cols-[repeat(auto-fill,minmax(4.5rem,1fr))] gap-2 overflow-y-auto scrollbar-subtle">
              {items.map((part) => (
                <ItemTile
                  key={part.id}
                  part={part}
                  selected={slots[part.category]?.asset === part.id}
                  disabled={!!busy}
                  onSelect={() => selectPart(part)}
                />
              ))}
            </div>
          </>
        ) : (
          /* Cabine de fotos: poses (posicione a câmera arrastando o personagem e tire a foto) */
          <div className="flex flex-col gap-2">
            <p className="text-center font-semibold text-muted-foreground text-xs">
              Escolha a pose, gire o personagem pra enquadrar e toque em <strong>Tirar foto</strong>{' '}
              📸
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-subtle">
              {POSES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPose(p.id)}
                  className={cn(
                    'shrink-0 rounded-full px-4 py-2 font-semibold text-sm transition-colors',
                    pose === p.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Alternador de modo (Personalizar / Cabine de fotos) */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMode('customize')}
            className={cn(
              'rounded-2xl py-3 font-bold text-sm transition-colors',
              mode === 'customize'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground',
            )}
          >
            🎨 Personalizar
          </button>
          <button
            type="button"
            onClick={() => setMode('photo')}
            className={cn(
              'rounded-2xl py-3 font-bold text-sm transition-colors',
              mode === 'photo'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground',
            )}
          >
            📸 Cabine de fotos
          </button>
        </div>
      </div>
    </div>
  )
}
