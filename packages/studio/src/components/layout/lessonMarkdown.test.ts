import { describe, expect, it } from 'bun:test'
import { renderLessonMarkdown } from './lessonMarkdown'

describe('renderLessonMarkdown', () => {
  it('vazio → string vazia', () => {
    expect(renderLessonMarkdown('')).toBe('')
    expect(renderLessonMarkdown('   \n  ')).toBe('')
  })

  it('parágrafo simples + negrito/itálico/código', () => {
    const out = renderLessonMarkdown('Faça um **botão** que *conta* com `let`')
    expect(out).toContain('<p>')
    expect(out).toContain('<strong>botão</strong>')
    expect(out).toContain('<em>conta</em>')
    expect(out).toContain('<code')
    expect(out).toContain('let</code>')
  })

  it('títulos viram h3/h4/h5', () => {
    expect(renderLessonMarkdown('# Título')).toContain('<h3')
    expect(renderLessonMarkdown('## Sub')).toContain('<h4')
    expect(renderLessonMarkdown('### Sub-sub')).toContain('<h5')
  })

  it('lista não-ordenada vira <ul><li>', () => {
    const out = renderLessonMarkdown('- um\n- dois')
    expect(out).toContain('<ul')
    expect(out).toContain('<li>um</li>')
    expect(out).toContain('<li>dois</li>')
  })

  it('quebra simples dentro do parágrafo vira <br>', () => {
    const out = renderLessonMarkdown('linha 1\nlinha 2')
    expect(out).toContain('linha 1<br>linha 2')
  })

  it('link http(s) vira âncora com rel/target seguros', () => {
    const out = renderLessonMarkdown('veja [aqui](https://sistemazero.com.br)')
    expect(out).toContain('<a href="https://sistemazero.com.br"')
    expect(out).toContain('rel="noopener noreferrer"')
    expect(out).toContain('>aqui</a>')
  })

  it('SEGURANÇA: HTML do autor é escapado (sem <script> cru)', () => {
    const out = renderLessonMarkdown('oi <script>alert(1)</script> <img src=x onerror=alert(1)>')
    expect(out).not.toContain('<script>')
    expect(out).not.toContain('<img')
    expect(out).toContain('&lt;script&gt;')
  })

  it('SEGURANÇA: link com esquema perigoso NÃO vira âncora (fica texto puro)', () => {
    const js = renderLessonMarkdown('[x](javascript:alert(1))')
    expect(js).not.toContain('<a ')
    expect(js).not.toContain('href="javascript:') // o que importa: nenhum href perigoso
    const data = renderLessonMarkdown('[y](data:text/html,<script>alert(1)</script>)')
    expect(data).not.toContain('<a ')
    expect(data).not.toContain('href="data:')
    expect(data).not.toContain('<script>')
  })

  it('SEGURANÇA: aspas/ângulos no rótulo do link não escapam do atributo', () => {
    const out = renderLessonMarkdown('[a"b](https://x.test)')
    expect(out).not.toContain('"b](') // foi escapado/transformado, não cru
    expect(out).toContain('&quot;')
  })

  it('lista com linha de CONTINUAÇÃO indentada junta no mesmo item', () => {
    const out = renderLessonMarkdown(
      '- **Estados** — o jogo vive em UM\n  estado por vez\n- outro item',
    )
    expect(out.match(/<li>/g)?.length).toBe(2)
    expect(out).toContain('UM estado por vez')
    expect(out).not.toContain('- **') // o marcador não vaza como texto
  })

  it('citação (> …) vira blockquote com inline renderizado', () => {
    const out = renderLessonMarkdown('> ⚠️ Use **um** por projeto')
    expect(out).toContain('<blockquote')
    expect(out).toContain('<strong>um</strong>')
    expect(out).not.toContain('&gt; ⚠️') // o marcador não vaza como texto
    // Multi-linha: as linhas do bloco viram <br> dentro da MESMA citação.
    const multi = renderLessonMarkdown('> linha 1\n> linha 2')
    expect(multi.match(/<blockquote/g)?.length).toBe(1)
    expect(multi).toContain('linha 1<br>linha 2')
  })
})
