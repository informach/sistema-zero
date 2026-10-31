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
import { MembrosIndisponiveisError } from '../../src/domain/membros.port'
import { MembrosHttp } from '../../src/infrastructure/members/membros-http'
import { membrosDeMentira } from '../fakes/membros'

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
      moveis: [],
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

describe('o quarto do irmão na visita (29/10/2026)', () => {
  const QUARTO = {
    theme: 'aconchego',
    placedItems: [{ itemId: 'cama', x: 0, y: 1 }],
    pet: 'pet-gato',
  }
  const daFamilia = () =>
    familia({ [LIA]: criarSalvamentoInicial(AGORA), [TOM]: criarSalvamentoInicial(AGORA) })

  test('vem do Members, do perfil do irmão, depois das conferências da casa', async () => {
    const pedidos: unknown[] = []
    const membros = membrosDeMentira({
      lerQuarto: async (pergunta) => {
        pedidos.push(pergunta)
        return { quarto: QUARTO }
      },
    })
    const servico = new ServicoDasVisitas({ familia: daFamilia(), politica: aberto, membros })
    expect((await servico.casa(lia(), TOM)).quarto).toEqual(QUARTO)
    expect(pedidos).toEqual([{ userId: TOM, audience: 'kids' }])
    // Quem não é irmão nem chega a perguntar o quarto.
    await expect(servico.casa(lia(), LIA)).rejects.toBeInstanceOf(IrmaoNaoEncontradoError)
    expect(pedidos).toHaveLength(1)
  })

  test('com o Members fora, a casa abre e só o quarto vem null', async () => {
    const membros = membrosDeMentira({
      lerQuarto: async () => {
        throw new MembrosIndisponiveisError('status', 500)
      },
    })
    const casa = await new ServicoDasVisitas({
      familia: daFamilia(),
      politica: aberto,
      membros,
    }).casa(lia(), TOM)
    expect(casa.quarto).toBeNull()
    expect(casa.perfilId).toBe(TOM)
    // Sem o Members configurado (dev), também null.
    const semMembros = new ServicoDasVisitas({ familia: daFamilia(), politica: aberto })
    expect((await semMembros.casa(lia(), TOM)).quarto).toBeNull()
  })

  test('erro que não é do Members não vira quarto vazio', async () => {
    const membros = membrosDeMentira({
      lerQuarto: async () => {
        throw new Error('defeito')
      },
    })
    await expect(
      new ServicoDasVisitas({ familia: daFamilia(), politica: aberto, membros }).casa(lia(), TOM),
    ).rejects.toThrow('defeito')
  })

  test('o cliente HTTP lê pela rota interna, com o perfil e o público', async () => {
    const pedidos: Request[] = []
    const membros = new MembrosHttp({
      url: 'http://members',
      token: 't',
      fetch: (async (url: string | URL | Request, init?: RequestInit) => {
        pedidos.push(new Request(url, init))
        return Response.json({ quarto: QUARTO })
      }) as typeof fetch,
    })
    expect(await membros.lerQuarto({ userId: TOM, audience: 'kids' })).toEqual({ quarto: QUARTO })
    expect(pedidos[0]?.url).toBe(
      `http://members/members/internal/arquipelago/quarto?userId=${TOM}&audience=kids`,
    )
    expect(pedidos[0]?.headers.get('x-arquipelago-token')).toBe('t')
    const torto = new MembrosHttp({
      url: 'http://m',
      token: 't',
      fetch: (async () => Response.json({ quarto: { theme: 1 } })) as unknown as typeof fetch,
    })
    await expect(torto.lerQuarto({ userId: TOM, audience: 'kids' })).rejects.toBeInstanceOf(
      MembrosIndisponiveisError,
    )
  })
})

describe('o andar de cima e o terreno na visita (lacunas, 01/11/2026)', () => {
  const andar = { escada: { x: 1, z: 2, giro: 0 }, paredes: [], aberturas: [], pisos: [] }
  const terreno = { alturas: [[3, 4, 2]] as [number, number, number][] }
  const f = () =>
    familia({ [LIA]: criarSalvamentoInicial(AGORA), [TOM]: criarSalvamentoInicial(AGORA) })

  test('a casa do irmão vem com o andar e o terreno dele, lidos como kids', async () => {
    const lidos: string[] = []
    const obras = {
      ler: async (id: string, publico: 'kids' | 'adulto') => {
        lidos.push(`${id}:${publico}`)
        return {
          revisao: 3,
          obra: { versao: 1 as const, iglu: null, andar, terreno },
        }
      },
    }
    const casa = await new ServicoDasVisitas({ familia: f(), politica: aberto, obras }).casa(
      lia(),
      TOM,
    )
    expect(casa.andar).toEqual(andar)
    expect(casa.terreno).toEqual(terreno)
    expect(lidos).toEqual([`${TOM}:kids`])
  })

  test('sem o repositório ou com falha na leitura, a casa vem sem eles', async () => {
    const sem = await new ServicoDasVisitas({ familia: f(), politica: aberto }).casa(lia(), TOM)
    expect(sem.andar).toBeNull()
    expect(sem.terreno).toBeNull()
    const avisos: string[] = []
    const comFalha = await new ServicoDasVisitas({
      familia: f(),
      politica: aberto,
      obras: {
        ler: async () => {
          throw new Error('banco fora')
        },
      },
      logger: { warn: (m: string) => avisos.push(m) } as never,
    }).casa(lia(), TOM)
    expect(comFalha.andar).toBeNull()
    expect(avisos).toEqual(['arquipelago.visitas.obra_estendida_indisponivel'])
  })
})
