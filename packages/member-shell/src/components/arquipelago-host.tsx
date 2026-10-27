'use client'

import {
  ManifestoDoClienteSchema,
  type ModuloDoArquipelago,
  type MontagemDoArquipelago,
  type PedidoDeFerramenta,
  type Plataforma,
  type PublicoJogo,
  posicaoDoPostoKids,
  QuartoSchema,
  type ResultadoDeFerramenta,
  VERSAO_CONTRATO_PLATAFORMA,
} from '@sistemazero/arquipelago-contracts'
import { type AdultJourneyView, adultJourneyPosition } from '@sistemazero/core/journey'
import type { MoldaToolAccess } from '@sistemazero/molda/tools'
import { Component, lazy, type ReactNode, Suspense, useEffect, useRef, useState } from 'react'
import { sessionFetch } from '../lib/session-fetch'

const CreationDialog = lazy(() =>
  import('./arquipelago-creation-dialog').then((m) => ({ default: m.ArquipelagoCreationDialog })),
)

class ToolLoadBoundary extends Component<
  { children: ReactNode; onCancel: () => void },
  { failed: boolean }
> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div
        className="absolute inset-0 z-50 grid place-items-center bg-background p-6 text-center text-foreground"
        role="alert"
      >
        <div>
          <p>Não foi possível abrir a ferramenta agora.</p>
          <button
            type="button"
            onClick={this.props.onCancel}
            className="mt-4 rounded-full bg-primary px-5 py-2 font-semibold text-primary-foreground"
          >
            Voltar ao jogo
          </button>
        </div>
      </div>
    )
  }
}

/** O repasse do BFF (`routes/arquipelago.ts`). */
const BASE = '/api/arquipelago'
/** As únicas rotas do serviço que o jogo chama (o limite da família é da área dos pais). */
const CAMINHOS_DO_JOGO = new Set(['/acesso', '/salvamento', '/tempo'])

type Estado = 'carregando' | 'pronto' | 'indisponivel' | 'erro'

/** `null` é liberação total explícita; ausência ou resposta malformada não abre a oficina. */
export function lerFerramentasMolda(
  value: unknown,
): { ok: true; access: MoldaToolAccess | null } | { ok: false } {
  if (value === null) return { ok: true, access: null }
  if (!value || typeof value !== 'object') return { ok: false }
  const candidate = value as { allow?: unknown; upcoming?: unknown }
  if (!Array.isArray(candidate.allow) || !candidate.allow.every((item) => typeof item === 'string'))
    return { ok: false }
  if (
    candidate.upcoming !== undefined &&
    (!Array.isArray(candidate.upcoming) ||
      !candidate.upcoming.every(
        (item) =>
          item &&
          typeof item.when === 'string' &&
          Array.isArray(item.families) &&
          item.families.every((family: unknown) => typeof family === 'string'),
      ))
  )
    return { ok: false }
  return { ok: true, access: candidate as MoldaToolAccess }
}

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
  abrirFerramenta?: (pedido: PedidoDeFerramenta) => Promise<ResultadoDeFerramenta>
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
        return json(`${BASE}${caminho}`, {
          ...corpoJson(pedido?.metodo ?? 'GET', pedido?.corpo),
          signal: pedido?.sinal,
        })
      },
    },
    abrirFerramenta:
      opcoes.abrirFerramenta ?? (async () => ({ situacao: 'indisponivel', motivo: 'em-breve' })),
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
  narrationEnabled?: boolean
}) {
  const elemento = useRef<HTMLDivElement>(null)
  const [estado, setEstado] = useState<Estado>('carregando')
  const [creation, setCreation] = useState<{
    ferramenta: 'pinta' | 'molda'
    studioAvailable: boolean
    toolAccess: MoldaToolAccess | null
  } | null>(null)
  const pendente = useRef<((resultado: ResultadoDeFerramenta) => void) | null>(null)
  const abrindo = useRef(false)
  const { publico, voltarPara } = props
  const { id, primeiroNome } = props.perfil

  useEffect(() => {
    let vivo = true
    let montagem: MontagemDoArquipelago | null = null
    const abrirFerramenta = async (pedido: PedidoDeFerramenta): Promise<ResultadoDeFerramenta> => {
      if (
        (pedido.ferramenta !== 'pinta' && pedido.ferramenta !== 'molda') ||
        pedido.molde !== undefined
      )
        return { situacao: 'indisponivel', motivo: 'em-breve' }
      if (abrindo.current || pendente.current)
        return { situacao: 'indisponivel', motivo: 'ocupado' }
      abrindo.current = true
      try {
        const [acessoResult, estudioResult] = await Promise.allSettled([
          json(`${BASE}/ferramentas/${pedido.ferramenta}`),
          json(`${BASE}/ferramentas/estudio`),
        ])
        if (!vivo) return { situacao: 'cancelado' }
        if (acessoResult.status !== 'fulfilled')
          return { situacao: 'indisponivel', motivo: 'em-breve' }
        const acesso = acessoResult.value
        const estudio = estudioResult.status === 'fulfilled' ? estudioResult.value : null
        const situacao = (acesso.corpo as { situacao?: string } | null)?.situacao
        if (acesso.status !== 200 || situacao !== 'disponivel')
          return {
            situacao: 'indisponivel',
            motivo: situacao === 'bloqueada' ? 'acesso-necessario' : 'em-breve',
          }
        const tools =
          pedido.ferramenta === 'molda'
            ? lerFerramentasMolda((acesso.corpo as { toolAccess?: unknown } | null)?.toolAccess)
            : { ok: true as const, access: null }
        if (!tools.ok) return { situacao: 'indisponivel', motivo: 'em-breve' }
        return await new Promise<ResultadoDeFerramenta>((resolve) => {
          pendente.current = resolve
          setCreation({
            ferramenta: pedido.ferramenta as 'pinta' | 'molda',
            toolAccess: tools.access,
            studioAvailable:
              estudio?.status === 200 &&
              (estudio.corpo as { situacao?: string } | null)?.situacao === 'disponivel',
          })
        })
      } catch {
        return { situacao: 'indisponivel', motivo: 'em-breve' }
      } finally {
        abrindo.current = false
      }
    }
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
        criarPlataformaDoArquipelago({
          publico,
          perfil: { id, primeiroNome },
          voltarPara,
          abrirFerramenta,
        }),
      )
      setEstado('pronto')
    })().catch((erro) => {
      console.error('[arquipelago] não abriu', erro)
      if (vivo) setEstado('erro')
    })
    return () => {
      vivo = false
      pendente.current?.({ situacao: 'cancelado' })
      pendente.current = null
      montagem?.desmontar()
    }
  }, [publico, id, primeiroNome, voltarPara])

  return (
    // A moldura usa estilo próprio (não classes): o jogo ocupa a tela em qualquer app que hospede.
    <div style={{ position: 'fixed', inset: 0, background: '#0e1430' }}>
      <div ref={elemento} style={{ position: 'absolute', inset: 0 }} />
      {creation ? (
        <ToolLoadBoundary
          onCancel={() => {
            setCreation(null)
            const resolve = pendente.current
            pendente.current = null
            resolve?.({ situacao: 'indisponivel', motivo: 'em-breve' })
          }}
        >
          <Suspense
            fallback={
              <div
                className="absolute inset-0 grid place-items-center bg-background text-foreground"
                role="status"
              >
                Abrindo a ferramenta…
              </div>
            }
          >
            <CreationDialog
              ferramenta={creation.ferramenta}
              viewerId={id}
              audience={publico === 'kids' ? 'kids' : 'adult'}
              studioAvailable={creation.studioAvailable}
              narrationEnabled={props.narrationEnabled ?? false}
              toolAccess={creation.toolAccess}
              onFinish={(criacaoId) => {
                setCreation(null)
                const resolve = pendente.current
                pendente.current = null
                resolve?.(criacaoId ? { situacao: 'pronto', criacaoId } : { situacao: 'cancelado' })
              }}
            />
          </Suspense>
        </ToolLoadBoundary>
      ) : null}
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
