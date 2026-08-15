import { describe, expect, test } from 'bun:test'
import { canHideReportedContent } from '../src/lib/hub-moderation'
import type { HubReportedContentView } from '../src/lib/hub-types'

const content = (status: HubReportedContentView['status']): HubReportedContentView =>
  ({ status }) as HubReportedContentView

describe('política de ações da moderação', () => {
  test('ocultar só aparece para conteúdo visível', () => {
    expect(canHideReportedContent(content('visible'))).toBe(true)
    expect(canHideReportedContent(content('pending'))).toBe(false)
    expect(canHideReportedContent(content('hidden'))).toBe(false)
    expect(canHideReportedContent(content('rejected'))).toBe(false)
    expect(canHideReportedContent(content('deleted'))).toBe(false)
    expect(canHideReportedContent(null)).toBe(false)
  })
})
