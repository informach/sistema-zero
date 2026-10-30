import { afterAll, beforeAll, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import {
  criarSalvamentoInicial,
  TransferenciaDaGaleriaSchema,
} from '@sistemazero/arquipelago-contracts'
import { exportarPosseDaGaleria } from '../../scripts/exportar-posse-da-galeria'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { migrarBancoDeTeste } from '../fakes/banco-migrado'

const url = process.env.ARQUIPELAGO_GALERIA_TEST_DATABASE_URL
if (url) {
  const u = new URL(url)
  if (
    !['postgres:', 'postgresql:'].includes(u.protocol) ||
    !['localhost', '127.0.0.1', '[::1]'].includes(u.hostname) ||
    !/^\/arquipelago_test[a-z0-9_]*$/.test(u.pathname)
  )
    throw new Error('Use banco local descartável arquipelago_test para a exportação')
}
let db: DbConnection
beforeAll(async () => {
  if (url) {
    db = createDbConnection(url, { max: 2 })
    await migrarBancoDeTeste(db)
  }
})
afterAll(async () => {
  await db?.close()
})

test.skipIf(!url)(
  'exportação preserva compras pagas e pendentes, sem usar o save como prova de pagamento',
  async () => {
    const jogador = randomUUID(),
      conta = randomUUID(),
      chave = randomUUID(),
      pendente = randomUUID()
    const dados = JSON.stringify(criarSalvamentoInicial(new Date('2026-10-30T12:00:00Z')))
    await db.sql`insert into arquipelago.salvamentos(jogador_id,publico,revisao,dados,criado_em,atualizado_em)
    values(${jogador},'kids',1,${dados}::jsonb,now(),now())`
    await db.sql`insert into arquipelago.perfis_da_conta(jogador_id,conta_id,criado_em) values(${jogador},${conta},now())`
    await db.sql`insert into arquipelago.compras_da_galeria(jogador_id,aparencia_id,objeto,moedas,chave,situacao,criada_em,paga_em)
    values(${jogador},'aquario-classico','aquario',70,${chave},'paga',now(),now()),
    (${jogador},'forno-classico','forno',50,${pendente},'pendente',now(),null)`
    const antes =
      await db.sql`select * from arquipelago.compras_da_galeria where jogador_id=${jogador} order by aparencia_id`
    const arquivo = TransferenciaDaGaleriaSchema.parse(await exportarPosseDaGaleria(url!))
    const rows = arquivo.compras.filter((r) => r.jogadorId === jogador)
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({
      publico: 'kids',
      contaId: conta,
      aparencia: 'aquario-classico',
      moedas: 70,
      chave,
      situacao: 'paga',
    })
    expect(rows[1]).toMatchObject({
      aparencia: 'forno-classico',
      moedas: 50,
      chave: pendente,
      situacao: 'pendente',
      pagaEm: null,
    })
    expect(JSON.stringify(arquivo)).not.toContain('projetos')
    expect(
      await db.sql`select * from arquipelago.compras_da_galeria where jogador_id=${jogador} order by aparencia_id`,
    ).toEqual(antes)
  },
)

test.skipIf(!url)(
  'uma compra antes do primeiro save não ganha público ou conta inventados',
  async () => {
    const jogador = randomUUID(),
      chave = randomUUID()
    await db.sql`insert into arquipelago.compras_da_galeria(jogador_id,aparencia_id,objeto,moedas,chave,situacao,criada_em,paga_em)
    values(${jogador},'planta-interior-classica','planta-interior',30,${chave},'paga',now(),now())`
    const arquivo = await exportarPosseDaGaleria(url!)
    expect(arquivo.compras.find((r) => r.chave === chave)).toMatchObject({
      publico: null,
      contaId: null,
    })
  },
)

test.skipIf(!url)('objeto histórico incompatível interrompe a exportação', async () => {
  const jogador = randomUUID(),
    chave = randomUUID()
  await db.sql`insert into arquipelago.compras_da_galeria(jogador_id,aparencia_id,objeto,moedas,chave,situacao,criada_em)
    values(${jogador},'forno-classico','aquario',50,${chave},'pendente',now())`
  try {
    await expect(exportarPosseDaGaleria(url!)).rejects.toThrow('Objeto histórico divergente')
  } finally {
    await db.sql`delete from arquipelago.compras_da_galeria where jogador_id=${jogador} and chave=${chave}`
  }
})
