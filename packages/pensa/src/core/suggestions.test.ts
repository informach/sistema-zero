import { describe, expect, it } from 'bun:test'
import { splitSuggestions, stripStreamingSuggestions } from './suggestions'

describe('splitSuggestions', () => {
  it('separa o corpo e as sugestões da linha final', () => {
    const result = splitSuggestions(
      'Legal! Qual é o objetivo do jogo?\nSUGESTÕES: pegar todas as estrelas | fugir do robô | chegar na fase 3',
    )
    expect(result.body).toBe('Legal! Qual é o objetivo do jogo?')
    expect(result.suggestions).toEqual([
      'pegar todas as estrelas',
      'fugir do robô',
      'chegar na fase 3',
    ])
  })

  it('tolera caixa, falta de acento e espaço antes dos dois-pontos', () => {
    expect(splitSuggestions('Oi!\nsugestoes: a | b').suggestions).toEqual(['a', 'b'])
    expect(splitSuggestions('Oi!\nSugestões : a | b').suggestions).toEqual(['a', 'b'])
  })

  it('só a linha FINAL vira sugestão; menção no meio fica no corpo', () => {
    const result = splitSuggestions('Minhas SUGESTÕES: pense bem.\nO que acha?')
    expect(result.body).toBe('Minhas SUGESTÕES: pense bem.\nO que acha?')
    expect(result.suggestions).toEqual([])
  })

  it('ignora linhas vazias no fim e limpa itens vazios, duplicados e excesso', () => {
    const result = splitSuggestions('Corpo\nSUGESTÕES: a || a | b | c | d | e | f | g\n\n')
    expect(result.body).toBe('Corpo')
    expect(result.suggestions).toEqual(['a', 'b', 'c', 'd', 'e', 'f'])
  })

  it('sem marcador devolve o texto intacto', () => {
    const text = 'Que ideia legal! Me conta mais.'
    expect(splitSuggestions(text)).toEqual({ body: text, suggestions: [] })
  })

  it('mensagem que é só a linha de sugestões vira corpo vazio', () => {
    const result = splitSuggestions('SUGESTÕES: um | dois')
    expect(result.body).toBe('')
    expect(result.suggestions).toEqual(['um', 'dois'])
  })
})

describe('stripStreamingSuggestions', () => {
  it('esconde a linha completa (mesmo pela metade) durante o streaming', () => {
    expect(stripStreamingSuggestions('Boa!\nSUGESTÕES: pegar est')).toBe('Boa!')
  })

  it('esconde o prefixo parcial do marcador, com e sem acento', () => {
    expect(stripStreamingSuggestions('Boa!\nSUGEST')).toBe('Boa!')
    expect(stripStreamingSuggestions('Boa!\nsugesto')).toBe('Boa!')
    expect(stripStreamingSuggestions('Boa!\nSUGESTÕES')).toBe('Boa!')
  })

  it('não esconde linha comum que não é o marcador', () => {
    expect(stripStreamingSuggestions('Boa!\nQual é a sua sugestão?')).toBe(
      'Boa!\nQual é a sua sugestão?',
    )
  })
})
