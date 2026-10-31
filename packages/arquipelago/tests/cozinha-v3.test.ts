import { describe, expect, test } from 'bun:test'
import {
  criarSalvamentoInicial,
  type DesafioNaLista,
  INSUMOS,
  RecompensaDoDesafioSchema,
} from '@sistemazero/arquipelago-contracts'
import {
  comerDaGeladeira,
  FALA_DO_FRESQUINHO,
  FRESQUINHO,
  podeComerFresquinho,
} from '../src/sistemas/construcao/projeto-azul'
import { colecaoDeReceitas } from '../src/sistemas/diario'
import { ITENS } from '../src/sistemas/itens'
import {
  dicaDaReceita,
  falaDaReceitaDoExtra,
  receitaConhecida,
  receitaPeloId,
  receitasDosExtras,
  SEM_RECEITAS_DOS_EXTRAS,
} from '../src/sistemas/receitas'

/**
 * A cozinha da revisão da proposta v3 (§6.28): o prêmio-objeto do desafio extra (A25), a geladeira
 * completa que conserva (A31) e os ingredientes do peixe com coco à venda (A6).
 */

const agora = new Date('2026-10-31T12:00:00Z')

function desafio(extraFeito: boolean, receitaDoExtra?: string): DesafioNaLista {
  return {
    id: '00000000-0000-4000-8000-000000000006',
    revisao: 1,
    ilha: 'vila-doce',
    tipo: 'quadro-das-cores',
    quadro: 6,
    ordem: 60,
    titulo: 'A corrida do entregador',
    situacao: 'concluido',
    faltam: [],
    recompensa: { cor: true, moedas: 20, moedasExtra: 10, receitaDoExtra },
    recompensaVista: true,
    extraFeito,
  }
}

describe('a receita do desafio extra (A25)', () => {
  const brigadeiro = receitaPeloId('brigadeiro')!

  test('o contrato só aceita receitas do caderno', () => {
    const base = { cor: true, moedas: 20, moedasExtra: 10 }
    expect(RecompensaDoDesafioSchema.safeParse(base).success).toBe(true)
    expect(
      RecompensaDoDesafioSchema.safeParse({ ...base, receitaDoExtra: 'brigadeiro' }).success,
    ).toBe(true)
    expect(RecompensaDoDesafioSchema.safeParse({ ...base, receitaDoExtra: 'bolo-x' }).success).toBe(
      false,
    )
  })

  test('com o extra feito, a receita entra no caderno sem precisar da amizade', () => {
    const s = criarSalvamentoInicial(agora)
    expect(receitaConhecida(brigadeiro, s)).toBe(false)
    const antes = receitasDosExtras({ desafios: [desafio(false, 'brigadeiro')] })
    expect(receitaConhecida(brigadeiro, s, antes)).toBe(false)
    expect(dicaDaReceita(brigadeiro, s, antes)).toContain(
      'Ou faça o desafio extra de A corrida do entregador.',
    )
    const depois = receitasDosExtras({ desafios: [desafio(true, 'brigadeiro')] })
    expect(receitaConhecida(brigadeiro, s, depois)).toBe(true)
    expect(colecaoDeReceitas(s, depois).find((r) => r.id === 'brigadeiro')).toMatchObject({
      sabe: true,
    })
    // Quem já sabia pelo Bento continua sabendo: o extra só soma (nada se perde).
    s.moradores.bento.amizade = 300
    expect(receitaConhecida(brigadeiro, s, SEM_RECEITAS_DOS_EXTRAS)).toBe(true)
    expect(dicaDaReceita(brigadeiro, s, antes)).not.toContain('desafio extra')
  })

  test('o recado vem quando o extra acaba de dar a receita, não na primeira leitura', () => {
    const antes = { desafios: [desafio(false, 'brigadeiro')] }
    const depois = { desafios: [desafio(true, 'brigadeiro')] }
    expect(falaDaReceitaDoExtra(null, depois)).toBeNull()
    expect(falaDaReceitaDoExtra(depois, depois)).toBeNull()
    expect(falaDaReceitaDoExtra(antes, depois)).toBe(
      'Receita nova no caderno: brigadeiro. É o prêmio do desafio extra.',
    )
    expect(
      falaDaReceitaDoExtra({ desafios: [desafio(false)] }, { desafios: [desafio(true)] }),
    ).toBeNull()
  })
})

describe('a geladeira completa conserva (A31)', () => {
  const projeto = (aparencia: boolean) => ({
    ganhoEm: agora.toISOString(),
    aparencia: aparencia ? { tipo: 'galeria' as const, id: 'geladeira-retro' } : null,
    aparencias: [],
    guardado: { salada: 2 },
  })
  const n = { fome: 20, energia: 50, diversao: 50 }

  test('comida direto da geladeira com aparência vem fresquinha e sacia mais', () => {
    const r = comerDaGeladeira(projeto(true) as never, n, 'salada')
    expect(r).not.toBeNull()
    const salada = ITENS.salada!.comida!
    expect(r?.necessidades.fome).toBe(n.fome + Math.round(salada.fome * FRESQUINHO))
    expect(r?.necessidades.energia).toBe(n.energia + Math.round((salada.energia ?? 0) * FRESQUINHO))
    expect(r?.projeto.guardado).toEqual({ salada: 1 })
  })

  test('sem aparência nada muda: guarda e devolve como antes, sem castigo', () => {
    expect(podeComerFresquinho(projeto(false) as never, 'salada')).toBe(false)
    expect(comerDaGeladeira(projeto(false) as never, n, 'salada')).toBeNull()
    expect(comerDaGeladeira(projeto(true) as never, n, 'milho')).toBeNull()
  })

  test('nunca passa de 100', () => {
    const cheia = { fome: 95, energia: 99, diversao: 100 }
    const r = comerDaGeladeira(projeto(true) as never, cheia, 'salada')
    expect(r?.necessidades).toEqual({ fome: 100, energia: 100, diversao: 100 })
  })

  test('os textos seguem as regras da criança', () => {
    for (const t of [FALA_DO_FRESQUINHO]) expect(t).not.toMatch(/[—!]/)
  })
})

test('os ingredientes do peixe com coco também se compram na feira (A6)', () => {
  for (const id of ['peixe', 'coco', 'limao'] as const) {
    expect(INSUMOS[id]).toBeDefined()
    expect(ITENS[id]).toBeDefined()
    expect(ITENS[id]?.comida).toBeUndefined()
  }
})
