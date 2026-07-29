import { describe, expect, it } from 'bun:test'
import {
  DEFAULT_TERMINAL_PROCESS_TIMEOUT_MS,
  resolvePreviewSecurity,
  resolveStudioConfig,
} from './config'

describe('resolveStudioConfig — modo profissional', () => {
  it('professional força terminal:true e mantém a allowlist do host (D2: modos por kind)', () => {
    // D2: professional NÃO força mais code-only globalmente — os modos passam a
    // depender do `kind` do projeto (modesForKind). A allowlist do host é mantida.
    const cfg = resolveStudioConfig({ professional: true }, ['blocks', 'bridge'])
    expect(cfg.professional).toBe(true)
    expect(cfg.terminal).toBe(true)
    expect(cfg.allowedModes).toEqual(['blocks', 'bridge'])
  })

  it('default é não-profissional e não força terminal', () => {
    const cfg = resolveStudioConfig(undefined, undefined)
    expect(cfg.professional).toBe(false)
    expect(cfg.terminal).toBe(false)
    expect(cfg.allowedModes.length).toBeGreaterThan(1)
  })

  it('professional respeita terminal:false quando a aula usa runtime remoto', () => {
    const cfg = resolveStudioConfig({ professional: true, terminal: false }, undefined)
    expect(cfg.terminal).toBe(false)
  })

  it('sem professional, terminal segue a flag do host', () => {
    expect(resolveStudioConfig({ terminal: true }, undefined).terminal).toBe(true)
    expect(resolveStudioConfig({ terminal: false }, undefined).terminal).toBe(false)
  })

  it('professional não quebra os outros defaults', () => {
    const cfg = resolveStudioConfig({ professional: true }, undefined)
    expect(cfg.preview).toBe(true)
    expect(cfg.console).toBe(true)
    expect(cfg.extensions).toBe(true)
  })
})

describe('resolvePreviewSecurity — timeout do terminal', () => {
  it('usa o default quando não informado', () => {
    expect(resolvePreviewSecurity().terminalProcessTimeoutMs).toBe(
      DEFAULT_TERMINAL_PROCESS_TIMEOUT_MS,
    )
  })
  it('respeita o limite do host (>0)', () => {
    expect(
      resolvePreviewSecurity({ terminalProcessTimeoutMs: 60_000 }).terminalProcessTimeoutMs,
    ).toBe(60_000)
  })
  it('ignora valores inválidos (≤0)', () => {
    expect(resolvePreviewSecurity({ terminalProcessTimeoutMs: 0 }).terminalProcessTimeoutMs).toBe(
      DEFAULT_TERMINAL_PROCESS_TIMEOUT_MS,
    )
  })
})
