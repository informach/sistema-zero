import { describe, expect, test } from 'bun:test'
import {
  criarSalvamentoInicial,
  PERFIS_DA_FAMILIA_MAXIMO,
  type PermissoesDaFamilia,
} from '@sistemazero/arquipelago-contracts'
import { IrmaoNaoEncontradoError, VisitasDesligadasError } from '../../src/application/erros'
import { ServicoDasVisitas } from '../../src/application/servico-das-visitas'
import type { PoliticaDeAcesso } from '../../src/domain/acesso'
import type { RepositorioDaFamilia } from '../../src/domain/familia.port'
import type { Jogador } from '../../src/domain/jogador'

/** O serviço das visitas (fase3-12) com a família em memória, sem HTTP. */

const CONTA = '22222222-2222-4222-8222-222222222222'
const LIA = '11111111-1111-4111-8111-111111111111'
const TOM = '33333333-3333-4333-8333-333333333333'
const AGORA = new Date('2026-10-29T15:00:00Z')

const lia = (extra: Partial<Jogador> = {}): Jogador => ({
  id: LIA,
  publico: 'kids',
  contaId: CONTA,
  equipe: false,
  somenteLeitura: false,
  ...extra,
})

function familia(
  perfis: Record<string, unknown>,
  permissoes: PermissoesDaFamilia | null = null,
): Pick<
  RepositorioDaFamilia,
  'perfisDaConta' | 'outrosPerfisDaConta' | 'salvamentos' | 'lerPermissoes'
> & { limites: number[] } {
  const limites: number[] = []
  return {
    limites,
    perfisDaConta: async (_conta, ids) => ids.filter((id) => id in perfis),
    outrosPerfisDaConta: async (_conta, menos, limite) => {
      limites.push(limite)
      return Object.keys(perfis).filter((id) => id !== menos)
    },
    salvamentos: async (ids) =>
      new Map(ids.filter((id) => id in perfis).map((id) => [id, perfis[id]])),
    lerPermissoes: async () => permissoes,
  }
}

const aberto: PoliticaDeAcesso = { modo: 'aberto', publicos: new Set(['kids']), lista: new Set() }

describe('ServicoDasVisitas', () => {
  test('sem permissão gravada vale o padrão (visitas de irmãos ligadas)', async () => {
    const f = familia({
      [LIA]: criarSalvamentoInicial(AGORA),
      [TOM]: criarSalvamentoInicial(AGORA),
    })
    const r = await new ServicoDasVisitas({ familia: f, politica: aberto }).irmaos(lia())
    expect(r.situacao).toBe('ok')
    expect(r.irmaos.map((i) => i.perfilId)).toEqual([TOM])
    expect(f.limites).toEqual([PERFIS_DA_FAMILIA_MAXIMO])
  })

  test('salvamento que não abre fica de fora da lista e a casa dá "não encontrado"', async () => {
    const f = familia({ [LIA]: criarSalvamentoInicial(AGORA), [TOM]: { versao: 99 } })
    const servico = new ServicoDasVisitas({ familia: f, politica: aberto })
    expect((await servico.irmaos(lia())).irmaos).toEqual([])
    await expect(servico.casa(lia(), TOM)).rejects.toBeInstanceOf(IrmaoNaoEncontradoError)
  })

  test('a casa de um irmão com a casa construída diz que tem casa', async () => {
    const tom = criarSalvamentoInicial(AGORA)
    const obra = {
      paredes: [],
      aberturas: [],
      pisos: [],
      objetos: [],
      cercas: [],
      caminhos: [],
      canteiros: [],
    }
    const comCasa = { ...tom, construcao: { casa: obra, cabanas: {} } }
    const f = familia({ [LIA]: criarSalvamentoInicial(AGORA), [TOM]: comCasa })
    const servico = new ServicoDasVisitas({ familia: f, politica: aberto })
    expect((await servico.irmaos(lia())).irmaos[0]?.temCasa).toBe(true)
    expect((await servico.casa(lia(), TOM)).obra).toEqual(obra)
  })

  test('desligada, a casa recusa antes de ler qualquer salvamento', async () => {
    const f = familia(
      { [TOM]: criarSalvamentoInicial(AGORA) },
      { visitasDeIrmaos: false, visitasDeOutrasCriancas: true, fotosNoClube: true },
    )
    f.salvamentos = async () => {
      throw new Error('não devia ler')
    }
    await expect(
      new ServicoDasVisitas({ familia: f, politica: aberto }).casa(lia(), TOM),
    ).rejects.toBeInstanceOf(VisitasDesligadasError)
  })

  test('com o jogo em lista, a família da equipe conta como equipe (como na semana dos pais)', async () => {
    const f = familia({
      [LIA]: criarSalvamentoInicial(AGORA),
      [TOM]: criarSalvamentoInicial(AGORA),
    })
    const lista: PoliticaDeAcesso = { modo: 'lista', publicos: new Set(['kids']), lista: new Set() }
    const servico = new ServicoDasVisitas({ familia: f, politica: lista })
    expect((await servico.irmaos(lia({ equipe: true }))).irmaos.map((i) => i.perfilId)).toEqual([
      TOM,
    ])
  })
})
