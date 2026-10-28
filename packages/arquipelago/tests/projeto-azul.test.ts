import { describe, expect, test } from 'bun:test'
import {
  CATALOGO_DE_OBJETOS,
  criarSalvamentoInicial,
  GELADEIRA_GUARDA,
  type Obra,
  type ProjetoAzul,
} from '@sistemazero/arquipelago-contracts'
import { LOTE_DA_CASA } from '../src/sistemas/construcao/lote'
import { apagarParede, esticarParede, type Resultado } from '../src/sistemas/construcao/obra'
import {
  cantoNoToque,
  capacidade,
  celulasDoObjeto,
  falaDoGanho,
  ganharProjetos,
  guardarNaGeladeira,
  moldaAberto,
  POSICAO_DO_MOLDA,
  porObjeto,
  tirarDaGeladeira,
  tirarObjeto,
} from '../src/sistemas/construcao/projeto-azul'

const L = LOTE_DA_CASA
const agora = new Date('2026-10-28T12:00:00Z')
const ganho = (): ProjetoAzul => ({ ganhoEm: agora.toISOString(), aparencia: null })
const PROJETOS = { geladeira: ganho(), casinha: ganho() }

function ok(r: Resultado): Obra {
  if (!r.ok) throw new Error(`recusado: ${JSON.stringify(r)}`)
  return r.obra
}

/** Um cômodo na frente do quarto (x -6 a -1, z 0 a 3). */
function comComodo(): Obra {
  let o = structuredClone(L.obraInicial)
  o = ok(esticarParede(o, L, { x: -6, z: 0 }, { x: -6, z: 3 }))
  o = ok(esticarParede(o, L, { x: -6, z: 3 }, { x: -1, z: 3 }))
  return ok(esticarParede(o, L, { x: -1, z: 3 }, { x: -1, z: 0 }))
}

describe('ganhar o projeto azul', () => {
  test('a geladeira vem do primeiro pedido entregue; a casinha, de adotar', () => {
    const s = criarSalvamentoInicial(agora)
    expect(ganharProjetos(s, agora).ganhos).toEqual([])
    const entregue = {
      ...s,
      moradores: {
        capi: {
          ...s.moradores.capi,
          pedido: { dia: '2026-10-28', id: 'alface-2', entregue: true },
        },
      },
    }
    const r = ganharProjetos(entregue, agora)
    expect(r.ganhos).toEqual(['geladeira'])
    expect(r.salvamento.projetos.geladeira).toEqual({
      ganhoEm: agora.toISOString(),
      aparencia: null,
    })
    // Já ganho: não ganha de novo.
    expect(ganharProjetos(r.salvamento, agora).ganhos).toEqual([])
    const adotou = {
      ...s,
      bichos: {
        achados: ['gato' as const],
        adotado: {
          id: 'gato' as const,
          nome: 'Mia',
          fase: 'filhote' as const,
          fome: 80,
          limpeza: 80,
          carinho: 80,
          diasCuidados: 0,
          diaCuidadoEm: null,
          truque: { sessoes: 0, ultimaEm: null, aprendido: false },
        },
      },
    }
    expect(ganharProjetos(adotou, agora).ganhos).toEqual(['casinha'])
    expect(falaDoGanho('geladeira')).toBe(
      'Chegou o projeto azul: geladeira. Ponha em casa no modo Construir.',
    )
  })
})

describe('pôr o objeto na obra', () => {
  test('a geladeira vai num cômodo novo; no quintal, no quarto ou sem ganhar, não', () => {
    const o = comComodo()
    const posta = ok(porObjeto(o, L, PROJETOS, 'geladeira', { x: -5, z: 2 }, 0))
    expect(posta.objetos).toEqual([{ id: 'geladeira', x: -5, z: 2, giro: 0 }])
    expect(porObjeto(o, L, PROJETOS, 'geladeira', { x: -12, z: 6 }, 0)).toMatchObject({
      motivo: 'fora-de-comodo',
    })
    expect(porObjeto(o, L, PROJETOS, 'geladeira', { x: 0, z: -4 }, 0)).toMatchObject({
      motivo: 'no-quarto',
    })
    expect(porObjeto(o, L, {}, 'geladeira', { x: -5, z: 2 }, 0)).toMatchObject({
      motivo: 'sem-projeto',
    })
    // Pôr de novo noutro lugar muda de lugar (cada objeto existe uma vez só).
    const mudou = ok(porObjeto(posta, L, PROJETOS, 'geladeira', { x: -3, z: 1 }, 1))
    expect(mudou.objetos).toEqual([{ id: 'geladeira', x: -3, z: 1, giro: 1 }])
  })

  test('a casinha (2 por 2) vai no quintal, fora de casa', () => {
    const o = comComodo()
    const canto = cantoNoToque('casinha', 0, { x: -11, z: 7 })
    expect(canto).toEqual({ x: -11, z: 7 })
    expect(celulasDoObjeto({ id: 'casinha', ...canto, giro: 0 })).toHaveLength(4)
    expect(porObjeto(o, L, PROJETOS, 'casinha', { x: -12, z: 6 }, 0).ok).toBe(true)
    expect(porObjeto(o, L, PROJETOS, 'casinha', { x: -5, z: 1 }, 0)).toMatchObject({
      motivo: 'dentro-de-casa',
    })
  })

  test('parede não corta o objeto ao meio; abrir o cômodo devolve a geladeira', () => {
    let o = ok(porObjeto(comComodo(), L, PROJETOS, 'casinha', { x: -12, z: 6 }, 0))
    expect(esticarParede(o, L, { x: -11, z: 6 }, { x: -11, z: 8 })).toMatchObject({
      motivo: 'tem-objeto',
    })
    o = ok(porObjeto(o, L, PROJETOS, 'geladeira', { x: -5, z: 2 }, 0))
    const aberto = ok(apagarParede(o, L, [{ eixo: 'x', x: -5, z: 3 }]))
    expect(aberto.objetos.map((x) => x.id)).toEqual(['casinha'])
  })

  test('tirar o objeto da célula', () => {
    const o = ok(porObjeto(comComodo(), L, PROJETOS, 'geladeira', { x: -5, z: 2 }, 0))
    expect(ok(tirarObjeto(o, { x: -5, z: 2 })).objetos).toEqual([])
    expect(tirarObjeto(o, { x: -4, z: 2 })).toMatchObject({ motivo: 'nada' })
  })
})

describe('a geladeira funcionando', () => {
  test('mochila no limite não perde alimento ao tentar retirar da geladeira', () => {
    const p = { ...ganho(), guardado: { salada: 2 } }
    const inv = { salada: 999 }
    expect(tirarDaGeladeira(p, inv, 'salada')).toBeNull()
    expect(p.guardado.salada).toBe(2)
    expect(inv.salada).toBe(999)
    const ultimo = tirarDaGeladeira(p, { salada: 998 }, 'salada')
    expect(ultimo?.inventario.salada).toBe(999)
    expect(ultimo?.projeto.guardado?.salada).toBe(1)
  })
  test('guarda até 4 alimentos no holograma e 12 com aparência; só alimento', () => {
    let p = ganho()
    let inv: Record<string, number> = { salada: 5, 'semente-milho': 2 }
    expect(capacidade(p)).toBe(GELADEIRA_GUARDA.holograma)
    for (let i = 0; i < 4; i++) {
      const r = guardarNaGeladeira(p, inv, 'salada')
      if (!r) throw new Error('não guardou')
      p = r.projeto
      inv = r.inventario
    }
    expect(p.guardado).toEqual({ salada: 4 })
    expect(inv).toEqual({ salada: 1, 'semente-milho': 2 })
    expect(guardarNaGeladeira(p, inv, 'salada')).toBeNull()
    expect(guardarNaGeladeira(p, inv, 'semente-milho')).toBeNull()
    const completa = { ...p, aparencia: { origem: 'pinta' as const, id: 'c1' } }
    expect(capacidade(completa)).toBe(GELADEIRA_GUARDA.completa)
    expect(guardarNaGeladeira(completa, inv, 'salada')?.projeto.guardado).toEqual({ salada: 5 })
    const tirou = tirarDaGeladeira(p, inv, 'salada')
    expect(tirou?.inventario.salada).toBe(2)
    expect(tirou?.projeto.guardado).toEqual({ salada: 3 })
  })

  test('o Molda abre no posto Explorador(a) de Mundos; o molde da geladeira tem a frente', () => {
    expect(POSICAO_DO_MOLDA).toBe(4)
    expect(moldaAberto(3)).toBe(false)
    expect(moldaAberto(4)).toBe(true)
    expect(CATALOGO_DE_OBJETOS.geladeira.molde.frente).toBe('frente')
  })
})
