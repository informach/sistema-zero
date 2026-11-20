import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import path from 'node:path'

/**
 * O painel do Zappy no Estúdio fala com o BFF pelos caminhos do adaptador do member-shell
 * (`studio-zappy-adapter.ts`): o histórico em `/api/studio/zappy` (GET, DELETE e as operações
 * contextuais por POST), o envio em `/api/studio/zappy/messages`, o retorno em `/feedback`, o
 * "Construir" em `/build` e os créditos em `/api/members/ai-credits`. Em 20/11/2026 a conferência em
 * staging achou as duas primeiras rotas TROCADAS no app adulto (405 nas duas: o Zappy não abria a
 * conversa nem enviava) e a de créditos ausente (404). Este teste trava o mapa do adulto igual ao
 * do Kids, lendo o que cada `route.ts` exporta.
 */

const apps = {
  adulto: path.join(import.meta.dir, '..', 'src', 'app', 'api'),
  kids: path.join(import.meta.dir, '..', '..', 'community-kids', 'src', 'app', 'api'),
}

const ROTAS = [
  'studio/zappy/route.ts',
  'studio/zappy/messages/route.ts',
  'studio/zappy/feedback/route.ts',
  'studio/zappy/build/route.ts',
  'members/ai-credits/route.ts',
]

/** O que um `route.ts` de uma linha expõe: os métodos e o handler do shell. */
function exportsOf(file: string): { methods: string[]; handler: string } {
  const source = readFileSync(file, 'utf8')
  const match = source.match(/export const \{\s*([^}]+?)\s*\}\s*=\s*shell\.routes\.(\w+)/)
  if (!match) throw new Error(`${file} não exporta um handler do shell`)
  return {
    methods: (match[1] ?? '')
      .split(',')
      .map((method) => method.trim())
      .sort(),
    handler: match[2] ?? '',
  }
}

describe('rotas do Zappy no Estúdio adulto', () => {
  for (const rota of ROTAS) {
    test(`${rota} expõe os mesmos métodos e o mesmo handler do Kids`, () => {
      expect(exportsOf(path.join(apps.adulto, rota))).toEqual(exportsOf(path.join(apps.kids, rota)))
    })
  }

  test('o histórico mora na raiz e o envio em messages, como o adaptador chama', () => {
    expect(exportsOf(path.join(apps.adulto, 'studio/zappy/route.ts'))).toEqual({
      methods: ['DELETE', 'GET', 'POST'],
      handler: 'studioZappyHistory',
    })
    expect(exportsOf(path.join(apps.adulto, 'studio/zappy/messages/route.ts'))).toEqual({
      methods: ['POST'],
      handler: 'studioZappyMessage',
    })
    const adapter = readFileSync(
      path.join(
        import.meta.dir,
        '..',
        '..',
        'member-shell',
        'src',
        'lib',
        'studio-zappy-adapter.ts',
      ),
      'utf8',
    )
    expect(adapter).toContain("baseUrl = '/api/studio/zappy'")
    expect(adapter).toContain('baseUrl}/messages')
    expect(adapter).toContain("'/api/members/ai-credits'")
  })
})
