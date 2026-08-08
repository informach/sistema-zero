import { describe, expect, test } from 'bun:test'

const plannerSource = await Bun.file(
  new URL('../src/server/pensa-agents/planner-contract.ts', import.meta.url),
).text()

describe('fronteira server-only do planejador Pensa', () => {
  test('não importa o entrypoint React do Estúdio', () => {
    expect(plannerSource).not.toMatch(/from ['"]@sistemazero\/studio['"]/)
  })
})
