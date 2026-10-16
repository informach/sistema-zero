import { Elysia, t } from 'elysia'
import type { AutomationService } from '../../../application/ai/automation.service'
import type { SettingsService } from '../../../application/settings/settings.service'
import { assertInternalCaller, requireStaff, resolveActor } from '../auth'
import { SettingsPatchBody } from '../dtos'

export interface SettingsRoutesDeps {
  settings: SettingsService
  automation: AutomationService
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
    .get('/helpdesk/settings/automation/diagnostics', ({ headers }) =>
      deps.automation.diagnostics(resolveActor(headers)),
    )
    .get('/helpdesk/settings/automation', ({ headers }) =>
      deps.automation.policy(resolveActor(headers)),
    )
    .patch(
      '/helpdesk/settings/automation',
      ({ headers, body }) =>
        deps.automation.update(resolveActor(headers), body.policy, body.version),
      {
        body: t.Object(
          { version: t.Integer({ minimum: 0 }), policy: t.Unknown() },
          { additionalProperties: false },
        ),
      },
    )
    .get('/helpdesk/settings/automation/evaluations', ({ headers }) =>
      deps.automation.evaluations(resolveActor(headers)),
    )
    .post(
      '/helpdesk/settings/automation/evaluations',
      ({ headers, body }) => deps.automation.recordEvaluation(resolveActor(headers), body),
      { body: t.Unknown() },
    )
    .patch(
      '/helpdesk/settings',
      ({ headers, body }) => deps.settings.patch(resolveActor(headers), body),
      { body: SettingsPatchBody },
    )
}
