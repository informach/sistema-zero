import { expect, test } from 'bun:test'
import { ArquipelagoNavLink } from '../src/components/arquipelago-nav-link'

test('entrada do jogo navega com documento completo para receber a política isolada', () => {
  const game = ArquipelagoNavLink({ href: '/arquipelago', children: 'Jogar' })
  expect(game.type).toBe('a')
  expect(game.props.href).toBe('/arquipelago')
  const regular = ArquipelagoNavLink({ href: '/cursos', children: 'Cursos' })
  expect(regular.type).not.toBe('a')
})
