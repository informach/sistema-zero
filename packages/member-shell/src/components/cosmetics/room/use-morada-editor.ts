'use client'
import { type MoradaHouse, MoradaHouseSchema, validateMoradaHouse } from '@sistemazero/core/morada'
import { sessionFetch } from '@sistemazero/member-shell/lib/session-fetch'
import { useCallback, useEffect, useRef, useState } from 'react'
import { type CosmeticsSkin, ROOM_MESSAGES } from '../skin'
import { replaceMoradaRoom } from './morada-editor-model'

export interface MoradaHouseEnvelope {
  house: MoradaHouse
  revision: number
  owned: string[]
}
export function readMoradaEnvelope(value: unknown): MoradaHouseEnvelope {
  if (!value || typeof value !== 'object') throw new Error('A resposta da casa está incompleta.')
  const data = value as Record<string, unknown>
  const parsed = MoradaHouseSchema.safeParse(data.house)
  if (!parsed.success) throw new Error('Não foi possível abrir os dados desta casa.')
  const house = parsed.data
  if (
    !Number.isSafeInteger(data.revision) ||
    Number(data.revision) < 0 ||
    !Array.isArray(data.owned) ||
    !data.owned.every((x) => typeof x === 'string')
  )
    throw new Error('A revisão da casa está incompleta.')
  return { house, revision: Number(data.revision), owned: data.owned }
}

/** O salvar sozinho do quarto (26/11/2026, o mesmo do avatar): 1 s depois do último gesto. */
export const MORADA_AUTOSAVE_MS = 1000
export type MoradaSaveState = 'idle' | 'saving' | 'saved' | 'error'

export function useMoradaEditor(
  skin: CosmeticsSkin = 'kids',
  { autosave = false }: { autosave?: boolean } = {},
) {
  const [saved, setSaved] = useState<MoradaHouseEnvelope | null>(null)
  const [draft, setDraft] = useState<MoradaHouse | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'saving' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const [conflict, setConflict] = useState<MoradaHouseEnvelope | null>(null)
  const [wallet, setWallet] = useState<{ balance: number; unlimited: boolean } | null>(null)
  /** A peça que está sendo comprada (um pedido por vez). */
  const [buying, setBuying] = useState<string | null>(null)
  const alive = useRef(true)
  const draftRef = useRef(draft)
  draftRef.current = draft
  const savedRef = useRef(saved)
  savedRef.current = saved
  const conflictRef = useRef(conflict)
  conflictRef.current = conflict
  const [saveState, setSaveState] = useState<MoradaSaveState>('idle')
  /** Uma gravação por vez; o gesto que chega durante ela pede outra logo depois. */
  const inflight = useRef(false)
  const again = useRef(false)
  const load = useCallback(async () => {
    setStatus('loading')
    try {
      const [response, roomResponse] = await Promise.all([
        sessionFetch('/api/members/house'),
        sessionFetch('/api/members/room').catch(() => null),
      ])
      if (!response.ok) throw new Error('Não foi possível abrir sua casa. Tente novamente.')
      const envelope = readMoradaEnvelope(await response.json())
      const metadata: unknown = roomResponse?.ok ? await roomResponse.json() : null
      if (!alive.current) return
      if (
        metadata &&
        typeof metadata === 'object' &&
        'balance' in metadata &&
        typeof metadata.balance === 'number'
      ) {
        setWallet({
          balance: metadata.balance,
          unlimited: 'balanceUnlimited' in metadata && metadata.balanceUnlimited === true,
        })
      }
      setSaved(envelope)
      setDraft(envelope.house)
      setConflict(null)
      setMessage('')
      setStatus('ready')
    } catch (error) {
      if (alive.current) {
        setStatus('error')
        setMessage(error instanceof Error ? error.message : 'Não foi possível abrir sua casa.')
      }
    }
  }, [])
  useEffect(() => {
    alive.current = true
    void load()
    return () => {
      alive.current = false
    }
  }, [load])
  const update = (change: (house: MoradaHouse) => MoradaHouse) => {
    // Com o salvar sozinho a criança continua mexendo enquanto grava (o gesto entra na próxima).
    if ((!autosave && status === 'saving') || conflict) return
    setMessage('')
    setDraft((house) => (house ? change(house) : house))
  }
  const save = async ({ keepalive = false }: { keepalive?: boolean } = {}) => {
    const draft = draftRef.current
    const saved = savedRef.current
    if (!saved || !draft || conflictRef.current) return
    if (inflight.current) {
      again.current = true
      return
    }
    if (JSON.stringify(saved.house) === JSON.stringify(draft)) return
    const errors = validateMoradaHouse(draft)
    if (errors.length) {
      setSaveState('error')
      setMessage(
        'Uma peça não cabe no espaço ou no apoio escolhido. Ajuste o arranjo e tente novamente.',
      )
      return
    }
    inflight.current = true
    setStatus('saving')
    setSaveState('saving')
    if (!autosave) setMessage('')
    const sent = JSON.stringify(draft)
    try {
      const response = await sessionFetch('/api/members/house', {
        method: 'PUT',
        keepalive,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ house: draft, revision: saved.revision, scope: 'room' }),
      })
      const body: unknown = await response.json()
      if (!alive.current) return
      if (response.status === 409) {
        const current =
          body && typeof body === 'object' && 'current' in body
            ? readMoradaEnvelope(body.current)
            : null
        if (!current)
          throw new Error('Sua casa mudou em outro lugar. Abra novamente antes de salvar.')
        setConflict(current)
        setStatus('ready')
        setSaveState('idle')
        return
      }
      if (!response.ok)
        throw new Error('Não foi possível salvar. Seu arranjo continua aqui para tentar novamente.')
      const envelope = readMoradaEnvelope(body)
      setSaved(envelope)
      savedRef.current = envelope
      // O gesto feito DURANTE a gravação fica na tela (e sai na próxima).
      if (JSON.stringify(draftRef.current) === sent) setDraft(envelope.house)
      setStatus('ready')
      setSaveState('saved')
      if (!autosave) setMessage(ROOM_MESSAGES[skin].saved)
    } catch (error) {
      if (alive.current) {
        setStatus('ready')
        setSaveState('error')
        if (!autosave)
          setMessage(
            error instanceof Error ? error.message : 'Não foi possível salvar. Tente novamente.',
          )
      }
    } finally {
      inflight.current = false
      if (again.current && alive.current) {
        again.current = false
        void save()
      }
    }
  }
  const resolveConflict = (keepLocal: boolean) => {
    if (!conflict) return
    const local = draftRef.current
    setSaved(conflict)
    setDraft(keepLocal && local ? replaceMoradaRoom(conflict.house, local) : conflict.house)
    setConflict(null)
    setMessage(
      keepLocal
        ? 'Seu arranjo foi aplicado à casa atual. Confira e salve novamente.'
        : 'A versão mais recente está aberta.',
    )
  }
  /**
   * Compra uma peça paga com moedas. Devolve `true` quando a peça passou a ser dela (comprada
   * agora ou já era); sem saldo ou falha, `false` com o recado na tela.
   */
  const buy = async (pieceId: string): Promise<boolean> => {
    if (buying) return false
    setBuying(pieceId)
    setMessage('')
    try {
      const response = await sessionFetch('/api/members/house/buy', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pieceId }),
      })
      const body: unknown = await response.json().catch(() => null)
      if (!alive.current) return false
      if (response.status === 402) {
        setMessage(ROOM_MESSAGES[skin].notEnoughCoins)
        return false
      }
      if (!response.ok) {
        setMessage(ROOM_MESSAGES[skin].buyFailed)
        return false
      }
      const data = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>
      if (typeof data.balance === 'number')
        setWallet({ balance: data.balance, unlimited: data.unlimited === true })
      setSaved((current) =>
        current && !current.owned.includes(pieceId)
          ? { ...current, owned: [...current.owned, pieceId] }
          : current,
      )
      setMessage(ROOM_MESSAGES[skin].bought)
      return true
    } catch {
      if (alive.current) setMessage(ROOM_MESSAGES[skin].buyFailed)
      return false
    } finally {
      if (alive.current) setBuying(null)
    }
  }
  const dirty = Boolean(saved && draft && JSON.stringify(saved.house) !== JSON.stringify(draft))
  // Salvar sozinho: 1 s depois do último gesto (os passos de um arraste viram uma gravação só).
  const saveRef = useRef(save)
  saveRef.current = save
  // biome-ignore lint/correctness/useExhaustiveDependencies: o `draft` recomeça a contagem a cada gesto.
  useEffect(() => {
    if (!autosave || !dirty || conflict) return
    const timer = setTimeout(() => void saveRef.current(), MORADA_AUTOSAVE_MS)
    return () => clearTimeout(timer)
  }, [autosave, dirty, draft, conflict])
  // Sair da página, esconder a aba ou fechar a tela grava o que falta na hora.
  useEffect(() => {
    if (!autosave) return
    const flush = () => void saveRef.current({ keepalive: true })
    const hidden = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', hidden)
    return () => {
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', hidden)
      flush()
    }
  }, [autosave])
  useEffect(() => {
    if (!dirty || (autosave && saveState !== 'error')) return
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty, autosave, saveState])
  return {
    saved,
    wallet,
    draft,
    status,
    message,
    conflict,
    dirty,
    update,
    save,
    saveState,
    load,
    resolveConflict,
    setMessage,
    buy,
    buying,
  }
}
