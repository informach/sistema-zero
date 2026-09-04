import { Elysia } from 'elysia'
import type { SettingsService } from '../../../application/settings/settings.service'
import { assertInternalCaller, requireStaff, resolveActor } from '../auth'
import { SettingsPatchBody } from '../dtos'

export interface SettingsRoutesDeps {
  settings: SettingsService
  internalToken?: string
  requireStaffEnabled: boolean
}

/** Configurações do help desk (assinatura das respostas humanas). */
export function settingsRoutes(deps: SettingsRoutesDeps) {
  return new Elysia()
    .onBeforeHandle(({ headers }) => {
      assertInternalCaller(headers['x-internal-token'], deps.internalToken)
      requireStaff(headers, deps.requireStaffEnabled)
    })
    .get('/helpdesk/settings', () => deps.settings.get())
    .patch(
      '/helpdesk/settings',
      ({ headers, body }) => deps.settings.patch(resolveActor(headers), body),
      { body: SettingsPatchBody },
    )
}
