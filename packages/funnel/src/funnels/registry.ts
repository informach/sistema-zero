// Registry de funis — FONTE DA VERDADE de quais funis existem, sob qual caminho,
// vendendo qual oferta, com qual conteúdo. Adicionar um produto = criar um módulo
// (ex.: `comunidade-adulto/`) e registrá-lo aqui; as rotas `[audience]/[produto]/*`
// e a resolução de oferta no checkout passam a funcionar sem mais nenhuma mudança.
//
// IMPORTANTE: este módulo é client-safe-ish (sem env/segredos/IO). É importado por
// páginas .astro (SSR) e rotas /api. NUNCA importe-o de uma ilha React — passe os
// dados que a ilha precisa por props (ver invariante 2 do CLAUDE.md).

import type { ZodType } from 'zod'
import type { HeroVariacao } from '../content/hero-perfil'
import type { LegalDoc } from '../content/legal'
import type { QuizStep } from '../content/quiz-config'
import type { ResultProfile } from '../content/result-profiles'
import type { ResultadoConversa } from '../content/resultado-conversa'
import type { QuizAnswers, QuizAnswerValue } from '../lib/quiz-types'

export type { QuizAnswers } from '../lib/quiz-types'

import { COMUNIDADE_ADULTO } from './comunidade-adulto'
import { COMUNIDADE_DOS_CRIADORES } from './comunidade-dos-criadores'
import { DESAFIO_ADULTO } from './desafio-adulto'
import { DESAFIO_PRIMEIRO_JOGO } from './desafio-primeiro-jogo'

export type Audience = 'pro' | 'kids'
export const AUDIENCES = ['pro', 'kids'] as const

export interface FunnelCopy {
  nome: string
  precoLabel: string
  /**
   * Gênero gramatical do nome do produto p/ frases montadas ("acesso AO Desafio"
   * × "acesso À Comunidade"). Ausente → 'o' (compat com os funis existentes).
   */
  artigo?: 'o' | 'a'
}
export interface FunnelLanding {
  /** Selo acima do título; ausente preserva o rótulo genérico. */
  badge?: string
  h1: string
  subtitulo: string
  tempo: string
}
export interface FunnelQuiz {
  version?: string
  presentation?: 'comunidade' | 'comunidade-adulto' | 'desafio-kids' | 'desafio-adulto'
  steps: QuizStep[]
  total: number
  /** Validação do valor por chave (server-side). Chaves fora daqui são rejeitadas. */
  valueSchema: Record<string, ZodType>
  /** Deriva chaves calculadas (ex.: custo_mensal) a partir das respostas. Opcional. */
  derive?: (answers: QuizAnswers) => QuizAnswers
  /** Calcula o perfil/diagnóstico (string) a partir das respostas. Opcional (quiz sem perfil). */
  computePerfil?: (answers: QuizAnswers) => string | null
  /** Conditional journeys validate and reduce their own active branches. */
  activeSteps?: (answers: QuizAnswers) => QuizStep[]
  applyAnswer?: (answers: QuizAnswers, key: string, value: QuizAnswerValue) => QuizAnswers | null
  isComplete?: (answers: QuizAnswers) => boolean
  /**
   * Variantes da manchete da entrada (teste A/B): id → rótulo do /admin. A ilha grava a variante
   * exibida em `attribution.quizHeadline`, e Performance/Perfis filtram por ela.
   */
  headlines?: Record<string, string>
  /** A manchete padrão do teste A/B: no /admin ela conta também os leads sem registro. */
  defaultHeadline?: string
  /** Perguntas de versões anteriores, só para o /admin rotular respostas de leads antigos. */
  legacySteps?: QuizStep[]
  /**
   * Ramos do quiz (id → rótulo do /admin), na ordem em que o /admin os mostra. As perguntas de um
   * ramo levam o mesmo id em `ramo`. Um ramo sem perguntas é uma saída (ex.: "18 ou mais").
   */
  branches?: Record<string, string>
  /**
   * O ramo que as respostas abrem (id de `branches`), ou null antes da escolha. Ao entrar num
   * ramo, o servidor grava o evento `entrou_ramo_<id>`, a primeira etapa do ramo no /admin.
   */
  branchOf?: (answers: QuizAnswers) => string | null
  /**
   * O resultado em conversa (Comunidade e Desafio, Kids e adulto): a carta montada pelas respostas, ou null
   * quando o quiz não tem resultado para elas. A /resultado desenha com `ResultadoConversa`.
   */
  conversa?: (answers: QuizAnswers) => ResultadoConversa | null
}

/** Evento de servidor gravado quando o lead entra num ramo do quiz (etapa do /admin). */
export const branchEventName = (branch: string): string => `entrou_ramo_${branch}`

/** A manchete pedida na URL (`?manchete=`), se o quiz a declara; senão, a padrão. */
export function quizHeadlineId(
  quiz: FunnelQuiz | undefined,
  param: string | null | undefined,
): string | undefined {
  if (param && Object.hasOwn(quiz?.headlines ?? {}, param)) return param
  return quiz?.defaultHeadline
}

/** O endereço do quiz que mantém a manchete que a pessoa viu (o padrão não leva parâmetro). */
export function quizPathWithHeadline(
  basePath: string,
  quiz: FunnelQuiz | undefined,
  headline: string | null | undefined,
): string {
  const id = quizHeadlineId(quiz, headline)
  return id && id !== quiz?.defaultHeadline
    ? `${basePath}/quiz?manchete=${encodeURIComponent(id)}`
    : `${basePath}/quiz`
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
  /** Bloco em realce acima do fecho (ex.: espelho do desejo). Marcadores resolvidos pelo renderCorpo. Opcional. */
  destaque?: string
  /** Rótulos legíveis por perfil (aba Perfis do /admin). */
  perfilLabels: Record<string, string>
  /**
   * Perfis de versões anteriores do quiz: a aba Perfis os mostra só quando há leads com eles,
   * com o prefixo "(quiz anterior)".
   */
  legacyPerfilLabels?: Record<string, string>
  /** Renderiza o corpo do perfil resolvendo marcadores com as respostas. Opcional. */
  renderCorpo?: (corpo: string, answers: QuizAnswers) => string
}
export interface FunnelObrigadoPasso {
  titulo: string
  texto: string
}
export interface FunnelObrigado {
  /**
   * Frase de abertura da confirmação (antes de "O seu acesso ao <produto>…"). Ausente →
   * "Obrigado pela compra.". Cada funil pode declarar sua própria abertura.
   */
  intro?: string
  /** Título da confirmação aprovada. Ausente → "Pagamento confirmado!". */
  titulo?: string
  /**
   * Frase depois da `intro` na confirmação aprovada. Ausente → "O seu acesso ao <produto> está a
   * caminho do seu e-mail."
   */
  acesso?: string
  /** Título da lista de passos. Ausente → "Como acessar". */
  passosTitulo?: string
  /** Rótulo do botão para a área de membros. Ausente → "Ir para a área de membros →". */
  botao?: string
  entrega: string[]
  passos: FunnelObrigadoPasso[]
}
/** Abertura do checkout acima do card do produto (o título vira o h1 da página). */
export interface FunnelCheckoutIntro {
  titulo: string
  paragrafos: string[]
}

export interface FunnelContent {
  copy: FunnelCopy
  landing: FunnelLanding
  /** Conteúdo da /obrigado. */
  obrigado: FunnelObrigado
  /** Abertura do checkout (opcional: sem ela, o card do produto é o h1 da página). */
  checkout?: FunnelCheckoutIntro
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

/** Política de acesso prometida pela copy e que a oferta configurada deve cumprir. */
export interface FunnelOfferContract {
  pricingMode: 'one_time' | 'subscription'
  accessMode: 'lifetime' | 'fixed' | 'billing_cycle'
  accessDurationValue: number | null
  accessDurationUnit: 'days' | 'months' | null
  /** Condição legal repetida pela copy; `null` quando o funil não promete garantia. */
  guaranteeDays: number | null
}

/** O Termo de Uso da oferta do funil (um por oferta) e a versão gravada em cada compra. */
export interface FunnelLegal {
  termos: LegalDoc
  /**
   * Versão aceita no checkout, congelada no snapshot da compra (`termsVersion`). Mudou o texto do
   * Termo? Suba a versão (ex.: a data), senão uma compra nova grava a versão antiga.
   */
  termsVersion: string
}

export interface FunnelDef {
  audience: Audience
  /** Slug do produto (kebab-case), 2º segmento da URL. */
  produto: string
  /** Chave composta do registry e gravada no lead: `${audience}/${produto}`. */
  key: string
  /** Prefixo de URL do funil: `/${audience}/${produto}`. */
  basePath: string
  // ⚠️ A oferta principal do funil NÃO vive mais no código: vem da env
  // `FUNNEL_OFFER_<KEY>` (obrigatória, fail-fast — ver `lib/env.ts`/`server/offer.ts`),
  // resolvida por `resolveOfferSlug(env, key)`. Trocar de oferta/campanha = só mudar a env.
  productName: string
  /**
   * Nome da cobrança da oferta PRINCIPAL (descrição do pagamento e da assinatura), quando difere do
   * nome exibido. A Comunidade adulta cobra como "Comunidade dos Criadores (adultos)", o mesmo nome
   * da oferta irmã no catálogo: é por ele que Compras e a área dos pais separam adulto de Kids.
   */
  chargeName?: string
  productSku: string
  /** Prefixo das imagens do funil em /public (ex.: `/img/comunidade-adulto`). */
  imagesBase: string
  /**
   * Imagem do produto no card do CHECKOUT (arquivo dentro de `imagesBase`). Ausente →
   * `produto-capa.webp`. Funis sem capa dedicada apontam p/ a arte do
   * hero (ex.: o Desafio usa `hero-desafio.webp`).
   */
  checkoutImage?: string
  /** Assinatura exibida no checkout (ex.: "Helena e Júlio · Sistema Zero"). */
  byline: string
  /** `<title>` da página de vendas (indexável) — por funil, para SEO. */
  seoTitle: string
  /** `<meta description>` da página de vendas — por funil, para SEO. */
  seoDescription: string
  /** Tema visual (ex.: `'kids'`) → `htmlClass="theme-kids"` no BaseLayout. Ausente: tema base. */
  theme?: string
  /** Oferta com acesso vitalício → exibe o disclaimer "vitalício = enquanto a empresa existir". */
  lifetimeAccess?: boolean
  /**
   * Use quando a copy contém uma promessa rígida de acesso. Página e cobrança falham fechadas se
   * a env apontar para uma oferta com contrato diferente.
   */
  offerContract?: FunnelOfferContract
  steps: FunnelSteps
  /** Termo de Uso da oferta, em `${basePath}/termos`. A Política de Privacidade é única. */
  legal: FunnelLegal
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
  // A landing /pro abre a Comunidade adulta, primeiro funil deste público.
  [COMUNIDADE_ADULTO.key]: COMUNIDADE_ADULTO,
  // O Desafio adulto entra depois: `/pro` segue na Comunidade. A env
  // `FUNNEL_OFFER_PRO_DESAFIO_PRIMEIRO_JOGO` existe no Railway de staging e de produção.
  [DESAFIO_ADULTO.key]: DESAFIO_ADULTO,
  [DESAFIO_PRIMEIRO_JOGO.key]: DESAFIO_PRIMEIRO_JOGO,
  // DEPOIS do Desafio: a landing /kids redireciona ao PRIMEIRO funil kids do map
  // ([audience]/index.astro) — a ordem preserva o destino atual do tráfego.
  [COMUNIDADE_DOS_CRIADORES.key]: COMUNIDADE_DOS_CRIADORES,
}

/** Chaves válidas de funil (p/ validar `{ funnel }` recebido do cliente em /api/leads). */
export const FUNNEL_KEYS = Object.keys(FUNNELS) as [string, ...string[]]

/** Funil de entrada do site (fallback de `/` e dos leads legados sem `funnel`). */
export const DEFAULT_FUNNEL: FunnelDef = COMUNIDADE_ADULTO

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

/** Resolve um funil pela chave composta gravada no lead (`pro/comunidade-dos-criadores`). */
export function getFunnelByKey(key: string | null | undefined): FunnelDef | null {
  if (!key) return null
  return FUNNELS[key] ?? null
}

/**
 * True para os dois funis do Desafio do Primeiro Jogo (Kids e adulto): a mesma oferta de 30 dias,
 * com a capa do checkout, a /obrigado que informa a data final e o e-mail com a data
 * (`challenge-access-approved` no Kids, `challenge-access-approved-adult` no adulto; ver
 * `welcome-email.ts`).
 */
export function isDesafioFunnel(key: string | null | undefined): boolean {
  return key === DESAFIO_PRIMEIRO_JOGO.key || key === DESAFIO_ADULTO.key
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
  /** Alternativas fechadas, para mostrar seleções múltiplas sem códigos internos. */
  answerOptions?: Record<string, Record<string, string>>
  /** Rótulo por perfil — p/ a aba Perfis. */
  perfilLabels: Record<string, string>
  /** Quiz versionado: filtros "só o quiz atual" e "manchete" de Performance/Perfis. */
  quiz?: {
    version: string
    headlines: { id: string; label: string }[]
    /** Ramos do quiz, na ordem do funil (Performance encadeia cada um à parte). */
    branches?: { id: string; label: string }[]
  }
}

/** Prefixo das respostas de versões anteriores do quiz (`legacySteps`) no /admin. */
export const LEGACY_ANSWER_PREFIX = '(quiz anterior) '

/** Rótulo (pergunta/campo) por chave de resposta do quiz de um funil. */
function quizAnswerLabels(f: FunnelDef): Record<string, string> {
  const labels: Record<string, string> = {}
  const quiz = f.content.quiz
  const current = new Set((quiz?.steps ?? []).map((s) => s.key))
  for (const step of quiz?.legacySteps ?? [])
    if (!current.has(step.key)) labels[step.key] = `${LEGACY_ANSWER_PREFIX}${step.titulo}`
  for (const step of quiz?.steps ?? []) {
    if (step.tipo === 'calculadora' || step.tipo === 'calculadora_prefilled') {
      labels[step.campo1.key] = step.campo1.label
      labels[step.campo2.key] = step.campo2.label
      labels[step.resultadoKey] = step.titulo
    } else {
      // A pergunta de um ramo leva o nome do ramo: "Menor de 9 · Ela já lê?".
      const branch = step.ramo ? quiz?.branches?.[step.ramo] : undefined
      labels[step.key] = branch ? `${branch} · ${step.titulo}` : step.titulo
    }
  }
  return labels
}

/**
 * Opções fechadas por chave, para mostrar respostas sem códigos internos. Numa chave que existe
 * em mais de uma versão, os mapas se somam e, no mesmo valor, vale o rótulo de hoje: a resposta
 * antiga com um valor que saiu continua legível.
 */
function quizAnswerOptions(f: FunnelDef): Record<string, Record<string, string>> {
  const options: Record<string, Record<string, string>> = {}
  for (const step of [...(f.content.quiz?.legacySteps ?? []), ...(f.content.quiz?.steps ?? [])])
    if (step.tipo === 'selecao')
      options[step.key] = {
        ...options[step.key],
        ...Object.fromEntries(step.opcoes.map((o) => [o.value, o.label])),
      }
  return options
}

/** Lista dos funis p/ o seletor do /admin + rótulos por funil (respostas/perfis). */
export function adminFunnelList(): AdminFunnelInfo[] {
  return Object.values(FUNNELS).map((f) => ({
    key: f.key,
    label: `${AUDIENCE_LABEL[f.audience]} · ${f.productName}`,
    answerLabels: quizAnswerLabels(f),
    answerOptions: quizAnswerOptions(f),
    perfilLabels: {
      ...Object.fromEntries(
        Object.entries(f.content.result?.legacyPerfilLabels ?? {}).map(([id, label]) => [
          id,
          `${LEGACY_ANSWER_PREFIX}${label}`,
        ]),
      ),
      ...(f.content.result?.perfilLabels ?? {}),
    },
    quiz: f.content.quiz?.version
      ? {
          version: f.content.quiz.version,
          headlines: Object.entries(f.content.quiz.headlines ?? {}).map(([id, label]) => ({
            id,
            label,
          })),
          ...(f.content.quiz.branches
            ? {
                branches: Object.entries(f.content.quiz.branches).map(([id, label]) => ({
                  id,
                  label,
                })),
              }
            : {}),
        }
      : undefined,
  }))
}

/** True quando todas as respostas exigidas pelos passos do quiz já existem. */
export function isQuizComplete(quiz: FunnelQuiz, answers: QuizAnswers): boolean {
  if (quiz.isComplete) return quiz.isComplete(answers)
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
