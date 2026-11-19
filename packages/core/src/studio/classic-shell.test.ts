import { describe, expect, it } from 'bun:test'
import {
  buildClassicShellPage,
  CLASSIC_SHELL_GAME_SANDBOX,
  classicShellHeaders,
  isClassicShellReady,
  parseClassicShellParentOrigins,
} from './classic-shell'

describe('casca da prévia do Clássico', () => {
  it('aceita só origens http(s) exatas, sem caminho nem credencial', () => {
    expect(
      parseClassicShellParentOrigins(
        'https://www.sistemazero.com.br, http://localhost:5195  https://a.test/caminho javascript:alert(1) https://u:p@b.test',
      ),
    ).toEqual(['https://www.sistemazero.com.br', 'http://localhost:5195'])
    expect(parseClassicShellParentOrigins(undefined)).toEqual([])
  })

  it('a página usa o mesmo sandbox da prévia direta e nunca allow-same-origin', () => {
    const page = buildClassicShellPage(['https://a.test'])
    expect(page).toContain(JSON.stringify(CLASSIC_SHELL_GAME_SANDBOX))
    expect(page).not.toContain('allow-same-origin')
    expect(page).toContain('"https://a.test"')
    // O script é JavaScript válido (é uma string; o TypeScript não olha dentro).
    const script = page.slice(page.indexOf('<script>') + 8, page.indexOf('</script>'))
    expect(() => new Function(script.replaceAll('\\u003c', '<'))).not.toThrow()
  })

  it('os cabeçalhos só restringem quem embute: um srcdoc herda a CSP da casca', () => {
    const headers = classicShellHeaders(['https://a.test', 'https://b.test'])
    expect(headers['content-security-policy']).toBe('frame-ancestors https://a.test https://b.test')
    expect(headers['cross-origin-embedder-policy']).toBe('credentialless')
    expect(headers['cross-origin-resource-policy']).toBe('cross-origin')
    expect(classicShellHeaders([])['content-security-policy']).toBe("frame-ancestors 'none'")
  })

  it('reconhece o aviso de pronta', () => {
    expect(isClassicShellReady({ type: 'sz-shell:ready' })).toBe(true)
    expect(isClassicShellReady('sz-shell:ready')).toBe(false)
  })
})
