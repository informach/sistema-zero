'use client'

import {
  type SemanaDaFamiliaParaOsPais,
  SemanaDaFamiliaParaOsPaisSchema,
} from '@sistemazero/member-shell/lib/arquipelago-contracts'
import { TreePalm } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { SemanaDasCriancas } from './arquipelago-familia'
import { ler, ROTA_DA_SEMANA } from './arquipelago-limit-card'
import { MinijogosDaCrianca } from './arquipelago-minijogos'

/** Só a criança pedida: a semana da família inteira vira a semana de um filho. */
export function semanaDoFilho(
  semana: SemanaDaFamiliaParaOsPais,
  perfilId: string,
): SemanaDaFamiliaParaOsPais {
  return {
    ...semana,
    criancas: semana.criancas.filter((c) => c.perfilId === perfilId),
    aindaSemJogo: semana.aindaSemJogo.filter((c) => c.perfilId === perfilId),
  }
}

/**
 * A aba "No jogo" da página de um filho (redesenho de 14/11/2026): a semana dele no Arquipélago
 * Vagalume e os minijogos que ele fez. As regras (tempo e visitas) valem para a família toda e
 * ficam na página Família. Jogo fechado para a família ou serviço fora: um recado curto.
 */
export function ArquipelagoDoFilho({ perfilId, nome }: { perfilId: string; nome: string }) {
  const [semana, setSemana] = useState<SemanaDaFamiliaParaOsPais | null | 'fechado'>(null)
  useEffect(() => {
    const controller = new AbortController()
    void (async () => {
      const lida = await ler(ROTA_DA_SEMANA, SemanaDaFamiliaParaOsPaisSchema, controller.signal)
      if (controller.signal.aborted) return
      setSemana(lida?.algumaCriancaVe ? semanaDoFilho(lida, perfilId) : 'fechado')
    })()
    return () => controller.abort()
  }, [perfilId])
  return (
    <section className="kids-carta flex min-w-0 flex-col gap-6 p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="kids-marca inline-flex size-10 shrink-0 items-center justify-center rounded-full">
          <TreePalm className="size-5" aria-hidden="true" />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="sz-display text-[1.25rem]">{nome} no Arquipélago Vagalume</h2>
          <p className="max-w-2xl text-muted-foreground text-sm">
            O que {nome} fez no jogo da plataforma nos últimos dias. O tempo de jogo e as visitas
            são regras da família:{' '}
            <Link
              href="/pais/familia"
              className="font-bold text-primary underline-offset-4 hover:underline"
            >
              mudar na página Família
            </Link>
            .
          </p>
        </div>
      </div>
      {semana === 'fechado' ? (
        <p className="text-muted-foreground text-sm">
          Os números do jogo aparecem aqui quando {nome} jogar.
        </p>
      ) : semana ? (
        <SemanaDasCriancas semana={semana} limiteDiarioMinutos={semana.limiteDiarioMinutos} />
      ) : null}
      <MinijogosDaCrianca perfilId={perfilId} nome={nome} />
    </section>
  )
}
