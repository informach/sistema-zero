import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import {
  BICHOS_DO_BOSQUE,
  criarSalvamentoInicial,
  GravarSalvamentoSchema,
  SALVAMENTO_MAX_BYTES,
  VERSAO_SALVAMENTO,
} from '@sistemazero/arquipelago-contracts'
import { SalvamentoGrandeDemaisError } from '../../src/application/erros'
import { ServicoDoJogo } from '../../src/application/servico-do-jogo'
import type { Jogador } from '../../src/domain/jogador'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleRepositorioDoJogo } from '../../src/infrastructure/persistence/drizzle/repositorio'
import { salvamentos } from '../../src/infrastructure/persistence/drizzle/schema'
import { migrarBancoDeTeste } from '../fakes/banco-migrado'

const url = process.env.TEST_DATABASE_URL
if (url) {
  const destino = new URL(url)
  if (
    !['localhost', '127.0.0.1', '[::1]'].includes(destino.hostname) ||
    destino.pathname !== '/arquipelago_test'
  ) {
    throw new Error('Este teste exige Postgres local descartável arquipelago_test')
  }
}
const AGORA = new Date('2026-10-28T15:00:00Z')

describe.skipIf(!url)('presente da Capi no Postgres local', () => {
  let db: DbConnection
  let servico: ServicoDoJogo
  beforeAll(async () => {
    db = createDbConnection(url!, { max: 2 })
    await migrarBancoDeTeste(db)
    servico = new ServicoDoJogo(
      new DrizzleRepositorioDoJogo(db.db),
      {
        modo: 'aberto',
        publicos: new Set(['kids', 'adulto']),
        lista: new Set(),
      },
      () => AGORA,
    )
  })
  afterAll(async () => {
    await db?.close()
  })

  for (const publico of ['kids', 'adulto'] as const) {
    test(`${publico}: migra V4, persiste a atual e mantém item e marca sob concorrência`, async () => {
      const jogador: Jogador = {
        id: crypto.randomUUID(),
        publico,
        contaId: publico === 'kids' ? crypto.randomUUID() : null,
        equipe: false,
        somenteLeitura: false,
      }
      const inicial = criarSalvamentoInicial(AGORA)
      const {
        presenteDosBichosEntregue: _,
        turnos: _t,
        lumis: _l,
        rotinas: _r,
        recife: _recife,
        vale: _vale,
        pico: _pico,
        nuvens: _nuvens,
        farol: _farol,
        clima: _clima,
        ilhasVisitadas: _ilhas,
        chaves: _chaves,
        segredos: _segredos,
        mapa: _mapa,
        companhia: _companhia,
        florada: _florada,
        ceu: _ceu,
        ...anterior
      } = inicial
      const v4 = {
        ...anterior,
        versao: 4,
        moradores: { capi: anterior.moradores.capi },
        bichos: { achados: [...BICHOS_DO_BOSQUE], adotado: null },
      }
      await db.db.insert(salvamentos).values({
        jogadorId: jogador.id,
        publico,
        revisao: 1,
        dados: v4,
        criadoEm: AGORA,
        atualizadoEm: AGORA,
      })
      const lido = await servico.lerSalvamento(jogador)
      expect(lido.salvamento).toMatchObject({
        versao: VERSAO_SALVAMENTO,
        presenteDosBichosEntregue: false,
      })
      if (!lido.salvamento) throw new Error('O serviço não leu a V4 guardada')
      const entregue = {
        ...lido.salvamento,
        inventario: { salada: 1 },
        presenteDosBichosEntregue: true,
      }
      const pedido = GravarSalvamentoSchema.parse({ revisaoBase: 1, salvamento: entregue })
      const corrida = await Promise.all([
        servico.gravarSalvamento(jogador, pedido),
        servico.gravarSalvamento(jogador, pedido),
      ])
      expect(corrida.filter((r) => r.ok)).toHaveLength(1)
      const relido = await servico.lerSalvamento(jogador)
      expect(relido.revisao).toBe(2)
      expect(relido.salvamento).toEqual(entregue)
      const atrasado = await servico.gravarSalvamento(
        jogador,
        GravarSalvamentoSchema.parse({ revisaoBase: 1, salvamento: v4 }),
      )
      expect(atrasado.ok).toBe(false)
      expect(await servico.lerSalvamento(jogador)).toEqual(relido)
      const grande = {
        ...pedido.salvamento,
        inventario: Object.fromEntries(
          Array.from({ length: 3000 }, (_, i) => [`item-com-nome-comprido-${i}`, 1]),
        ),
      }
      expect(new TextEncoder().encode(JSON.stringify(grande)).length).toBeGreaterThan(
        SALVAMENTO_MAX_BYTES,
      )
      await expect(
        servico.gravarSalvamento(jogador, { revisaoBase: 2, salvamento: grande }),
      ).rejects.toThrow(SalvamentoGrandeDemaisError)
      expect(await servico.lerSalvamento(jogador)).toEqual(relido)
    })
  }
})
