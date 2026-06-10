import { ValidationError } from '@sistemazero/core/errors'

/**
 * Plataforma de DESTINO dos links de e-mail (reset/convite/impersonação):
 * `main` = community (área do aluno adulta) | `kids` = community-kids.
 * É um enum request-scoped — o usuário NÃO tem "plataforma home" persistida
 * (a mesma conta pode um dia acessar as duas); cada fluxo que dispara link
 * informa o destino no momento da request. O cliente NUNCA manda URL — só o
 * enum, mapeado aqui para as envs `COMMUNITY_URL`/`KIDS_COMMUNITY_URL`.
 */
export const PLATFORMS = ['main', 'kids'] as const
export type Platform = (typeof PLATFORMS)[number]

export interface PlatformUrls {
  main: string
  /** Ausente até a plataforma kids existir — pedir `kids` sem ela → 400. */
  kids?: string
}

/**
 * Base do link da plataforma pedida. `kids` sem `KIDS_COMMUNITY_URL` configurada
 * lança `ValidationError` (400): erro de CONFIGURAÇÃO deve aflorar na hora —
 * nunca cair em silêncio num link da plataforma errada.
 */
export function resolvePlatformUrl(urls: PlatformUrls, platform: Platform = 'main'): string {
  if (platform === 'kids') {
    if (!urls.kids) {
      throw new ValidationError('Plataforma kids não configurada (KIDS_COMMUNITY_URL ausente)')
    }
    return urls.kids
  }
  return urls.main
}
