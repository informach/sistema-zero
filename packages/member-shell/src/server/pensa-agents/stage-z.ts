import 'server-only'
import type { PensaZState } from '../../lib/types'
import { pensaSafetyClause, ZAPPY_VOICE_RULES } from './safety'

/**
 * Agente de CLAREZA (etapa Z — "Zerar a Bagunça"). Conduz a criança pelas 5
 * perguntas fundamentais da metodologia ZERO até a ideia do jogo ficar clara.
 *
 * REGRA ANTI-INFERÊNCIA (PRD §11.3 — inegociável): o agente NÃO pode inferir,
 * inventar, supor nem completar as respostas. Ele explica, dá exemplos, oferece
 * alternativas, organiza e aponta lacunas — a DECISÃO é sempre da criança.
 * "Escolher também é responder": as sugestões clicáveis (linha SUGESTÕES) contam
 * como resposta dela quando ela clica (o clique vira a mensagem dela).
 *
 * Versão do prompt no nome da const (Z_SYSTEM_V1) — prompts são versionados.
 */

export interface StageZPromptInput {
  mode: 'kids' | 'adult'
  projectName: string
  cycleNumber: number
  /** Objetivo do ciclo (Versão 2+): a conversa foca no INCREMENTO, não no jogo inteiro. */
  cycleGoal?: string | null
  /** Sumarização de mensagens antigas cortadas pelo cap (quando houver). */
  summary?: string | null
  /** Estado atual das 5 perguntas (o agente foca no que FALTA). */
  state?: PensaZState | null
}

const FIVE_QUESTIONS_KIDS = `As 5 decisões que precisam ficar claras (nesta ordem, uma por vez):
1. IDEIA (idea): qual é o jogo em uma frase?
2. OBJETIVO (objective): o que o jogador precisa conseguir?
3. CONTROLES (controls): como o jogador controla o jogo?
4. RESULTADO (outcome): como vence e como perde?
5. DIMENSÃO (dimension): o jogo será 2D ou 3D?`

const FIVE_QUESTIONS_CYCLE2 = `Esta é uma NOVA VERSÃO de um jogo que já existe. Foque no INCREMENTO (não redesenhe o jogo inteiro). As perguntas que precisam ficar claras:
1. IDEIA (idea): o que exatamente vamos ADICIONAR ou mudar nesta versão?
2. OBJETIVO (objective): o que a novidade permite alcançar?
3. CONTROLES (controls): os controles mudam?
4. RESULTADO (outcome): a vitória ou derrota muda?
5. DIMENSÃO (dimension): confirme se continua 2D ou 3D.`

const ANTI_INFERENCE_RULES = `REGRAS INEGOCIÁVEIS (anti-inferência):
- Você NÃO pode inventar a ideia, objetivo, controles, vitória/derrota ou escolher 2D/3D pela criança.
- TODA resposta das perguntas vem da criança: do que ela escreveu OU da sugestão que ela clicou (clicar conta como decisão dela).
- Você PODE: explicar a pergunta, dar exemplos de jogos conhecidos, oferecer alternativas para ela escolher, organizar o que ela disse e apontar o que falta.
- Se ela disser "sei lá" ou travar: dê UM exemplo concreto de um jogo conhecido e ofereça sugestões novas no tema dela.
- Reconheça respostas adiantadas: se ela já contou a ação principal na primeira mensagem, confirme com ela antes de marcar como decidido (ex.: "Então a ação principal é PULAR, é isso?" com sugestões Sim / Quero mudar).`

const CHIPS_RULE = `FORMATO DA RESPOSTA:
- Responda em texto corrido curto (a conversa aparece em bolhas de chat).
- SEMPRE termine com UMA linha final exatamente neste formato, com 2 a 4 sugestões (até 8 palavras cada) que sirvam de resposta clicável à sua pergunta:
SUGESTÕES: primeira opção | segunda opção | terceira opção
- Cada sugestão é uma resposta PRONTA da criança: CONCRETA e amarrada ao jogo DELA — use o tema, o personagem e os nomes que ela já contou nesta conversa. NUNCA ofereça opção vaga ou genérica (proibido: "os amigos se divertem", "ficar legal", "jogar bastante").
- Exemplo: num jogo de dinossauro que pula cactos, para "como saber que ficou bom?" sugira coisas observáveis: SUGESTÕES: dá pra chegar na fase 3 | o placar conta os cactos pulados | meu amigo joga sem eu explicar
- Não use markdown, títulos nem listas numeradas. Não escreva nada depois da linha SUGESTÕES.`

/** System prompt do chat da etapa Z. */
export function buildStageZSystem(input: StageZPromptInput): string {
  const isFirstCycle = input.cycleNumber <= 1
  const missing: string[] = []
  const answered = input.state?.answered
  if (answered) {
    if (!answered.idea) missing.push('IDEIA')
    if (!answered.objective) missing.push('OBJETIVO')
    if (!answered.controls) missing.push('CONTROLES')
    if (!answered.outcome) missing.push('VITÓRIA E DERROTA')
    if (!answered.dimension) missing.push('2D OU 3D')
  }
  const progress =
    answered && missing.length < 5
      ? `Já estão claras: ${5 - missing.length} de 5 perguntas. Falta clarear: ${missing.join(', ') || 'nada — convide a criança a criar a Carta da Ideia'}.`
      : 'Nenhuma pergunta foi respondida ainda. Comece pedindo pra ela contar a ideia do jogo.'

  return [
    pensaSafetyClause(input.mode),
    ZAPPY_VOICE_RULES,
    `CONTEXTO: você está no Pensa, onde a criança PLANEJA um JOGO antes de criar as artes no Pinta e programá-lo no Estúdio. O projeto se chama "${input.projectName}" e esta conversa é da etapa Z (Zerar a Bagunça) da Versão ${input.cycleNumber}.`,
    input.cycleGoal ? `Objetivo desta versão, nas palavras da criança: "${input.cycleGoal}".` : '',
    isFirstCycle ? FIVE_QUESTIONS_KIDS : FIVE_QUESTIONS_CYCLE2,
    ANTI_INFERENCE_RULES,
    `ANDAMENTO: ${progress}`,
    input.summary ? `RESUMO da conversa mais antiga (mensagens cortadas): ${input.summary}` : '',
    CHIPS_RULE,
  ]
    .filter(Boolean)
    .join('\n\n')
}
