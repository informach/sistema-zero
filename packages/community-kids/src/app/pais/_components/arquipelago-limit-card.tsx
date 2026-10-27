'use client'

import {
  LIMITE_DIARIO_MAXIMO_MINUTOS,
  LIMITE_DIARIO_MINIMO_MINUTOS,
  LIMITE_DIARIO_PASSO_MINUTOS,
  LimiteDaFamiliaSchema,
} from '@sistemazero/member-shell/lib/arquipelago-contracts'
import { sessionFetch } from '@sistemazero/member-shell/lib/session-fetch'
import { type FormEvent, useCallback, useEffect, useState } from 'react'
import { PRIMARY_ACTION, SECONDARY_ACTION } from './parent-actions'

/** Limite da família para o tempo livre de cada criança no Arquipélago. */
export function ArquipelagoLimitCard() {
  const [limite, setLimite] = useState<number | null>(null)
  const [valor, setValor] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const carregar = useCallback(async (signal?: AbortSignal) => {
    setOcupado(true)
    setErro('')
    try {
      const response = await sessionFetch('/api/parents/arquipelago/limite', { signal })
      const data = LimiteDaFamiliaSchema.safeParse(await response.json())
      if (!response.ok || !data.success) throw new Error('limite indisponível')
      if (signal?.aborted) return
      setLimite(data.data.limiteDiarioMinutos)
      setValor(String(data.data.limiteDiarioMinutos))
    } catch {
      if (!signal?.aborted) setErro('Não foi possível consultar o limite agora.')
    } finally {
      if (!signal?.aborted) setOcupado(false)
    }
  }, [])
  useEffect(() => {
    const controller = new AbortController()
    void carregar(controller.signal)
    return () => controller.abort()
  }, [carregar])
  async function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const minutos = Number(valor)
    if (
      !Number.isInteger(minutos) ||
      minutos < LIMITE_DIARIO_MINIMO_MINUTOS ||
      minutos > LIMITE_DIARIO_MAXIMO_MINUTOS ||
      minutos % LIMITE_DIARIO_PASSO_MINUTOS !== 0
    ) {
      setErro('Escolha entre 10 e 240 minutos, de 5 em 5.')
      return
    }
    setOcupado(true)
    setErro('')
    setAviso('')
    try {
      const response = await sessionFetch('/api/parents/arquipelago/limite', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ limiteDiarioMinutos: minutos }),
      })
      const data = LimiteDaFamiliaSchema.safeParse(await response.json())
      if (!response.ok || !data.success) throw new Error('limite não salvo')
      setLimite(data.data.limiteDiarioMinutos)
      setValor(String(data.data.limiteDiarioMinutos))
      setAviso('Limite salvo.')
    } catch {
      setErro('Não foi possível salvar o limite. Tente novamente.')
    } finally {
      setOcupado(false)
    }
  }
  return (
    <section className="kids-carta space-y-4 p-5" aria-labelledby="limite-arquipelago">
      <h2 id="limite-arquipelago" className="sz-display text-xl">
        Tempo no Arquipélago
      </h2>
      <p className="text-muted-foreground text-sm">
        Defina o tempo livre diário para cada criança no jogo. Aulas e desafios do Estúdio não
        contam nesse limite.
      </p>
      {limite !== null ? (
        <form onSubmit={salvar} className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 font-bold text-sm">
            Minutos por dia
            <input
              type="number"
              min={LIMITE_DIARIO_MINIMO_MINUTOS}
              max={LIMITE_DIARIO_MAXIMO_MINUTOS}
              step={LIMITE_DIARIO_PASSO_MINUTOS}
              required
              value={valor}
              onChange={(event) => setValor(event.target.value)}
              disabled={ocupado}
              className="min-h-11 w-28 rounded-xl border border-border bg-background px-3"
            />
          </label>
          <button className={PRIMARY_ACTION} disabled={ocupado || Number(valor) === limite}>
            Salvar limite
          </button>
        </form>
      ) : !ocupado ? (
        <button className={SECONDARY_ACTION} onClick={() => void carregar()}>
          Tentar novamente
        </button>
      ) : (
        <p>Consultando limite…</p>
      )}
      {erro && <p role="alert">{erro}</p>}
      {aviso && <p role="status">{aviso}</p>}
    </section>
  )
}
