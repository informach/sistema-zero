import { describe, expect, test } from 'bun:test'
import type { KidsSessionClaim } from '@sistemazero/core/security'
import config from '../../gateway.config'
import { kidsMayAccess } from '../../src/application/auth/kids-access-policy'
import {
  CENARIOS_LOTE_MAX_BYTES,
  cenariosRoutes,
} from '../../src/infrastructure/config/cenarios-routes'
import { routeConfigSchema } from '../../src/infrastructure/config/gateway-config.schema'
import { RouteRegistry } from '../../src/infrastructure/routing/route-registry'

const ID = '11111111-1111-4111-8111-111111111111'
const DIGEST = 'a'.repeat(64)
const registry = new RouteRegistry(config.routes.map((route) => routeConfigSchema.parse(route)))
const resolver = (metodo: string, caminho: string) =>
  registry.resolve(metodo as 'GET', caminho, 'v1')?.route

/** Tudo o que a oficina chama no `members`, com o método de cada caminho. */
const DA_OFICINA: ReadonlyArray<readonly [string, string]> = [
  ['GET', '/members/cenarios/acesso'],
  ['GET', '/members/cenarios/espacos'],
  ['GET', `/members/cenarios/espacos/${ID}/bibliotecas`],
  ['POST', `/members/cenarios/espacos/${ID}/bibliotecas`],
  ['PATCH', `/members/cenarios/bibliotecas/${ID}`],
  ['DELETE', `/members/cenarios/bibliotecas/${ID}`],
  ['GET', `/members/cenarios/bibliotecas/${ID}/modelos`],
  ['POST', `/members/cenarios/bibliotecas/${ID}/modelos/reservar`],
  ['POST', `/members/cenarios/bibliotecas/${ID}/modelos/apagar`],
  ['PATCH', `/members/cenarios/modelos/${ID}`],
  ['GET', `/members/cenarios/espacos/${ID}/arquivos/${DIGEST}`],
  ['GET', `/members/cenarios/espacos/${ID}/mundos`],
  ['POST', `/members/cenarios/espacos/${ID}/mundos`],
  ['PATCH', `/members/cenarios/mundos/${ID}`],
  ['DELETE', `/members/cenarios/mundos/${ID}`],
  ['GET', `/members/cenarios/mundos/${ID}/cenarios`],
  ['POST', `/members/cenarios/mundos/${ID}/cenarios`],
  ['GET', `/members/cenarios/cenarios/${ID}`],
  ['POST', `/members/cenarios/cenarios/${ID}/lotes`],
  ['POST', `/members/cenarios/cenarios/${ID}/duplicar`],
  ['POST', `/members/cenarios/cenarios/${ID}/capa/reservar`],
  ['DELETE', `/members/cenarios/cenarios/${ID}`],
]

describe('Molda Cenários na borda', () => {
  test('cada caminho da oficina tem rota própria: JWT, conta ativa e sem papel exigido', () => {
    const usadas = new Set<string>()
    for (const [metodo, caminho] of DA_OFICINA) {
      const rota = resolver(metodo, caminho)
      expect(`${metodo} ${caminho}: ${rota?.id ?? 'sem rota'}`).toMatch(/: members-cenarios-/)
      expect(rota).toMatchObject({
        service: 'members',
        auth: { required: true, strategies: ['jwt'] },
        authorize: { statuses: ['active'] },
        rateLimit: { by: 'principal' },
      })
      // Quem pode usar é o members que decide (`CENARIOS_MODO`): aqui não há papel.
      expect(rota?.authorize?.roles).toBeUndefined()
      usadas.add(rota!.id)
    }
    // Nenhuma rota declarada ficou sem caminho que a alcance, e nenhuma se repete.
    const declaradas = cenariosRoutes(undefined)
      .map((r) => r.id)
      .filter((id) => !id.startsWith('members-cenarios-interno-'))
    expect([...usadas].sort()).toEqual([...declaradas].sort())
    expect(new Set(declaradas).size).toBe(declaradas.length)
  })

  test('escritas têm teto de corpo; o lote do editor aceita até 1 MB', () => {
    expect(resolver('POST', `/members/cenarios/cenarios/${ID}/lotes`)?.maxBodyBytes).toBe(
      CENARIOS_LOTE_MAX_BYTES,
    )
    for (const [metodo, caminho] of DA_OFICINA) {
      if (metodo !== 'POST' && metodo !== 'PATCH') continue
      const teto = resolver(metodo, caminho)?.maxBodyBytes
      expect(`${caminho}: ${typeof teto}`).toBe(`${caminho}: number`)
      if (!caminho.endsWith('/lotes')) expect(teto).toBeLessThanOrEqual(64 * 1024)
    }
  })

  test('método ou caminho fora da lista não passa', () => {
    for (const [metodo, caminho] of [
      ['PUT', `/members/cenarios/cenarios/${ID}`],
      ['DELETE', `/members/cenarios/modelos/${ID}`],
      ['POST', '/members/cenarios/espacos'],
      ['GET', `/members/cenarios/cenarios/${ID}/lotes`],
      ['GET', '/members/cenarios/qualquer/coisa/nova'],
    ] as const)
      expect(`${metodo} ${caminho}: ${resolver(metodo, caminho)?.id ?? 'sem rota'}`).toBe(
        `${metodo} ${caminho}: sem rota`,
      )
  })

  test('só o BFF afirma que o arquivo chegou: rota interna por HMAC do member-shell', () => {
    for (const caminho of [
      '/members/internal/cenarios/modelos',
      '/members/internal/cenarios/capa',
    ]) {
      const rota = resolver('POST', caminho)
      expect(rota).toMatchObject({
        service: 'members',
        auth: { required: true, strategies: ['hmac'], allowedConsumers: ['member-shell'] },
        rateLimit: { by: 'json-field', field: 'ator.contaId' },
      })
      expect(rota?.authorize).toBeUndefined()
      expect(resolver('GET', caminho)).toBeUndefined()
    }
  })

  test('no Kids a criança alcança a oficina; o responsável e a rota interna, não', () => {
    const crianca: KidsSessionClaim = {
      kind: 'student',
      sessionId: crypto.randomUUID(),
      deviceId: crypto.randomUUID(),
      grantId: crypto.randomUUID(),
    }
    const responsavel: KidsSessionClaim = {
      kind: 'parent',
      sessionId: crypto.randomUUID(),
      authenticatedAt: 1,
    }
    for (const [metodo, caminho] of DA_OFICINA) {
      expect(kidsMayAccess(crianca, caminho, metodo, ID)).toBe(true)
      expect(kidsMayAccess(responsavel, caminho, metodo, ID)).toBe(false)
    }
    expect(kidsMayAccess(crianca, '/members/internal/cenarios/modelos', 'POST', ID)).toBe(false)
  })
})
