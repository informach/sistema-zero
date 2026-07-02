import 'server-only'
import { z } from 'zod'
import type { PensaMission } from '../../lib/types'
import { completePensaJson } from '../pensa-llm'
import { pensaSafetyClause } from './safety'

/**
 * Agente de MISSÕES (etapa R — "Rodar as Missões"): converte o PRD interno + a spec
 * amigável numa lista de missões que a PRÓPRIA CRIANÇA executa no Estúdio (editor de
 * blocos) — nunca prompts de IA (decisão de produto: a criança constrói; o Pensa
 * aponta o caminho).
 *
 * As `studioHints.categories` saem de um catálogo CURADO com os nomes REAIS da
 * toolbox do Estúdio (snapshot manual de blocks.ts/toolbox.ts — o member-shell não
 * importa os internals do studio no servidor). `studioHints.blocks` são DESCRIÇÕES
 * em linguagem natural ("o bloco de pular quando estiver no chão"), nunca nomes
 * exatos inventados — a criança acha pelo tema da categoria + busca da toolbox.
 */

/** Categorias/subcategorias REAIS da toolbox (snapshot 07/2026 — studio v0.x). */
export const STUDIO_CATEGORY_HINTS = [
  '🗂️ Áreas do projeto',
  'HTML',
  'CSS',
  'Canvas',
  'Programação',
  'Programação › ⚡ Eventos',
  'Jogo 2D',
  'Jogo 2D › 🎮 Sprites',
  'Jogo 2D › 📐 Posição & tamanho',
  'Jogo 2D › 🪐 Muitos (grupos)',
  'Jogo 2D › 🕹️ Movimento',
  'Jogo 2D › ⏱️ Quando…',
  'Jogo 2D › ❓ Perguntas',
  'Jogo 2D › 🎯 Mira e contas',
  'Jogo 2D › ❤️ Vida e tempo',
  'Jogo 2D › ✨ Aparência',
  'Jogo 2D › 🎬 Animação',
  'Jogo 2D › 🔊 Som',
  'Jogo 2D › 🏆 Placar e HUD',
  'Jogo 2D › 🎬 Telas e cenas',
  'Jogo 2D › 🗺️ Mapa',
  'Jogo 2D › 🎥 Câmera',
  'Jogo 2D › 🚀 Kit espaço',
  'Jogo 2D › 🦕 Kit dino',
  'Jogo 2D › 🦍 Kit gorilas',
  'Jogo 2D › 🤸 Kit equilibrista',
  'Jogo 2D › 🎈 Kit balão',
] as const

const MissionSchema = z.object({
  tasks: z.array(
    z.object({
      title: z.string(),
      summary: z.string(),
      taskType: z.string(),
      story: z.string(),
      steps: z.array(z.object({ text: z.string(), hint: z.string() })),
      categories: z.array(z.string()),
      blocks: z.array(z.string()),
      doneWhen: z.array(z.string()),
    }),
  ),
})

const MISSIONS_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['tasks'],
  properties: {
    tasks: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'title',
          'summary',
          'taskType',
          'story',
          'steps',
          'categories',
          'blocks',
          'doneWhen',
        ],
        properties: {
          title: { type: 'string' },
          summary: { type: 'string' },
          taskType: { type: 'string' },
          story: { type: 'string' },
          steps: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['text', 'hint'],
              properties: { text: { type: 'string' }, hint: { type: 'string' } },
            },
          },
          categories: { type: 'array', items: { type: 'string' } },
          blocks: { type: 'array', items: { type: 'string' } },
          doneWhen: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  },
} as const

export interface MissionPlanTask {
  title: string
  summary?: string
  taskType?: string
  mission: PensaMission
}

function missionsSystem(input: { mode: 'kids' | 'adult'; cycleNumber: number }): string {
  const catalog = STUDIO_CATEGORY_HINTS.map((c) => `- ${c}`).join('\n')
  const count = input.cycleNumber <= 1 ? 'entre 5 e 8 missões' : 'entre 3 e 5 missões'
  return [
    pensaSafetyClause(input.mode),
    `Você é o agente de missões do Pensa (Sistema Zero). Transforme o plano do jogo em MISSÕES que a CRIANÇA (7 a 12 anos) executa SOZINHA no Estúdio — o editor de blocos do Sistema Zero (blocos em português, categorias de HTML/CSS/Canvas/Programação e a extensão Jogo 2D com sprites, movimento, colisões, placar, som e telas). As missões NUNCA são prompts para IA: são passos que a criança faz com as próprias mãos.`,
    `FORMATO de cada missão:
- title: verbo + objeto, curto ("Faça o pulo do herói").
- summary: 1 frase do que a missão entrega.
- taskType: um de setup|gameplay|screens|polish.
- story: 1 frase de contexto divertida ("Todo herói precisa escapar do perigo.").
- steps: 3 a 6 passos imperativos CURTOS e numerados na ordem de execução, cada um com hint (dica opcional de onde achar/como testar; hint pode ser string vazia). O primeiro passo costuma ser abrir o projeto no Estúdio; o último costuma ser rodar e testar.
- categories: 1 a 3 categorias do CATÁLOGO abaixo (nomes EXATOS — não invente categoria).
- blocks: 1 a 4 DESCRIÇÕES em linguagem natural dos blocos que ajudam ("o bloco de pular quando estiver no chão", "o bloco quando a tecla for pressionada"). NÃO invente nomes exatos de bloco; descreva o que o bloco faz.
- doneWhen: 1 a 3 critérios OBSERVÁVEIS que a criança consegue checar jogando ("O herói pula quando aperto espaço").`,
    `REGRAS DO PLANO:
- Gere ${count}, na ordem de construção.
- A PRIMEIRA missão é sempre "Monte o palco" (criar/abrir o projeto no Estúdio, fundo e o personagem principal aparecendo na tela).
- A ÚLTIMA missão é sempre "Toque final" (tela de título com o nome do jogo, usando as cores da paleta do jogo).
- Cada missão cabe numa sessão de 15 a 30 minutos de uma criança. Uma mecânica por missão.
- Baseie-se SOMENTE no plano fornecido (não invente mecânica nova).
- Linguagem alegre, sem jargão, sem travessão.`,
    `CATÁLOGO DE CATEGORIAS DO ESTÚDIO (use nomes EXATOS):\n${catalog}`,
  ].join('\n\n')
}

/** Clamps pós-validação + montagem do shape `PensaMission` do contrato. */
export function clampMissions(raw: z.infer<typeof MissionSchema>): MissionPlanTask[] {
  const clip = (s: string, n: number) => s.trim().slice(0, n)
  const validCategories = new Set<string>(STUDIO_CATEGORY_HINTS)
  return raw.tasks.slice(0, 12).map((t) => {
    const steps = t.steps.slice(0, 12).map((s) => {
      const hint = clip(s.hint, 160)
      return hint ? { text: clip(s.text, 200), hint } : { text: clip(s.text, 200) }
    })
    const categories = t.categories.map((c) => c.trim()).filter((c) => validCategories.has(c))
    const blocks = t.blocks.map((b) => clip(b, 120)).filter(Boolean)
    const doneWhen = t.doneWhen
      .map((d) => clip(d, 160))
      .filter(Boolean)
      .slice(0, 3)
    return {
      title: clip(t.title, 200) || 'Missão',
      summary: clip(t.summary, 300),
      taskType: ['setup', 'gameplay', 'screens', 'polish', 'fix'].includes(t.taskType)
        ? t.taskType
        : 'gameplay',
      mission: {
        story: clip(t.story, 200),
        steps: steps.length > 0 ? steps : [{ text: 'Abra seu projeto no Estúdio' }],
        ...(categories.length > 0 || blocks.length > 0
          ? { studioHints: { categories: categories.slice(0, 3), blocks: blocks.slice(0, 4) } }
          : {}),
        doneWhen: doneWhen.length > 0 ? doneWhen : ['Ficou do jeito que você imaginou'],
      },
    }
  })
}

/** Gera o plano de missões a partir do PRD interno + spec amigável + identidade. */
export async function synthesizeMissions(input: {
  mode: 'kids' | 'adult'
  projectName: string
  cycleNumber: number
  cycleGoal?: string | null
  prdMarkdown: string
  friendlySpec: unknown
  identity?: { name?: string; palette?: { colors?: string[] } } | null
}): Promise<MissionPlanTask[]> {
  const user = [
    `Jogo: "${input.identity?.name ?? input.projectName}" (Versão ${input.cycleNumber}).`,
    input.cycleGoal ? `Objetivo desta versão: ${input.cycleGoal}` : '',
    input.identity?.palette?.colors?.length
      ? `Paleta do jogo (para a missão Toque final): ${input.identity.palette.colors.join(', ')}`
      : '',
    `PLANO INTERNO (markdown):\n${input.prdMarkdown.slice(0, 24_000)}`,
    `VISÃO AMIGÁVEL (JSON):\n${JSON.stringify(input.friendlySpec).slice(0, 8_000)}`,
    'Gere o plano de missões.',
  ]
    .filter(Boolean)
    .join('\n\n')

  const raw = await completePensaJson({
    system: missionsSystem({ mode: input.mode, cycleNumber: input.cycleNumber }),
    user,
    schema: MissionSchema,
    jsonSchema: MISSIONS_JSON_SCHEMA as unknown as Record<string, unknown>,
    schemaName: 'pensa_mission_plan',
    maxTokens: 6_000,
    temperature: 0.4,
  })
  const tasks = clampMissions(raw)
  if (tasks.length === 0) throw new Error('Plano de missões vazio')
  return tasks
}
