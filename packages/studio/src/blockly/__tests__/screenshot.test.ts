import { describe, expect, it } from 'bun:test'
import {
  buildBlocksSvg,
  canonicalBlockFontFamily,
  collectBlocklyCss,
  firstFontUrl,
  looksLikeFontBinary,
} from '../screenshot'

const SVG_NS = 'http://www.w3.org/2000/svg'

/** Workspace falso com só o que `buildBlocksSvg` usa (rasterizar é browser-only). */
function fakeWorkspace(box: { left: number; top: number; right: number; bottom: number }) {
  const canvas = document.createElementNS(SVG_NS, 'g')
  canvas.setAttribute('transform', 'translate(40,30) scale(1.5)') // pan/zoom a ser removido
  canvas.appendChild(document.createElementNS(SVG_NS, 'rect'))
  return {
    getBlocksBoundingBox: () => box,
    getCanvas: () => canvas,
    getTheme: () => ({ name: 'sz-light', getComponentStyle: () => '#fef9ef' }),
    options: { renderer: 'zelos' },
  } as never
}

describe('buildBlocksSvg — imagem de TODOS os blocos', () => {
  it('enquadra a moldura TOTAL no viewBox e remove o transform de pan/zoom', () => {
    const out = buildBlocksSvg(fakeWorkspace({ left: 10, top: 20, right: 110, bottom: 70 }))
    expect(out).not.toBeNull()
    expect(out?.width).toBe(100)
    expect(out?.height).toBe(50)
    // viewBox cobre a moldura inteira (não a viewport) → pega blocos fora da tela.
    expect(out?.svg).toContain('viewBox="10 20 100 50"')
    // o transform do scroll/zoom NÃO entra na imagem.
    expect(out?.svg).not.toContain('translate(40,30)')
    expect(out?.svg).toContain('zelos-renderer')
    expect(out?.svg).toContain('sz-light-theme')
  })

  it('devolve null quando não há blocos (moldura sem área)', () => {
    expect(buildBlocksSvg(fakeWorkspace({ left: 0, top: 0, right: 0, bottom: 0 }))).toBeNull()
  })
})

describe('canonicalBlockFontFamily — mapeia o nome hasheado do next/font p/ o literal do texto', () => {
  it('nomes hasheados do next/font caem no nome LITERAL que o <text> pede', () => {
    // next/font registra a família com hash; o texto do bloco pede 'Baloo 2'/'Nunito'.
    expect(canonicalBlockFontFamily('__Baloo_2_ab12ef')).toBe('Baloo 2')
    expect(canonicalBlockFontFamily('__Baloo_2_Fallback_ab12ef')).toBe('Baloo 2')
    expect(canonicalBlockFontFamily('__Nunito_9f8c')).toBe('Nunito')
  })

  it('nome literal permanece o mesmo (host que já usa Baloo 2/Nunito)', () => {
    expect(canonicalBlockFontFamily('Baloo 2')).toBe('Baloo 2')
    expect(canonicalBlockFontFamily('Nunito')).toBe('Nunito')
  })

  it('família sem relação passa direto', () => {
    expect(canonicalBlockFontFamily('Comic Sans MS')).toBe('Comic Sans MS')
  })
})

describe('firstFontUrl — resolve a url da @font-face contra a FOLHA dona da regra', () => {
  it('URL relativa resolve contra o href da folha (formato do next/font no Next 16)', () => {
    // O CSS do next/font vive em /_next/static/chunks/ e aponta ../media/x.woff2.
    // Resolver contra a PÁGINA (/cursos/…/aulas/…) montava um caminho inexistente —
    // era o print quebrado do kids (fonte não embutida → fallback largo no PNG).
    const url = firstFontUrl(
      'url("../media/abc123.woff2") format("woff2")',
      'https://kids.sistemazero.com.br/_next/static/chunks/app.css',
    )
    expect(url).toBe('https://kids.sistemazero.com.br/_next/static/media/abc123.woff2')
  })

  it('URL absoluta ignora a base', () => {
    const url = firstFontUrl(
      "url(https://fonts.gstatic.com/s/baloo2/v23/x.woff2) format('woff2')",
      'https://kids.sistemazero.com.br/_next/static/chunks/app.css',
    )
    expect(url).toBe('https://fonts.gstatic.com/s/baloo2/v23/x.woff2')
  })

  it('sem href de folha (style inline) cai no baseURI do documento', () => {
    // happy-dom nasce em about:blank (base inválida p/ new URL) — o <base> dá a
    // âncora que uma página real sempre tem.
    const base = document.createElement('base')
    base.href = 'http://host.local/aulas/'
    document.head.appendChild(base)
    try {
      expect(firstFontUrl('url(/fonts/x.woff2)', null)).toBe('http://host.local/fonts/x.woff2')
    } finally {
      base.remove()
    }
  })

  it('data: já embutido e src sem url() devolvem null', () => {
    expect(firstFontUrl('url(data:font/woff2;base64,AAAA)', null)).toBeNull()
    expect(firstFontUrl('local(Arial)', null)).toBeNull()
  })
})

describe('looksLikeFontBinary — não embute resposta de catch-all como fonte', () => {
  const tagged = (tag: string) => {
    const buf = new Uint8Array(8)
    for (let i = 0; i < 4; i++) buf[i] = tag.charCodeAt(i)
    return buf.buffer
  }

  it('aceita wOF2/wOFF/OTTO/TrueType', () => {
    expect(looksLikeFontBinary(tagged('wOF2'))).toBe(true)
    expect(looksLikeFontBinary(tagged('wOFF'))).toBe(true)
    expect(looksLikeFontBinary(tagged('OTTO'))).toBe(true)
    expect(looksLikeFontBinary(new Uint8Array([0, 1, 0, 0, 9, 9]).buffer)).toBe(true)
  })

  it('recusa HTML de SPA-fallback (dev server responde 200 com index.html) e vazio', () => {
    expect(looksLikeFontBinary(new TextEncoder().encode('<!doctype html><html>').buffer)).toBe(
      false,
    )
    expect(looksLikeFontBinary(new ArrayBuffer(0))).toBe(false)
  })
})

describe('collectBlocklyCss — só as folhas do Blockly', () => {
  it('inclui as <style> com .blocklySvg e ignora as demais', () => {
    const blockly = document.createElement('style')
    blockly.textContent = '.blocklySvg { background: red } .blocklyText { fill: #fff }'
    const outra = document.createElement('style')
    outra.textContent = '.naoDeveEntrar { color: blue }'
    document.head.append(blockly, outra)
    try {
      const css = collectBlocklyCss()
      expect(css).toContain('.blocklyText')
      expect(css).not.toContain('.naoDeveEntrar')
    } finally {
      blockly.remove()
      outra.remove()
    }
  })
})
