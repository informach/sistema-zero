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
/**
 * O navegador recusa `keepalive` com corpo acima de 64 KiB (o `fetch` lança antes de sair). Abaixo
 * desta medida o envio da saída vai com `keepalive`; acima, vai como pedido comum (e o aviso de sair
 * da página segura enquanto houver mudança pendente).
 */
export const MORADA_KEEPALIVE_MAX_BYTES = 60_000

/**
 * O corpo do PUT do quarto: só os cômodos, o lote e as peças DO QUARTO. O servidor, com
 * `scope: 'room'`, usa da casa enviada só o quarto e o bichinho (o resto vem da casa guardada), então
 * mandar a casa inteira só aumentava o corpo (e passava do teto do `keepalive` numa casa grande).
 */
export function moradaRoomPutBody(house: MoradaHouse, revision: number): string {
  const room = { ...house, instances: house.instances.filter((i) => i.roomId === house.roomId) }
  return JSON.stringify({ house: room, revision, scope: 'room' })
}

/** A frase que o servidor mandou com a recusa (`{error: {message}}`), quando há. */
function serverReason(body: unknown): string | null {
  if (!body || typeof body !== 'object' || !('error' in body)) return null
  const error = (body as { error: unknown }).error
  if (!error || typeof error !== 'object' || !('message' in error)) return null
  const message = (error as { message: unknown }).message
  return typeof message === 'string' && message.trim() ? message.trim() : null
}

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
  /**
   * Sobe quando a casa da tela é TROCADA por outra que não veio desta aba (abrir de novo, resolver
   * um conflito). Quem guarda o desfazer recomeça o histórico nessa hora: desfazer para uma casa de
   * antes da troca gravaria por cima da versão mais nova (revisão de 26/11/2026).
   */
  const [generation, setGeneration] = useState(0)
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
      conflictRef.current = null
      setGeneration((g) => g + 1)
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
    if (JSON.stringify(saved.house) === JSON.stringify(draft)) {
      // Desfez de volta ao que está guardado: nada a gravar, e o "Não salvou" de antes sai.
      setSaveState((state) => (state === 'error' ? 'saved' : state))
      return
    }
    const errors = validateMoradaHouse(draft)
    if (errors.length) {
      setSaveState('error')
      setMessage(
        'Uma peça não cabe no espaço ou no apoio escolhido. Ajuste o arranjo e tente novamente.',
      )
      return
    }
    inflight.current = true
    if (alive.current) {
      setStatus('saving')
      setSaveState('saving')
      if (!autosave) setMessage('')
    }
    const sent = JSON.stringify(draft)
    const payload = moradaRoomPutBody(draft, saved.revision)
    try {
      const response = await sessionFetch('/api/members/house', {
        method: 'PUT',
        // Corpo grande demais para o `keepalive` vai como pedido comum (com ele, o `fetch` lançava).
        keepalive:
          keepalive && new TextEncoder().encode(payload).byteLength <= MORADA_KEEPALIVE_MAX_BYTES,
        headers: { 'content-type': 'application/json' },
        body: payload,
      })
      const body: unknown = await response.json().catch(() => null)
      if (response.status === 409) {
        const current =
          body && typeof body === 'object' && 'current' in body
            ? readMoradaEnvelope(body.current)
            : null
        if (!current)
          throw new Error('Sua casa mudou em outro lugar. Abra novamente antes de salvar.')
        // Já, e não no próximo render: o `finally` pode pedir outra gravação agora, e ela sairia
        // com a revisão velha (outro 409 à toa).
        conflictRef.current = current
        again.current = false
        if (!alive.current) return
        setConflict(current)
        setStatus('ready')
        setSaveState('idle')
        return
      }
      if (!response.ok)
        throw new Error(
          serverReason(body) ??
            'Não foi possível salvar. Seu arranjo continua aqui para tentar novamente.',
        )
      const envelope = readMoradaEnvelope(body)
      // A tela pode ter fechado enquanto o pedido estava no ar. O gesto pendente ainda precisa
      // da revisão confirmada para gravar em seguida; só as atualizações da tela são dispensadas.
      savedRef.current = envelope
      if (!alive.current) return
      setSaved(envelope)
      // O gesto feito DURANTE a gravação fica na tela (e sai na próxima).
      if (JSON.stringify(draftRef.current) === sent) setDraft(envelope.house)
      setStatus('ready')
      setSaveState('saved')
      if (!autosave) setMessage(ROOM_MESSAGES[skin].saved)
    } catch (error) {
      if (alive.current) {
        setStatus('ready')
        setSaveState('error')
        // Com o salvar sozinho, o selo já diz "Não salvou"; o motivo do servidor (peça ainda não
        // comprada, peça fora do quarto) aparece também, senão a criança não sabe o que mudar.
        setMessage(
          error instanceof Error ? error.message : 'Não foi possível salvar. Tente novamente.',
        )
      }
    } finally {
      inflight.current = false
      if (again.current && !conflictRef.current) {
        again.current = false
        // O gesto feito durante a gravação sai mesmo com a tela já fechada (navegou no app): sem
        // isto ele se perdia ao desmontar.
        void save({ keepalive: !alive.current })
      }
    }
  }
  const resolveConflict = (keepLocal: boolean) => {
    if (!conflict) return
    const local = draftRef.current
    setSaved(conflict)
    savedRef.current = conflict
    setDraft(keepLocal && local ? replaceMoradaRoom(conflict.house, local) : conflict.house)
    setConflict(null)
    conflictRef.current = null
    setGeneration((g) => g + 1)
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
  // Undo de volta ao guardado (sem nada a gravar) também tira o "Não salvou".
  useEffect(() => {
    if (!dirty && saveState === 'error') setSaveState('saved')
  }, [dirty, saveState])
  // Sair da página, esconder a aba ou fechar a tela grava o que falta na hora.
  useEffect(() => {
    if (!autosave) return
    const flush = () => void saveRef.current({ keepalive: true })
    const hidden = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    /**
     * A página vai embora com uma gravação no ar: o pedido comum dela pode ser cortado, e o gesto
     * feito depois só sairia no fim dela, que não chega. Manda a casa de agora, com `keepalive`, sem
     * esperar (com a revisão de antes: se a primeira chegou, esta recebe 409 e nada se estraga).
     */
    const leaving = () => {
      const draft = draftRef.current
      const saved = savedRef.current
      if (!inflight.current || !draft || !saved || conflictRef.current) return flush()
      if (JSON.stringify(saved.house) === JSON.stringify(draft)) return
      const payload = moradaRoomPutBody(draft, saved.revision)
      if (new TextEncoder().encode(payload).byteLength > MORADA_KEEPALIVE_MAX_BYTES) return
      void sessionFetch('/api/members/house', {
        method: 'PUT',
        keepalive: true,
        headers: { 'content-type': 'application/json' },
        body: payload,
      }).catch(() => undefined)
    }
    window.addEventListener('pagehide', leaving)
    document.addEventListener('visibilitychange', hidden)
    return () => {
      window.removeEventListener('pagehide', leaving)
      document.removeEventListener('visibilitychange', hidden)
      flush()
    }
  }, [autosave])
  useEffect(() => {
    // Com o salvar sozinho, o aviso de sair só segura quando a gravação falhou ou quando a casa é
    // grande demais para o envio com `keepalive` da saída.
    const big =
      autosave &&
      dirty &&
      draft &&
      saved &&
      new TextEncoder().encode(moradaRoomPutBody(draft, saved.revision)).byteLength >
        MORADA_KEEPALIVE_MAX_BYTES
    if (!dirty || (autosave && saveState !== 'error' && !big)) return
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty, autosave, saveState, draft, saved])
  return {
    generation,
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
