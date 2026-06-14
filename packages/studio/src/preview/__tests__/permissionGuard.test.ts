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

  it('NÃO libera blob:/data: cuja origem interna casa a allowlist (#LOW)', () => {
    // blob:https://api.exemplo.com/uuid tem protocol blob: mas origin
    // https://api.exemplo.com — sem a checagem de protocolo, allowed() passaria.
    const rt = buildPermissionGuardRuntime({
      fetchAllowedOrigins: ['https://api.exemplo.com'],
    })
    // Executa o IIFE num window falso; fetch original devolve um marcador.
    const ALLOWED_MARKER = Symbol('passou')
    const fakeWindow: Record<string, unknown> = {
      fetch: () => ALLOWED_MARKER,
    }
    const fakeLocation = { href: 'https://aluno.preview/' }
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    new Function('window', 'location', rt)(fakeWindow, fakeLocation)
    const wrappedFetch = fakeWindow.fetch as (input: string) => unknown

    // URL https legítima da allowlist → passa para o fetch original.
    expect(wrappedFetch('https://api.exemplo.com/dados')).toBe(ALLOWED_MARKER)

    // blob: com a MESMA origem interna → bloqueado (retorna Promise rejeitada).
    const blobResult = wrappedFetch('blob:https://api.exemplo.com/uuid-1234')
    expect(blobResult).toBeInstanceOf(Promise)
    return expect(blobResult).rejects.toThrow('não liberado')
  })
})
