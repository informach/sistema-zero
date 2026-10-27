'use client'

import {
  ManifestoDoClienteSchema,
  type ModuloDoArquipelago,
  type MontagemDoArquipelago,
  type Plataforma,
  type PublicoJogo,
  posicaoDoPostoKids,
  QuartoSchema,
  VERSAO_CONTRATO_PLATAFORMA,
} from '@sistemazero/arquipelago-contracts'
import { type AdultJourneyView, adultJourneyPosition } from '@sistemazero/core/journey'
import { useEffect, useRef, useState } from 'react'
import { sessionFetch } from '../lib/session-fetch'

/** O repasse do BFF (`routes/arquipelago.ts`). */
const BASE = '/api/arquipelago'
/** As únicas rotas do serviço que o jogo chama (o limite da família é da área dos pais). */
const CAMINHOS_DO_JOGO = new Set(['/acesso', '/salvamento', '/tempo'])

type Estado = 'carregando' | 'pronto' | 'indisponivel' | 'erro'

async function json(url: string, init?: RequestInit): Promise<{ status: number; corpo: unknown }> {
  const resposta = await sessionFetch(url, init)
  return { status: resposta.status, corpo: await resposta.json().catch(() => null) }
}

function corpoJson(metodo: string, corpo: unknown): RequestInit {
  return corpo === undefined
    ? { method: metodo }
    : {
        method: metodo,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(corpo),
      }
}

/**
 * A porta da plataforma para o Arquipélago Vagalume (contrato em
 * `@sistemazero/arquipelago-contracts`). O avatar e o quarto são lidos e gravados pelas MESMAS
 * rotas das telas da plataforma; o resto vai ao serviço do jogo pelo repasse.
 */
export function criarPlataformaDoArquipelago(opcoes: {
  publico: PublicoJogo
  perfil: { id: string; primeiroNome: string }
  voltarPara: string
}): Plataforma {
  return {
    versaoContrato: VERSAO_CONTRATO_PLATAFORMA,
    publico: opcoes.publico,
    perfil: opcoes.perfil,
    async lerJornada() {
      const r = await json('/api/members/gamification/me')
      const dados =
        r.status === 200
          ? (r.corpo as { level?: { slug?: string }; journey?: AdultJourneyView } | null)
          : null
      if (opcoes.publico === 'adulto')
        return { posicao: adultJourneyPosition(dados?.journey)?.position ?? 1 }
      return { posicao: posicaoDoPostoKids(dados?.level?.slug) }
    },
    async lerAvatar() {
      const r = await json('/api/members/avatar')
      const slots = (r.corpo as { equipped?: Record<string, { asset: string; color?: string }> })
        ?.equipped
      if (r.status !== 200 || !slots) throw new Error(`avatar (${r.status})`)
      return { slots }
    },
    async lerQuarto() {
      const r = await json('/api/members/room')
      const quarto = QuartoSchema.safeParse((r.corpo as { state?: unknown } | null)?.state)
      if (r.status !== 200 || !quarto.success) throw new Error(`quarto (${r.status})`)
      return quarto.data
    },
    async salvarQuarto(quarto) {
      const r = await json('/api/members/room', corpoJson('PUT', quarto))
      if (r.status !== 200) throw new Error(`quarto (${r.status})`)
      const guardado = QuartoSchema.safeParse(
        (r.corpo as { state?: unknown } | null)?.state ?? r.corpo,
      )
      return guardado.success ? guardado.data : quarto
    },
    servico: {
      async buscar(caminho, pedido) {
        if (!CAMINHOS_DO_JOGO.has(caminho)) return { status: 404, corpo: { code: 'NOT_FOUND' } }
        return json(`${BASE}${caminho}`, corpoJson(pedido?.metodo ?? 'GET', pedido?.corpo))
      },
    },
    // As ferramentas de verdade (Pinta, Molda, Estúdio) abrem por cima do jogo numa fase
    // seguinte; por enquanto o jogo recebe "indisponível" e segue sem elas.
    abrirFerramenta: async () => ({ situacao: 'indisponivel', motivo: 'em-breve' }),
    voltarParaPlataforma: () => window.location.assign(opcoes.voltarPara),
    relatarErro: (erro, contexto) => console.error(`[arquipelago] ${contexto}`, erro),
  }
}

/**
 * Hospeda o jogo: lê o manifesto publicado, importa a entrada daquela versão e chama
 * `montarArquipelago`. O jogo roda na própria raiz React; se ele falhar, só esta página avisa.
 */
export function ArquipelagoHost(props: {
  publico: PublicoJogo
  perfil: { id: string; primeiroNome: string }
  voltarPara: string
}) {
  const elemento = useRef<HTMLDivElement>(null)
  const [estado, setEstado] = useState<Estado>('carregando')
  const { publico, voltarPara } = props
  const { id, primeiroNome } = props.perfil

  useEffect(() => {
    let vivo = true
    let montagem: MontagemDoArquipelago | null = null
    void (async () => {
      const resposta = await fetch(`${BASE}/cliente/manifesto.json`, { cache: 'no-store' })
      const manifesto = resposta.ok
        ? ManifestoDoClienteSchema.safeParse(await resposta.json().catch(() => null))
        : null
      if (!manifesto?.success || manifesto.data.versaoContrato !== VERSAO_CONTRATO_PLATAFORMA) {
        if (vivo) setEstado('indisponivel')
        return
      }
      const url = `${BASE}/cliente/${manifesto.data.entrada}`
      const modulo = (await import(
        /* webpackIgnore: true */ /* turbopackIgnore: true */ url
      )) as ModuloDoArquipelago
      if (!vivo || !elemento.current) return
      if (modulo.versaoContrato !== VERSAO_CONTRATO_PLATAFORMA) {
        setEstado('indisponivel')
        return
      }
      montagem = modulo.montarArquipelago(
        elemento.current,
        criarPlataformaDoArquipelago({ publico, perfil: { id, primeiroNome }, voltarPara }),
      )
      setEstado('pronto')
    })().catch((erro) => {
      console.error('[arquipelago] não abriu', erro)
      if (vivo) setEstado('erro')
    })
    return () => {
      vivo = false
      montagem?.desmontar()
    }
  }, [publico, id, primeiroNome, voltarPara])

  return (
    // A moldura usa estilo próprio (não classes): o jogo ocupa a tela em qualquer app que hospede.
    <div style={{ position: 'fixed', inset: 0, background: '#0e1430' }}>
      <div ref={elemento} style={{ position: 'absolute', inset: 0 }} />
      {estado === 'pronto' ? null : (
        <div
          className="grid place-items-center p-6 text-center text-white"
          style={{ position: 'absolute', inset: 0 }}
        >
          <div className="max-w-sm space-y-4" role="status" aria-live="polite">
            <p className="font-bold text-xl">
              {estado === 'carregando'
                ? 'Abrindo o Arquipélago…'
                : estado === 'indisponivel'
                  ? 'O Arquipélago ainda não abriu por aqui.'
                  : 'Não consegui abrir o Arquipélago agora.'}
            </p>
            {estado === 'carregando' ? null : (
              <a
                href={voltarPara}
                className="inline-flex h-11 items-center rounded-full bg-white px-6 font-bold text-[#0e1430]"
              >
                Voltar
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
