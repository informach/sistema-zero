import { describe, expect, it } from 'bun:test'
import { buildPermissionGuardRuntime, STUDENT_BASELINE_PERMISSIONS } from '../permissionGuard'

describe('buildPermissionGuardRuntime', () => {
  it('por padrão (sem rede) bloqueia fetch/XHR/WebSocket', () => {
    const rt = buildPermissionGuardRuntime()
    expect(rt).not.toBe('')
    expect(rt).toContain("window.fetch = blocked('fetch')")
    expect(rt).toContain("blocked('WebSocket')")
    expect(rt).toContain('var ALLOW = null;')
  })

  it('com fetchAllowedOrigins, envolve fetch validando a origem', () => {
    const rt = buildPermissionGuardRuntime({ fetchAllowedOrigins: ['https://api.exemplo.com'] })
    expect(rt).toContain('https://api.exemplo.com')
    expect(rt).toContain('allowed(input)')
    // ainda bloqueia WebSocket (não casa allowlist http(s))
    expect(rt).toContain("blocked('WebSocket')")
  })

  it('extensão com network e sem allowlist libera tudo (guard vazio)', () => {
    expect(buildPermissionGuardRuntime({ granted: ['network'] })).toBe('')
  })

  it('a baseline do aluno NÃO inclui network', () => {
    expect(STUDENT_BASELINE_PERMISSIONS).not.toContain('network')
    expect(STUDENT_BASELINE_PERMISSIONS).toContain('audio')
    expect(STUDENT_BASELINE_PERMISSIONS).toContain('storage')
  })

  it('origens inválidas são descartadas → vira bloqueio total', () => {
    const rt = buildPermissionGuardRuntime({ fetchAllowedOrigins: ['não-é-origem'] })
    expect(rt).toContain('var ALLOW = null;')
  })
})
