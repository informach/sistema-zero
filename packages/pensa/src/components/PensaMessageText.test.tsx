import { expect, test } from 'bun:test'
import { render, screen } from '@testing-library/react'
import { PensaMessageText } from './PensaMessageText'

test('links de aulas acessíveis viram links reais e o restante continua texto', () => {
  render(
    <PensaMessageText text="Esta [aula de cartas](/cursos/jogos/aulas/cartas) pode ajudar. Confira o objetivo da missão." />,
  )
  expect(screen.getByRole('link', { name: 'aula de cartas' }).getAttribute('href')).toBe(
    '/cursos/jogos/aulas/cartas',
  )
  expect(screen.getByText(/Confira o objetivo/)).toBeTruthy()
})
test('texto ou links fora das rotas de ajuda nunca viram HTML executável', () => {
  const { container } = render(
    <PensaMessageText text="[teste](javascript:alert(1)) <script>alert(1)</script> [externo](//example.org)" />,
  )
  expect(screen.queryByRole('link')).toBeNull()
  expect(container.querySelector('script')).toBeNull()
})
