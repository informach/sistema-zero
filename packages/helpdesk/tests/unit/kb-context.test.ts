import { describe, expect, it } from 'bun:test'
import { selectRelevantKbArticles } from '../../src/application/ai/kb-context'

describe('selectRelevantKbArticles', () => {
  it('prioriza artigos relacionados e respeita o orçamento renderizado', () => {
    const selected = selectRelevantKbArticles(
      'Não consigo acessar o curso porque esqueci minha senha',
      [
        { title: 'Parcerias com escolas', content: 'Proposta comercial e contrato.' },
        { title: 'Redefinir senha e acesso', content: 'Abra a tela de login e redefina a senha.' },
        {
          title: 'Acesso ao curso',
          content: 'Como localizar as aulas depois do login.'.repeat(20),
        },
      ],
      120,
    )

    const rendered = selected
      .map((article) => `# ${article.title}\n${article.content}`)
      .join('\n\n')
    expect(selected[0]?.title).toBe('Redefinir senha e acesso')
    expect(selected.some((article) => article.title === 'Parcerias com escolas')).toBe(false)
    expect(rendered.length).toBeLessThanOrEqual(120)
  })

  it('não injeta artigos quando não há correspondência lexical', () => {
    expect(
      selectRelevantKbArticles(
        'Solicitação sobre reembolso',
        [{ title: 'Editor de jogos', content: 'Blocos e personagens.' }],
        1_000,
      ),
    ).toEqual([])
  })
})
