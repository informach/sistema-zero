import { describe, expect, test } from 'bun:test'
import { buildTransformers } from '../../src/application/transform/transform-chain'
import { headerInjectTransformer } from '../../src/application/transform/transformers/header-inject.transformer'
import { headerStripTransformer } from '../../src/application/transform/transformers/header-strip.transformer'
import { defaultTransformerRegistry } from '../../src/application/transform/transformers/index'
import { pathRewriteTransformer } from '../../src/application/transform/transformers/path-rewrite.transformer'
import { makeContext } from '../helpers'

describe('transformers (Decorator)', () => {
  test('header-inject adiciona headers + principal', async () => {
    const ctx = makeContext({ headers: { 'x-keep': '1' } })
    ctx.principal = { kind: 'hmac', subject: 'sys-a' }
    await headerInjectTransformer({
      headers: { 'x-svc': 'gw' },
      principalHeader: 'x-gateway-principal',
    }).transformRequest?.(ctx)
    expect(ctx.upstreamHeaders.get('x-svc')).toBe('gw')
    expect(ctx.upstreamHeaders.get('x-gateway-principal')).toBe('sys-a')
  })

  test('header-inject SOBRESCREVE valor forjado pelo cliente (anti-spoof do token interno)', async () => {
    // Cliente tenta forjar o token interno; o header-inject do gateway o substitui.
    const ctx = makeContext({ headers: { 'x-internal-token': 'forjado-pelo-cliente' } })
    await headerInjectTransformer({
      headers: { 'x-internal-token': 'segredo-real-do-gateway' },
    }).transformRequest?.(ctx)
    expect(ctx.upstreamHeaders.get('x-internal-token')).toBe('segredo-real-do-gateway')
  })

  test('header-strip remove headers', async () => {
    const ctx = makeContext({ headers: { 'x-secret': 'shh' } })
    await headerStripTransformer({ headers: ['x-secret'] }).transformRequest?.(ctx)
    expect(ctx.upstreamHeaders.get('x-secret')).toBeNull()
  })

  test('path-rewrite tira prefixo e reescreve', async () => {
    const ctx = makeContext({ url: 'http://gw.local/api/payments/1' })
    ctx.upstreamPath = '/api/payments/1'
    await pathRewriteTransformer({ stripPrefix: '/api' }).transformRequest?.(ctx)
    expect(ctx.upstreamPath).toBe('/payments/1')
  })

  test('buildTransformers resolve do registry e falha em tipo desconhecido', () => {
    expect(buildTransformers(['header-inject'], defaultTransformerRegistry)).toHaveLength(1)
    expect(() => buildTransformers(['nope'], defaultTransformerRegistry)).toThrow()
  })
})
