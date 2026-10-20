import type {
  PensaDestination,
  PensaMissionAvailability,
  PensaMissionProgress,
} from '@sistemazero/core/pensa'

/**
 * As palavras que mudam com quem lê. O Kids fala com a criança em "ideias" e com o Zappy em
 * primeira pessoa; o adulto fala em "créditos", sem mascote nem sementes de ideia infantis.
 * Regras de copy da casa: sem travessão, sem exclamação, sem "IA" solta.
 */
export interface PensaCopy {
  audience: 'kids' | 'adult'
  unit: (count: number) => string
  /** A linha do cabeçalho da conversa: quanto cada mensagem custa. */
  messageCost: string
  greeting: string
  greetingText: string
  readOnlyHint: string
  suggestion: string
  failedSaved: string
  restoreBody: string
  finishedText: (name: string) => string
}

const KIDS: PensaCopy = {
  audience: 'kids',
  unit: (count) => (count === 1 ? 'ideia' : 'ideias'),
  messageCost: 'Cada mensagem usa uma ideia',
  greeting: 'Oi. Conta o jogo que está na sua cabeça.',
  greetingText:
    'Pode ser curtinho. Eu pergunto o que faltar, uma coisa de cada vez, e depois a gente divide o jogo em missões.',
  readOnlyHint: 'Só a criança mexe no jogo',
  suggestion: 'Sugestão do Zappy',
  failedSaved: 'Eu não consegui terminar. O que você escreveu continua aqui.',
  restoreBody:
    'Antes de voltar, eu guardo o jogo de agora. Depois, a conferência final precisa ser feita de novo.',
  finishedText: (name) =>
    `Você conferiu todas as missões do ${name}. Agora é jogar, mostrar para alguém e, se quiser, publicar no Mural pelo Estúdio.`,
}

const ADULT: PensaCopy = {
  audience: 'adult',
  unit: (count) => (count === 1 ? 'crédito' : 'créditos'),
  messageCost: 'Cada mensagem usa um crédito',
  greeting: 'Conte o jogo que você quer criar.',
  greetingText:
    'Pode ser curto. O Zappy pergunta o que faltar, uma coisa de cada vez, e depois divide o jogo em missões.',
  readOnlyHint: 'Só a pessoa dona da conta mexe no jogo',
  suggestion: 'Sugestão do Zappy',
  failedSaved: 'O Zappy não conseguiu terminar. O que você escreveu continua aqui.',
  restoreBody:
    'Antes de voltar, o jogo de agora fica guardado. Depois, a conferência final precisa ser feita de novo.',
  finishedText: (name) =>
    `Você conferiu todas as missões do ${name}. Agora é jogar, mostrar para alguém e, se quiser, publicar pelo Estúdio.`,
}

export function pensaCopy(audience: 'kids' | 'adult'): PensaCopy {
  return audience === 'adult' ? ADULT : KIDS
}

export const DESTINATION_NAMES: Record<PensaDestination, string> = {
  studio: 'Estúdio',
  pinta: 'Pinta',
  molda: 'Molda',
}

export type MissionState = 'done' | 'review' | 'doing' | 'todo' | 'skip'

/** O estado que a criança lê, a partir do progresso e da disponibilidade do servidor. */
export function missionState(
  progress: PensaMissionProgress | undefined,
  access: PensaMissionAvailability | undefined,
): MissionState {
  if (access?.reason === 'not_applicable') return 'skip'
  if (progress?.validity === 'needs_review') return 'review'
  if (progress?.status === 'completed') return 'done'
  if (progress?.status === 'in_progress') return 'doing'
  return 'todo'
}

export const MISSION_STATE_LABELS: Record<MissionState, string> = {
  done: 'Pronta',
  review: 'Conferir de novo',
  doing: 'Fazendo',
  todo: 'Por fazer',
  skip: 'Não precisa mais',
}

/** Primeiro nome de quem está na equipe, ou "Colega" quando o servidor não sabe. */
export function personName(firstName: string | null | undefined): string {
  return firstName?.trim() || 'Colega'
}
