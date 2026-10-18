import 'server-only'
import type {
  ChallengeMonthAdminView,
  ChallengeThemeAdminView,
  ChallengeThemesAdminView,
} from '@/lib/types'
import { type GatewayResponse, gatewayFetch } from '@/server/gateway'

const enc = encodeURIComponent

// Adapters do Desafio do mês (Sala do Professor): janela de meses com o tema
// resolvido (definido pelo professor ou sorteado como fallback), override por
// mês e biblioteca de temas custom. Rotas `/members/admin/challenge/*`.

/** Janela do painel: `GET /members/admin/challenge/months` (corrente + 11). */
export function listChallengeMonths(
  audience = 'kids',
): Promise<GatewayResponse<{ months: ChallengeMonthAdminView[] }>> {
  return gatewayFetch('/members/admin/challenge/months', { query: { audience } })
}

/** Define o tema de um mês: `PUT /members/admin/challenge/months/:month`. */
export function setChallengeMonth(
  month: string,
  body: unknown,
  audience = 'kids',
): Promise<GatewayResponse<ChallengeMonthAdminView>> {
  return gatewayFetch(`/members/admin/challenge/months/${enc(month)}`, {
    method: 'PUT',
    body,
    query: { audience },
  })
}

/** Volta o mês ao sorteio: `DELETE /members/admin/challenge/months/:month`. */
export function clearChallengeMonth(
  month: string,
  audience = 'kids',
): Promise<GatewayResponse<ChallengeMonthAdminView>> {
  return gatewayFetch(`/members/admin/challenge/months/${enc(month)}`, {
    method: 'DELETE',
    query: { audience },
  })
}

/** Biblioteca: `GET /members/admin/challenge/themes` (fixos + custom). */
export function listChallengeThemes(
  audience = 'kids',
): Promise<GatewayResponse<ChallengeThemesAdminView>> {
  return gatewayFetch('/members/admin/challenge/themes', { query: { audience } })
}

/** Cria tema custom: `POST /members/admin/challenge/themes`. */
export function createChallengeTheme(
  body: unknown,
  audience = 'kids',
): Promise<GatewayResponse<ChallengeThemeAdminView>> {
  return gatewayFetch('/members/admin/challenge/themes', {
    method: 'POST',
    body,
    query: { audience },
  })
}

/** Edita/arquiva tema custom: `PATCH /members/admin/challenge/themes/:id`. */
export function updateChallengeTheme(
  id: string,
  body: unknown,
  audience = 'kids',
): Promise<GatewayResponse<ChallengeThemeAdminView>> {
  return gatewayFetch(`/members/admin/challenge/themes/${enc(id)}`, {
    method: 'PATCH',
    body,
    query: { audience },
  })
}

export function challengeAudience(request: Request) {
  return new URL(request.url).searchParams.get('audience') ?? 'kids'
}
