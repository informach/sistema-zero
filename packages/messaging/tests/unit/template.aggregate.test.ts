import { describe, expect, it } from 'bun:test'
import { Template } from '../../src/domain/template/template.aggregate'

const now = new Date('2026-06-03T12:00:00Z')

describe('Template.create', () => {
  it('cria template de e-mail com assunto e variáveis', () => {
    const t = Template.create({
      id: 't1',
      key: 'welcome',
      channel: 'email',
      name: 'Boas-vindas',
      subject: 'Bem-vindo {{nome}}',
      body: 'Olá {{nome}}',
      variables: ['nome', 'nome'], // dedup
      now,
    })
    expect(t.channel).toBe('email')
    expect(t.state.subject).toBe('Bem-vindo {{nome}}')
    expect(t.state.variables).toEqual(['nome'])
    expect(t.toRenderable().body).toBe('Olá {{nome}}')
  })

  it('e-mail sem assunto falha', () => {
    expect(() =>
      Template.create({ id: 't', key: 'k', channel: 'email', name: 'N', body: 'B', now }),
    ).toThrow()
  })

  it('whatsapp ignora assunto (fica nulo)', () => {
    const t = Template.create({
      id: 't2',
      key: 'welcome',
      channel: 'whatsapp',
      name: 'Boas-vindas',
      subject: 'qualquer coisa',
      body: 'Olá {{nome}}',
      now,
    })
    expect(t.state.subject).toBeNull()
  })

  it('update aplica alterações e revalida', () => {
    const t = Template.create({
      id: 't3',
      key: 'k',
      channel: 'email',
      name: 'N',
      subject: 'S',
      body: 'B',
      now,
    })
    t.update({ name: 'Novo nome', active: false }, now)
    expect(t.state.name).toBe('Novo nome')
    expect(t.active).toBe(false)
    expect(() => t.update({ subject: '' }, now)).toThrow() // e-mail sem assunto
  })
})
