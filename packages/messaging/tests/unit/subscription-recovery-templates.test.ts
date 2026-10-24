import { expect, test } from 'bun:test'
import { subscriptionRecoveryTemplates } from '../../scripts/subscription-recovery-templates'
import { renderTemplate } from '../../src/domain/services/render-template'

const seeds = subscriptionRecoveryTemplates({
  emailLayout: ({ title, content, footerNote }) =>
    `<h1>${title}</h1>${content}<footer>${footerNote}</footer>`,
  p: (html) => `<p>${html}</p>`,
  ctaButton: (label, href) => `<a href="${href}">${label}</a>`,
  fallbackLink: (href) => `<span>${href}</span>`,
})

test('contrato contém quatro avisos próprios de cada público, sem depender do lead do funil', () => {
  expect(seeds.map((seed) => seed.key).sort()).toEqual([
    'recovery-adult-canceled',
    'recovery-adult-initial',
    'recovery-adult-recovered',
    'recovery-adult-reminder',
    'recovery-kids-canceled',
    'recovery-kids-initial',
    'recovery-kids-recovered',
    'recovery-kids-reminder',
  ])
  for (const seed of seeds) {
    expect(seed.channel).toBe('email')
    const result = renderTemplate(
      { ...seed, subject: seed.subject ?? null, variables: seed.variables ?? [] },
      {
        nome: '<img src=x>',
        produto: 'Assinatura QA',
        valor: 'R$ 97,00',
        dias: '7',
        prazo: '31 de outubro de 2026 às 09:00',
        link: 'https://example.invalid/conta',
      },
    )
    expect(result.ok).toBe(true)
    if (!result.ok) throw result.error
    expect(result.value.body).not.toContain('<img src=x>')
    expect(result.value.body).not.toContain('{{')
    expect(result.value.body).toContain('https://example.invalid/conta')
    if (seed.key.includes('-kids-')) expect(result.value.body).toContain('responsável')
    if (seed.key.includes('-adult-')) expect(result.value.body).not.toContain('criança')
    if (seed.key.endsWith('-initial')) {
      expect(result.value.body).toContain('7 dias a partir deste aviso')
      expect(result.value.body).toContain('não amplia o período de acesso já pago')
    }
    if (seed.key.endsWith('-reminder'))
      expect(result.value.body).toContain('31 de outubro de 2026 às 09:00')
    if (seed.key.endsWith('-recovered')) {
      expect(result.value.body).toContain('qual cobrança foi paga')
      expect(result.value.body).toContain(
        'não significa que todas as cobranças antigas foram pagas',
      )
      expect(result.value.body).not.toContain('acompanhamento dessa cobrança')
    }
  }
})
