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
 * `studioHints.categories` e os labels de bloco saem de catálogos CURADOS com os
 * nomes REAIS da toolbox (snapshots manuais de blocks.ts/toolbox.ts do game-2d —
 * o member-shell NÃO importa os internals do studio no servidor: o BLOCK_CATALOG
 * público puxa blockly/core). Os passos citam os labels EXATOS entre aspas e o
 * plano segue a arquitetura real de um jogo canvas (setup fora do loop → eventos →
 * UM "A cada quadro"). Projeto semeado pelo Pensa nasce SEM extensão instalada —
 * a 1ª missão SEMPRE ensina a instalar a Jogo 2D (decisão: ensinar, não pré-instalar).
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

/**
 * Blocos-chave REAIS por categoria — labels EXATOS do `message0` de
 * `packages/studio/src/official-extensions/game-2d/blocks.ts` (snapshot manual
 * 07/2026; mudou label lá, atualize aqui). O prompt cita esses labels entre
 * aspas para os passos apontarem blocos que EXISTEM na paleta.
 * ⚠️ "Fazer o sprite pular no chão" é o pulo GENÉRICO (Movimento);
 * "Controlar o dinossauro" (Kit dino) já embute pulo+gravidade — não confundir.
 */
export const STUDIO_BLOCK_HINTS: ReadonlyArray<readonly [string, readonly string[]]> = [
  [
    'Jogo 2D › 🎮 Sprites',
    [
      'Criar sprite',
      'Criar sprite com imagem',
      'Desenhar o sprite',
      'Trocar imagem do sprite',
      'Mudar a posição do sprite',
      'Mudar a velocidade do sprite',
    ],
  ],
  [
    'Jogo 2D › 🕹️ Movimento',
    [
      'Mover o sprite estilo plataforma',
      'Mover sprite em 4 direções com setas',
      'Fazer o sprite pular no chão',
      'Botar a gravidade do mundo',
      'Aplicar velocidade e gravidade ao sprite',
      'Quicar o sprite nas bordas da tela',
      'Manter o sprite dentro da tela',
      'Controlar o sprite como nave',
      'Fazer sprite seguir o ponteiro',
    ],
  ],
  [
    'Jogo 2D › ⏱️ Quando…',
    [
      'A cada quadro do jogo, fazer',
      'Quando apertar a tecla',
      'Quando clicar/tocar',
      'Quando o sprite encostar no sprite',
      'Quando o sprite encostar num do grupo',
      'A cada … segundos fazer',
    ],
  ],
  ['Jogo 2D › ❓ Perguntas', ['a tecla está apertada?', 'o sprite está encostando no sprite?']],
  [
    'Jogo 2D › 🪐 Muitos (grupos)',
    [
      'Criar grupo de sprites',
      'Criar tiro no grupo',
      'Atualizar (mover) o grupo',
      'Desenhar o grupo',
      'Para cada sprite do grupo',
      'quantos sprites tem no grupo',
      'Tirar do grupo quem sair da tela',
    ],
  ],
  [
    'Jogo 2D › ✨ Aparência',
    [
      'Preparar o jogo em tela cheia',
      'Fazer a tela preencher N% da janela',
      'Limpar a tela',
      'Mostrar fim de jogo com o texto',
    ],
  ],
  [
    'Jogo 2D › 🏆 Placar e HUD',
    ['Criar pontuação', 'Mostrar placar', 'Desenhar vidas (corações)', 'Barra de progresso'],
  ],
  [
    'Jogo 2D › 🎬 Telas e cenas',
    ['Ir para a tela', 'a tela atual é …?', 'Mostrar tela com título', 'Reiniciar o jogo'],
  ],
  ['Jogo 2D › 🔊 Som', ['Tocar efeito', 'Tocar música de fundo', 'Parar a música de fundo']],
  ['Jogo 2D › 🎥 Câmera', ['Fazer a câmera seguir o sprite']],
  ['Jogo 2D › 🗺️ Mapa', ['Desenhar o mapa', 'Impedir o sprite de atravessar os tiles sólidos']],
  [
    'Jogo 2D › 🦕 Kit dino',
    [
      'Criar dinossauro',
      'Controlar o dinossauro',
      'No grupo criar obstáculo',
      'No grupo criar um ovo (bônus)',
      'Desenhar fundo de floresta',
      'Tocar som de pulo',
    ],
  ],
  [
    'Jogo 2D › 🚀 Kit espaço',
    [
      'Criar nave',
      'No grupo criar um asteroide',
      'Atirar do sprite para a frente',
      'Desenhar fundo de estrelas',
      'Soltar explosão no sprite',
    ],
  ],
  [
    'Jogo 2D › 🦍 Kit gorilas',
    [
      'Criar cidade de prédios',
      'Pôr o gorila na cidade',
      'Mirar arrastando a partir do gorila',
      'Jogar a banana do gorila',
      'O robô do gorila joga',
    ],
  ],
  [
    'Jogo 2D › 🤸 Kit equilibrista',
    ['Criar equilibrista', 'Atualizar o equilibrista', 'o equilibrista caiu?'],
  ],
  [
    'Jogo 2D › 🎈 Kit balão',
    ['Criar balão', 'Atualizar o balão', 'combustível do balão', 'o balão bateu?'],
  ],
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
      // Missão de ARTE (07/2026): 'sprite'|'background'|'tileset' abre o Pinta
      // pré-configurado; string vazia = missão normal (o modo strict exige o campo).
      artKind: z.string(),
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
          'artKind',
        ],
        properties: {
          title: { type: 'string' },
          summary: { type: 'string' },
          taskType: { type: 'string' },
          story: { type: 'string' },
          artKind: { type: 'string' },
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

/** Exportada só p/ os testes de prompt (tests/pensa-missions.test.ts). */
export function missionsSystem(input: {
  mode: 'kids' | 'adult'
  cycleNumber: number
  buildEnv?: 'embedded' | 'studio' | 'external' | null
  /** Criança POSSUI o Pinta → o plano ganha 1–2 missões de ARTE (artKind). */
  includeArtMissions?: boolean
}): string {
  const external = input.buildEnv === 'external'
  const art = input.includeArtMissions === true && !external
  const catalog = STUDIO_CATEGORY_HINTS.map((c) => `- ${c}`).join('\n')
  const blockCatalog = STUDIO_BLOCK_HINTS.map(
    ([category, labels]) => `- ${category}: ${labels.map((label) => `"${label}"`).join(' · ')}`,
  ).join('\n')
  const count = input.cycleNumber <= 1 ? 'entre 5 e 8 missões' : 'entre 3 e 5 missões'
  return [
    pensaSafetyClause(input.mode),
    external
      ? `Você é o agente de missões do Pensa (Sistema Zero). Transforme o plano do jogo em MISSÕES que a CRIANÇA (7 a 12 anos) executa SOZINHA no editor que ela usa no computador dela (ex.: VS Code) — o jogo é construído FORA do Estúdio, então NUNCA mande abrir o Estúdio nem cite blocos. As missões NUNCA são prompts para IA: são passos que a criança faz com as próprias mãos.`
      : `Você é o agente de missões do Pensa (Sistema Zero). Transforme o plano do jogo em MISSÕES que a CRIANÇA (7 a 12 anos) executa SOZINHA no Estúdio — o editor de blocos do Sistema Zero (blocos em português, categorias de HTML/CSS/Canvas/Programação e a extensão Jogo 2D com sprites, movimento, colisões, placar, som e telas). As missões NUNCA são prompts para IA: são passos que a criança faz com as próprias mãos.`,
    `FORMATO de cada missão:
- title: verbo + objeto, curto ("Faça o pulo do herói").
- summary: 1 frase do que a missão entrega.
- taskType: um de setup|gameplay|screens|polish.
- story: 1 frase de contexto divertida NO MUNDO DESTE jogo — cite o personagem/tema do plano ("O Dino Espacial não pode tropeçar nos meteoros!"). Nunca frase genérica que serviria pra qualquer jogo.
- steps: 3 a 7 passos imperativos CURTOS e numerados na ordem de execução, cada um com hint (dica opcional de onde achar/como testar; hint pode ser string vazia). O primeiro passo costuma ser abrir o projeto${external ? ' no editor' : ' no Estúdio'}; o último costuma ser rodar e testar.${
      external
        ? `
- categories: sempre [] (lista vazia — não há Estúdio neste projeto).
- blocks: sempre [] (lista vazia).`
        : `
- categories: 1 a 3 categorias do CATÁLOGO DE CATEGORIAS abaixo (nomes EXATOS — não invente categoria).
- blocks: 1 a 4 blocos que ajudam, citando o label EXATO do CATÁLOGO DE BLOCOS abaixo, entre aspas (ex.: "Controlar o dinossauro", "Quando apertar a tecla"). Se precisar de um bloco que não está no catálogo, descreva-o em linguagem natural — NUNCA invente um label. Quando um passo usa um bloco, o hint diz a categoria onde achar (ex.: "procure em Jogo 2D › 🕹️ Movimento").`
    }
- doneWhen: 1 a 3 critérios OBSERVÁVEIS que a criança consegue checar jogando, usando os elementos NOMEADOS do jogo ("O Dino Espacial pula quando aperto espaço") — nunca "o personagem".
- artKind: ${
      art
        ? 'SOMENTE nas missões de ARTE (ver regra abaixo), um de sprite|background|tileset; nas demais missões, string vazia ""'
        : 'SEMPRE string vazia ""'
    }.`,
    art
      ? `MISSÕES DE ARTE (a criança TEM o Pinta, o ateliê de desenho do Sistema Zero):
- Inclua 1 ou 2 missões de DESENHO logo após a primeira missão: desenhar o personagem principal (artKind "sprite") e, se o plano tiver cenário próprio, o fundo (artKind "background").
- Os passos citam o Pinta: abrir pelo botão "Desenhar no Pinta" da missão, criar o desenho usando as CORES DA PALETA do jogo, e apertar "🚀 Usar no Estúdio" no final (o desenho aparece em "Meus desenhos" no painel de Imagens do Estúdio).
- Missão de arte: categories [] e blocks [] (o trabalho é no Pinta, não nos blocos).
- doneWhen da missão de arte é observável no Pinta/Estúdio ("O Dino Espacial aparece em Meus desenhos").`
      : '',
    external
      ? ''
      : `ARQUITETURA REAL DE UM JOGO NO ESTÚDIO (siga esta ordem no plano E dentro dos passos):
- O código do jogo vive no bloco ⚙️ Comportamento (categoria 🗂️ Áreas do projeto) — só o que está DENTRO dele roda.
- SETUP no topo, FORA do loop: "Preparar o jogo em tela cheia" (ou "Fazer a tela preencher N% da janela"), criar os sprites e grupos, "Criar pontuação" e "Ir para a tela" com o nome "inicio".
- EVENTOS soltos: "Quando apertar a tecla" para começar o jogo e para as ações do jogador.
- UM ÚNICO loop "A cada quadro do jogo, fazer", nesta ordem interna: "Limpar a tela" → desenhar o cenário → decidir pela cena atual ("a tela atual é …?") → controlar e desenhar o herói → criar obstáculos/itens com "A cada … segundos fazer" → "Atualizar (mover) o grupo" e "Desenhar o grupo" → tratar as colisões ("Quando o sprite encostar num do grupo") → placar/HUD por último ("Mostrar placar").
- Cada passo diz ONDE o bloco entra: no topo (fora do loop), dentro do "A cada quadro do jogo, fazer", ou como evento solto.`,
    `REGRAS DO PLANO:
- Gere ${count}, na ordem de construção.${
      external
        ? `
- A PRIMEIRA missão é sempre "Monte o palco" (criar/abrir o projeto no editor, fundo e o personagem principal aparecendo na tela).`
        : `
- A PRIMEIRA missão é sempre "Monte o palco" e COMEÇA instalando a extensão: passo com o caminho exato "abra o menu ⋯ (Mais opções) → Extensões → no cartão Jogo 2D, aperte Instalar" (sem ela a categoria Jogo 2D não existe na paleta; o hint desse passo avisa: se a categoria Jogo 2D já aparecer, pode pular). Se o plano pedir um jogo 3D, a extensão é a Jogo 3D. Depois vêm os passos de preparar a tela e fazer o personagem principal aparecer.`
    }
- A ÚLTIMA missão é sempre "Toque final" (tela de título com o nome do jogo, usando as cores da paleta do jogo).
- Cada missão cabe numa sessão de 15 a 30 minutos de uma criança. Uma mecânica por missão.
- Baseie-se SOMENTE no plano fornecido (não invente mecânica nova).
- Linguagem alegre, sem jargão, sem travessão.`,
    external
      ? ''
      : `CATÁLOGO DE CATEGORIAS DO ESTÚDIO (use nomes EXATOS):\n${catalog}

CATÁLOGO DE BLOCOS DO ESTÚDIO (labels EXATOS por categoria — cite entre aspas):\n${blockCatalog}

ESCOLHA DO KIT: se a mecânica principal bate com um Kit, use os blocos DELE nas primeiras missões — correr e pular obstáculos → 🦕 Kit dino ("Criar dinossauro", "Controlar o dinossauro", "No grupo criar obstáculo", "Desenhar fundo de floresta"); nave que atira → 🚀 Kit espaço ("Criar nave", "No grupo criar um asteroide", "Atirar do sprite para a frente"); mirar e atirar por turnos → 🦍 Kit gorilas ("Criar cidade de prédios", "Pôr o gorila na cidade", "Jogar a banana do gorila"); esticar ponte pra atravessar → 🤸 Kit equilibrista ("Criar equilibrista", "Atualizar o equilibrista"); subir desviando → 🎈 Kit balão ("Criar balão", "Atualizar o balão"). Sem Kit compatível, use os blocos genéricos de Jogo 2D. ⚠️ "Fazer o sprite pular no chão" é o pulo GENÉRICO; com o Kit dino use "Controlar o dinossauro" (já embute pulo e gravidade).`,
  ]
    .filter(Boolean)
    .join('\n\n')
}

const ART_KINDS = ['sprite', 'background', 'tileset'] as const
const HEX_RE = /^#[0-9a-f]{6}$/i

/** Clamps pós-validação + montagem do shape `PensaMission` do contrato. */
export function clampMissions(
  raw: z.infer<typeof MissionSchema>,
  external = false,
  /** Paleta da identidade (hex) — anexada SÓ às missões de arte (abre o Pinta já colorido). */
  palette: string[] = [],
): MissionPlanTask[] {
  const clip = (s: string, n: number) => s.trim().slice(0, n)
  const validCategories = new Set<string>(STUDIO_CATEGORY_HINTS)
  const safePalette = palette.filter((c) => HEX_RE.test(c)).slice(0, 8)
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
    // Missão de ARTE (07/2026): artKind válido carrega o tipo + a paleta do jogo
    // (o kids abre o Pinta pré-configurado). Fora do external — lá não há Pinta.
    const artKind =
      !external && (ART_KINDS as readonly string[]).includes(t.artKind.trim())
        ? (t.artKind.trim() as (typeof ART_KINDS)[number])
        : undefined
    return {
      title: clip(t.title, 200) || 'Missão',
      summary: clip(t.summary, 300),
      taskType: ['setup', 'gameplay', 'screens', 'polish', 'fix'].includes(t.taskType)
        ? t.taskType
        : 'gameplay',
      mission: {
        story: clip(t.story, 200),
        steps:
          steps.length > 0
            ? steps
            : [{ text: external ? 'Abra seu projeto no editor' : 'Abra seu projeto no Estúdio' }],
        ...(categories.length > 0 || blocks.length > 0
          ? { studioHints: { categories: categories.slice(0, 3), blocks: blocks.slice(0, 4) } }
          : {}),
        doneWhen: doneWhen.length > 0 ? doneWhen : ['Ficou do jeito que você imaginou'],
        ...(artKind ? { artKind } : {}),
        ...(artKind && safePalette.length > 0 ? { palette: safePalette } : {}),
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
  /** Onde a criança constrói — 'external' gera missões SEM Estúdio/blocos. */
  buildEnv?: 'embedded' | 'studio' | 'external' | null
  /** Criança POSSUI o Pinta → o plano ganha 1–2 missões de ARTE (artKind). */
  includeArtMissions?: boolean
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
    system: missionsSystem({
      mode: input.mode,
      cycleNumber: input.cycleNumber,
      buildEnv: input.buildEnv,
      includeArtMissions: input.includeArtMissions,
    }),
    user,
    schema: MissionSchema,
    jsonSchema: MISSIONS_JSON_SCHEMA as unknown as Record<string, unknown>,
    schemaName: 'pensa_mission_plan',
    maxTokens: 6_000,
    temperature: 0.4,
  })
  const tasks = clampMissions(
    raw,
    input.buildEnv === 'external',
    input.identity?.palette?.colors ?? [],
  )
  if (tasks.length === 0) throw new Error('Plano de missões vazio')
  return tasks
}
