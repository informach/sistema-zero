// Registry de funis — FONTE DA VERDADE de quais funis existem, sob qual caminho,
// vendendo qual oferta, com qual conteúdo. Adicionar um produto = criar um módulo
// (ex.: `no-comando-da-ia/`) e registrá-lo aqui; as rotas `[audience]/[produto]/*`
// e a resolução de oferta no checkout passam a funcionar sem mais nenhuma mudança.
//
// IMPORTANTE: este módulo é client-safe-ish (sem env/segredos/IO). É importado por
// páginas .astro (SSR) e rotas /api. NUNCA importe-o de uma ilha React — passe os
// dados que a ilha precisa por props (ver invariante 2 do CLAUDE.md).

import type { ZodType } from 'zod'
import type { HeroVariacao } from '../content/hero-perfil'
import type { QuizStep } from '../content/quiz-config'
import type { ResultProfile } from '../content/result-profiles'
import type { SalesSections } from '../content/sales-sections'
import { DESAFIO_PRIMEIRO_JOGO } from './desafio-primeiro-jogo'
import { NO_COMANDO_DA_IA } from './no-comando-da-ia'

export type Audience = 'pro' | 'kids'
export const AUDIENCES = ['pro', 'kids'] as const

/** Respostas do quiz (chave snake_case → valor). Genérico — cada funil define suas chaves. */
export type QuizAnswers = Record<string, string | number>

export interface FunnelCopy {
  nome: string
  precoLabel: string
}
export interface FunnelLanding {
  h1: string
  subtitulo: string
  tempo: string
}
export interface FunnelQuiz {
  steps: QuizStep[]
  total: number
  /** Validação do valor por chave (server-side). Chaves fora daqui são rejeitadas. */
  valueSchema: Record<string, ZodType>
  /** Deriva chaves calculadas (ex.: custo_mensal) a partir das respostas. Opcional. */
  derive?: (answers: QuizAnswers) => QuizAnswers
  /** Calcula o perfil/diagnóstico (string) a partir das respostas. Opcional (quiz sem perfil). */
  computePerfil?: (answers: QuizAnswers) => string
}
export interface FunnelHero {
  padrao: HeroVariacao
  paragrafoComum: string
  /** Variação do hero por perfil (chaves = perfis do funil). */
  porPerfil: Record<string, HeroVariacao>
}
export interface FunnelResult {
  /** Diagnóstico por perfil (chaves = perfis do funil). */
  profiles: Record<string, ResultProfile>
  fecho: string
  /** Rótulos legíveis por perfil (aba Perfis do /admin). */
  perfilLabels: Record<string, string>
  /** Renderiza o corpo do perfil resolvendo marcadores com as respostas. Opcional. */
  renderCorpo?: (corpo: string, answers: QuizAnswers) => string
}
export interface FunnelObrigadoPasso {
  titulo: string
  texto: string
}
export interface FunnelObrigado {
  entrega: string[]
  passos: FunnelObrigadoPasso[]
}

export interface FunnelContent {
  copy: FunnelCopy
  landing: FunnelLanding
  /** Conteúdo da página de vendas no template padrão (/oferta). Opcional: funis com
   *  layout de oferta PRÓPRIO (ex.: o Desafio) trazem a cópia no seu próprio body. */
  sales?: SalesSections
  /** Conteúdo da /obrigado. */
  obrigado: FunnelObrigado
  /** Quiz (opcional — funil sem quiz entra direto na oferta). */
  quiz?: FunnelQuiz
  /** Hero da oferta por perfil (só faz sentido com quiz). */
  hero?: FunnelHero
  /** Diagnóstico por perfil (só faz sentido com quiz). */
  result?: FunnelResult
}

/** Passos opcionais do funil (oferta/checkout/obrigado são sempre obrigatórios). */
export interface FunnelSteps {
  quiz: boolean
  resultado: boolean
  upsell: boolean
  downsell: boolean
}

/** Oferta secundária (upsell/downsell): liga um passo opcional a uma oferta do catálogo. */
export interface FunnelExtraOffer {
  catalogOfferSlug: string
  productName: string
  productSku: string
}

export interface FunnelDef {
  audience: Audience
  /** Slug do produto (kebab-case), 2º segmento da URL. */
  produto: string
  /** Chave composta do registry e gravada no lead: `${audience}/${produto}`. */
  key: string
  /** Prefixo de URL do funil: `/${audience}/${produto}`. */
  basePath: string
  /** Oferta principal no catálogo (preço autoritativo vem da cotação dela). */
  catalogOfferSlug: string
  productName: string
  productSku: string
  /** Prefixo das imagens do funil em /public (ex.: `/img/no-comando-da-ia`). */
  imagesBase: string
  /** Assinatura exibida no checkout (ex.: "Helena e Júlio · Sistema Zero"). */
  byline: string
  /** `<title>` da página de vendas (indexável) — por funil, para SEO. */
  seoTitle: string
  /** `<meta description>` da página de vendas — por funil, para SEO. */
  seoDescription: string
  /** Tema visual (ex.: `'kids'`) → `htmlClass="theme-kids"` no BaseLayout. Default: tema do NCI. */
  theme?: string
  steps: FunnelSteps
  content: FunnelContent
  /** Oferta de upsell (pós-compra), quando `steps.upsell`. */
  upsell?: FunnelExtraOffer
  /** Oferta de downsell (recusou o upsell), quando `steps.downsell`. */
  downsell?: FunnelExtraOffer
}

/** Chave composta usada no map e gravada em `leads.funnel`. */
export function funnelKey(audience: string, produto: string): string {
  return `${audience}/${produto}`
}

/**
 * Todos os funis. A chave do map é `funnelKey(audience, produto)`. Para criar um
 * novo produto, importe seu módulo e adicione aqui — nada mais precisa mudar.
 */
export const FUNNELS: Record<string, FunnelDef> = {
  [NO_COMANDO_DA_IA.key]: NO_COMANDO_DA_IA,
  [DESAFIO_PRIMEIRO_JOGO.key]: DESAFIO_PRIMEIRO_JOGO,
}

/** Chaves válidas de funil (p/ validar `{ funnel }` recebido do cliente em /api/leads). */
export const FUNNEL_KEYS = Object.keys(FUNNELS) as [string, ...string[]]

/** Funil de entrada do site (fallback de `/` e dos leads legados sem `funnel`). */
export const DEFAULT_FUNNEL: FunnelDef = NO_COMANDO_DA_IA

function isAudience(value: unknown): value is Audience {
  return value === 'pro' || value === 'kids'
}

/** Resolve um funil pelos params da URL (`/[audience]/[produto]/…`). Null se não existir. */
export function getFunnel(
  audience: string | undefined,
  produto: string | undefined,
): FunnelDef | null {
  if (!isAudience(audience) || !produto) return null
  return FUNNELS[funnelKey(audience, produto)] ?? null
}

/** Resolve um funil pela chave composta gravada no lead (`pro/no-comando-da-ia`). */
export function getFunnelByKey(key: string | null | undefined): FunnelDef | null {
  if (!key) return null
  return FUNNELS[key] ?? null
}

/** True se `value` é uma chave de funil conhecida (validação de entrada do cliente). */
export function isFunnelKey(value: unknown): value is string {
  return typeof value === 'string' && Object.hasOwn(FUNNELS, value)
}

const AUDIENCE_LABEL: Record<Audience, string> = { pro: 'Pro', kids: 'Kids' }

/** Metadados de um funil para a UI do /admin (dropdown + rótulos de respostas/perfis). */
export interface AdminFunnelInfo {
  key: string
  label: string
  /** Rótulo (pergunta) por chave de resposta do quiz — p/ exibir as respostas. */
  answerLabels: Record<string, string>
  /** Rótulo por perfil — p/ a aba Perfis. */
  perfilLabels: Record<string, string>
}

/** Rótulo (pergunta/campo) por chave de resposta do quiz de um funil. */
function quizAnswerLabels(f: FunnelDef): Record<string, string> {
  const labels: Record<string, string> = {}
  for (const step of f.content.quiz?.steps ?? []) {
    if (step.tipo === 'calculadora' || step.tipo === 'calculadora_prefilled') {
      labels[step.campo1.key] = step.campo1.label
      labels[step.campo2.key] = step.campo2.label
      labels[step.resultadoKey] = step.titulo
    } else {
      labels[step.key] = step.titulo
    }
  }
  return labels
}

/** Lista dos funis p/ o seletor do /admin + rótulos por funil (respostas/perfis). */
export function adminFunnelList(): AdminFunnelInfo[] {
  return Object.values(FUNNELS).map((f) => ({
    key: f.key,
    label: `${AUDIENCE_LABEL[f.audience]} · ${f.productName}`,
    answerLabels: quizAnswerLabels(f),
    perfilLabels: f.content.result?.perfilLabels ?? {},
  }))
}

/** True quando todas as respostas exigidas pelos passos do quiz já existem. */
export function isQuizComplete(quiz: FunnelQuiz, answers: QuizAnswers): boolean {
  return quiz.steps.every((step) => {
    if (step.tipo === 'calculadora' || step.tipo === 'calculadora_prefilled') {
      return (
        answers[step.campo1.key] != null &&
        answers[step.campo2.key] != null &&
        answers[step.resultadoKey] != null
      )
    }
    // input_numero/slider/sim_nao/multipla_escolha têm chave única.
    return answers[step.key] != null
  })
}
