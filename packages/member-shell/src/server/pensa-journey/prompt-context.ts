import 'server-only'
import type { ServerBlockCatalogEntry } from '@sistemazero/studio/server-catalog'
import { expandedTerms, scoreTokens, searchTerms, tokenizeSearchable } from '../zappy-search'
import type { JourneyContext } from './context'
import { STUDIO_AREA_NAMES } from './interface-map'
import { privateJourneyInput } from './privacy'
import { journeyRecipes } from './recipes'

/**
 * O que vai ao modelo, e dentro de qual teto (full review de 14/10/2026).
 *
 * Medido antes: a criança com todo o Jogo 2D mandava ~330 KB por chamada (~95 mil tokens: todos os
 * 641 blocos com entradas e encaixes, os manuais inteiros, as fontes inteiras e o contexto
 * serializado DUAS vezes, como texto dentro do JSON); a equipe, com as cinco extensões, ~844 KB. O
 * tutor do Estúdio vive com 48 KB, e este é o mesmo teto, para o pedido INTEIRO (sistema +
 * usuário). O que entra:
 * - os blocos que a missão já usa, SEMPRE (o guia precisa dos nomes deles) e, no que sobra, os
 *   mais próximos da ideia ou da missão, pela mesma busca do tutor (`zappy-search.ts`);
 * - os trechos dos manuais mais próximos, nunca o manual inteiro;
 * - poucas fontes, curtas; o inventário com teto; a conversa e as ideias guardadas recentes.
 * Se passar do teto, a escada encolhe na ordem da tabela abaixo. ⚠️ O orçamento é contrato: o
 * teste `pensa-journey-budget.test.ts` reprova quem passar, inclusive no caso da equipe.
 */
export const JOURNEY_PROMPT_BUDGET_BYTES = 48_000

export interface JourneyPromptLimits {
  /** Blocos escolhidos pela busca, ALÉM dos que a missão já usa. */
  blocks: number
  /** Com entradas e encaixe; sem, só id, nome e caminho na paleta. */
  blockDetail: boolean
  manualChunks: number
  sources: number
  sourceChars: number
  recipes: number
  creations: number
  messages: number
  messageChars: number
  backlog: number
  backlogChars: number
  /** Resultados já construídos (jogo em incremento). */
  built: number
  palette: boolean
}

export const JOURNEY_PROMPT_LADDER: readonly JourneyPromptLimits[] = [
  {
    blocks: 60,
    blockDetail: true,
    manualChunks: 6,
    sources: 5,
    sourceChars: 1_200,
    recipes: 3,
    creations: 20,
    messages: 8,
    messageChars: 600,
    backlog: 12,
    backlogChars: 200,
    built: 10,
    palette: true,
  },
  {
    blocks: 40,
    blockDetail: true,
    manualChunks: 4,
    sources: 3,
    sourceChars: 900,
    recipes: 2,
    creations: 12,
    messages: 6,
    messageChars: 500,
    backlog: 8,
    backlogChars: 160,
    built: 8,
    palette: true,
  },
  {
    blocks: 24,
    blockDetail: false,
    manualChunks: 2,
    sources: 2,
    sourceChars: 600,
    recipes: 1,
    creations: 8,
    messages: 4,
    messageChars: 400,
    backlog: 4,
    backlogChars: 120,
    built: 5,
    palette: false,
  },
  {
    blocks: 0,
    blockDetail: false,
    manualChunks: 0,
    sources: 0,
    sourceChars: 0,
    recipes: 0,
    creations: 4,
    messages: 3,
    messageChars: 300,
    backlog: 0,
    backlogChars: 0,
    built: 3,
    palette: false,
  },
]

export class JourneyPromptTooLarge extends Error {
  /** Bytes de cada campo do pedido no último degrau: só números, para o log dizer QUEM estourou. */
  constructor(readonly sizes: Record<string, number>) {
    super('PENSA_PROMPT_TOO_LARGE')
    this.name = 'JourneyPromptTooLarge'
  }
}

export function utf8Bytes(value: string): number {
  return new TextEncoder().encode(value).byteLength
}

/** Os `count` mais recentes. ⚠️ `slice(-0)` devolve a lista INTEIRA, e o degrau zero era ignorado. */
export function latest<T>(items: readonly T[], count: number): T[] {
  return count > 0 ? items.slice(-count) : []
}

/** Corte por CARACTERE: um emoji partido vira lixo no prompt. */
export function clip(value: string | null | undefined, max: number): string {
  const chars = Array.from(value ?? '')
  return chars.length > max ? `${chars.slice(0, max).join('')}…` : chars.join('')
}

const BLOCK_TOKENS = new WeakMap<ServerBlockCatalogEntry, ReturnType<typeof tokensOf>>()
function tokensOf(entry: ServerBlockCatalogEntry) {
  return {
    label: tokenizeSearchable(entry.label),
    type: tokenizeSearchable(entry.type),
    tooltip: tokenizeSearchable(entry.tooltip ?? ''),
    category: tokenizeSearchable(`${entry.category} ${entry.subcategory} ${entry.area}`),
  }
}
function blockTokens(entry: ServerBlockCatalogEntry) {
  let tokens = BLOCK_TOKENS.get(entry)
  if (!tokens) {
    tokens = tokensOf(entry)
    BLOCK_TOKENS.set(entry, tokens)
  }
  return tokens
}

/** Os blocos pela proximidade com o foco (mesmos pesos do tutor do Estúdio). */
export function rankJourneyBlocks(
  blocks: readonly ServerBlockCatalogEntry[],
  focus: string,
): ServerBlockCatalogEntry[] {
  const terms = expandedTerms(searchTerms(focus))
  return blocks
    .map((entry, index) => {
      const tokens = blockTokens(entry)
      const text =
        120 * scoreTokens(terms, tokens.label) +
        80 * scoreTokens(terms, tokens.type) +
        40 * scoreTokens(terms, tokens.tooltip) +
        15 * scoreTokens(terms, tokens.category)
      // Sem palavra em comum, o começo de cada área (montar o palco, eventos) vem primeiro.
      const base = entry.area === 'start' || entry.area === 'events' ? 2 : 0
      return { entry, index, score: text * 100 + base }
    })
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ entry }) => entry)
}

/**
 * Um bloco como o modelo precisa dele. `area` é o nome da área em que ele encaixa direto (como a
 * criança a vê na paleta); `tip`, a dica do próprio bloco, só nos blocos que a missão USA: é ela
 * que diz quando um comando vai dentro de "A cada quadro do jogo" (o guia precisa disso para dizer
 * o gesto exato, 15/10/2026).
 */
function blockForModel(entry: ServerBlockCatalogEntry, detail: boolean, tip = false) {
  const area = STUDIO_AREA_NAMES[entry.area]
  return {
    id: entry.type,
    label: entry.label,
    // O caminho na paleta já começa pela família ("🎮 Jogo 2D › …"): a extensão vai junto.
    path: entry.palettePath.join(' › '),
    // Área e dica só nos degraus com detalhe: no degrau apertado, o guia de oito missões cabe.
    ...(detail && area ? { area } : {}),
    ...(tip && entry.tooltip ? { tip: clip(entry.tooltip, 140) } : {}),
    ...(detail && entry.extension ? { extension: entry.extension } : {}),
    ...(detail && entry.inputs.length ? { inputs: entry.inputs.slice(0, 8) } : {}),
    ...(detail && entry.placement
      ? { placement: { role: entry.placement.role, root: entry.placement.root } }
      : {}),
  }
}

const MANUAL_CHUNK_CHARS = 1_400

function manualChunks(content: string): string[] {
  const chunks: string[] = []
  let rest = content.replace(/\s+/g, ' ').trim()
  while (rest) {
    if (rest.length <= MANUAL_CHUNK_CHARS) {
      chunks.push(rest)
      break
    }
    const boundary = rest.lastIndexOf(' ', MANUAL_CHUNK_CHARS)
    const end = boundary > MANUAL_CHUNK_CHARS / 2 ? boundary : MANUAL_CHUNK_CHARS
    chunks.push(rest.slice(0, end).trim())
    rest = rest.slice(end).trim()
  }
  return chunks
}

/**
 * O contexto do perfil para UMA chamada, no tamanho do degrau. `focus` é o texto que decide o que é
 * relevante (a ideia, as missões, o pedido de ajuda); `includeBlockIds` são os blocos que o plano já
 * usa e precisam ir sempre. `tips` leva a dica de cada um desses blocos (o guia precisa dela para
 * dizer o gesto); só nos degraus com detalhe, para o guia de oito missões ainda caber no teto.
 */
export function journeyModelContext(
  context: JourneyContext,
  input: { focus: string; includeBlockIds?: readonly string[]; tips?: boolean },
  limits: JourneyPromptLimits,
) {
  const included = new Set(input.includeBlockIds ?? [])
  const must = context.blocks.filter((entry) => included.has(entry.type))
  const ranked = rankJourneyBlocks(
    context.blocks.filter((entry) => !included.has(entry.type)),
    input.focus,
  ).slice(0, limits.blocks)
  const terms = expandedTerms(searchTerms(input.focus))
  const chunks = context.documents
    .flatMap((document) =>
      manualChunks(document.content).map((text, index) => ({
        manual: document.extension,
        text,
        index,
        score: scoreTokens(terms, tokenizeSearchable(text)),
      })),
    )
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limits.manualChunks)
  const palette = new Map<string, number>()
  for (const entry of context.blocks) {
    const path = entry.palettePath.join(' › ')
    palette.set(path, (palette.get(path) ?? 0) + 1)
  }
  const caps = context.capabilities
  return {
    // ⚠️ Sem `profileId` (o servidor já sabe quem é) nem `fingerprint`; e sem a lista de TODOS os
    // blocos: a paleta resumida e os `blocks` abaixo são o que o modelo pode citar.
    capabilities: {
      rank: caps.rank,
      studio: caps.studio,
      pinta: caps.pinta,
      molda: caps.molda,
      dimensions: caps.dimensions,
      extensionIds: caps.extensionIds,
      moldaTools: context.moldaToolFamilies.map((tool) => ({
        id: tool.id,
        label: tool.label,
        tab: tool.tab,
      })),
      tutor: caps.tutor,
      blockCount: caps.blockIds.length,
    },
    ...(limits.palette
      ? { palette: [...palette].slice(0, 80).map(([path, count]) => ({ path, count })) }
      : {}),
    blocks: [
      ...must.map((entry) =>
        blockForModel(entry, limits.blockDetail, Boolean(input.tips) && limits.blockDetail),
      ),
      ...ranked.map((entry) => blockForModel(entry, limits.blockDetail)),
    ],
    manuals: chunks.map((chunk) => ({ manual: chunk.manual, excerpt: chunk.text })),
    knownMechanics: journeyRecipes(input.focus, caps).slice(0, limits.recipes),
    sources: context.sources
      .slice(0, limits.sources)
      .map((source) => ({ id: source.id, content: clip(source.text, limits.sourceChars) })),
    references: context.references
      .slice(0, 12)
      .map((ref) => ({ id: ref.id, kind: ref.kind, title: clip(ref.title, 120) })),
    knowledgeAvailable: context.knowledgeAvailable,
    // Uma fonte recuperada não prova que a criança fez, pode abrir ou domina a fase.
    learningProgress: context.learningProgress.slice(0, 5),
    existingCreations: context.existingCreations.slice(0, limits.creations).map((item) => ({
      id: item.id,
      name: clip(item.name, 60),
      kind: item.kind,
      tool: item.tool,
    })),
  }
}

/**
 * O pedido do usuário, serializado UMA vez, já com os dados pessoais redigidos e dentro do teto
 * (somado ao do sistema). Desce a escada até caber; se nem o último degrau cabe, recusa em vez de
 * mandar um pedido gigante ao provedor.
 */
export function budgetedJourneyPrompt(
  system: string,
  build: (limits: JourneyPromptLimits) => unknown,
  budget = JOURNEY_PROMPT_BUDGET_BYTES,
): string {
  const room = budget - utf8Bytes(system)
  let last: unknown = null
  for (const limits of JOURNEY_PROMPT_LADDER) {
    last = privateJourneyInput(build(limits))
    const user = JSON.stringify(last)
    if (utf8Bytes(user) <= room) return user
  }
  const sizes: Record<string, number> = { system: utf8Bytes(system) }
  for (const [key, value] of Object.entries(last as Record<string, unknown>))
    sizes[key] = utf8Bytes(JSON.stringify(value) ?? '')
  const context = (last as { context?: Record<string, unknown> }).context
  for (const [key, value] of Object.entries(context ?? {}))
    sizes[`context.${key}`] = utf8Bytes(JSON.stringify(value) ?? '')
  throw new JourneyPromptTooLarge(sizes)
}
