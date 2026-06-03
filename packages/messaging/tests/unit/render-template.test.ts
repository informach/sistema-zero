import { describe, expect, it } from 'bun:test'
import { type RenderableTemplate, renderTemplate } from '../../src/domain/services/render-template'
import { isErr, isOk } from '../../src/domain/shared/result'

const emailTemplate: RenderableTemplate = {
  channel: 'email',
  subject: 'Bem-vindo, {{nome}}!',
  body: '<p>Olá {{nome}}, seu acesso: {{senha}}</p>',
  variables: ['nome', 'senha'],
}

const whatsappTemplate: RenderableTemplate = {
  channel: 'whatsapp',
  subject: null,
  body: 'Olá {{nome}}! Acesse: {{link}}',
  variables: ['nome', 'link'],
}

describe('renderTemplate', () => {
  it('substitui variáveis no assunto e corpo de e-mail', () => {
    const result = renderTemplate(emailTemplate, { nome: 'Helena', senha: 'abc123' })
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value.subject).toBe('Bem-vindo, Helena!')
      expect(result.value.body).toBe('<p>Olá Helena, seu acesso: abc123</p>')
    }
  })

  it('escapa HTML dos VALORES no corpo de e-mail (anti-injeção)', () => {
    const result = renderTemplate(emailTemplate, {
      nome: '<script>alert(1)</script>',
      senha: 'a&b',
    })
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value.body).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
      expect(result.value.body).toContain('a&amp;b')
      expect(result.value.body).not.toContain('<script>')
    }
  })

  it('NÃO escapa no WhatsApp (texto puro) e não tem assunto', () => {
    const result = renderTemplate(whatsappTemplate, {
      nome: 'Zé',
      link: 'https://x.com?a=1&b=2',
    })
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value.subject).toBeNull()
      expect(result.value.body).toBe('Olá Zé! Acesse: https://x.com?a=1&b=2')
    }
  })

  it('falha quando faltam variáveis obrigatórias', () => {
    const result = renderTemplate(emailTemplate, { nome: 'Helena' })
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe('MISSING_TEMPLATE_VARIABLE')
      expect(result.error.missing).toEqual(['senha'])
    }
  })
})
