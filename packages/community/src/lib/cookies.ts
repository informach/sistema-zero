/**
 * Nomes dos cookies de sessão do aluno (fonte ÚNICA — `session.ts` os escreve e
 * `proxy.ts` lê/regrava no gate de UI; sem centralizar, um divergir do outro
 * deslogaria todo mundo em silêncio — antes deste arquivo os nomes viviam
 * DUPLICADOS nos dois lugares).
 *
 * Em produção (HTTPS) usam o prefixo **`__Host-`**: o browser só aceita o cookie
 * se vier com `Secure`, `Path=/` e SEM `Domain` — prende o cookie a esta origem
 * exata e blinda contra fixation por um subdomínio irmão (que poderia setar um
 * `sz_member_*` de escopo de domínio). Em dev (`http://localhost`) o prefixo é
 * OMITIDO: `__Host-` EXIGE `Secure`, que o browser rejeita sob http. Espelha o
 * admin (`packages/admin/src/lib/cookies.ts`).
 */

/** Aplica o prefixo `__Host-` só em produção (puro — testável nos dois ramos). */
export function prefixedCookieName(base: string, prod: boolean): string {
  return prod ? `__Host-${base}` : base
}

const PROD = process.env.NODE_ENV === 'production'

export const ACCESS_COOKIE = prefixedCookieName('sz_member_access', PROD)
export const REFRESH_COOKIE = prefixedCookieName('sz_member_refresh', PROD)
