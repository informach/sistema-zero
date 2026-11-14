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

export function useMoradaEditor(skin: CosmeticsSkin = 'kids') {
  const [saved, setSaved] = useState<MoradaHouseEnvelope | null>(null)
  const [draft, setDraft] = useState<MoradaHouse | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'saving' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const [conflict, setConflict] = useState<MoradaHouseEnvelope | null>(null)
  const [wallet, setWallet] = useState<{ balance: number; unlimited: boolean } | null>(null)
  const alive = useRef(true)
  const draftRef = useRef(draft)
  draftRef.current = draft
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
    if (status === 'saving' || conflict) return
    setMessage('')
    setDraft((house) => (house ? change(house) : house))
  }
  const save = async () => {
    if (!saved || !draft || conflict || status === 'saving') return
    const errors = validateMoradaHouse(draft)
    if (errors.length) {
      setMessage(
        'Uma peça não cabe no espaço ou no apoio escolhido. Ajuste o arranjo e tente novamente.',
      )
      return
    }
    setStatus('saving')
    setMessage('')
    try {
      const response = await sessionFetch('/api/members/house', {
        method: 'PUT',
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
        return
      }
      if (!response.ok)
        throw new Error('Não foi possível salvar. Seu arranjo continua aqui para tentar novamente.')
      const envelope = readMoradaEnvelope(body)
      setSaved(envelope)
      setDraft(envelope.house)
      setStatus('ready')
      setMessage(ROOM_MESSAGES[skin].saved)
    } catch (error) {
      if (alive.current) {
        setStatus('ready')
        setMessage(
          error instanceof Error ? error.message : 'Não foi possível salvar. Tente novamente.',
        )
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
  const dirty = Boolean(saved && draft && JSON.stringify(saved.house) !== JSON.stringify(draft))
  useEffect(() => {
    if (!dirty) return
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])
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
    load,
    resolveConflict,
    setMessage,
  }
}
