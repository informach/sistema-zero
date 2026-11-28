import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { USER_ROLES } from '@sistemazero/core/identity'
import realConfig from '../../gateway.config'
import { arquipelagoGateway } from '../../src/infrastructure/config/arquipelago-routes'
import { subscriptionRecoveryRoutes } from '../../src/infrastructure/config/subscription-recovery-routes'

// Os papéis moram num lugar só (`@sistemazero/core/identity`). A borda não valida o texto de
// `authorize.roles` (o schema aceita qualquer string), então um papel digitado errado passaria
// calado e a rota ficaria fechada para todo mundo.

const raiz = fileURLToPath(new URL('../../', import.meta.url))
const pastaConfig = `${raiz}src/infrastructure/config/`
const arquivosDeRotas = [
  `${raiz}gateway.config.ts`,
  ...readdirSync(pastaConfig, { recursive: true, encoding: 'utf8' })
    .filter((nome) => nome.endsWith('.ts'))
    .map((nome) => `${pastaConfig}${nome}`),
]

function semComentarios(fonte: string): string {
  return fonte
    .split('\n')
    .filter((linha) => !linha.trim().startsWith('//') && !linha.trim().startsWith('*'))
    .join('\n')
}

// Qualquer papel da EQUIPE escrito entre aspas indica uma lista feita à mão, mesmo guardada numa
// variável (`const ADMINS = ['superadmin', 'admin']`). `customer` fica de fora: nenhuma rota o cita.
const papelEscrito = /['"`](superadmin|admin|staff)['"`]/

describe('papéis da borda', () => {
  test('nenhuma rota escreve a lista de papéis à mão', () => {
    const comLista = arquivosDeRotas.filter((arquivo) =>
      papelEscrito.test(semComentarios(readFileSync(arquivo, 'utf8'))),
    )
    expect(arquivosDeRotas.length).toBeGreaterThan(3)
    expect(comLista).toEqual([])
  })

  test('todo papel citado numa rota existe na lista do core', () => {
    const jogo = arquipelagoGateway({
      url: 'http://jogo.local',
      transforms: [],
      resilience: { timeoutMs: 15000 },
    })
    const rotas = [...realConfig.routes, ...jogo.routes, ...subscriptionRecoveryRoutes([])]
    const desconhecidos = rotas.flatMap((rota) =>
      (rota.authorize?.roles ?? [])
        .filter((papel) => !(USER_ROLES as readonly string[]).includes(papel))
        .map((papel) => `${rota.id}: ${papel}`),
    )
    expect(rotas.filter((rota) => (rota.authorize?.roles?.length ?? 0) > 0).length).toBeGreaterThan(
      100,
    )
    expect(desconhecidos).toEqual([])
  })
})
