'use client'

import {
  type DesafioAberto,
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
import { challengeDraftScope, challengeForViewer } from '../lib/arquipelago-challenge'
import { lerPedidoDeObjeto, type PedidoDeObjeto } from '../lib/arquipelago-objeto'
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
const ChallengeDialog = lazy(() =>
  import('./arquipelago-challenge-dialog').then((m) => ({ default: m.ArquipelagoChallengeDialog })),
)
const MinijogoPlayer = lazy(() =>
  import('./arquipelago-minijogo-player').then((m) => ({ default: m.ArquipelagoMinijogoPlayer })),
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
  '/minijogos',
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
  const [challenge, setChallenge] = useState<DesafioAberto | null>(null)
  const [minijogo, setMinijogo] = useState<string | null>(null)
  const [creation, setCreation] = useState<{
    ferramenta: 'pinta' | 'molda' | 'estudio'
    studioAvailable: boolean
    toolAccess: MoldaToolAccess | null
    studioConfig: ArquipelagoStudioConfig | null
    /** Aparência de um objeto (projeto azul): o Pinta e o Molda abrem com o molde. */
    objeto: PedidoDeObjeto | null
  } | null>(null)
  const pendente = useRef<((resultado: ResultadoDeFerramenta) => void) | null>(null)
  const abrindo = useRef(false)
  const { publico, voltarPara } = props
  const { id, primeiroNome } = props.perfil

  useEffect(() => {
    let vivo = true
    let montagem: MontagemDoArquipelago | null = null
    const abrirFerramenta = async (pedido: PedidoDeFerramenta): Promise<ResultadoDeFerramenta> => {
      if (abrindo.current || pendente.current)
        return { situacao: 'indisponivel', motivo: 'ocupado' }
      abrindo.current = true
      try {
        if (pedido.ferramenta === 'estudio' && pedido.proposito === 'minijogo') {
          const idDoJogo = (pedido.molde as { desafioId?: unknown } | undefined)?.desafioId
          if (typeof idDoJogo !== 'string' || !new RegExp(`^${UUID}$`).test(idDoJogo))
            return { situacao: 'indisponivel', motivo: 'pedido-invalido' }
          return await new Promise<ResultadoDeFerramenta>((resolve) => {
            pendente.current = resolve
            setMinijogo(idDoJogo)
          })
        }
        // O molde de um objeto (o projeto azul do modo construção) abre o Pinta ou o Molda de
        // verdade com a planificação ou a caixa; o resto do caminho é o de criar no jogo.
        const objeto = lerPedidoDeObjeto(pedido)
        if (objeto && 'recusa' in objeto) return { situacao: 'indisponivel', motivo: objeto.recusa }
        if (!objeto && pedido.molde !== undefined) {
          const molde = MoldeDeDesafioSchema.safeParse(pedido.molde)
          if (!molde.success || pedido.ferramenta !== 'estudio' || pedido.proposito !== 'desafio')
            return { situacao: 'indisponivel', motivo: 'em-breve' }
          const resposta = await json(`${BASE}/desafios/${molde.data.desafioId}`)
          if (!vivo) return { situacao: 'cancelado' }
          if (resposta.status !== 200)
            return { situacao: 'indisponivel', motivo: 'acesso-necessario' }
          const desafio = challengeForViewer(resposta.corpo, id, molde.data)
          return await new Promise<ResultadoDeFerramenta>((resolve) => {
            pendente.current = resolve
            setChallenge(desafio)
          })
        }
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
            ferramenta: pedido.ferramenta,
            toolAccess: tools.access,
            studioConfig,
            objeto,
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
      setChallenge(null)
      setMinijogo(null)
      setCreation(null)
      pendente.current?.({ situacao: 'cancelado' })
      pendente.current = null
      montagem?.desmontar()
    }
  }, [publico, id, primeiroNome, voltarPara])

  return (
    // A moldura usa estilo próprio (não classes): o jogo ocupa a tela em qualquer app que hospede.
    <div style={{ position: 'fixed', inset: 0, background: '#0e1430' }}>
      <div ref={elemento} style={{ position: 'absolute', inset: 0 }} />
      {minijogo && (
        <ToolLoadBoundary
          ferramenta="estudio"
          onCancel={() => {
            setMinijogo(null)
            pendente.current?.({ situacao: 'cancelado' })
            pendente.current = null
          }}
        >
          <Suspense fallback={<AvisoDaFerramenta ferramenta="estudio" falhou={false} />}>
            <MinijogoPlayer
              url={`${BASE}/minijogos/${minijogo}`}
              onClose={() => {
                setMinijogo(null)
                pendente.current?.({ situacao: 'cancelado' })
                pendente.current = null
              }}
            />
          </Suspense>
        </ToolLoadBoundary>
      )}
      {challenge ? (
        <ToolLoadBoundary
          key={`${id}-${challenge.id}-${challenge.revisao}`}
          ferramenta="estudio"
          onCancel={() => {
            setChallenge(null)
            const resolve = pendente.current
            pendente.current = null
            resolve?.({ situacao: 'cancelado' })
          }}
        >
          <Suspense fallback={<AvisoDaFerramenta ferramenta="estudio" falhou={false} />}>
            <ChallengeDialog
              desafio={challenge}
              audience={publico === 'kids' ? 'kids' : 'adult'}
              onFinish={(completed) => {
                setChallenge(null)
                const resolve = pendente.current
                pendente.current = null
                const draft = challengeDraftScope(
                  publico === 'kids' ? 'kids' : 'adult',
                  id,
                  challenge.id,
                  challenge.revisao,
                )
                resolve?.(
                  completed
                    ? { situacao: 'pronto', criacaoId: draft.projectId }
                    : { situacao: 'cancelado' },
                )
              }}
            />
          </Suspense>
        </ToolLoadBoundary>
      ) : null}
      {creation ? (
        <ToolLoadBoundary
          ferramenta={creation.ferramenta}
          onCancel={() => {
            setCreation(null)
            const resolve = pendente.current
            pendente.current = null
            resolve?.({ situacao: 'indisponivel', motivo: 'em-breve' })
          }}
        >
          <Suspense
            fallback={<AvisoDaFerramenta ferramenta={creation.ferramenta} falhou={false} />}
          >
            <CreationDialog
              ferramenta={creation.ferramenta}
              viewerId={id}
              audience={publico === 'kids' ? 'kids' : 'adult'}
              studioAvailable={creation.studioAvailable}
              narrationEnabled={props.narrationEnabled ?? false}
              toolAccess={creation.toolAccess}
              studioConfig={creation.studioConfig}
              objeto={creation.objeto}
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
        <PortaDoArquipelago estado={estado} publico={publico} voltarPara={voltarPara} />
      )}
    </div>
  )
}
