'use client'

import {
  AVATAR_CATALOG,
  type AvatarFilter,
  type AvatarSlots,
  drawAvatar,
} from '@sistemazero/core/avatar'
import { sessionFetch as fetch } from '@sistemazero/member-shell/lib/session-fetch'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  AVATAR_IDLE_POSE,
  AVATAR_TABS,
  type AvatarKind,
  type AvatarShopItem,
  type AvatarTab,
  type AvatarTabId,
  applyAvatarItem,
  avatarKindOfWorn,
  avatarKinds,
  avatarRemovedBy,
  avatarShopItems,
  avatarTab,
  avatarUnownedWorn,
  isAvatarItemOwned,
  visibleAvatarKinds,
} from '../../../lib/avatar-pack'
import type { AvatarStateView } from '../../../lib/types'
import type { AvatarMessages } from '../skin'
import type { CaptureFn } from './avatar-scene'

const C = AVATAR_CATALOG
export type Mode = 'customize' | 'photo'
export type LoadState = 'loading' | 'ready' | 'error'

/**
 * O estado do salvamento, que a tela mostra no lugar do antigo botão "Salvar":
 * - `saved`: o que está na tela é o que está guardado;
 * - `waiting`: mudou, grava depois de 1 s sem mexer;
 * - `saving`: gravando (e tirando a foto de frente);
 * - `preview`: há peça paga só experimentada: nada grava até comprar ou tirar;
 * - `error`: a última gravação falhou (tenta de novo na próxima mudança ou no "Tentar de novo").
 */
export type SaveStatus = 'saved' | 'waiting' | 'saving' | 'preview' | 'error'

/** O aviso das regras: "para vestir X, saiu Y", com o desfazer. */
export interface RuleNotice {
  chosen: string
  removed: string[]
  undo: AvatarSlots
}

/** Quanto o avatar espera parado antes de gravar. */
export const AUTOSAVE_DELAY_MS = 1000
/** Quanto a foto de frente espera depois de gravado (o boneco termina de trocar as peças). */
export const FOTO_DEPOIS_MS = 600

/** As peças em texto, na ordem dos encaixes (para comparar avatares). */
const chave = (slots: AvatarSlots) =>
  JSON.stringify(Object.entries(slots).sort(([a], [b]) => (a < b ? -1 : 1)))

const same = (a: AvatarSlots, b: AvatarSlots) => {
  const ka = Object.keys(a)
  return ka.length === Object.keys(b).length && ka.every((k) => a[k] === b[k])
}

/**
 * A lógica do "Meu avatar" do pack, a mesma no Kids e na comunidade adulta (só a tela muda):
 * carregar, escolher peça (com as regras do pack), comprar em dois toques (peça ou fantasia),
 * filtro menina/menino/todas, sortear, e SALVAR SOZINHO: cada mudança grava depois de 1 s parado
 * e, gravada, ganha a foto de frente; a peça paga só experimentada não entra (o resto, sim); ao
 * sair, o que falta vai junto.
 */
export function useAvatarEditor({ messages }: { messages: AvatarMessages }) {
  const [state, setState] = useState<AvatarStateView | null>(null)
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [slots, setSlots] = useState<AvatarSlots>({})
  const [saved, setSaved] = useState<{ slots: AvatarSlots; filter: AvatarFilter | null }>({
    slots: {},
    filter: null,
  })
  const [filter, setFilter] = useState<AvatarFilter | null>(null)
  const [owned, setOwned] = useState<ReadonlySet<string>>(new Set())
  const [balance, setBalance] = useState(0)
  const [coinsUnlimited, setCoinsUnlimited] = useState(false)
  const [mode, setMode] = useState<Mode>('customize')
  const [pose, setPoseState] = useState<string>(AVATAR_IDLE_POSE)
  /** Quantas vezes uma pose foi escolhida: tocar de novo na mesma pose repete o movimento. */
  const [poseTake, setPoseTake] = useState(0)
  const setPose = useCallback((id: string) => {
    setPoseState(id)
    setPoseTake((n) => n + 1)
  }, [])
  const [tabId, setTabId] = useState<AvatarTabId>('cabelo')
  const [kindByTab, setKindByTab] = useState<Partial<Record<AvatarTabId, string>>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [pending, setPending] = useState<{ item: AvatarShopItem; undo: AvatarSlots } | null>(null)
  const [notice, setNotice] = useState<RuleNotice | null>(null)
  const savedSomething = useRef(false)
  /** As peças da última foto de frente (`null` = não há foto). */
  const fotografado = useRef<string | null>(null)
  const captureRef = useRef<CaptureFn | null>(null)
  const onReady = useCallback((c: CaptureFn) => {
    captureRef.current = c
  }, [])

  const load = useCallback(async (isCurrent?: () => boolean) => {
    setLoadState('loading')
    try {
      const res = await fetch('/api/members/avatar')
      if (!res.ok) throw new Error('avatar load failed')
      const data = (await res.json()) as AvatarStateView | null
      if (!data?.equipped) throw new Error('avatar missing')
      if (isCurrent && !isCurrent()) return
      setState(data)
      // A foto que existe é a do avatar gravado; sem foto, a primeira visita tira (abaixo).
      fotografado.current = data.photoUrl ? chave(data.equipped) : null
      setSlots(data.equipped)
      setSaved({ slots: data.equipped, filter: data.filter })
      setFilter(data.filter)
      setOwned(new Set(data.owned))
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
    void load(() => alive)
    return () => {
      alive = false
    }
  }, [load])

  const tab: AvatarTab = avatarTab(tabId)
  const allKinds: AvatarKind[] = useMemo(() => avatarKinds(C, tab), [tab])
  const kinds = useMemo(
    () => visibleAvatarKinds(C, tab, allKinds, filter ?? 'all', owned, slots),
    [tab, allKinds, filter, owned, slots],
  )
  const kindId = kindByTab[tabId] ?? avatarKindOfWorn(kinds, tab, slots)
  const kind = kinds.find((k) => k.id === kindId) ?? kinds[0]
  const items = useMemo(
    () => (kind ? avatarShopItems(C, tab, kind, filter ?? 'all', owned, slots) : []),
    [tab, kind, filter, owned, slots],
  )
  const unowned = useMemo(() => avatarUnownedWorn(C, slots, owned), [slots, owned])
  // O que se grava: o avatar da tela, ou, com uma peça paga só de prévia, o último avatar sem
  // prévia (as mudanças grátis de antes da prévia não se perdem; a peça paga só entra comprada).
  const ultimoProprio = useRef<AvatarSlots>(slots)
  if (unowned.length === 0) ultimoProprio.current = slots
  const alvo = unowned.length === 0 ? slots : ultimoProprio.current

  const dirty = !same(alvo, saved.slots) || (filter !== null && filter !== saved.filter)
  const status: SaveStatus =
    unowned.length > 0
      ? 'preview'
      : saving
        ? 'saving'
        : saveError
          ? 'error'
          : dirty
            ? 'waiting'
            : 'saved'

  function chooseTab(id: AvatarTabId) {
    setTabId(id)
  }
  function chooseKind(id: string) {
    setKindByTab((k) => ({ ...k, [tabId]: id }))
  }

  /**
   * Escolher uma peça. Paga e ainda não comprada: o 1º toque veste de PRÉVIA e arma a compra;
   * o 2º toque na mesma compra. As regras do pack tiram o que não combina, e o aviso diz o quê.
   */
  function choose(item: AvatarShopItem, inTab: AvatarTab = tab) {
    if (busy) return
    if (!item.owned && pending?.item.id === item.id) {
      if (item.tier !== 'festa') void buy(item)
      return
    }
    const antes = slots
    const depois = applyAvatarItem(C, antes, item, inTab)
    if (same(antes, depois)) return
    const saiu = avatarRemovedBy(C, antes, depois, inTab)
    setNotice(saiu.length > 0 ? { chosen: item.label, removed: saiu, undo: antes } : null)
    setSlots(depois)
    setSaveError(false)
    setPending((p) => {
      if (!item.owned) return { item, undo: p?.undo ?? antes }
      // A prévia de outra peça paga continua de pé enquanto ela estiver no avatar.
      return p && avatarUnownedWorn(C, depois, owned).includes(p.item.id) ? p : null
    })
  }

  /** Escolher pelo id (as sugestões da festa do jogo): abre a aba da peça e veste. */
  function chooseById(id: string) {
    const p = C.parts[id]
    const alvo = p ? AVATAR_TABS.find((t) => t.groups.includes(p.group)) : undefined
    if (!p || !alvo) return
    setTabId(alvo.id)
    choose(
      {
        id,
        kind: 'part',
        label: p.label,
        thumb: p.thumb,
        tier: p.tier,
        price: p.price,
        owned: isAvatarItemOwned(C, id, owned),
      },
      alvo,
    )
  }

  /** "Deixar para depois": desfaz a prévia da peça paga. */
  function cancelBuy() {
    if (!pending) return
    setSlots(pending.undo)
    setPending(null)
    setNotice(null)
  }

  function undoNotice() {
    if (!notice) return
    setSlots(notice.undo)
    setNotice(null)
    setPending(null)
  }

  async function buy(item: AvatarShopItem) {
    setBusy(item.id)
    try {
      const res = await fetch(`/api/members/avatar/parts/${encodeURIComponent(item.id)}/buy`, {
        method: 'POST',
      })
      const body = (await res.json().catch(() => null)) as {
        balance?: number
        unlimited?: boolean
      } | null
      if (!res.ok) {
        toast.error(res.status === 402 ? messages.notEnoughCoins : messages.buyRefused)
        return
      }
      setOwned((o) => new Set([...o, item.id]))
      if (typeof body?.balance === 'number') setBalance(body.balance)
      if (body?.unlimited === true) setCoinsUnlimited(true)
      setPending(null)
      toast.success(messages.bought)
    } catch {
      toast.error(messages.buyFailed)
    } finally {
      setBusy(null)
    }
  }

  /** "Surpreenda-me": um sorteio do pack com o filtro, só com peças grátis e as que a pessoa tem. */
  function randomize() {
    const sorteado = drawAvatar(C, `${Date.now()}-${Math.random()}`, {
      filter: filter ?? 'all',
      owned,
    })
    setPending(null)
    setNotice(null)
    setSaveError(false)
    setSlots(sorteado)
  }

  function chooseFilter(f: AvatarFilter) {
    setFilter(f)
    setSaveError(false)
  }

  // ── Salvar sozinho ──────────────────────────────────────────────────────────────────────
  const latest = useRef({ slots, alvo, filter, unowned, saved, dirty })
  latest.current = { slots, alvo, filter, unowned, saved, dirty }
  const inFlight = useRef<Promise<boolean> | null>(null)
  const emVoo = useRef<AbortController | null>(null)

  /** Grava o alvo de agora. Sem foto: a foto vem depois, só do avatar sem prévia (abaixo). */
  const persist = useCallback(async (opts: { keepalive?: boolean } = {}): Promise<boolean> => {
    const atual = latest.current
    if (!atual.dirty) return true
    const enviado = { slots: atual.alvo, filter: atual.filter }
    const controle = new AbortController()
    emVoo.current = controle
    setSaving(true)
    try {
      const res = await fetch('/api/members/avatar', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(enviado.filter ? enviado : { slots: enviado.slots }),
        signal: controle.signal,
        ...(opts.keepalive ? { keepalive: true } : {}),
      })
      if (!res.ok) throw new Error('equip')
      setSaved({ slots: enviado.slots, filter: enviado.filter ?? latest.current.saved.filter })
      setSaveError(false)
      savedSomething.current = true
      return true
    } catch {
      if (!controle.signal.aborted) setSaveError(true)
      return false
    } finally {
      if (emVoo.current === controle) emVoo.current = null
      setSaving(false)
    }
  }, [])

  /** Uma gravação de cada vez, na ordem: a mais nova nunca chega antes da anterior. */
  const saveNow = useCallback(async () => {
    while (inFlight.current) await inFlight.current
    const p = persist()
    inFlight.current = p
    try {
      return await p
    } finally {
      inFlight.current = null
    }
  }, [persist])

  // Grava 1 s depois da última mudança.
  const alvoKey = chave(alvo)
  // biome-ignore lint/correctness/useExhaustiveDependencies: `alvoKey` e `filter` não são lidos, mas cada mudança deles precisa recomeçar a espera de 1 s (com `dirty` já verdadeiro, só eles mudam).
  useEffect(() => {
    if (loadState !== 'ready' || !dirty || saveError) return
    const t = setTimeout(() => void saveNow(), AUTOSAVE_DELAY_MS)
    return () => clearTimeout(t)
  }, [loadState, dirty, saveError, alvoKey, filter, saveNow])

  /**
   * A foto de frente, quando o avatar gravado é o da tela (nada por gravar, nenhuma prévia) e a
   * foto de agora é de outras peças. Vale também para quem ainda não tem foto (perfil novo):
   * ninguém fica sem foto no menu, no ranking e no Mural.
   */
  const fotoPendente = useRef<Promise<void> | null>(null)
  const tirarFotoSePrecisa = useCallback(async (acabouDeGravar = false): Promise<void> => {
    if (fotoPendente.current) return fotoPendente.current
    const atual = latest.current
    const capture = captureRef.current
    const pecas = chave(atual.slots)
    // `acabouDeGravar`: a gravação deu certo agora, mas a tela ainda não renderizou o "gravado".
    if (
      !capture ||
      (atual.dirty && !acabouDeGravar) ||
      atual.unowned.length > 0 ||
      fotografado.current === pecas
    )
      return
    const tarefa = (async () => {
      try {
        const blob = await capture({ portrait: true })
        // Mudou durante a foto: a próxima rodada tira de novo.
        if (!blob || chave(latest.current.slots) !== pecas) return
        const fd = new FormData()
        fd.append('file', new File([blob], 'avatar.png', { type: 'image/png' }))
        const res = await fetch('/api/members/avatar/snapshot', { method: 'POST', body: fd })
        if (res.ok) {
          fotografado.current = pecas
          savedSomething.current = true
        }
      } catch {
        // a próxima mudança (ou a próxima visita) tenta de novo
      }
    })()
    fotoPendente.current = tarefa
    try {
      await tarefa
    } finally {
      fotoPendente.current = null
    }
  }, [])
  const slotsKey = chave(slots)
  useEffect(() => {
    if (loadState !== 'ready' || dirty || saving || unowned.length > 0) return
    if (fotografado.current === slotsKey) return
    const t = setTimeout(() => void tirarFotoSePrecisa(), FOTO_DEPOIS_MS)
    return () => clearTimeout(t)
  }, [loadState, dirty, saving, unowned.length, slotsKey, tirarFotoSePrecisa])

  // Saiu da página com algo por gravar: vai junto (sem foto: a página está fechando). Uma
  // gravação ainda no ar é cancelada antes, para a velha não chegar depois da nova.
  useEffect(() => {
    const flush = () => {
      if (!latest.current.dirty) return
      emVoo.current?.abort()
      void persist({ keepalive: true })
    }
    window.addEventListener('pagehide', flush)
    return () => window.removeEventListener('pagehide', flush)
  }, [persist])

  /**
   * Sair: grava o que falta e tira a foto antes de ir. `ok` falso = a gravação falhou (a tela não
   * sai sem avisar); `saved` = algo foi gravado nesta visita.
   */
  async function finishBeforeExit(): Promise<{ ok: boolean; saved: boolean }> {
    const ok = latest.current.dirty ? await saveNow() : true
    if (ok) await tirarFotoSePrecisa(true)
    return { ok, saved: savedSomething.current }
  }

  /** Cabine de fotos: a foto de corpo inteiro na pose escolhida. */
  async function takePhoto() {
    const capture = captureRef.current
    if (!capture || photoBusy) return
    setPhotoBusy(true)
    try {
      await saveNow()
      const blob = await capture({ portrait: false })
      if (!blob) throw new Error('foto')
      const fd = new FormData()
      fd.append('file', new File([blob], 'avatar.png', { type: 'image/png' }))
      const res = await fetch('/api/members/avatar/snapshot', { method: 'POST', body: fd })
      if (!res.ok) throw new Error('foto')
      // A foto da Cabine vale para estas peças: a de frente não passa por cima dela.
      fotografado.current = chave(latest.current.slots)
      savedSomething.current = true
      toast.success(messages.photoTaken)
    } catch {
      toast.error(messages.photoNotUpdated)
    } finally {
      setPhotoBusy(false)
    }
  }

  return {
    catalog: C,
    state,
    loadState,
    slots,
    filter,
    owned,
    balance,
    coinsUnlimited,
    mode,
    setMode,
    pose,
    poseTake,
    setPose,
    tab,
    chooseTab,
    kinds,
    kind,
    chooseKind,
    items,
    busy,
    status,
    pending: pending?.item ?? null,
    notice,
    photoBusy,
    onReady,
    retry: () => void load(),
    retrySave: () => {
      setSaveError(false)
    },
    choose,
    chooseById,
    cancelBuy,
    undoNotice,
    dismissNotice: () => setNotice(null),
    randomize,
    chooseFilter,
    takePhoto,
    finishBeforeExit,
  }
}

export type AvatarEditor = ReturnType<typeof useAvatarEditor>
