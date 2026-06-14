import { describe, expect, it } from 'bun:test'
import { escapeScriptContent, escapeStyleContent } from '../escape'

describe('escapeScriptContent', () => {
  it('neutraliza apenas o fechamento </script (early-close)', () => {
    const out = escapeScriptContent('const html = "</script><img src=x>";')
    // O fechamento literal vira `<\/script` (não encerra o elemento).
    expect(out).toContain('<\\/script')
    expect(out).not.toMatch(/<\/script/)
  })

  it('neutraliza as aberturas <!-- e <script (impede o estado de duplo-escape)', () => {
    // `<!--` seguido de `<script` põe o tokenizer HTML em "script data double
    // escaped", estado no qual o `</script>` REAL do gerador NÃO fecha mais o
    // elemento e o resto do documento vira script. Neutralizar a ABERTURA impede
    // entrar nesse estado — só neutralizar o fechamento NÃO basta.
    const out = escapeScriptContent('/* <!-- */ const t = "<script>foo</script>";')
    expect(out).toContain('<\\!--')
    expect(out).toContain('<\\script>')
    expect(out).toContain('<\\/script>')
    // Nenhuma sequência CRUA de abertura/fechamento sobra para o tokenizer.
    expect(out).not.toMatch(/<!--/)
    expect(out).not.toMatch(/<script/)
    expect(out).not.toMatch(/<\/script/)
  })
})

describe('escapeStyleContent', () => {
  it('neutraliza o fechamento </style', () => {
    const out = escapeStyleContent('body { content: "</style>"; }')
    expect(out).toContain('<\\/style')
    expect(out).not.toMatch(/<\/style/)
  })
})
