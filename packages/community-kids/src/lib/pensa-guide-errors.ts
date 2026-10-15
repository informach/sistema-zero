import { PALAVRAS_DA_ESCOLA } from '@sistemazero/member-shell/lib/lesson-copy-kids'

/**
 * Os recados do Guia do Pensa dentro das oficinas (14/10/2026).
 *
 * O guia mora nos PACOTES (Estúdio, Pinta) e não conhece o servidor; a convenção entre os dois
 * é o campo `childMessage` na rejeição: com ele o guia mostra a frase, sem ele trata como falha
 * de REDE ("Confira a internet"). Antes toda recusa virava "Confira a internet", inclusive a
 * dependência não cumprida e o plano alterado, e a criança ficava conferindo um Wi-Fi que estava
 * bom. Quem decide o que é frase de criança é o HOST, aqui, porque é ele que fala com o servidor.
 */
export type GuideError = Error & { code?: string; childMessage?: string }

/** Uma recusa com frase para a criança. */
export function guideError(message: string, code?: string): GuideError {
  return Object.assign(new Error(message), {
    childMessage: message,
    ...(code ? { code } : {}),
  })
}

/**
 * O conflito do progresso tem DOIS sentidos no servidor (15/10/2026): a versão que a página tinha
 * ficou velha (a frase padrão, adulta, que o host troca) ou a jornada v2 recusou por um motivo que
 * ela diz em voz de criança ("Seu jogo mudou. Espere ficar guardado na conta…", "Conclua a missão
 * anterior…", "Abra o caminho atual deste jogo."). Antes as duas viravam "A missão mudou em outro
 * lugar", e a criança que só precisava esperar o jogo subir lia que alguém tinha mexido no plano.
 */
export const CONFLITO_PADRAO = /^A tarefa mudou em outro aparelho/

/** Frases do host para as recusas que o servidor diz em voz técnica ou adulta. */
const FRASE_DO_HOST: Record<string, string> = {
  // A frase do servidor é a do plano clássico ("Conclua as tarefas anteriores…"): no v2 a
  // criança lê "missões" (15/10/2026; antes ela passava direto).
  PENSA_TASK_DEPENDENCY_PENDING: 'Termine antes as missões que vêm antes desta no seu plano.',
  // O plano mudou por baixo (passo ou critério que não existe mais, outra ferramenta, revisão).
  PENSA_TASK_TRANSITION_INVALID: 'Seu plano mudou. Volte ao plano para ver esta missão de novo.',
  PENSA_NOT_FOUND: 'Esta missão não está mais no seu plano. Volte ao plano para ver o caminho.',
  PENSA_TASK_PROGRESS_CONFLICT:
    'A missão mudou em outro lugar. Recarreguei o Guia do Pensa para você.',
  // Pensa em equipe (14/10/2026): a missão é de outra função, ou outra artista já começou.
  PENSA_NOT_YOUR_MISSION: 'Essa missão é de outra pessoa da equipe. Volte ao plano para ver a sua.',
  PENSA_MISSION_TAKEN: 'Outra pessoa da equipe já está fazendo essa missão.',
}

const RECUSA_DESCONHECIDA = 'Não consegui concluir agora. Tente de novo daqui a pouco.'
/** A recusa desconhecida ao ABRIR uma missão (lá a criança não estava concluindo nada). */
export const RECUSA_AO_ABRIR = 'Não consegui abrir esta missão agora. Tente de novo daqui a pouco.'

/**
 * A recusa do `PATCH …/progress`, já na voz da criança. Falha de REDE nunca chega aqui (o
 * `fetch` lança antes, sem `childMessage`, e o guia mostra o recado da internet).
 * `unknown` é a frase de uma recusa sem frase própria (padrão: a de concluir).
 */
export function progressRefusal(
  status: number,
  body: { error?: { code?: string; message?: string } } | null,
  unknown: string = RECUSA_DESCONHECIDA,
): GuideError {
  const code = body?.error?.code
  const message = body?.error?.message?.trim()
  if (
    code === 'PENSA_TASK_PROGRESS_CONFLICT' &&
    message &&
    !CONFLITO_PADRAO.test(message) &&
    !PALAVRAS_DA_ESCOLA.test(message)
  )
    return guideError(message, code)
  if (code && FRASE_DO_HOST[code]) return guideError(FRASE_DO_HOST[code], code)
  if (status === 404) return guideError(FRASE_DO_HOST.PENSA_NOT_FOUND!, 'PENSA_NOT_FOUND')
  return guideError(unknown, code)
}

/**
 * A espera da nuvem antes de concluir (`cloud.confirm`). A fila rejeita com a frase da criança
 * (`CLOUD_MESSAGES`) e o `code` do servidor quando o item FALHOU; sem `code` é o prazo vencido
 * ou a fila desligada, que quase sempre é falta de internet: a frase diz as duas coisas.
 */
export function cloudConfirmRefusal(cause: unknown, what: string): GuideError {
  const failure = cause as { code?: unknown; message?: unknown } | null
  if (failure && typeof failure.code === 'string' && typeof failure.message === 'string')
    return guideError(failure.message, failure.code)
  return guideError(`${what} ainda não chegou à conta. Confira a internet e tente de novo.`)
}
