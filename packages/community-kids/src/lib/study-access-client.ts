import { notifySessionChange, sessionFetch } from '@sistemazero/member-shell/lib/session-fetch'
import { endRenovationVisits, startRenovationVisit } from './platform-renovation-visit'

/**
 * A frase de quando a resposta não chegou ou não pode ser lida. A criança lia o erro cru do
 * navegador ("Failed to fetch", "JSON Parse error…"); rede fora, tempo esgotado, página de erro
 * em HTML e serviço indisponível viram esta frase, e nada aparece como sucesso antes disso.
 */
export const CONNECTION_MESSAGE =
  'Não conseguimos conectar agora. Confira a internet e tente de novo.'
/** Código interno das falhas de transporte: nunca vem do servidor. */
export const CONNECTION_ERROR = 'CONNECTION'

const TOO_MANY_MESSAGE = 'Foram muitas tentativas. Aguarde 10 minutos e tente novamente.'
const MESSAGES: Record<string, string> = {
  INVALID_INPUT: 'Não conseguimos validar esses dados. Recarregue a página e tente de novo.',
  VALIDATION_ERROR: 'Não conseguimos validar esses dados. Recarregue a página e tente de novo.',
  PROFILE_CREATION_CONFLICT:
    'Este cadastro já foi recebido com outros dados. Volte à família e confira os perfis antes de tentar novamente.',
  STUDY_ACCESS_REQUIRED:
    'Esse código não liberou o acesso. Confira as letras ou peça um novo código ao responsável.',
  DEVICE_NOT_READY:
    'Não conseguimos preparar este navegador. Permita os cookies e tente novamente.',
  DEVICE_OTHER_FAMILY: 'Este navegador já está sendo usado por outra família. Use outro navegador.',
  PARENT_REAUTH_REQUIRED: 'Para mudar o acesso, entre novamente como responsável.',
  PROFILE_LIMIT_REACHED: 'Sua família já chegou ao limite de perfis disponíveis.',
  PARENT_SESSION_REQUIRED: 'Entre como responsável para continuar.',
  SESSION_CHANGED: 'O perfil mudou em outra aba. Abra esta página novamente.',
  SERVICE_UNAVAILABLE: CONNECTION_MESSAGE,
  TOO_MANY_REQUESTS: TOO_MANY_MESSAGE,
  TOO_MANY_ATTEMPTS: TOO_MANY_MESSAGE,
}
const FALLBACK_MESSAGE = 'Não foi possível continuar agora. Tente novamente.'

export class StudyRequestError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message)
  }
}

/**
 * A ÚNICA régua do que aparece na tela: só a frase de um `StudyRequestError` (que já é nossa,
 * escolhida pelo código). Qualquer outro erro (um `TypeError` do navegador, um `ZodError` de
 * uma resposta fora do contrato) cai na frase de conexão, nunca na mensagem dele.
 */
export function studyErrorMessage(error: unknown): string {
  return error instanceof StudyRequestError ? error.message : CONNECTION_MESSAGE
}

export async function studyRequest<T>(
  path: string,
  body?: unknown,
  method: 'GET' | 'POST' | 'PATCH' = 'POST',
): Promise<T> {
  let response: Response
  try {
    response = await sessionFetch(path, {
      method,
      cache: 'no-store',
      headers: { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
    })
  } catch {
    // Rede fora, tempo esgotado ou pedido cancelado: nada foi confirmado.
    throw new StudyRequestError(CONNECTION_ERROR, CONNECTION_MESSAGE)
  }
  let data: { error?: { code?: unknown } } | null
  try {
    data = await response.json()
  } catch {
    data = null
  }
  if (!response.ok) {
    const code = typeof data?.error?.code === 'string' ? data.error.code : null
    if (response.status === 429)
      throw new StudyRequestError(code ?? 'TOO_MANY_ATTEMPTS', TOO_MANY_MESSAGE)
    const known = code ? MESSAGES[code] : undefined
    if (code && known) throw new StudyRequestError(code, known)
    // 5xx sem frase nossa (proxy, gateway, página de erro em HTML) é conexão, não credencial.
    if (response.status >= 500 || !data)
      throw new StudyRequestError(code ?? 'SERVICE_UNAVAILABLE', CONNECTION_MESSAGE)
    throw new StudyRequestError(code ?? 'UNAVAILABLE', FALLBACK_MESSAGE)
  }
  // Um 2xx ilegível é resposta inconclusiva: não pode virar sucesso na tela.
  if (data === null) throw new StudyRequestError(CONNECTION_ERROR, CONNECTION_MESSAGE)
  return data as T
}
export async function enterStudyProfile(profileId: string, destination = '/') {
  await studyRequest('/api/study/enter', { profileId })
  startRenovationVisit(profileId)
  notifySessionChange()
  window.location.replace(destination)
}
export async function leaveStudy(destination: string, forgetProfileId?: string) {
  await studyRequest('/api/study/leave', { forgetProfileId })
  endRenovationVisits()
  notifySessionChange()
  window.location.replace(destination)
}
