import 'server-only'
import { createShell } from '@sistemazero/member-shell'

/**
 * Instância ÚNICA do shell deste app (community = vitrine ADULTA, cookies
 * `sz_member_*`). Os módulos em `src/server/*` e `src/lib/cookies.ts` são shims
 * que re-exportam daqui — páginas/handlers seguem importando `@/server/...`.
 * O Turbopack re-executa este wrapper em cada bundle com a MESMA config
 * (determinístico); estado compartilhado real vive em `globalThis` no shell.
 */
export const shell = createShell({
  cookieBase: 'sz_member',
  audience: 'adult',
  serviceName: '@sistemazero/community',
})
