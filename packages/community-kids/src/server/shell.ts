import 'server-only'
import { createShell } from '@sistemazero/member-shell'

/**
 * Instância ÚNICA do shell deste app (community-kids = vitrine KIDS, cookies
 * `sz_kids_*`). Os módulos em `src/server/*` e `src/lib/cookies.ts` são shims
 * que re-exportam daqui — páginas/handlers importam `@/server/...`. A vitrine
 * `kids` só afeta as LISTAGENS do members (curso kids fica fora da chave-mestra
 * adulta; acesso é por matrícula específica).
 */
export const shell = createShell({
  cookieBase: 'sz_kids',
  audience: 'kids',
  serviceName: '@sistemazero/community-kids',
})
