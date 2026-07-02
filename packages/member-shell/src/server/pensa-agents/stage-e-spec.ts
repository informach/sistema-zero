import 'server-only'
import { z } from 'zod'
import { completePensaJson } from '../pensa-llm'
import { pensaSafetyClause } from './safety'

/**
 * Agente de ESBOÇO (etapa E — "Enxergar o Jogo"): transforma a ideia clarificada
 * num PRD interno (markdown, alimenta a fase R) + numa visão AMIGÁVEL que a
 * criança valida — fluxos como tirinha de 3 quadrinhos (Entrada → Processamento →
 * Saída em linguagem infantil) e telas como JSON restrito de esboço (o app
 * DESENHA wireframes coloridos; nada de ASCII art no kids — decisão de produto).
 *
 * As duas saídas nascem na MESMA chamada (`E_SPEC_V1`) para serem consistentes.
 * Modo revisão: recebe a versão anterior + o comentário da criança e regenera.
 */

export interface StageESpecInput {
  mode: 'kids' | 'adult'
  projectName: string
  cycleNumber: number
  cycleGoal?: string | null
  /** Texto da ideia clarificada (artefato `idea` validado). */
  ideaText: string
  /**
   * Transcript da conversa da etapa Z (contexto adicional): a conversa tem os
   * detalhes concretos que a Carta resume (nomes, inimigos, o que a criança
   * recusou) — sem ele o esboço sai genérico.
   */
  transcript?: string
  /** Revisão: a spec anterior (JSON) + o pedido de mudança da criança. */
  previousSpec?: unknown
  /** Revisão: o PRD anterior — atualizado em vez de regenerado (senão deriva). */
  previousPrd?: string
  feedback?: string
}

export interface FriendlySpecContent {
  flows: Array<{
    id: string
    title: string
    input: string
    processing: string
    output: string
    screens: string[]
  }>
  screens: Array<{
    name: string
    elements: Array<{
      kind: 'title' | 'button' | 'score' | 'hero' | 'enemy' | 'item' | 'background' | 'text'
      label: string
      zone: 'top' | 'middle' | 'bottom'
    }>
  }>
}

const ELEMENT_KINDS = [
  'title',
  'button',
  'score',
  'hero',
  'enemy',
  'item',
  'background',
  'text',
] as const
const ZONES = ['top', 'middle', 'bottom'] as const

// Validação Zod SEM tetos (o modo strict do json_schema não suporta maxItems em
// todo provedor) — os CLAMPS rodam em código depois (clampSpec).
const SpecSchema = z.object({
  prdMarkdown: z.string().min(100),
  flows: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      input: z.string(),
      processing: z.string(),
      output: z.string(),
      screens: z.array(z.string()),
    }),
  ),
  screens: z.array(
    z.object({
      name: z.string(),
      elements: z.array(
        z.object({
          kind: z.enum(ELEMENT_KINDS),
          label: z.string(),
          zone: z.enum(ZONES),
        }),
      ),
    }),
  ),
})

const SPEC_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['prdMarkdown', 'flows', 'screens'],
  properties: {
    prdMarkdown: { type: 'string' },
    flows: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'title', 'input', 'processing', 'output', 'screens'],
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          input: { type: 'string' },
          processing: { type: 'string' },
          output: { type: 'string' },
          screens: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    screens: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'elements'],
        properties: {
          name: { type: 'string' },
          elements: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['kind', 'label', 'zone'],
              properties: {
                kind: { type: 'string', enum: [...ELEMENT_KINDS] },
                label: { type: 'string' },
                zone: { type: 'string', enum: [...ZONES] },
              },
            },
          },
        },
      },
    },
  },
} as const

/** Clamps pós-validação (tetos que o json_schema strict não garante). */
export function clampSpec(spec: z.infer<typeof SpecSchema>): {
  prdMarkdown: string
  friendly: FriendlySpecContent
} {
  const clip = (s: string, n: number) => s.trim().slice(0, n)
  const screens = spec.screens.slice(0, 6).map((s) => ({
    name: clip(s.name, 40),
    elements: s.elements.slice(0, 10).map((e) => ({
      kind: e.kind,
      label: clip(e.label, 60),
      zone: e.zone,
    })),
  }))
  const screenNames = new Set(screens.map((s) => s.name))
  const flows = spec.flows.slice(0, 5).map((f, i) => ({
    id: clip(f.id, 40) || `fluxo-${i + 1}`,
    title: clip(f.title, 80),
    input: clip(f.input, 240),
    processing: clip(f.processing, 240),
    output: clip(f.output, 240),
    // Só telas que EXISTEM no esboço (o desenho referencia por nome).
    screens: f.screens.map((n) => clip(n, 40)).filter((n) => screenNames.has(n)),
  }))
  return {
    prdMarkdown: spec.prdMarkdown.slice(0, 60_000),
    friendly: { flows, screens },
  }
}

function specSystem(input: StageESpecInput): string {
  const kids = input.mode === 'kids'
  return [
    pensaSafetyClause(input.mode),
    `Você é o agente de esboço do Pensa (Sistema Zero). A criança clarificou a ideia de um jogo; agora você o DESENHA em duas camadas consistentes entre si:
1. prdMarkdown — documento técnico INTERNO (markdown) com EXATAMENTE estas seções, nesta ordem: "## Objetivo", "## Quem joga", "## Mecânica principal", "## Controles", "## Telas" (uma subseção "### <nome da tela>" por tela, listando TODOS os elementos dela), "## Regras e pontuação", "## Estados do jogo" e "## Ficou bom quando". Use os NOMES que a criança deu (do jogo, do personagem, dos itens) em todo o documento. Este texto alimenta a geração das missões de construção no Estúdio (editor de blocos HTML/CSS/JS com kits de Jogo 2D) — seja concreto e construível por uma criança com blocos.
2. flows + screens — a visão que a CRIANÇA valida:
   - flows: cada fluxo é uma tirinha de 3 quadrinhos em linguagem infantil ("Quando o jogador..." / "...o jogo..." / "...e aparece na tela..."). Use de 3 a 5 fluxos NO MÁXIMO. input = o que o jogador faz; processing = o que o jogo faz por dentro; output = o que aparece na tela. Cada fluxo lista as telas envolvidas (pelo nome EXATO usado em screens).
   - screens: os esboços que o app desenha. Tipicamente 3 telas de jogo (ex.: "Tela do título", "O jogo", "Fim de jogo"), NO MÁXIMO 6. Cada elemento tem kind (title|button|score|hero|enemy|item|background|text), label CURTO em português e zone (top|middle|bottom).`,
    kids
      ? 'Linguagem dos flows/screens: infantil, alegre, SEM jargão (nunca PRD, requisito, sistema). Sem travessão.'
      : '',
    `FIDELIDADE: baseie TUDO na ideia clarificada e na conversa. Detalhes que a criança citou na conversa (nomes, cores, inimigos, como perde) DEVEM aparecer no esboço; não invente mecânica/personagem/tela que ela não decidiu. Detalhar o que ela decidiu é ok (é o seu trabalho), criar features novas NÃO é.`,
    input.feedback
      ? input.previousSpec
        ? `MODO REVISÃO: a criança pediu uma mudança na versão anterior. Aplique SOMENTE a mudança pedida (e ajustes de consistência), preservando todo o resto igual — inclusive no prdMarkdown${input.previousPrd ? ' (atualize o PRD anterior abaixo em vez de reescrevê-lo do zero)' : ''}.
Versão anterior (JSON): ${JSON.stringify(input.previousSpec).slice(0, 20_000)}${input.previousPrd ? `\nPRD anterior (markdown):\n${input.previousPrd.slice(0, 20_000)}` : ''}
Pedido da criança: "${input.feedback.slice(0, 500)}"`
        : `PEDIDO DA CRIANÇA (incorpore ao esboço): "${input.feedback.slice(0, 500)}"`
      : '',
  ]
    .filter(Boolean)
    .join('\n\n')
}

/** Gera (ou revisa) o PRD interno + a spec amigável, numa chamada só. */
export async function synthesizeSpec(input: StageESpecInput): Promise<{
  prdMarkdown: string
  friendly: FriendlySpecContent
}> {
  const user = [
    `Projeto: "${input.projectName}" (Versão ${input.cycleNumber}).`,
    input.cycleGoal ? `Objetivo desta versão: ${input.cycleGoal}` : '',
    `Ideia clarificada (decidida pela criança): ${input.ideaText}`,
    input.transcript
      ? `CONVERSA da etapa de clareza (contexto adicional; a ideia clarificada prevalece):\n${input.transcript}`
      : '',
    'Gere o esboço completo.',
  ]
    .filter(Boolean)
    .join('\n\n')

  const spec = await completePensaJson({
    system: specSystem(input),
    user,
    schema: SpecSchema,
    jsonSchema: SPEC_JSON_SCHEMA as unknown as Record<string, unknown>,
    schemaName: 'pensa_stage_e_spec',
    maxTokens: 6_000,
    temperature: 0.4,
  })
  return clampSpec(spec)
}
