'use client'

import {
  LeituraDoLimiteDaFamiliaSchema,
  LIMITE_DIARIO_MAXIMO_MINUTOS,
  LIMITE_DIARIO_MINIMO_MINUTOS,
  LIMITE_DIARIO_PASSO_MINUTOS,
  LimiteDaFamiliaSchema,
  type PermissoesDaFamilia,
  PermissoesDaFamiliaSchema,
  type SemanaDaFamiliaParaOsPais,
  SemanaDaFamiliaParaOsPaisSchema,
} from '@sistemazero/member-shell/lib/arquipelago-contracts'
import { sessionFetch } from '@sistemazero/member-shell/lib/session-fetch'
import { Minus, Plus, TreePalm } from 'lucide-react'
import { type FormEvent, useEffect, useId, useState } from 'react'
import type { z } from 'zod'
import { duracaoPorExtenso, PermissoesDeVisita, SemanaDasCriancas } from './arquipelago-familia'
import { MinijogosDaFamilia } from './arquipelago-minijogos'
import { PRIMARY_ACTION } from './parent-actions'

export { duracaoPorExtenso } from './arquipelago-familia'

const ROTA = '/api/parents/arquipelago/limite'
const ROTA_DA_SEMANA = '/api/parents/arquipelago/semana'
const ROTA_DAS_PERMISSOES = '/api/parents/arquipelago/permissoes'

/** Lê uma parte do cartão; qualquer falha (rede, status, formato) vira `null` e a parte some. */
async function ler<T>(rota: string, schema: z.ZodType<T>, signal: AbortSignal): Promise<T | null> {
  try {
    const response = await sessionFetch(rota, { signal })
    if (!response.ok) return null
    const data = schema.safeParse(await response.json())
    return data.success ? data.data : null
  } catch {
    return null
  }
}

function ajustar(minutos: number): number {
  const passo = LIMITE_DIARIO_PASSO_MINUTOS
  const arredondado = Math.round(minutos / passo) * passo
  return Math.min(LIMITE_DIARIO_MAXIMO_MINUTOS, Math.max(LIMITE_DIARIO_MINIMO_MINUTOS, arredondado))
}

/**
 * O Arquipélago Vagalume na Família: a semana de cada criança no jogo, o tempo livre por dia e as
 * permissões de visita. O cartão só aparece quando o serviço do jogo responde que alguma criança
 * da conta vê o jogo (a mesma política de acesso do jogo). Jogo fechado para a família, serviço
 * fora ou resposta estranha: o cartão fica escondido, porque um cartão de um jogo que a criança
 * não vê, ou um erro aqui, só confundiria a família. A semana e as permissões só são lidas depois
 * disso, e cada uma some sozinha quando a leitura dela falha (28/10/2026, fase1-18).
 */
export function ArquipelagoLimitCard() {
  const titulo = useId()
  const tituloDoLimite = useId()
  const ajuda = useId()
  const [limite, setLimite] = useState<number | null>(null)
  const [semana, setSemana] = useState<SemanaDaFamiliaParaOsPais | null>(null)
  const [permissoes, setPermissoes] = useState<PermissoesDaFamilia | null>(null)
  const [valor, setValor] = useState(LIMITE_DIARIO_MINIMO_MINUTOS)
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    void (async () => {
      try {
        const response = await sessionFetch(ROTA, { signal: controller.signal })
        const data = LeituraDoLimiteDaFamiliaSchema.safeParse(await response.json())
        if (!response.ok || !data.success || controller.signal.aborted) return
        if (!data.data.algumaCriancaVe) return
        setLimite(data.data.limiteDiarioMinutos)
        setValor(data.data.limiteDiarioMinutos)
        const [lidaSemana, lidas] = await Promise.all([
          ler(ROTA_DA_SEMANA, SemanaDaFamiliaParaOsPaisSchema, controller.signal),
          ler(ROTA_DAS_PERMISSOES, PermissoesDaFamiliaSchema, controller.signal),
        ])
        if (controller.signal.aborted) return
        if (lidaSemana?.algumaCriancaVe) setSemana(lidaSemana)
        setPermissoes(lidas)
      } catch {
        // Sem o serviço do jogo o cartão continua escondido.
      }
    })()
    return () => controller.abort()
  }, [])

  if (limite === null) return null

  function mudar(minutos: number) {
    setValor(ajustar(minutos))
    setErro('')
    setAviso('')
  }

  async function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setOcupado(true)
    setErro('')
    setAviso('')
    try {
      const response = await sessionFetch(ROTA, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ limiteDiarioMinutos: valor }),
      })
      const data = LimiteDaFamiliaSchema.safeParse(await response.json())
      if (!response.ok || !data.success) throw new Error('limite não salvo')
      setLimite(data.data.limiteDiarioMinutos)
      setValor(data.data.limiteDiarioMinutos)
      setAviso(
        `Pronto. Agora cada criança tem ${duracaoPorExtenso(data.data.limiteDiarioMinutos)} por dia.`,
      )
    } catch {
      setErro('Não consegui salvar agora. Tente de novo daqui a pouco.')
    } finally {
      setOcupado(false)
    }
  }

  const mudou = valor !== limite
  const botaoDoPasso =
    'grid size-11 shrink-0 place-items-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-muted disabled:opacity-40'

  return (
    <section aria-labelledby={titulo} className="kids-carta flex min-w-0 flex-col gap-6 p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="kids-marca inline-flex size-10 shrink-0 items-center justify-center rounded-full">
          <TreePalm className="size-5" aria-hidden="true" />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id={titulo} className="sz-display text-[1.25rem]">
            Arquipélago Vagalume
          </h2>
          <p className="max-w-2xl text-muted-foreground text-sm">
            O que as crianças fizeram no jogo, quanto tempo cada uma pode passear por dia e com quem
            ela pode interagir lá dentro.
          </p>
        </div>
      </div>
      {semana ? <SemanaDasCriancas semana={semana} limiteDiarioMinutos={limite} /> : null}
      <MinijogosDaFamilia />
      <section aria-labelledby={tituloDoLimite} className="flex flex-col gap-4">
        <div className="flex flex-col gap-0.5">
          <h3 id={tituloDoLimite} className="font-extrabold text-base">
            Tempo livre no Arquipélago
          </h3>
          <p id={ajuda} className="max-w-2xl text-muted-foreground text-xs">
            Quanto tempo cada criança pode passear pelo jogo por dia. Criar no Pinta, no Molda ou no
            Estúdio não gasta esse tempo, nem quando ela abre as ferramentas de dentro do jogo.
          </p>
        </div>
        <form onSubmit={salvar} className="flex flex-wrap items-center gap-x-6 gap-y-4">
          <fieldset className="flex items-center gap-3" aria-describedby={ajuda}>
            <legend className="sr-only">Tempo livre por dia</legend>
            <button
              type="button"
              className={botaoDoPasso}
              onClick={() => mudar(valor - LIMITE_DIARIO_PASSO_MINUTOS)}
              disabled={ocupado || valor <= LIMITE_DIARIO_MINIMO_MINUTOS}
              aria-label={`Diminuir ${LIMITE_DIARIO_PASSO_MINUTOS} minutos`}
            >
              <Minus className="size-4" aria-hidden="true" />
            </button>
            <output
              aria-live="polite"
              className="min-w-[7.5rem] text-center sz-display text-[1.75rem] leading-none tabular-nums"
            >
              {duracaoPorExtenso(valor)}
              <span className="mt-1 block font-sans font-semibold text-muted-foreground text-xs">
                por dia
              </span>
            </output>
            <button
              type="button"
              className={botaoDoPasso}
              onClick={() => mudar(valor + LIMITE_DIARIO_PASSO_MINUTOS)}
              disabled={ocupado || valor >= LIMITE_DIARIO_MAXIMO_MINUTOS}
              aria-label={`Aumentar ${LIMITE_DIARIO_PASSO_MINUTOS} minutos`}
            >
              <Plus className="size-4" aria-hidden="true" />
            </button>
          </fieldset>
          <button type="submit" className={PRIMARY_ACTION} disabled={ocupado || !mudou}>
            {ocupado ? 'Salvando…' : 'Salvar'}
          </button>
          <p className="text-muted-foreground text-xs">
            De {duracaoPorExtenso(LIMITE_DIARIO_MINIMO_MINUTOS)} a{' '}
            {duracaoPorExtenso(LIMITE_DIARIO_MAXIMO_MINUTOS)}, de {LIMITE_DIARIO_PASSO_MINUTOS} em{' '}
            {LIMITE_DIARIO_PASSO_MINUTOS} minutos.
          </p>
        </form>
        {erro ? (
          <p role="alert" className="font-semibold text-destructive text-sm">
            {erro}
          </p>
        ) : null}
        {aviso ? (
          <p role="status" className="font-semibold text-sm">
            {aviso}
          </p>
        ) : null}
      </section>
      {permissoes ? <PermissoesDeVisita inicial={permissoes} /> : null}
    </section>
  )
}
