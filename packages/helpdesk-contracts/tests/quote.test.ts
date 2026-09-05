import { describe, expect, it } from 'bun:test'
import { splitQuotedReply, stripQuotedHistory } from '../src/quote'

describe('parser compartilhado de citação', () => {
  const cases = [
    {
      name: 'atribuição em português com CRLF',
      body: 'Resposta nova.\r\n\r\nEm 5 de setembro Maria escreveu:\r\n> Antiga',
      visible: 'Resposta nova.',
    },
    {
      name: 'atribuição em inglês',
      body: 'New reply.\n\nOn Sep 5, Maria wrote:\n> Old',
      visible: 'New reply.',
    },
    {
      name: 'separador do Outlook',
      body: 'Resposta.\n\n-----Mensagem original-----\nDe: Maria',
      visible: 'Resposta.',
    },
    {
      name: 'citação com espaços à esquerda',
      body: 'Resposta.\n\n   > histórico',
      visible: 'Resposta.',
    },
  ] as const

  for (const testCase of cases) {
    it(testCase.name, () => {
      const split = splitQuotedReply(testCase.body)
      expect(split.visible).toBe(testCase.visible)
      expect(split.quoted).not.toBeNull()
      expect(stripQuotedHistory(testCase.body)).toBe(testCase.visible)
    })
  }

  it('preserva texto sem histórico e aceita corpo vazio', () => {
    expect(splitQuotedReply('texto simples')).toEqual({ visible: 'texto simples', quoted: null })
    expect(splitQuotedReply('')).toEqual({ visible: '', quoted: null })
  })
})
