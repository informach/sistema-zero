import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import {
  criarSalvamentoInicial,
  type OrigemDaAparencia,
  type Salvamento,
} from '@sistemazero/arquipelago-contracts'
import { SomenteLeituraError } from '../../src/application/erros'
import { ServicoDoJogo } from '../../src/application/servico-do-jogo'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleRepositorioDoJogo } from '../../src/infrastructure/persistence/drizzle/repositorio'
import { DrizzleRepositorioDaMedicao } from '../../src/infrastructure/persistence/drizzle/repositorio-medicao'
import { migrarBancoDeTeste } from '../fakes/banco-migrado'
import { idMedicao, validarBancoMedicao } from '../fakes/medicao'

const url = process.env.ARQUIPELAGO_APARENCIAS_TEST_DATABASE_URL
if (url) validarBancoMedicao(url)
const setembro = new Date('2026-09-01T12:00:00Z')
const outubro = new Date('2026-10-02T03:00:00Z')
function com(origem: OrigemDaAparencia, id = 'desenho-privado'): Salvamento {
  const save = criarSalvamentoInicial(setembro)
  const aparencia = { origem, id }
  save.projetos.geladeira = { ganhoEm: setembro.toISOString(), aparencia, aparencias: [aparencia] }
  return save
}
describe.skipIf(!url)('mudanças atômicas de aparência no Postgres descartável', () => {
  let db: DbConnection
  let repo: DrizzleRepositorioDoJogo
  beforeAll(async () => {
    if (!url) throw new Error('Falta o banco local.')
    db = createDbConnection(url, { max: 4 })
    await migrarBancoDeTeste(db)
    await db.sql`TRUNCATE arquipelago.salvamentos CASCADE`
    repo = new DrizzleRepositorioDoJogo(db.db)
  })
  afterAll(async () => {
    await db?.close()
  })
  const gravar = (
    n: number,
    revisaoBase: number,
    salvamento: Salvamento,
    agora = outubro,
    publico: 'kids' | 'adulto' = 'kids',
  ) =>
    repo.gravarSalvamento({
      jogadorId: idMedicao(n),
      publico,
      revisaoBase,
      salvamento,
      agora,
    })
  const eventos = (n: number) =>
    db.sql`SELECT * FROM arquipelago.mudancas_de_aparencia WHERE jogador_id = ${idMedicao(n)} ORDER BY revisao`
  test('primeira importação é base; aplicação posterior usa data do servidor e não ganhoEm', async () => {
    await gravar(1, 0, com('pinta'), setembro)
    expect(await eventos(1)).toHaveLength(0)
    expect((await gravar(1, 1, com('molda'))).ok).toBe(true)
    const linhas = await eventos(1)
    expect(linhas).toHaveLength(1)
    expect(linhas[0]?.origem).toBe('molda')
    expect(new Date(linhas[0]?.registrado_em)).toEqual(outubro)
    expect(JSON.stringify(linhas)).not.toContain('desenho-privado')
    await gravar(1, 2, com('molda'))
    expect(await eventos(1)).toHaveLength(1)
    await gravar(1, 3, com('pinta'))
    expect(await eventos(1)).toHaveLength(2)
    // Uma correção posterior do save não reclassifica os eventos anteriores.
    expect((await eventos(1))[0]?.origem).toBe('molda')
  })
  test('duas gravações da mesma revisão e replay só registram a vencedora', async () => {
    await gravar(2, 0, criarSalvamentoInicial(setembro))
    const resultados = await Promise.all([gravar(2, 1, com('pinta')), gravar(2, 1, com('molda'))])
    expect(resultados.filter((r) => r.ok)).toHaveLength(1)
    expect(await eventos(2)).toHaveLength(1)
    expect((await gravar(2, 1, com('criacao'))).ok).toBe(false)
    expect(await eventos(2)).toHaveLength(1)
  })
  test('falha ao registrar evento desfaz também a gravação do save', async () => {
    await gravar(3, 0, criarSalvamentoInicial(setembro))
    // Uma restrição temporária exclusiva deste banco provoca erro depois do UPDATE.
    await db.sql`ALTER TABLE arquipelago.mudancas_de_aparencia ADD CONSTRAINT teste_rollback CHECK (jogador_id <> '12345678-1234-4234-8234-000000000003'::uuid)`
    let falhou = false
    try {
      await gravar(3, 1, com('pinta'))
    } catch {
      falhou = true
    } finally {
      await db.sql`ALTER TABLE arquipelago.mudancas_de_aparencia DROP CONSTRAINT teste_rollback`
    }
    expect(falhou).toBe(true)
    expect((await repo.lerSalvamento(idMedicao(3)))?.revisao).toBe(1)
    expect(await eventos(3)).toHaveLength(0)
  })
  test('somente leitura não chega à gravação nem ao histórico', async () => {
    await gravar(4, 0, criarSalvamentoInicial(setembro))
    const service = new ServicoDoJogo(
      repo,
      { modo: 'aberto', publicos: new Set(['kids', 'adulto']), lista: new Set() },
      () => outubro,
    )
    await expect(
      service.gravarSalvamento(
        {
          id: idMedicao(4),
          publico: 'kids',
          contaId: idMedicao(400),
          equipe: false,
          somenteLeitura: true,
        },
        { revisaoBase: 1, salvamento: com('pinta') },
      ),
    ).rejects.toBeInstanceOf(SomenteLeituraError)
    expect(await eventos(4)).toHaveLength(0)
    expect((await repo.lerSalvamento(idMedicao(4)))?.revisao).toBe(1)
  })
  test('excluir o save elimina os eventos privados', async () => {
    await gravar(5, 0, criarSalvamentoInicial(setembro))
    await gravar(5, 1, com('pinta'))
    expect(await eventos(5)).toHaveLength(1)
    await db.sql`DELETE FROM arquipelago.salvamentos WHERE jogador_id = ${idMedicao(5)}`
    expect(await eventos(5)).toHaveLength(0)
  })
  test('agrega pela data local do evento e separa público da fotografia de setembro', async () => {
    // Dias exclusivos, sem depender dos eventos dos outros testes.
    for (let n = 10; n < 15; n++) {
      await gravar(n, 0, criarSalvamentoInicial(setembro))
      await gravar(n, 1, com('pinta'), new Date('2026-10-11T02:59:59Z'))
      await gravar(n, 2, com('molda'), new Date('2026-10-11T03:00:00Z'))
      await gravar(n + 100, 0, criarSalvamentoInicial(setembro), setembro, 'adulto')
      await gravar(n + 100, 1, com('criacao'), new Date('2026-10-11T03:00:00Z'), 'adulto')
    }
    const medicao = new DrizzleRepositorioDaMedicao(db.db)
    for (const dia of ['2026-10-10', '2026-10-11']) {
      const r = await medicao.agregar({ de: dia, ate: dia, publico: 'kids' }, '2026-10-30')
      expect(r.pintaMolda.quantidade).toBe(0)
      expect(r.mudancasDeAparencia?.pintaMolda).toEqual({ quantidade: 5, pessoas: 5 })
      expect(r.mudancasDeAparencia?.criacaoGuardada.quantidade).toBe(0)
    }
    const adulto = await medicao.agregar(
      { de: '2026-10-11', ate: '2026-10-11', publico: 'adulto' },
      '2026-10-30',
    )
    expect(adulto.mudancasDeAparencia?.criacaoGuardada).toEqual({ quantidade: 5, pessoas: 5 })
    expect(adulto.mudancasDeAparencia?.pintaMolda.quantidade).toBe(0)
  })
})
