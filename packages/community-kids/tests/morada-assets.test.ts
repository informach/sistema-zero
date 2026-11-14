import { describe, expect, test } from 'bun:test'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { MORADA_CATALOG } from '@sistemazero/core/morada'

const root = resolve(import.meta.dirname, '../../..')
describe('arte Morada nas comunidades', () => {
  test('ambas usam entrega autenticada e não carregam cópias públicas antigas', () => {
    for (const app of ['community-kids', 'community']) {
      expect(existsSync(resolve(root, `packages/${app}/public/room3d`))).toBe(false)
      const route = readFileSync(
        resolve(root, `packages/${app}/src/app/api/morada3d/[...arquivo]/route.ts`),
        'utf8',
      )
      expect(route).toContain('shell.routes.moradaFile')
    }
  })
  test('só os oito troféus possuem fontes antigas preservadas', () => {
    const models = readdirSync(resolve(root, 'art/trofeus/items')).filter((f) => f.endsWith('.glb'))
    expect(models).toHaveLength(8)
    for (const model of models)
      expect(MORADA_CATALOG.pieces[`trophy/${model.slice(0, -4)}`]).toBeDefined()
    expect(models).not.toContain('estante-trofeus.glb')
  })
})
