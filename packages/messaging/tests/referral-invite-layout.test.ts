import { expect, test } from 'bun:test'
import { seeds } from '../scripts/seed-templates'

// Importa o HTML efetivamente produzido pelo seed; o acesso ao banco fica em import.meta.main.
test.each([
  'referrals-offer-gift-invite',
  'referrals-offer-gift-invite-adult',
  'referrals-offer-referral-invite',
  'referrals-offer-referral-invite-adult',
])('convite %s tem rodapé completo no HTML renderizado', (key) => {
  const template = seeds.find((seed) => seed.key === key && seed.channel === 'email')
  expect(template).toBeDefined()
  expect(template!.body).not.toContain('undefined')
  expect(template!.body).toContain(
    'Você recebeu este convite porque {{indicador}} indicou o seu e-mail. Ele não é reenviado.',
  )
})
