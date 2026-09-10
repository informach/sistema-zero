import 'server-only'
import { sessionCookieNames } from './lib/cookies'
import { createShellRoutes } from './routes'
import { createCertificateRoutes } from './routes/certificate'
import { createCreationCleanupWorkerRoutes } from './routes/creation-cleanup'
import { createCreationsRoutes } from './routes/creations'
import { createHelpdeskRoutes } from './routes/helpdesk'
import { createHubRoutes } from './routes/hub'
import { createPensaRoutes } from './routes/pensa'
import { createPensaAiRoutes } from './routes/pensa-ai'
import { createStudioRoutes } from './routes/studio'
import { createStudioZappyRoutes } from './routes/studio-zappy'
import {
  createAuthClient,
  createHubClient,
  createMembersClient,
  createPaymentsClient,
  createProfilesClient,
  type MembersAudience,
} from './server/clients'
import { createGatewayModule } from './server/gateway'
import { createMediaModule } from './server/media'
import { createSessionModule } from './server/session'

export interface ShellConfig {
  /**
   * Base dos cookies de sessão (`sz_member` no community, `sz_kids` no kids) —
   * compile-time por app: cookies não escopam por porta em dev e os dois apps
   * podem rodar lado a lado (localhost:3007/:3008) com jars independentes.
   */
  cookieBase: string
  /** Vitrine do members deste app (`adult` | `kids`) — só afeta as LISTAGENS. */
  audience: MembersAudience
  /** Nome do app p/ logs/erros (ex.: `@sistemazero/community`). */
  serviceName: string
}

export type Shell = ReturnType<typeof createShell>

/**
 * Compositor do BFF de um app de área do aluno. Chamado UMA vez no wrapper
 * `src/server/shell.ts` de cada app — o Turbopack separa proxy/RSC/handlers em
 * bundles com cópias dos módulos, e cada bundle re-executa o wrapper com a
 * MESMA config estática (determinístico); o estado compartilhado real
 * (single-flight do refresh, gate da marca d'água, JWKS) vive em `globalThis`
 * via `Symbol.for` DENTRO dos módulos do shell — nunca em closure de factory.
 */
export function createShell(cfg: ShellConfig) {
  // process.env DIRETO (não o zod do lib/env): createShell roda em MODULE SCOPE
  // (wrapper shell.ts de cada app) — o getEnv() validaria a env inteira no
  // import e quebraria o `next build` (page data collection roda com
  // NODE_ENV=production sobre a .env de dev). Mesma técnica do lib/cookies
  // original; o zod continua validando no PRIMEIRO USO real.
  const cookies = sessionCookieNames(cfg.cookieBase, process.env.NODE_ENV === 'production')
  const session = createSessionModule(cookies)
  const gateway = createGatewayModule(session)
  const auth = createAuthClient(gateway)
  const members = createMembersClient(gateway, { audience: cfg.audience })
  const payments = createPaymentsClient(gateway)
  const profiles = createProfilesClient(gateway)
  const hub = createHubClient(gateway, { audience: cfg.audience })
  const media = createMediaModule({ session, gateway })
  const routes = {
    ...createShellRoutes({ session, gateway, auth, members, payments, profiles, media }),
    ...createHubRoutes({ hub, members, media, session, audience: cfg.audience }),
    ...createHelpdeskRoutes({ gateway, session, audience: cfg.audience }),
    ...createStudioRoutes({ hub, members, media }),
    ...createStudioZappyRoutes({ members, session }),
    ...createCertificateRoutes({ members, session }),
    ...createPensaRoutes({ members, session }),
    ...createPensaAiRoutes({ members, session }),
    ...createCreationsRoutes({ members, session }),
    ...createCreationCleanupWorkerRoutes({ gateway }),
  }

  return {
    config: cfg,
    cookies,
    session,
    gateway,
    auth,
    members,
    payments,
    profiles,
    hub,
    media,
    routes,
  }
}
