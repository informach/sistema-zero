import { describe, expect, test } from 'bun:test'
import { consoleAppLinks, INFORMACH_BACKSTAGE } from '../src/lib/console-apps'

const URLS = {
  admin: 'https://admin.sistemazero.com.br',
  helpdesk: 'https://atendimento.sistemazero.com.br',
  marketing: 'https://marketing.sistemazero.com.br',
}

describe('consoleAppLinks', () => {
  test('cada console aponta para os outros dois e, por último, para os bastidores', () => {
    expect(consoleAppLinks('admin', URLS).map((a) => a.id)).toEqual([
      'helpdesk',
      'marketing',
      'informach',
    ])
    expect(consoleAppLinks('helpdesk', URLS).map((a) => a.id)).toEqual([
      'admin',
      'marketing',
      'informach',
    ])
    expect(consoleAppLinks('marketing', URLS).map((a) => a.id)).toEqual([
      'admin',
      'helpdesk',
      'informach',
    ])
  })

  test('o console atual nunca aparece, mesmo com a URL dele configurada', () => {
    expect(consoleAppLinks('admin', URLS).some((a) => a.id === 'admin')).toBe(false)
  })

  test('URL ausente ou em branco esconde o link em vez de apontar para lugar nenhum', () => {
    expect(consoleAppLinks('admin', { helpdesk: URLS.helpdesk, marketing: '  ' })).toEqual([
      { id: 'helpdesk', label: 'Atendimento', href: URLS.helpdesk },
      INFORMACH_BACKSTAGE,
    ])
  })

  test('os bastidores da Informach aparecem sempre, sem depender de env', () => {
    expect(consoleAppLinks('admin', {})).toEqual([
      {
        id: 'informach',
        label: 'Bastidores da Informach',
        href: 'https://admin.informach.com.br/',
      },
    ])
  })
})
