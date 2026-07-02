import { describe, expect, it } from 'bun:test'
import { SVG_MAX_CHARS, sanitizeIconSvg } from '../src/lib/svg-sanitize'

const OK_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><circle cx="64" cy="64" r="50" fill="#22d3ee"/><path d="M30 70 L64 30 L98 70 Z" fill="#C4F042"/></svg>'

describe('sanitizeIconSvg (allowlist estrita — ícone gerado por LLM)', () => {
  it('preserva um ícone legítimo (formas + viewBox + cores)', () => {
    const out = sanitizeIconSvg(OK_ICON)
    expect(out).not.toBeNull()
    expect(out).toContain('<svg')
    expect(out).toContain('viewBox="0 0 128 128"')
    expect(out).toContain('<circle')
    expect(out).toContain('fill="#C4F042"')
  })

  it('remove <script> e handlers on*', () => {
    const out = sanitizeIconSvg(
      '<svg viewBox="0 0 10 10"><script>alert(1)</script><rect x="1" y="1" width="2" height="2" onload="alert(1)" onclick="x()"/></svg>',
    )
    expect(out).not.toBeNull()
    expect(out).not.toContain('script')
    expect(out).not.toContain('onload')
    expect(out).not.toContain('onclick')
    expect(out).not.toContain('alert')
  })

  it('remove foreignObject/image/use/a e href externo', () => {
    const out = sanitizeIconSvg(
      '<svg viewBox="0 0 10 10"><foreignObject><body>x</body></foreignObject><image href="https://evil.example/x.png"/><use href="#y"/><a href="https://evil.example"><rect x="0" y="0" width="1" height="1"/></a></svg>',
    )
    expect(out).not.toBeNull()
    expect(out).not.toContain('foreignObject')
    expect(out).not.toContain('image')
    expect(out).not.toContain('href')
    expect(out).not.toContain('evil.example')
    // A forma DENTRO do <a> sobrevive (só o wrapper some).
    expect(out).toContain('<rect')
  })

  it('barra javascript:/data:/url() externo em atributos, preservando url(#gradiente)', () => {
    const out = sanitizeIconSvg(
      '<svg viewBox="0 0 10 10"><defs><linearGradient id="g1"><stop offset="0" stop-color="#fff"/></linearGradient></defs><rect x="0" y="0" width="2" height="2" fill="url(#g1)"/><circle cx="1" cy="1" r="1" fill="url(https://evil.example)"/><path d="M0 0" fill="javascript:alert(1)"/></svg>',
    )
    expect(out).not.toBeNull()
    expect(out).toContain('fill="url(#g1)"')
    expect(out).not.toContain('evil.example')
    expect(out).not.toContain('javascript:')
    // O camelCase do gradiente sobrevive (SVG é case-sensitive).
    expect(out).toContain('<linearGradient')
  })

  it('remove style/class e comentários/CDATA/doctype', () => {
    const out = sanitizeIconSvg(
      '<!DOCTYPE svg><!-- oi --><svg viewBox="0 0 10 10" class="x" style="background:url(https://e.x)"><![CDATA[boom]]><rect x="0" y="0" width="1" height="1" style="fill:red"/></svg>',
    )
    expect(out).not.toBeNull()
    expect(out).not.toContain('style')
    expect(out).not.toContain('class')
    expect(out).not.toContain('DOCTYPE')
    expect(out).not.toContain('boom')
  })

  it('devolve null para: vazio, sem <svg>, sem forma, grande demais', () => {
    expect(sanitizeIconSvg('')).toBeNull()
    expect(sanitizeIconSvg('<div>oi</div>')).toBeNull()
    expect(sanitizeIconSvg('<svg viewBox="0 0 1 1"><defs/></svg>')).toBeNull()
    const huge = `<svg viewBox="0 0 1 1"><path d="M${'0 '.repeat(SVG_MAX_CHARS)}"/></svg>`
    expect(sanitizeIconSvg(huge)).toBeNull()
  })

  it('fecha tags desequilibradas sem quebrar o documento', () => {
    const out = sanitizeIconSvg(
      '<svg viewBox="0 0 10 10"><g><rect x="0" y="0" width="1" height="1"/>',
    )
    expect(out).not.toBeNull()
    expect(out?.endsWith('</svg>')).toBe(true)
    // Todo aberto foi fechado (contagem igual de < e </ para g e svg).
    expect(out?.match(/<g[ >]/g)?.length ?? 0).toBe(out?.match(/<\/g>/g)?.length ?? -1)
  })
})
