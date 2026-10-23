import { expect, test } from 'bun:test'
import { COMUNIDADE_ADULTO } from '../../src/funnels/comunidade-adulto'
import {
  DEFAULT_FUNNEL,
  FUNNELS,
  getFunnel,
  getFunnelByKey,
  isFunnelKey,
} from '../../src/funnels/registry'

test('retired No Comando quiz and offer have no registered public route', () => {
  expect(getFunnel('pro', 'no-comando-da-ia')).toBeNull()
  expect(getFunnelByKey('pro/no-comando-da-ia')).toBeNull()
  expect(isFunnelKey('pro/no-comando-da-ia')).toBe(false)
})

test('adult entry and default use the active adult community without changing Kids entry', () => {
  expect(DEFAULT_FUNNEL).toBe(COMUNIDADE_ADULTO)
  expect(Object.values(FUNNELS).find((f) => f.audience === 'pro')).toBe(COMUNIDADE_ADULTO)
  expect(Object.values(FUNNELS).find((f) => f.audience === 'kids')?.key).toBe(
    'kids/desafio-primeiro-jogo',
  )
})
