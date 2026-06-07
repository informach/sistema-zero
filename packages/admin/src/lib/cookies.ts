/**
 * Nomes dos cookies de sessão do painel (fonte ÚNICA — `session.ts` os escreve e
 * `proxy.ts` lê o de refresh no gate de UI; sem centralizar, um divergir do outro
 * deslogaria todo mundo em silêncio).
 *
 * Em produção (HTTPS) usam o prefixo **`__Host-`**: o browser só aceita o cookie
 * se vier com `Secure`, `Path=/` e SEM `Domain` — prende o cookie a esta origem
 * exata e blinda contra fixation por um subdomínio irmão (que poderia setar um
 * `sz_admin_*` de escopo de domínio). Em dev (`http://localhost`) o prefixo é
 * OMITIDO: `__Host-` EXIGE `Secure`, que o browser rejeita sob http.
 *
 * ⚠️ Ao subir p/ prod, sessões já abertas (cookies sem prefixo) deixam de ser
 * lidas → um único re-login regrava no formato novo.
 */

/** Aplica o prefixo `__Host-` só em produção (puro — testável nos dois ramos). */
export function prefixedCookieName(base: string, prod: boolean): string {
  return prod ? `__Host-${base}` : base
}

/**
 * Atributos p/ EXPIRAR um cookie de sessão (`value: ''` + `maxAge: 0`), casando
 * com os da escrita. ⚠️ Load-bearing: o browser aplica as regras do prefixo
 * `__Host-` a TODO Set-Cookie do nome — inclusive o de remoção. Um
 * `cookies().delete(nome)` pelado (sem `Secure`) é REJEITADO em prod e o cookie
 * SOBREVIVE: logout que não desloga (visto no e2e do community em staging,
 * 07/06/2026 — mesmo padrão aqui).
 */
export function expireCookieOptions(prod: boolean) {
  return { httpOnly: true, sameSite: 'lax' as const, secure: prod, path: '/', maxAge: 0 }
}

const PROD = process.env.NODE_ENV === 'production'

export const ACCESS_COOKIE = prefixedCookieName('sz_admin_access', PROD)
export const REFRESH_COOKIE = prefixedCookieName('sz_admin_refresh', PROD)
