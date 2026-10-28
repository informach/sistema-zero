'use client'

import {
  type DesafioAberto,
  DesafioAbertoSchema,
  ManifestoDoClienteSchema,
  type ModuloDoArquipelago,
  MoldeDeDesafioSchema,
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
import type { ArquipelagoStudioConfig } from '../lib/arquipelago-studio'
import { sessionFetch } from '../lib/session-fetch'
import {
  AvisoDaFerramenta,
  type EstadoDaPorta,
  type FerramentaDaPorta,
  PortaDoArquipelago,
} from './arquipelago-porta'

const CreationDialog = lazy(() =>
  import('./arquipelago-creation-dialog').then((m) => ({ default: m.ArquipelagoCreationDialog })),
)
const DesafioDialog = lazy(() =>
  import('./arquipelago-desafio-dialog').then((m) => ({ default: m.ArquipelagoDesafioDialog })),
)

class ToolLoadBoundary extends Component<
  { children: ReactNode; ferramenta: FerramentaDaPorta; onCancel: () => void },
  { failed: boolean }
> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    if (!this.state.failed) return this.props.children
    return (
      <AvisoDaFerramenta ferramenta={this.props.ferramenta} falhou onVoltar={this.props.onCancel} />
    )
  }
}

/** O repasse do BFF (`routes/arquipelago.ts`). */
const BASE = '/api/arquipelago'
/** As únicas rotas do serviço que o jogo chama (o limite da família é da área dos pais). */
const CAMINHOS_DO_JOGO = new Set([
  '/acesso',
  '/salvamento',
  '/tempo/recuperar',
  '/tempo/sessao',
  '/cartas',
])
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
/**
 * Os desafios: a lista (com `?ilha=`), o desafio aberto e o prêmio visto. Conferir NÃO está aqui:
 * quem manda o projeto é o Estúdio de desafio da página, nunca o jogo.
 */
const DESAFIOS_DO_JOGO = new RegExp(
  `^/desafios(?:\\?ilha=[a-z][a-z-]{0,39}|/${UUID}(?:/recompensa-vista)?)?$`,
)

export function caminhoDoJogo(caminho: string): boolean {
  return CAMINHOS_DO_JOGO.has(caminho) || DESAFIOS_DO_JOGO.test(caminho)
}

type Estado = EstadoDaPorta | 'pronto'

/** O que está aberto por cima do jogo: uma ferramenta de criação ou o Estúdio de desafio. */
type PorCima =
  | {
      tipo: 'criacao'
      ferramenta: 'pinta' | 'molda' | 'estudio'
      studioAvailable: boolean
      toolAccess: MoldaToolAccess | null
      studioConfig: ArquipelagoStudioConfig | null
    }
  | { tipo: 'desafio'; desafio: DesafioAberto }

/**
 * O pedido do Estúdio de desafio: `estudio` com o propósito `desafio` e o molde do contrato.
 * Qualquer outro pedido com molde é desconhecido (`null`).
 */
export function lerPedidoDeDesafio(pedido: PedidoDeFerramenta) {
  if (pedido.ferramenta !== 'estudio' || pedido.proposito !== 'desafio') return null
  const molde = MoldeDeDesafioSchema.safeParse(pedido.molde)
  return molde.success ? molde.data : null
}

/** Por que o desafio não abriu, pela resposta do serviço (o jogo só mostra que não abriu). */
export function motivoDoDesafioFechado(status: number): string {
  if (status === 403) return 'acesso-necessario'
  if (status === 404) return 'desafio-mudou'
  return 'fora-do-ar'
}

export function pertenceAoPerfil(corpo: unknown, viewerId: string): boolean {
  return (
    !!corpo && typeof corpo === 'object' && (corpo as { viewerId?: unknown }).viewerId === viewerId
  )
}

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

function lerStudioConfig(value: unknown, viewerId: string): ArquipelagoStudioConfig | null {
  if (!value || typeof value !== 'object') return null
  const c = value as Record<string, unknown>
  const tier = c.tier && typeof c.tier === 'object' ? (c.tier as Record<string, unknown>) : null
  const strings = (x: unknown) => Array.isArray(x) && x.every((item) => typeof item === 'string')
  if (
    c.viewerId !== viewerId ||
    !tier ||
    tier.freeStudio !== true ||
    tier.hasPalette !== true ||
    typeof tier.level !== 'string' ||
    !strings(tier.allowedExtensions) ||
    !strings(tier.initialExtensions) ||
    !strings(tier.allowedModes) ||
    (tier.allowBlocks !== undefined && !strings(tier.allowBlocks)) ||
    typeof tier.pro !== 'boolean' ||
    typeof tier.bridge !== 'boolean' ||
    typeof tier.canCreateProProject !== 'boolean' ||
    typeof tier.canPromoteToPro !== 'boolean' ||
    tier.allowLevelReveal !== false ||
    ![
      'showExamples',
      'showPythonCreation',
      'pintaOwned',
      'moldaOwned',
      'zappyEnabled',
      'narrationEnabled',
      'voiceInputEnabled',
    ].every((key) => typeof c[key] === 'boolean') ||
    !(c.aiCredits === null || (c.aiCredits && typeof c.aiCredits === 'object'))
  )
    return null
  return c as unknown as ArquipelagoStudioConfig
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
        if (
          !caminhoDoJogo(caminho) ||
          ((caminho === '/tempo/sessao' || caminho === '/tempo/recuperar') &&
            opcoes.publico !== 'kids')
        )
          return { status: 404, corpo: { code: 'NOT_FOUND' } }
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
  const [creation, setCreation] = useState<PorCima | null>(null)
  const pendente = useRef<((resultado: ResultadoDeFerramenta) => void) | null>(null)
  const fechou = useRef(false)
  const abrindo = useRef(false)
  const { publico, voltarPara } = props
  const { id, primeiroNome } = props.perfil

  useEffect(() => {
    let vivo = true
    let montagem: MontagemDoArquipelago | null = null
    /**
     * O Estúdio de desafio: lê o desafio no serviço ANTES de cobrir o jogo (sem acesso, desafio
     * trocado ou serviço fora, nada abre). Abre a revisão publicada agora, que é a que o serviço
     * confere; o jogo relê a lista na volta.
     */
    const abrirDesafio = async (desafioId: string): Promise<ResultadoDeFerramenta> => {
      const lido = await json(`${BASE}/desafios/${desafioId}`)
      if (!vivo) return { situacao: 'cancelado' }
      const desafio = lido.status === 200 ? DesafioAbertoSchema.safeParse(lido.corpo) : null
      if (!desafio?.success || desafio.data.id !== desafioId)
        return { situacao: 'indisponivel', motivo: motivoDoDesafioFechado(lido.status) }
      return new Promise<ResultadoDeFerramenta>((resolve) => {
        pendente.current = resolve
        setCreation({ tipo: 'desafio', desafio: desafio.data })
      })
    }
    const abrirFerramenta = async (pedido: PedidoDeFerramenta): Promise<ResultadoDeFerramenta> => {
      const desafio = pedido.molde === undefined ? null : lerPedidoDeDesafio(pedido)
      if (pedido.molde !== undefined && !desafio)
        return { situacao: 'indisponivel', motivo: 'em-breve' }
      if (abrindo.current || pendente.current)
        return { situacao: 'indisponivel', motivo: 'ocupado' }
      if (desafio) {
        abrindo.current = true
        try {
          return await abrirDesafio(desafio.desafioId)
        } catch {
          return { situacao: 'indisponivel', motivo: 'fora-do-ar' }
        } finally {
          abrindo.current = false
        }
      }
      abrindo.current = true
      try {
        const acesso = await json(`${BASE}/ferramentas/${pedido.ferramenta}`)
        if (!vivo) return { situacao: 'cancelado' }
        const situacao = (acesso.corpo as { situacao?: string } | null)?.situacao
        if (acesso.status !== 200 || situacao !== 'disponivel')
          return {
            situacao: 'indisponivel',
            motivo: situacao === 'bloqueada' ? 'acesso-necessario' : 'em-breve',
          }
        if (!pertenceAoPerfil(acesso.corpo, id))
          return { situacao: 'indisponivel', motivo: 'em-breve' }
        const tools =
          pedido.ferramenta === 'molda'
            ? lerFerramentasMolda((acesso.corpo as { toolAccess?: unknown } | null)?.toolAccess)
            : { ok: true as const, access: null }
        if (!tools.ok) return { situacao: 'indisponivel', motivo: 'em-breve' }
        const studioConfig =
          pedido.ferramenta === 'estudio'
            ? lerStudioConfig((acesso.corpo as { studioConfig?: unknown } | null)?.studioConfig, id)
            : null
        if (pedido.ferramenta === 'estudio' && !studioConfig)
          return { situacao: 'indisponivel', motivo: 'em-breve' }
        return await new Promise<ResultadoDeFerramenta>((resolve) => {
          pendente.current = resolve
          setCreation({
            tipo: 'criacao',
            ferramenta: pedido.ferramenta,
            toolAccess: tools.access,
            studioConfig,
            studioAvailable:
              pedido.ferramenta === 'estudio' ||
              (acesso.corpo as { studioAvailable?: unknown } | null)?.studioAvailable === true,
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

  /** Fecha o que está por cima e devolve o resultado ao jogo. */
  function fechar(resultado: ResultadoDeFerramenta) {
    fechou.current = true
    setCreation(null)
    const resolve = pendente.current
    pendente.current = null
    resolve?.(resultado)
  }

  // Depois de fechar (já sem a camada e sem o jogo inerte): o foco volta para onde estava, e se
  // esse lugar sumiu vai para o jogo, que escuta o teclado.
  useEffect(() => {
    if (creation || !fechou.current) return
    fechou.current = false
    const ativo = document.activeElement
    if (!ativo || ativo === document.body) elemento.current?.focus({ preventScroll: true })
  }, [creation])

  const ferramentaPorCima: FerramentaDaPorta =
    creation?.tipo === 'criacao' ? creation.ferramenta : 'estudio'

  return (
    // A moldura usa estilo próprio (não classes): o jogo ocupa a tela em qualquer app que hospede.
    <div style={{ position: 'fixed', inset: 0, background: '#0e1430' }}>
      <div
        ref={elemento}
        tabIndex={-1}
        // Com algo por cima, o jogo pausado não recebe foco nem clique.
        inert={creation !== null}
        style={{ position: 'absolute', inset: 0, outline: 'none' }}
      />
      {creation ? (
        <ToolLoadBoundary
          ferramenta={ferramentaPorCima}
          // O Estúdio de desafio que quebra volta como "cancelado": a conferência pode ter
          // passado antes, e o jogo só relê a lista (e mostra a cor) quando a ferramenta abriu.
          onCancel={() =>
            fechar(
              creation.tipo === 'desafio'
                ? { situacao: 'cancelado' }
                : { situacao: 'indisponivel', motivo: 'em-breve' },
            )
          }
        >
          <Suspense fallback={<AvisoDaFerramenta ferramenta={ferramentaPorCima} falhou={false} />}>
            {creation.tipo === 'desafio' ? (
              <DesafioDialog
                desafio={creation.desafio}
                viewerId={id}
                onFinish={(cumprido) =>
                  fechar(
                    cumprido
                      ? { situacao: 'pronto', criacaoId: creation.desafio.id }
                      : { situacao: 'cancelado' },
                  )
                }
              />
            ) : (
              <CreationDialog
                ferramenta={creation.ferramenta}
                viewerId={id}
                audience={publico === 'kids' ? 'kids' : 'adult'}
                studioAvailable={creation.studioAvailable}
                narrationEnabled={props.narrationEnabled ?? false}
                toolAccess={creation.toolAccess}
                studioConfig={creation.studioConfig}
                onFinish={(criacaoId) =>
                  fechar(criacaoId ? { situacao: 'pronto', criacaoId } : { situacao: 'cancelado' })
                }
              />
            )}
          </Suspense>
        </ToolLoadBoundary>
      ) : null}
      {estado === 'pronto' ? null : (
        <PortaDoArquipelago estado={estado} publico={publico} voltarPara={voltarPara} />
      )}
    </div>
  )
}
