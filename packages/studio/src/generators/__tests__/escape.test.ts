import { describe, expect, it } from 'bun:test'
import { escapeScriptContent, escapeStyleContent } from '../escape'

describe('escapeScriptContent', () => {
  it('neutraliza apenas o fechamento </script (early-close)', () => {
    const out = escapeScriptContent('const html = "</script><img src=x>";')
    // O fechamento literal vira `<\/script` (não encerra o elemento).
    expect(out).toContain('<\\/script')
    expect(out).not.toMatch(/<\/script/)
  })

  it('NÃO reescreve <!-- nem <script (preserva regex /u do aluno)', () => {
    // Neutralizar SÓ o fechamento `</script` já basta: como ele é sempre
    // escapado, o `</script>` REAL do gerador é o único que casa o parser de
    // fechamento, então o documento nunca escorrega para o estado de
    // duplo-escape. Reescrever `<!--`/`<script` QUEBRAVA regex literais (ex.:
    // `/<!--/u` virava `/<\!--/u` → SyntaxError sob a flag `u`).
    const out = escapeScriptContent('/* <!-- */ const t = "<script>foo</script>";')
    // Só o fechamento é neutralizado.
    expect(out).toContain('<\\/script>')
    expect(out).not.toMatch(/<\/script[^>]/) // nenhum fechamento cru sobra
    // Aberturas ficam INTACTAS — não há mais `<\!--` nem `<\script`.
    expect(out).toContain('<!--')
    expect(out).toContain('<script>')
    expect(out).not.toContain('<\\!--')
    expect(out).not.toContain('<\\script')
  })

  it('preserva regex literal /<!--/u sem corromper (não vira SyntaxError)', () => {
    const out = escapeScriptContent('const re = /<!--/u; const s = "</script>";')
    // O regex do aluno sai verbatim (sem `<\!--`), mas o fechamento é escapado.
    expect(out).toContain('/<!--/u')
    expect(out).toContain('<\\/script>')
  })
})

describe('escapeStyleContent', () => {
  it('neutraliza o fechamento </style', () => {
    const out = escapeStyleContent('body { content: "</style>"; }')
    expect(out).toContain('<\\/style')
    expect(out).not.toMatch(/<\/style/)
  })
})
