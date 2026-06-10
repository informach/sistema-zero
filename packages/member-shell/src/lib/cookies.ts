/**
 * Helpers PUROS dos cookies de sessão dos apps de área do aluno. As CONSTANTES
 * com o nome concreto vivem em cada app (`sz_member_*` no community,
 * `sz_kids_*` no community-kids) — são compile-time por app DE PROPÓSITO:
 * cookies não são escopados por porta em dev (localhost:3007 e :3008 dividem o
 * jar) e um nome via env esquecida colidiria em silêncio. Cada app constrói os
 * nomes com `sessionCookieNames(base, prod)` e os injeta no `createShell`.
 *
 * Em produção (HTTPS) os nomes ganham o prefixo **`__Host-`**: o browser só
 * aceita o cookie com `Secure`, `Path=/` e SEM `Domain` — prende o cookie à
 * origem exata e blinda contra fixation por um subdomínio irmão.
 */

/** Aplica o prefixo `__Host-` só em produção (puro — testável nos dois ramos). */
export function prefixedCookieName(base: string, prod: boolean): string {
  return prod ? `__Host-${base}` : base
}

/** Nomes do par de cookies de sessão de um app (`<base>_access`/`<base>_refresh`). */
export function sessionCookieNames(
  base: string,
  prod: boolean,
): { accessCookie: string; refreshCookie: string } {
  return {
    accessCookie: prefixedCookieName(`${base}_access`, prod),
    refreshCookie: prefixedCookieName(`${base}_refresh`, prod),
  }
}

/** Par de nomes injetado no `createShell` (ver `sessionCookieNames`). */
export interface SessionCookieNames {
  accessCookie: string
  refreshCookie: string
}

/**
 * Atributos p/ EXPIRAR um cookie de sessão (`value: ''` + `maxAge: 0`), casando
 * com os da escrita. ⚠️ Load-bearing: o browser aplica as regras do prefixo
 * `__Host-` a TODO Set-Cookie do nome — inclusive o de remoção. Um
 * `cookies().delete(nome)` pelado (sem `Secure`) é REJEITADO em prod e o cookie
 * SOBREVIVE: logout que não desloga (visto no e2e de staging, 07/06/2026).
 */
export function expireCookieOptions(prod: boolean) {
  return { httpOnly: true, sameSite: 'lax' as const, secure: prod, path: '/', maxAge: 0 }
}
