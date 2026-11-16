import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import type { DocumentoDeCenario, ModeloDeCatalogo } from '@sistemazero/molda-cenarios-core'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { CatalogosDeCenarios } from '../src/application/catalogo-de-cenarios'
import { ServicoDeCenarios } from '../src/application/servico-de-cenarios'
import { SessoesDeCenarios } from '../src/application/sessoes-de-cenarios'
import { createDbConnection } from '../src/infrastructure/persistence/drizzle/db'
import { DrizzleRepositorioDeCatalogos } from '../src/infrastructure/persistence/drizzle/repositorio-catalogos-cenarios'
import { DrizzleRepositorioDeCenarios } from '../src/infrastructure/persistence/drizzle/repositorio-cenarios'
import { DrizzleSessoesDeCenarios } from '../src/infrastructure/persistence/drizzle/repositorio-sessoes-cenarios'
import { rotasDosCenarios } from '../src/interfaces/http/rotas-dos-cenarios'

/** Harness local explícito. A plataforma continua usando a composição/autenticação de produção. */
export async function prepararCenariosLocal(
  url: string,
  modelos: ModeloDeCatalogo[],
  documento: (digest: string) => DocumentoDeCenario,
) {
  const u = new URL(url)
  if (!['localhost', '127.0.0.1'].includes(u.hostname) || u.pathname !== '/molda_cenarios_local')
    throw Error('O ensaio exige banco local molda_cenarios_local')
  const conexao = createDbConnection(url)
  await migrate(conexao.db, {
    migrationsFolder: resolve(
      import.meta.dir,
      '../src/infrastructure/persistence/drizzle/migrations',
    ),
    migrationsTable: 'arquipelago_migrations',
  })
  const catalogos = new CatalogosDeCenarios(new DrizzleRepositorioDeCatalogos(conexao.db)),
    servico = new ServicoDeCenarios(new DrizzleRepositorioDeCenarios(conexao.db), (r) =>
      catalogos.resolver(r),
    )
  const equipe = {
    id: '00000000-0000-4000-8000-000000000016',
    podeEscrever: true,
    podeRevisar: true,
  }
  const digest = createHash('sha256').update(JSON.stringify(modelos)).digest('hex')
  await catalogos.registrar(equipe, { id: 'faisca-acervo', digest, modelos })
  const projetos = await servico.listar(equipe)
  let comAcervoAtual = false
  for (const p of projetos)
    if ((await servico.ler(equipe, p.id)).documento.catalogo.digest === digest) {
      comAcervoAtual = true
      break
    }
  if (!comAcervoAtual)
    await servico.criar(equipe, {
      nome: 'Faísca — base com biblioteca completa',
      documento: documento(digest),
      operacaoId: crypto.randomUUID(),
    })
  return {
    rotas: rotasDosCenarios({
      cenarios: servico,
      catalogos,
      sessoes: new SessoesDeCenarios(new DrizzleSessoesDeCenarios(conexao.db), servico),
    }),
    conexao,
    servico,
    catalogos,
    equipe,
  }
}
