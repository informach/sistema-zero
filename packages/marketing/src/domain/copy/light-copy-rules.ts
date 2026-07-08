/**
 * As 12 proibições do Light Copy (método VTSD do Leandro Ladeira) — a regra de
 * copy da casa. Fonte única: o prompt da IA e as mensagens do linter leem daqui.
 * Voz da marca: humana e fluida, sem jargão de IA.
 */

export interface LightCopyRule {
  /** Número da proibição (1..12), como no checklist. */
  n: number
  /** Rótulo curto (chip do linter). */
  label: string
  /** O que fazer p/ corrigir (dica). */
  fix: string
  /** Verificável por regex (linter passivo) ou só pela IA (subjetiva)? */
  mechanical: boolean
}

export const LIGHT_COPY_RULES: readonly LightCopyRule[] = [
  {
    n: 1,
    label: 'Travessão',
    fix: 'Troque o travessão (—) por vírgula, ponto ou dois-pontos.',
    mechanical: true,
  },
  {
    n: 2,
    label: 'Exclamação',
    fix: 'Tire o ponto de exclamação. Afirme com ponto final.',
    mechanical: true,
  },
  {
    n: 3,
    label: 'Pergunta no gancho',
    fix: 'A primeira frase não pode ser pergunta. Vire uma afirmação direta.',
    mechanical: true,
  },
  {
    n: 4,
    label: '"Não é X. É Y."',
    fix: 'Afirme direto o que é, sem a negação "não é... é...".',
    mechanical: true,
  },
  {
    n: 5,
    label: 'Promessa vaga',
    fix: 'Toda promessa precisa de dado: número, prazo ou situação concreta.',
    mechanical: false,
  },
  {
    n: 6,
    label: '"mesmo que" / "sem precisar"',
    fix: 'Troque "mesmo que" e "sem precisar" por um argumento real e direto.',
    mechanical: true,
  },
  {
    n: 7,
    label: 'Erro de português',
    fix: 'Revise concordância, acentuação e pontuação.',
    mechanical: false,
  },
  {
    n: 8,
    label: 'Lero-lero',
    fix: 'Palavra genérica que dá pra trocar por outra do nicho sem mudar o sentido vira dado concreto ou cena real.',
    mechanical: false,
  },
  {
    n: 9,
    label: 'Sem tese',
    fix: 'Não descreva só o problema: argumente por que ele existe (a causa).',
    mechanical: false,
  },
  {
    n: 10,
    label: 'Sigla sem explicação',
    fix: 'Explique a sigla ou técnica no mesmo parágrafo em que ela aparece.',
    mechanical: false,
  },
  {
    n: 11,
    label: 'Depoimento sem resultado',
    fix: 'Depoimento só vale com resultado concreto (número ou prazo), nunca só elogio.',
    mechanical: false,
  },
  {
    n: 12,
    label: 'Só o Quadro',
    fix: 'Venda o Decorado: a consequência emocional ou financeira do resultado, não só a técnica.',
    mechanical: false,
  },
] as const

/** Bloco de texto das 12 regras p/ o system prompt da IA. */
export function lightCopyRulesText(): string {
  return LIGHT_COPY_RULES.map((r) => `${r.n}. ${r.label}: ${r.fix}`).join('\n')
}
