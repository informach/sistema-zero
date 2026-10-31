import { createHash } from 'node:crypto'
import { ServicoDasVisitasDeAmigos } from '../../../packages/arquipelago-api/src/application/servico-das-visitas-de-amigos'
import { createDbConnection } from '../../../packages/arquipelago-api/src/infrastructure/persistence/drizzle/db'
import { DrizzleRepositorioDoJogo } from '../../../packages/arquipelago-api/src/infrastructure/persistence/drizzle/repositorio'
import { DrizzleRepositorioDaFamilia } from '../../../packages/arquipelago-api/src/infrastructure/persistence/drizzle/repositorio-da-familia'
import { DrizzleRepositorioDasVisitasDeAmigos } from '../../../packages/arquipelago-api/src/infrastructure/persistence/drizzle/repositorio-visitas-de-amigos'
import { migrarBancoDeTeste } from '../../../packages/arquipelago-api/tests/fakes/banco-migrado'
import {
  CASAS_DE_AMIGOS_MAXIMO,
  criarSalvamentoInicial,
  PERMISSOES_PADRAO,
} from '../../../packages/arquipelago-contracts/src'

// Somente banco NOVO e descartável. O script instala um gatilho de sincronização na tabela local.
const url = process.argv[2]
if (!url) throw new Error('Informe a URL do Postgres local descartável arquipelago_test*')
const alvo = new URL(url)
if (
  !['localhost', '127.0.0.1', '[::1]'].includes(alvo.hostname) ||
  !/^\/arquipelago_test[a-z0-9_]*$/.test(alvo.pathname)
)
  throw new Error('Destino recusado')
const db = createDbConnection(url, { max: 6 })
try {
  await migrarBancoDeTeste(db)
  const saves = new DrizzleRepositorioDoJogo(db.db)
  const familia = new DrizzleRepositorioDaFamilia(db.db)
  const repo = new DrizzleRepositorioDasVisitasDeAmigos(db.db)
  const agora = new Date('2026-10-30T23:00:00Z')
  const svc = new ServicoDasVisitasDeAmigos({
    repo,
    familia,
    politica: {
      modo: 'aberto',
      publicos: new Set(['kids', 'adulto']),
      lista: new Set(),
    },
    agora: () => agora,
  })
  async function criar() {
    const contaId = crypto.randomUUID(),
      id = crypto.randomUUID()
    await saves.gravarSalvamento({
      jogadorId: id,
      publico: 'kids',
      revisaoBase: 0,
      salvamento: criarSalvamentoInicial(agora),
      agora,
      contaId,
    })
    await familia.gravarPermissoes(
      contaId,
      { ...PERMISSOES_PADRAO, visitasDeOutrasCriancas: true },
      agora,
    )
    return {
      pais: { contaId, equipe: false, somenteLeitura: false },
      jogador: { id, contaId, publico: 'kids' as const, equipe: false, somenteLeitura: false },
    }
  }
  const anfitria = await criar(),
    visitante = await criar()
  const convite = await svc.gerarConvite(anfitria.pais, anfitria.jogador.id)
  await svc.aceitar(visitante.pais, convite.codigo, 'Casa da Lua')
  const antes = (await svc.casas(visitante.jogador)).casas.length
  await svc.apagarConvite(anfitria.pais, anfitria.jogador.id)
  const revogado = (await svc.casas(visitante.jogador)).casas.length
  const novo = await svc.gerarConvite(anfitria.pais, anfitria.jogador.id)
  const novoSemAceite = (await svc.casas(visitante.jogador)).casas.length
  console.log(JSON.stringify({ caso: 'revogar-e-gerar-outro', antes, revogado, novoSemAceite }))
  // Depois da correção, o código novo pede aceite novo: a família visitante aceita de novo.
  await svc.aceitar(visitante.pais, novo.codigo, 'Casa da Lua')

  const entrou = Promise.withResolvers<void>(),
    sair = Promise.withResolvers<void>()
  const svcLento = new ServicoDasVisitasDeAmigos({
    repo,
    familia,
    politica: {
      modo: 'aberto',
      publicos: new Set(['kids', 'adulto']),
      lista: new Set(),
    },
    membros: {
      async lerQuarto() {
        entrou.resolve()
        await sair.promise
        return { quarto: { theme: 'padrao', pet: null, placedItems: [] } }
      },
    },
  })
  const casaId = (await svc.casas(visitante.jogador)).casas[0]!.id
  const leitura = svcLento.casa(visitante.jogador, casaId)
  await entrou.promise
  await svc.apagarConvite(anfitria.pais, anfitria.jogador.id)
  sair.resolve()
  const resposta = await leitura.catch(() => null)
  console.log(
    JSON.stringify({
      caso: 'revogar-durante-members',
      devolveuCasa: Boolean(resposta),
      casasAtuais: (await svc.casas(visitante.jogador)).casas.length,
    }),
  )

  // A espera no INSERT só força a intercalação concorrente, sem alterar a regra testada.
  const conta = crypto.randomUUID()
  // Cada aceite vale para um convite vigente (o código é conferido na transação).
  const comConvite = async () => {
    const c = await criar()
    const hash = createHash('sha256').update(c.jogador.id).digest('hex')
    await repo.gerarConvite(c.jogador.id, c.pais.contaId, hash, agora)
    return { perfilId: c.jogador.id, hash }
  }
  for (let i = 0; i < CASAS_DE_AMIGOS_MAXIMO - 1; i++)
    await repo.aceitar(conta, await comConvite(), 'Casa', agora, CASAS_DE_AMIGOS_MAXIMO)
  const lua = await comConvite()
  const sol = await comConvite()
  await db.sql.unsafe(
    `CREATE FUNCTION arquipelago.review_slow_insert() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN PERFORM pg_sleep(0.5); RETURN NEW; END $$`,
  )
  await db.sql.unsafe(
    `CREATE TRIGGER review_slow_insert BEFORE INSERT ON arquipelago.casas_de_amigos FOR EACH ROW EXECUTE FUNCTION arquipelago.review_slow_insert()`,
  )
  const aceites = await Promise.all([
    repo.aceitar(conta, lua, 'Lua', agora, CASAS_DE_AMIGOS_MAXIMO),
    repo.aceitar(conta, sol, 'Sol', agora, CASAS_DE_AMIGOS_MAXIMO),
  ])
  console.log(
    JSON.stringify({
      caso: 'limite-concorrente',
      maximo: CASAS_DE_AMIGOS_MAXIMO,
      aceites: aceites.filter((a) => a.situacao === 'ok').length,
      casas: (await repo.casasDaConta(conta)).length,
    }),
  )
} finally {
  try {
    await db.sql.unsafe('DROP TRIGGER IF EXISTS review_slow_insert ON arquipelago.casas_de_amigos')
    await db.sql.unsafe('DROP FUNCTION IF EXISTS arquipelago.review_slow_insert()')
  } finally {
    await db.close()
  }
}
