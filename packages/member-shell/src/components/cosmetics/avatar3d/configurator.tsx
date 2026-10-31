'use client'

import type { MoldeDoVestuario } from '@sistemazero/arquipelago-contracts'
import { sessionFetch as fetch } from '@sistemazero/member-shell/lib/session-fetch'

import { Camera, Check, Loader2, Lock, RefreshCw, Shuffle, X } from 'lucide-react'
import { type ComponentType, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import type { AvatarReturnPath } from '../../../lib/avatar-return'
import {
  AVATAR_CATEGORIES,
  AVATAR_CATEGORY_LABELS,
  AVATAR_PART_INFO,
  type AvatarCategory,
  type AvatarSlot,
  paletteForPart,
} from '../../../lib/avatar3d-catalog'
import { cn } from '../../../lib/cn'
import type { AvatarPartView, AvatarStateView } from '../../../lib/types'
import { KidsBackButton, KidsMascot, ZappyCoin } from '../presentation'
import { AVATAR_MESSAGES, type CosmeticsSkin } from '../skin'
import { AvatarScene, type CaptureFn } from './avatar-scene'
import type { AdultAvatarConfiguratorProps } from './configurator-adult'
import {
  KIDS_AVATAR_CATEGORY_GROUPS,
  kidsAvatarGroupOf,
  type LoadState,
  type Mode,
  POSES,
  type Slots,
} from './configurator-shared'
import { SeasonalAvatarChoices } from './seasonal-choices'
import { AvatarThumb } from './thumb-canvas'

/** Uma peça na grade — com MINIATURA renderizada (igual WawaSensei). "Nenhum" mostra "✕". */
function ItemTile({
  part,
  selected,
  disabled,
  confirming,
  onSelect,
}: {
  part: AvatarPartView
  selected: boolean
  disabled: boolean
  /** Peça travada aguardando o 2º toque de confirmação da compra. */
  confirming?: boolean
  onSelect: () => void
}) {
  const isNone = part.id.endsWith('-none')
  const info = AVATAR_PART_INFO[part.id]
  const label = info?.labelPt ?? part.id
  // Roupa da festa (B16): diz de onde vem, sem preço.
  const daFesta = part.locked && part.tier === 'festa'
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-label={daFesta ? `${label}, vem da festa do Arquipélago` : label}
      title={label}
      aria-pressed={selected}
      className={cn(
        'relative grid aspect-square place-items-center overflow-hidden rounded-2xl border-2 bg-muted/40 transition-[background-color,border-color,box-shadow,opacity] disabled:opacity-60',
        selected ? 'border-primary ring-2 ring-primary/40' : 'border-border',
      )}
    >
      {isNone ? (
        <X className="size-7 text-muted-foreground" />
      ) : info ? (
        <AvatarThumb partId={part.id} category={info.category} />
      ) : (
        // Id sem apresentação (desconhecido): cai no rótulo de texto.
        <span className="line-clamp-2 px-1 text-center [font-family:var(--font-display)] font-bold text-[0.7rem] text-muted-foreground">
          {label}
        </span>
      )}
      {part.locked ? (
        <span
          className={cn(
            'absolute inset-x-1 bottom-1 inline-flex items-center justify-center gap-1 rounded-full px-1.5 py-0.5 font-bold text-[0.7rem] shadow',
            confirming ? 'bg-primary text-primary-foreground' : 'bg-(--kids-lime-tint)',
          )}
        >
          <Lock className="size-3" />{' '}
          {daFesta ? 'Da festa' : confirming ? `Comprar? ${part.price}` : part.price}
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
 *
 * `skin="adult"` (comunidade adulta) usa a MESMA lógica com outra tela (`configurator-adult.tsx`):
 * título, voltar com texto, painel ao lado no computador e frases sem emoji (`../skin.ts`).
 * ⚠️ A tela adulta chega por `adultView` (ver `configurator-adult-entry.tsx`), nunca por import
 * daqui: importada aqui, ela iria no pacote do Kids, que nunca a desenha.
 */
export function AvatarConfigurator({
  dark,
  returnTo,
  skin = 'kids',
  adultView: AdultView,
  onReturn,
  festa,
}: {
  dark: boolean
  returnTo: AvatarReturnPath
  skin?: CosmeticsSkin
  adultView?: ComponentType<AdultAvatarConfiguratorProps>
  /** Fluxo embutido: volta à ferramenta chamadora, sem navegar ou salvar a prévia. */
  onReturn?: (saved: boolean) => void
  festa?: MoldeDoVestuario['festa']
}) {
  const messages = AVATAR_MESSAGES[skin]
  // Sair do avatar = navegação DURA para o destino interno permitido, NÃO `router.push`.
  // A foto nova do avatar
  // precisa aparecer em TODO lugar (menu, tab bar, quarto, perfil), e o avatar do menu/tab bar
  // vive no LAYOUT do grupo (app), que PERSISTE entre navegações SPA e não re-busca o
  // `getAvatarReadonly` — `router.push` troca só a página, não o layout, e `push`+`refresh`
  // tem corrida conhecida (vercel/next#54766), então a foto "demorava" a trocar. Um reload
  // re-renderiza a árvore inteira no servidor → layout + página leem o `avatarPhotoUrl` novo
  // (o `gatewayFetch` é `no-store`, sem cache de dados) e a imagem atualiza na hora em todo canto.
  const exitAvatar = () => {
    if (onReturn) {
      if (!saving && !busy) onReturn(false)
    } else window.location.assign(returnTo)
  }
  // Esta é a variante ícone-só: o `aria-label` é a ÚNICA informação que existe, então
  // "Voltar" sozinho não diz nada. O destino é uma allowlist de dois valores.
  const exitLabel = onReturn
    ? 'Voltar ao jogo'
    : returnTo === '/'
      ? 'Voltar ao início'
      : 'Voltar ao meu perfil'
  const onEmbeddedKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && onReturn) {
      e.preventDefault()
      exitAvatar()
    }
  }
  const [state, setState] = useState<AvatarStateView | null>(null)
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [slots, setSlots] = useState<Slots>({})
  const [balance, setBalance] = useState(0)
  // Equipe (passe livre) = moedas ilimitadas: a lojinha mostra ∞ e nunca trava por saldo.
  const [coinsUnlimited, setCoinsUnlimited] = useState(false)
  const [mode, setMode] = useState<Mode>('customize')
  const [pose, setPose] = useState<string>('Idle')
  const [category, setCategory] = useState<AvatarCategory>('head')
  const [busy, setBusy] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  // Compra pendente de confirmação (2º toque). `prevSlot` restaura a prévia no cancelar.
  const [pendingBuy, setPendingBuy] = useState<{
    part: AvatarPartView
    prevSlot?: AvatarSlot
  } | null>(null)
  const captureRef = useRef<CaptureFn | null>(null)
  const onReady = useCallback((c: CaptureFn) => {
    captureRef.current = c
  }, [])

  const loadAvatar = useCallback(async (isCurrent?: () => boolean) => {
    setLoadState('loading')
    try {
      const res = await fetch('/api/members/avatar')
      if (!res.ok) throw new Error('avatar load failed')
      const data = (await res.json()) as AvatarStateView | null
      if (!data) throw new Error('avatar missing')
      if (isCurrent && !isCurrent()) return
      setState(data)
      setSlots({ ...data.equipped } as Slots)
      setBalance(data.balance)
      setCoinsUnlimited(data.balanceUnlimited === true)
      setLoadState('ready')
    } catch {
      if (isCurrent && !isCurrent()) return
      setState(null)
      setLoadState('error')
    }
  }, [])

  useEffect(() => {
    let alive = true
    void loadAvatar(() => alive)
    return () => {
      alive = false
    }
  }, [loadAvatar])

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

  /**
   * Confirmação LEVE de compra (07/2026; antes era 1 toque direto): o 1º toque numa peça
   * travada VESTE de prévia (o `hasLocked` já bloqueia o Salvar) e arma a confirmação; o
   * 2º toque na MESMA peça compra. Evita o "gastei sem querer" sem modal pesado.
   */
  function selectPart(part: AvatarPartView) {
    if (!part.owned) {
      if (pendingBuy?.part.id === part.id) {
        // A roupa da festa não se compra (B16): o segundo toque só mantém a prévia.
        if (part.tier === 'festa') return
        // O `buy` só desarma a confirmação no SUCESSO — falhou (ex.: sem moedas), a barra
        // fica de pé com o "Deixar para depois" (que desveste a prévia).
        void buy(part)
        return
      }
      setPendingBuy((p) => ({
        part,
        // Prévia em cadeia na MESMA categoria preserva o slot original p/ o "deixar para depois".
        prevSlot: p && p.part.category === part.category ? p.prevSlot : slots[part.category],
      }))
      setSlots((s) => ({ ...s, [part.category]: { ...s[part.category], asset: part.id } }))
      return
    }
    setPendingBuy(null)
    setSlots((s) => ({ ...s, [part.category]: { ...s[part.category], asset: part.id } }))
  }

  /** "Deixar para depois": desfaz a prévia da peça travada e desarma a confirmação. */
  function cancelPendingBuy() {
    setPendingBuy((p) => {
      if (p) {
        setSlots((s) => {
          const next = { ...s }
          if (p.prevSlot) next[p.part.category] = p.prevSlot
          else delete next[p.part.category]
          return next
        })
      }
      return null
    })
  }

  function selectColor(color: string) {
    setSlots((s) => ({ ...s, [category]: { ...(s[category] ?? { asset: '' }), color } }))
  }

  /** "Surpreenda-me": sorteia uma peça GRÁTIS/possuída + cor por categoria (nunca peça travada). */
  function randomize() {
    setPendingBuy(null)
    setSlots((prev) => {
      const next: Slots = { ...prev }
      for (const cat of AVATAR_CATEGORIES) {
        const owned = (partsByCategory.get(cat) ?? []).filter((p) => p.owned)
        const pick = owned[Math.floor(Math.random() * owned.length)]
        if (!pick) continue
        const palette = paletteForPart(cat, pick.id)
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
        toast.error(res.status === 402 ? messages.notEnoughCoins : messages.buyRefused)
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
      // Compra já equipa (a criança quer ver na hora) e desarma a confirmação.
      setPendingBuy(null)
      setSlots((sl) => ({ ...sl, [part.category]: { ...sl[part.category], asset: part.id } }))
      toast.success(messages.bought)
    } catch {
      toast.error(messages.buyFailed)
    } finally {
      setBusy(null)
    }
  }

  /**
   * Salva o avatar: PUT da config (a roupa/peças) + captura a "foto" (snapshot do enquadramento
   * atual → vira a imagem do avatar). A captura ESPERA a cena assentar (no `SnapshotBridge`), então
   * não precisa de gate/nag. `redirect`: no fluxo normal, "Salvar" (Personalizar) fica na tela;
   * "Tirar foto" (Cabine) finaliza. No onboarding, ambos retornam à home para continuar o tour.
   */
  async function save({ redirect }: { redirect: boolean }) {
    if (saving || busy || hasLocked || !state) return
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
          // "Salvar" (Personalizar) → RETRATO forçado (rosto), pra a imagem ficar sempre boa;
          // "Tirar foto" (Cabine) → o enquadramento ATUAL que a criança posicionou.
          const blob = await capture({ portrait: mode === 'customize' })
          if (blob) {
            const fd = new FormData()
            fd.append('file', new File([blob], 'avatar.png', { type: 'image/png' }))
            const photo = await fetch('/api/members/avatar/snapshot', { method: 'POST', body: fd })
            if (!photo.ok) toast.error(messages.photoNotUpdated)
          }
        } catch {
          // ignora — foto é cosmética; a próxima vez tenta de novo
        }
      }
      toast.success(redirect ? messages.savedAndLeaving : messages.saved)
      if (onReturn) onReturn(true)
      else if (redirect) exitAvatar()
    } catch {
      toast.error(messages.saveFailed)
    } finally {
      setSaving(false)
    }
  }

  // Peça de cor embutida (brinco de metal, fantasia) não mostra a fileira de cores.
  const palette = paletteForPart(category, slots[category]?.asset)
  const currentColor = slots[category]?.color
  const items = partsByCategory.get(category) ?? []
  const activePose = mode === 'photo' ? pose : 'Idle'
  const seasonalChoices = festa ? (
    <SeasonalAvatarChoices
      festa={festa}
      parts={state?.parts ?? []}
      disabled={saving || Boolean(busy)}
      onSelect={(part) => {
        const info = AVATAR_PART_INFO[part.id]
        if (info) {
          setCategory(info.category)
          selectPart(part)
        }
      }}
    />
  ) : null

  if (skin === 'adult' && AdultView) {
    return (
      <AdultView
        returnTo={returnTo}
        onExit={onReturn ? exitAvatar : undefined}
        seasonalChoices={seasonalChoices}
        dark={dark}
        state={state}
        loadState={loadState}
        slots={slots}
        balance={balance}
        coinsUnlimited={coinsUnlimited}
        mode={mode}
        onMode={setMode}
        pose={pose}
        onPose={setPose}
        category={category}
        onCategory={setCategory}
        busy={busy}
        saving={saving}
        hasLocked={hasLocked}
        pendingPart={pendingBuy?.part ?? null}
        items={items}
        palette={palette}
        currentColor={currentColor}
        activePose={activePose}
        onReady={onReady}
        onRetry={() => void loadAvatar()}
        onRandomize={randomize}
        onSave={() => save({ redirect: mode === 'photo' || returnTo === '/' })}
        onSelectPart={selectPart}
        onCancelBuy={cancelPendingBuy}
        onSelectColor={selectColor}
      />
    )
  }

  if (loadState === 'error') {
    return (
      <div
        onKeyDown={onEmbeddedKeyDown}
        className="fixed inset-0 z-50 flex flex-col bg-background md:static md:z-auto md:h-full md:min-h-0 md:flex-1"
      >
        <div className="relative z-10 flex items-center justify-between gap-2 p-4">
          <KidsBackButton onClick={exitAvatar} label={exitLabel} variant="overlay" />
        </div>
        <div className="grid flex-1 place-items-center px-6 text-center">
          <div className="flex max-w-sm flex-col items-center gap-3">
            <KidsMascot expression="thinking" className="size-24" />
            <p className="font-semibold">Não consegui carregar seu avatar.</p>
            <button
              type="button"
              onClick={() => void loadAvatar()}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-4 font-bold text-primary-foreground"
            >
              <RefreshCw className="size-4" /> Tentar de novo
            </button>
          </div>
        </div>
      </div>
    )
  }

  // O grupo do celular segue a categoria escolhida: um estado só (tocar num grupo escolhe a
  // primeira categoria dele), então o painel largo e o estreito nunca discordam.
  const activeGroup = kidsAvatarGroupOf(category)
  const categoryChip = (c: AvatarCategory) => (
    <button
      key={c}
      type="button"
      onClick={() => setCategory(c)}
      aria-pressed={c === category}
      className={cn(
        'min-h-10 shrink-0 rounded-full px-3 font-semibold text-sm transition-colors',
        c === category ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
      )}
    >
      {AVATAR_CATEGORY_LABELS[c]}
    </button>
  )

  return (
    <div
      onKeyDown={onEmbeddedKeyDown}
      className="fixed inset-0 z-50 flex flex-col bg-background md:static md:z-auto md:h-full md:min-h-0 md:flex-1"
    >
      {/* Barra superior */}
      <div className="relative z-10 flex items-center justify-between gap-2 p-4">
        <div className="flex items-center gap-2">
          <KidsBackButton onClick={exitAvatar} label={exitLabel} variant="overlay" />
          <h1 className="sr-only [font-family:var(--font-display)] font-extrabold text-2xl leading-none md:not-sr-only md:px-1">
            Meu avatar
          </h1>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-(--kids-lime-tint) px-3 py-1.5 [font-family:var(--font-display)] font-bold text-sm shadow-md">
            <ZappyCoin className="size-4" /> {coinsUnlimited ? '∞' : balance}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={randomize}
            disabled={!state || !!busy}
            aria-label="Surpreenda-me"
            title="Surpreenda-me"
            className="inline-flex size-11 items-center justify-center gap-2 rounded-full bg-card/90 font-bold text-foreground text-sm shadow-md backdrop-blur transition-transform active:scale-90 disabled:opacity-50 md:w-auto md:px-4"
          >
            <Shuffle className="size-5" />
            {/* Com espaço, o nome escrito (a proposta do painel ao lado); no celular, só o ícone. */}
            <span className="hidden md:inline">Surpreenda-me</span>
          </button>
          {/* Botão de cima: SALVAR em Personalizar, TIRAR FOTO na Cabine de fotos. */}
          <button
            type="button"
            onClick={() => save({ redirect: mode === 'photo' || returnTo === '/' })}
            aria-label={
              saving
                ? 'Salvando'
                : hasLocked
                  ? 'Peça travada'
                  : mode === 'photo'
                    ? 'Tirar foto'
                    : 'Salvar'
            }
            disabled={saving || Boolean(busy) || hasLocked || !state}
            className={cn(
              'inline-flex h-11 items-center gap-2 rounded-full px-4 font-bold text-sm shadow-md transition-transform active:scale-95',
              hasLocked
                ? 'bg-card/90 text-muted-foreground'
                : 'sz-btn-gradient text-primary-foreground',
              (saving || !state) && 'opacity-60',
            )}
          >
            {saving ? (
              <Loader2 className="size-5 animate-spin" />
            ) : mode === 'photo' ? (
              <Camera className="size-5" />
            ) : (
              <Check className="size-5" />
            )}
            <span className="hidden sm:inline">
              {saving
                ? 'Salvando…'
                : hasLocked
                  ? 'Peça travada 🔒'
                  : mode === 'photo'
                    ? 'Tirar foto'
                    : 'Salvar'}
            </span>
          </button>
        </div>
      </div>

      {seasonalChoices}
      {/* Corpo (proposta "painel ao lado", 26/10/2026). Com a área do editor a partir de 45rem
          (720px), o 3D fica à esquerda e o painel à direita, os dois com a altura toda: trocar
          uma peça mostra o resultado sem rolar, e só a grade de peças rola. Abaixo disso, o 3D
          em cima e o painel embaixo, como sempre. A régua mede o CONTÊINER, e não a janela,
          porque o menu do Kids aparece a partir do `md` e pode ser recolhido. */}
      <div className="@container/avatar flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col @min-[45rem]/avatar:flex-row @min-[45rem]/avatar:gap-4 @min-[45rem]/avatar:px-4 @min-[45rem]/avatar:pb-4">
          {/* Cena 3D — no celular, a faixa ENTRE a barra e o painel (centraliza o avatar na
              área visível); no painel ao lado, a altura toda da coluna da esquerda. */}
          <div
            className="relative min-h-0 flex-1 @min-[45rem]/avatar:overflow-hidden @min-[45rem]/avatar:rounded-3xl @min-[45rem]/avatar:border-2 @min-[45rem]/avatar:border-border"
            role="img"
            aria-label="Pré-visualização 3D do seu avatar"
          >
            {state ? (
              <AvatarScene
                slots={slots}
                onReady={onReady}
                dark={dark}
                mode={mode}
                pose={activePose}
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <KidsMascot expression="thinking" className="size-24 animate-pulse" />
              </div>
            )}
          </div>

          {/* Painel: embaixo no celular, ao lado no computador. */}
          <section
            aria-label="Escolhas do avatar"
            className="relative z-10 flex flex-col gap-3 rounded-t-3xl bg-card/95 p-4 shadow-2xl backdrop-blur @min-[45rem]/avatar:w-[21.25rem] @min-[45rem]/avatar:min-h-0 @min-[45rem]/avatar:shrink-0 @min-[45rem]/avatar:rounded-3xl @min-[45rem]/avatar:border-2 @min-[45rem]/avatar:border-border @min-[45rem]/avatar:bg-card @min-[45rem]/avatar:shadow-none @min-[62.5rem]/avatar:w-[25rem]"
          >
            {/* Alternador de modo (Personalizar / Cabine de fotos): no pé do painel no celular,
                perto do polegar; no alto do painel ao lado. */}
            <div className="order-last grid grid-cols-2 gap-2 @min-[45rem]/avatar:order-first">
              <button
                type="button"
                onClick={() => setMode('customize')}
                aria-pressed={mode === 'customize'}
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
                aria-pressed={mode === 'photo'}
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

            {mode === 'customize' ? (
              <>
                {/* Categorias em três grupos. Ao lado do 3D, todas à vista; no celular, o grupo
                    em cima e as categorias dele embaixo (as 14 numa fila escondiam metade). */}
                <div className="hidden flex-col gap-2 @min-[45rem]/avatar:flex">
                  {KIDS_AVATAR_CATEGORY_GROUPS.map((group) => (
                    <div
                      key={group.id}
                      role="group"
                      aria-label={group.label}
                      className="flex items-start gap-2"
                    >
                      <span
                        aria-hidden="true"
                        className="w-16 shrink-0 pt-2.5 font-bold text-muted-foreground text-xs"
                      >
                        {group.label}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {group.categories.map(categoryChip)}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex flex-col gap-2 @min-[45rem]/avatar:hidden">
                  <div
                    role="group"
                    aria-label="Partes do avatar"
                    className="grid grid-cols-3 gap-1.5"
                  >
                    {KIDS_AVATAR_CATEGORY_GROUPS.map((group) => (
                      <button
                        key={group.id}
                        type="button"
                        onClick={() => {
                          if (group.id !== activeGroup.id)
                            setCategory(group.categories[0] ?? 'head')
                        }}
                        aria-pressed={group.id === activeGroup.id}
                        className={cn(
                          'min-h-10 rounded-full border-2 px-3 font-bold text-sm transition-colors',
                          group.id === activeGroup.id
                            ? 'border-primary bg-primary/10 text-foreground'
                            : 'border-border text-muted-foreground',
                        )}
                      >
                        {group.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-subtle">
                    {activeGroup.categories.map(categoryChip)}
                  </div>
                </div>

                {/* Cores */}
                {palette && palette.length > 0 ? (
                  <div className="flex flex-col gap-1.5">
                    <p className="hidden font-bold text-muted-foreground text-xs @min-[45rem]/avatar:block">
                      Cores
                    </p>
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-subtle @min-[45rem]/avatar:flex-wrap @min-[45rem]/avatar:overflow-visible">
                      {palette.map((color, i) => {
                        const isCurrent = currentColor === color
                        return (
                          <button
                            key={color}
                            type="button"
                            onClick={() => selectColor(color)}
                            aria-label={`Cor ${i + 1}`}
                            aria-pressed={isCurrent}
                            className={cn(
                              'grid size-11 shrink-0 place-items-center rounded-full border-2 transition-transform active:scale-90',
                              isCurrent
                                ? 'border-foreground ring-2 ring-foreground/30'
                                : 'border-transparent',
                            )}
                            style={{ backgroundColor: color }}
                          >
                            {/* Cue NÃO-cor do selecionado (daltônicos): check branco com sombra p/ contraste. */}
                            {isCurrent ? (
                              <Check
                                className="size-4 text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]"
                                strokeWidth={3}
                              />
                            ) : null}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ) : null}

                {/* Grade de itens com miniatura: no celular com teto de altura; ao lado do 3D,
                    o resto do painel, e é a única parte que rola. */}
                <p className="hidden font-bold text-muted-foreground text-xs @min-[45rem]/avatar:block">
                  {AVATAR_CATEGORY_LABELS[category]}
                </p>
                <div className="grid max-h-[26vh] grid-cols-[repeat(auto-fill,minmax(4.5rem,1fr))] content-start gap-2 overflow-y-auto scrollbar-subtle @min-[45rem]/avatar:max-h-none @min-[45rem]/avatar:min-h-0 @min-[45rem]/avatar:flex-1 @min-[45rem]/avatar:p-1">
                  {items.map((part) => (
                    <ItemTile
                      key={part.id}
                      part={part}
                      selected={slots[part.category]?.asset === part.id}
                      disabled={!!busy}
                      confirming={pendingBuy?.part.id === part.id}
                      onSelect={() => selectPart(part)}
                    />
                  ))}
                </div>

                {/* Barra de confirmação da compra (a peça já está vestida de prévia), colada nas
                    peças. */}
                {pendingBuy ? (
                  <div
                    role="status"
                    className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-(--kids-lime-tint) px-4 py-2.5"
                  >
                    <p className="font-semibold text-sm">
                      {pendingBuy.part.tier === 'festa'
                        ? 'Esta peça vem da festa do Arquipélago. Na época da festa, ela chega pelo jogo.'
                        : 'Gostou? Está vestido de prévia!'}{' '}
                      <span className="text-muted-foreground">
                        ({AVATAR_PART_INFO[pendingBuy.part.id]?.labelPt ?? pendingBuy.part.id})
                      </span>
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={cancelPendingBuy}
                        disabled={!!busy}
                        className="sz-btn-gradient sz-btn-contorno h-11 px-4 text-sm"
                      >
                        Deixar para depois
                      </button>
                      {pendingBuy.part.tier === 'festa' ? null : (
                        <button
                          type="button"
                          onClick={() => selectPart(pendingBuy.part)}
                          disabled={!!busy}
                          className="inline-flex h-11 items-center gap-1.5 rounded-full bg-primary px-4 font-bold text-primary-foreground text-sm"
                        >
                          <ZappyCoin className="size-4" /> Comprar por {pendingBuy.part.price}
                        </button>
                      )}
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              /* Cabine de fotos: poses (posicione a câmera arrastando o personagem e tire a foto) */
              <div className="flex flex-col gap-2">
                <p className="text-center font-semibold text-muted-foreground text-xs @min-[45rem]/avatar:text-left @min-[45rem]/avatar:text-sm">
                  Escolha a pose e clique em <strong>Tirar foto</strong> lá em cima 📸
                </p>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-subtle @min-[45rem]/avatar:flex-wrap @min-[45rem]/avatar:overflow-visible">
                  {POSES.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPose(p.id)}
                      aria-pressed={pose === p.id}
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
          </section>
        </div>
      </div>
    </div>
  )
}
