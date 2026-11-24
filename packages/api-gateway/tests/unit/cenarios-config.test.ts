import { describe, expect, test } from 'bun:test'
import type { KidsSessionClaim } from '@sistemazero/core/security'
import { MAX_BYTES_DO_RESUMO_DE_PUBLICACAO } from '@sistemazero/molda-cenarios-core/publicacao'
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
  ['GET', '/members/cenarios/publicacoes/perfis/sua-ilha'],
  ['GET', '/members/cenarios/publicacoes/perfis/sua-ilha/versoes'],
  ['POST', '/members/cenarios/publicacoes/preparar'],
  ['POST', '/members/cenarios/publicacoes/manifesto/reservar'],
  ['GET', `/members/cenarios/espacos/${ID}/bibliotecas`],
  ['POST', `/members/cenarios/espacos/${ID}/bibliotecas`],
  ['POST', `/members/cenarios/espacos/${ID}/biblioteca-molda`],
  ['PATCH', `/members/cenarios/bibliotecas/${ID}`],
  ['DELETE', `/members/cenarios/bibliotecas/${ID}`],
  ['GET', `/members/cenarios/bibliotecas/${ID}/modelos`],
  ['GET', `/members/cenarios/espacos/${ID}/modelos`],
  ['GET', `/members/cenarios/bibliotecas/${ID}/texturas`],
  ['GET', `/members/cenarios/bibliotecas/${ID}/conjuntos`],
  ['POST', `/members/cenarios/bibliotecas/${ID}/conjuntos`],
  ['GET', `/members/cenarios/conjuntos/${ID}`],
  ['GET', `/members/cenarios/conjuntos/${ID}/versoes/1`],
  ['PATCH', `/members/cenarios/conjuntos/${ID}`],
  ['POST', `/members/cenarios/conjuntos/${ID}/editar`],
  ['POST', `/members/cenarios/conjuntos/${ID}/publicar`],
  ['POST', `/members/cenarios/conjuntos/${ID}/versoes/1/miniatura/reservar`],
  ['DELETE', `/members/cenarios/conjuntos/${ID}`],
  ['POST', `/members/cenarios/bibliotecas/${ID}/texturas/reservar`],
  ['POST', `/members/cenarios/bibliotecas/${ID}/texturas/apagar`],
  ['PATCH', `/members/cenarios/texturas/${ID}`],
  ['GET', `/members/cenarios/bibliotecas/${ID}/organizacao`],
  ['POST', `/members/cenarios/bibliotecas/${ID}/modelos/reservar`],
  ['POST', `/members/cenarios/bibliotecas/${ID}/modelos/apagar`],
  ['PATCH', `/members/cenarios/modelos/${ID}`],
  ['GET', `/members/cenarios/espacos/${ID}/arquivos/${DIGEST}`],
  ['GET', `/members/cenarios/espacos/${ID}/mundos`],
  ['GET', `/members/cenarios/mundos/${ID}`],
  ['POST', `/members/cenarios/espacos/${ID}/mundos`],
  ['PATCH', `/members/cenarios/mundos/${ID}`],
  ['DELETE', `/members/cenarios/mundos/${ID}`],
  ['GET', `/members/cenarios/mundos/${ID}/cenarios`],
  ['POST', `/members/cenarios/mundos/${ID}/cenarios`],
  ['GET', `/members/cenarios/cenarios/${ID}`],
  ['POST', `/members/cenarios/cenarios/${ID}/exportacao`],
  ['GET', `/members/cenarios/cenarios/${ID}/historico`],
  ['GET', `/members/cenarios/cenarios/${ID}/revisoes`],
  ['POST', `/members/cenarios/cenarios/${ID}/historico`],
  ['POST', `/members/cenarios/cenarios/${ID}/restaurar`],
  ['POST', `/members/cenarios/cenarios/${ID}/lotes`],
  ['POST', `/members/cenarios/cenarios/${ID}/duplicar`],
  ['POST', `/members/cenarios/cenarios/${ID}/recursos/reservar`],
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

  test('escritas têm teto de corpo; documentos e conjuntos aceitam 8 MiB mais envelope limitado', () => {
    expect(resolver('POST', `/members/cenarios/cenarios/${ID}/lotes`)?.maxBodyBytes).toBe(
      CENARIOS_LOTE_MAX_BYTES,
    )
    for (const [metodo, caminho] of DA_OFICINA) {
      if (metodo !== 'POST' && metodo !== 'PATCH') continue
      const teto = resolver(metodo, caminho)?.maxBodyBytes
      expect(`${caminho}: ${typeof teto}`).toBe(`${caminho}: number`)
      if (
        caminho.endsWith('/lotes') ||
        caminho.endsWith('/publicar') ||
        (metodo === 'POST' && caminho.endsWith('/conjuntos'))
      )
        expect(teto).toBe(8 * 1024 * 1024 + 64 * 1024)
      else expect(teto).toBeLessThanOrEqual(64 * 1024)
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
      '/members/internal/cenarios/texturas',
      '/members/internal/cenarios/lotes',
      '/members/internal/cenarios/capa',
      '/members/internal/cenarios/arquivos/sairam',
      '/members/internal/cenarios/conjuntos/miniatura',
      '/members/internal/cenarios/publicacoes/recursos',
      '/members/internal/cenarios/publicacoes/confirmar',
      '/members/internal/cenarios/publicacoes/voltar',
      '/members/internal/cenarios/publicacoes/jogo/perfil',
      '/members/internal/cenarios/publicacoes/jogo/arquivo',
      '/members/internal/cenarios/publicacoes/jogo/arquivos',
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
    // Voltar uma versão troca o que o jogo mostra: a criança e o responsável nunca chegam lá.
    for (const sessao of [crianca, responsavel])
      expect(
        kidsMayAccess(sessao, '/members/internal/cenarios/publicacoes/voltar', 'POST', ID),
      ).toBe(false)
  })

  test('o manifesto compilado não atravessa a borda: só o resumo, dentro do teto padrão', () => {
    expect(resolver('POST', '/members/internal/cenarios/publicacoes/confirmar')?.maxBodyBytes).toBe(
      MAX_BYTES_DO_RESUMO_DE_PUBLICACAO,
    )
    expect(
      resolver('POST', '/members/internal/cenarios/publicacoes/recursos')?.maxBodyBytes,
    ).toBeLessThanOrEqual(64 * 1024)
    // O teto global padrão do servidor (9 MiB) precisa caber todas as rotas: senão o gateway nem sobe.
    expect(MAX_BYTES_DO_RESUMO_DE_PUBLICACAO).toBeLessThan(9 * 1024 * 1024)
    expect(
      resolver('POST', '/members/cenarios/publicacoes/preparar')?.maxBodyBytes,
    ).toBeLessThanOrEqual(64 * 1024)
    expect(resolver('POST', '/members/cenarios/publicacoes/confirmar')).toBeUndefined()
  })

  test('voltar uma versão é rota interna de corpo pequeno; a lista é só leitura', () => {
    const voltar = resolver('POST', '/members/internal/cenarios/publicacoes/voltar')
    expect(voltar?.id).toBe('members-cenarios-interno-publicacao-voltar')
    expect(voltar?.maxBodyBytes).toBeLessThanOrEqual(1024 * 1024)
    expect(voltar?.maxBodyBytes).toBeLessThanOrEqual(16 * 1024)
    // Pela borda pública, sem HMAC, não há como trocar a versão no ar.
    expect(resolver('POST', '/members/cenarios/publicacoes/voltar')).toBeUndefined()
    const versoes = resolver('GET', '/members/cenarios/publicacoes/perfis/bosque/versoes')
    expect(versoes?.id).toBe('members-cenarios-publicacao-versoes')
    expect(resolver('POST', '/members/cenarios/publicacoes/perfis/bosque/versoes')).toBeUndefined()
    // A rota do destino atual continua sendo a dela, sem engolir a lista.
    expect(resolver('GET', '/members/cenarios/publicacoes/perfis/bosque')?.id).toBe(
      'members-cenarios-publicacao-perfil',
    )
  })
})
