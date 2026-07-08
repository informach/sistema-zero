import { describe, expect, test } from 'bun:test'
import { splitQuotedReply } from '../src/lib/quote'

describe('splitQuotedReply', () => {
  test('resposta simples sem citação: quoted null, visible intacto', () => {
    const body = 'Oi, obrigado pelo retorno.\nJá consegui acessar o curso.'
    expect(splitQuotedReply(body)).toEqual({ visible: body, quoted: null })
  })

  test('corpo vazio: visible vazio, quoted null', () => {
    expect(splitQuotedReply('')).toEqual({ visible: '', quoted: null })
  })

  test('atribuição "Em ... escreveu:" corta antes do histórico', () => {
    const body =
      'Perfeito, pode fechar o chamado.\n\n' +
      'Em qua., 8 de jul. de 2026, 09:12, Suporte <contato@sistemazero.com.br> escreveu:\n' +
      '> Olá, tudo certo por aí?\n> Abraço.'
    const result = splitQuotedReply(body)
    expect(result.visible).toBe('Perfeito, pode fechar o chamado.')
    expect(result.quoted).toContain('Em qua., 8 de jul. de 2026')
    expect(result.quoted).toContain('> Olá, tudo certo por aí?')
  })

  test('atribuição "On ... wrote:" corta antes do histórico', () => {
    const body =
      'Thanks, that fixed it.\n\n' +
      'On Wed, Jul 8, 2026 at 9:12 AM Support <contato@sistemazero.com.br> wrote:\n' +
      '> Hello, can you try again?'
    const result = splitQuotedReply(body)
    expect(result.visible).toBe('Thanks, that fixed it.')
    expect(result.quoted?.startsWith('On Wed, Jul 8, 2026')).toBe(true)
  })

  test('bloco de linhas ">" após linha em branco corta ali', () => {
    const body =
      'Segue minha resposta abaixo.\n\n> mensagem original citada\n> segunda linha citada'
    const result = splitQuotedReply(body)
    expect(result.visible).toBe('Segue minha resposta abaixo.')
    expect(result.quoted).toBe('> mensagem original citada\n> segunda linha citada')
  })

  test('separador "-----Original Message-----" corta ali', () => {
    const body =
      'Resposta nova aqui.\n\n-----Original Message-----\nFrom: Suporte\nAssunto: Chamado'
    const result = splitQuotedReply(body)
    expect(result.visible).toBe('Resposta nova aqui.')
    expect(result.quoted?.startsWith('-----Original Message-----')).toBe(true)
  })

  test('separador "-----Mensagem original-----" corta ali', () => {
    const body = 'Oi.\n\n-----Mensagem original-----\nDe: Suporte'
    const result = splitQuotedReply(body)
    expect(result.visible).toBe('Oi.')
    expect(result.quoted?.startsWith('-----Mensagem original-----')).toBe(true)
  })

  test('corpo inteiramente citado: visible vazio, quoted é o corpo', () => {
    const body = '> tudo isto é histórico\n> nada de novo aqui'
    const result = splitQuotedReply(body)
    expect(result.visible).toBe('')
    expect(result.quoted).toBe('> tudo isto é histórico\n> nada de novo aqui')
  })

  test('linha ">" no meio do texto (sem branco antes) não corta', () => {
    const body = 'linha um\nlinha dois\n> não é citação, é continuação'
    expect(splitQuotedReply(body)).toEqual({ visible: body, quoted: null })
  })
})
