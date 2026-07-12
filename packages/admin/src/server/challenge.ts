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
export function listChallengeMonths(): Promise<
  GatewayResponse<{ months: ChallengeMonthAdminView[] }>
> {
  return gatewayFetch('/members/admin/challenge/months')
}

/** Define o tema de um mês: `PUT /members/admin/challenge/months/:month`. */
export function setChallengeMonth(
  month: string,
  body: unknown,
): Promise<GatewayResponse<ChallengeMonthAdminView>> {
  return gatewayFetch(`/members/admin/challenge/months/${enc(month)}`, { method: 'PUT', body })
}

/** Volta o mês ao sorteio: `DELETE /members/admin/challenge/months/:month`. */
export function clearChallengeMonth(
  month: string,
): Promise<GatewayResponse<ChallengeMonthAdminView>> {
  return gatewayFetch(`/members/admin/challenge/months/${enc(month)}`, { method: 'DELETE' })
}

/** Biblioteca: `GET /members/admin/challenge/themes` (fixos + custom). */
export function listChallengeThemes(): Promise<GatewayResponse<ChallengeThemesAdminView>> {
  return gatewayFetch('/members/admin/challenge/themes')
}

/** Cria tema custom: `POST /members/admin/challenge/themes`. */
export function createChallengeTheme(
  body: unknown,
): Promise<GatewayResponse<ChallengeThemeAdminView>> {
  return gatewayFetch('/members/admin/challenge/themes', { method: 'POST', body })
}

/** Edita/arquiva tema custom: `PATCH /members/admin/challenge/themes/:id`. */
export function updateChallengeTheme(
  id: string,
  body: unknown,
): Promise<GatewayResponse<ChallengeThemeAdminView>> {
  return gatewayFetch(`/members/admin/challenge/themes/${enc(id)}`, { method: 'PATCH', body })
}
