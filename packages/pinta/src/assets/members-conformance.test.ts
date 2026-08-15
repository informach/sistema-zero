/**
 * O `members` conhece os MESMOS 7 tipos de desenho que este pacote.
 *
 * O serviço Bun importa somente `@sistemazero/pinta/assets`: a pureza desse subpath é protegida
 * por `purity.test.ts`, sem React no grafo. A lista de kinds continua COPIADA no domínio do
 * members para manter seu contrato próprio; este teste impede que as duas listas derivem.
 *
 * O que quebra se drifar: tipo novo no Pinta que o members não conhece = bloco recusado na
 * autoria com 400; tipo removido = bloco salvo cujo tipo o resto do sistema não consegue ler.
 */
import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { PINTA_ASSET_KINDS as MEMBERS_KINDS } from '../../../members/src/domain/course/lesson-block'
import { PINTA_ASSET_KINDS } from '../core/project'

describe('conformidade pinta × members', () => {
  it('🚨 as duas listas de tipos de desenho batem', () => {
    expect([...MEMBERS_KINDS].sort()).toEqual([...PINTA_ASSET_KINDS].sort())
  })

  it('a leitura é de verdade (anti-vácuo: os 7 chegaram dos dois lados)', () => {
    expect(PINTA_ASSET_KINDS).toHaveLength(7)
    expect(MEMBERS_KINDS).toHaveLength(7)
  })

  it('🚨 mudança no Pinta também dispara deploy do consumidor Members', () => {
    const railway = JSON.parse(
      readFileSync(new URL('../../../members/railway.json', import.meta.url), 'utf8'),
    ) as { build: { watchPatterns: string[] } }
    const workflow = readFileSync(
      new URL('../../../../.github/workflows/ci.yml', import.meta.url),
      'utf8',
    )

    expect(railway.build.watchPatterns).toContain('/packages/pinta/**')
    expect(workflow).toMatch(/packages\/pinta\/\*\).*add members/)
  })

  it('🚨 CI exercita o contrato wire/desbloqueio do Members em PostgreSQL real', () => {
    const workflow = readFileSync(
      new URL('../../../../.github/workflows/ci.yml', import.meta.url),
      'utf8',
    )

    expect(workflow).toContain('Testes DB members (Postgres real)')
    expect(workflow).toMatch(
      /packages\/members.*studio-unlock-eligibility\.test\.ts[\s\S]*TEST_DATABASE_URL/,
    )
  })
})
