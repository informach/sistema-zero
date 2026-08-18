import { describe, expect, it } from 'bun:test'
import type { VectorShape } from './model'
import { dropShapesOrder, moveShapesOrder } from './order'

/** Retângulo mínimo — só o id, o grupo e o olhinho importam para a ordem. */
function rect(id: string, extra: Partial<VectorShape> = {}): VectorShape {
  return {
    id,
    fill: '#ff0000',
    stroke: null,
    opacity: 1,
    rotation: 0,
    type: 'rect',
    x: 0,
    y: 0,
    w: 10,
    h: 10,
    rx: 0,
    ...extra,
  } as VectorShape
}

/** A pilha lida do fundo para a frente, que é a ordem do array. */
function ordem(shapes: readonly VectorShape[] | null): string[] {
  return (shapes ?? []).map((s) => s.id)
}

describe('moveShapesOrder — a seleção anda como UMA peça', () => {
  it('grupo de 2 sobe INTEIRO e vira contíguo', () => {
    // ⭐ ANTI-VÁCUO: se a operação fosse por forma (como era antes), "a" passaria
    // "b" e o grupo se PARTIRIA — o esperado abaixo reprova exatamente isso.
    const shapes = [rect('a', { groupId: 'g' }), rect('b'), rect('c', { groupId: 'g' })]
    expect(ordem(moveShapesOrder(shapes, ['a'], 1))).toEqual(['b', 'a', 'c'])
  })

  it('⭐ o passo pula o CLUSTER vizinho inteiro (grupo de 3 não fica pela metade)', () => {
    const shapes = [
      rect('eu'),
      rect('v1', { groupId: 'gv' }),
      rect('v2', { groupId: 'gv' }),
      rect('v3', { groupId: 'gv' }),
      rect('topo'),
    ]
    expect(ordem(moveShapesOrder(shapes, ['eu'], 1))).toEqual(['v1', 'v2', 'v3', 'eu', 'topo'])
  })

  it('pedir por UM membro (o que o painel Camadas manda) move o grupo inteiro', () => {
    const shapes = [rect('a', { groupId: 'g' }), rect('b', { groupId: 'g' }), rect('c')]
    expect(ordem(moveShapesOrder(shapes, ['b'], 'front'))).toEqual(['c', 'a', 'b'])
  })

  it('laço com duas formas soltas: sobem juntas, ordem relativa preservada', () => {
    const shapes = [rect('a'), rect('b'), rect('c'), rect('d')]
    expect(ordem(moveShapesOrder(shapes, ['a', 'b'], 1))).toEqual(['c', 'a', 'b', 'd'])
  })

  it('seleção espalhada: o passo é do BLOCO, e quem estava no meio cai fora', () => {
    const shapes = [rect('a'), rect('b'), rect('c'), rect('d')]
    // {a,c} é uma peça só: acima dela está "d", então o passo passa "d"; e "b",
    // que estava ENTRE os membros, sai do meio (a contiguidade prometida).
    expect(ordem(moveShapesOrder(shapes, ['a', 'c'], 1))).toEqual(['b', 'd', 'a', 'c'])
  })

  it('escondida entre a seleção e o vizinho visível NÃO consome o passo', () => {
    const shapes = [rect('eu'), rect('fantasma', { hidden: true }), rect('vizinha')]
    // Um passo tem que passar a VIZINHA; parar em cima da escondida deixaria o
    // botão com cara de morto (nada muda na tela).
    expect(ordem(moveShapesOrder(shapes, ['eu'], 1))).toEqual(['fantasma', 'vizinha', 'eu'])
  })

  it('front/back levam o bloco ao topo/fundo na ordem relativa', () => {
    const shapes = [rect('a'), rect('b'), rect('c'), rect('d')]
    expect(ordem(moveShapesOrder(shapes, ['a', 'c'], 'front'))).toEqual(['b', 'd', 'a', 'c'])
    expect(ordem(moveShapesOrder(shapes, ['b', 'd'], 'back'))).toEqual(['b', 'd', 'a', 'c'])
  })

  it('bloco já contíguo no topo devolve null (nada a commitar)', () => {
    const shapes = [rect('a'), rect('b', { groupId: 'g' }), rect('c', { groupId: 'g' })]
    expect(moveShapesOrder(shapes, ['b'], 1)).toBeNull()
    expect(moveShapesOrder(shapes, ['b'], 'front')).toBeNull()
  })

  it('grupo ESPALHADO no topo ainda se junta com um passo', () => {
    const shapes = [rect('a', { groupId: 'g' }), rect('meio'), rect('b', { groupId: 'g' })]
    expect(ordem(moveShapesOrder(shapes, ['a'], 1))).toEqual(['meio', 'a', 'b'])
  })

  it('quem não se moveu sai com a MESMA REFERÊNCIA (memoização do palco)', () => {
    const parada = rect('parada')
    const shapes = [rect('a'), parada]
    const next = moveShapesOrder(shapes, ['a'], 'front')
    expect(next?.[0]).toBe(parada)
  })

  it('grupo vizinho ESPALHADO dos dois lados: o passo passa por cima dele todo', () => {
    const shapes = [
      rect('v1', { groupId: 'gv' }),
      rect('eu'),
      rect('v2', { groupId: 'gv' }),
      rect('topo'),
    ]
    expect(ordem(moveShapesOrder(shapes, ['eu'], 1))).toEqual(['v1', 'v2', 'eu', 'topo'])
    expect(ordem(moveShapesOrder(shapes, ['eu'], -1))).toEqual(['eu', 'v1', 'v2', 'topo'])
  })

  it('apertar "para a frente" várias vezes CONVERGE e depois devolve null', () => {
    // Sem isso, um passo que não anda viraria clique morto (ou, pior, undo vazio).
    let atual: VectorShape[] = [
      rect('a', { groupId: 'g' }),
      rect('x'),
      rect('b', { groupId: 'g' }),
      rect('y'),
    ]
    const trilha: string[][] = []
    for (let i = 0; i < 5; i += 1) {
      const next = moveShapesOrder(atual, ['a'], 1)
      if (!next) break
      atual = next
      trilha.push(ordem(atual))
    }
    expect(trilha).toEqual([['x', 'y', 'a', 'b']])
    expect(moveShapesOrder(atual, ['a'], 1)).toBeNull()
  })

  it('groupId igual ao id de OUTRA forma não gruda as duas', () => {
    const shapes = [rect('abc'), rect('y', { groupId: 'abc' }), rect('z')]
    expect(ordem(moveShapesOrder(shapes, ['y'], 'front'))).toEqual(['abc', 'z', 'y'])
  })

  it('seleção vazia, id fantasma ou pilha inteira selecionada: null', () => {
    const shapes = [rect('a'), rect('b')]
    expect(moveShapesOrder(shapes, [], 1)).toBeNull()
    expect(moveShapesOrder(shapes, ['sumiu'], 1)).toBeNull()
    expect(moveShapesOrder(shapes, ['a', 'b'], 'front')).toBeNull()
  })
})

describe('dropShapesOrder — alça do painel Camadas', () => {
  it('uma forma só atravessa igualzinho ao arrasto de antes', () => {
    const shapes = [rect('a'), rect('b'), rect('c')]
    expect(ordem(dropShapesOrder(shapes, ['a'], 'b'))).toEqual(['b', 'a', 'c'])
    expect(ordem(dropShapesOrder(shapes, ['c'], 'b'))).toEqual(['a', 'c', 'b'])
  })

  it('arrastar a linha de uma forma agrupada leva o grupo inteiro', () => {
    const shapes = [rect('a', { groupId: 'g' }), rect('b', { groupId: 'g' }), rect('c')]
    expect(ordem(dropShapesOrder(shapes, ['a'], 'c'))).toEqual(['c', 'a', 'b'])
  })

  it('soltar sobre SI MESMA não mexe em nada', () => {
    const shapes = [rect('a', { groupId: 'g' }), rect('b', { groupId: 'g' }), rect('c')]
    expect(dropShapesOrder(shapes, ['a'], 'a')).toBeNull()
  })

  it('⭐ sobre um IRMÃO, reordena DENTRO do grupo (o controle fino)', () => {
    // Sem isso, restacar as partes de um personagem agrupado exigia desagrupar,
    // arrumar e reagrupar — a régua "o grupo é uma peça só" tirava o único jeito.
    const shapes = [rect('olho', { groupId: 'g' }), rect('rosto', { groupId: 'g' }), rect('fundo')]
    // O olho sobe por cima do rosto, e o grupo NÃO se move como bloco.
    expect(ordem(dropShapesOrder(shapes, ['olho'], 'rosto'))).toEqual(['rosto', 'olho', 'fundo'])
  })

  it('cruzar para FORA volta a mover o grupo inteiro', () => {
    const shapes = [rect('olho', { groupId: 'g' }), rect('rosto', { groupId: 'g' }), rect('fundo')]
    // ⭐ ANTI-VÁCUO da regra: aqui o alvo é de fora, então os DOIS membros andam.
    expect(ordem(dropShapesOrder(shapes, ['olho'], 'fundo'))).toEqual(['fundo', 'olho', 'rosto'])
  })

  it('dentro do grupo, descer também vale', () => {
    const shapes = [rect('olho', { groupId: 'g' }), rect('rosto', { groupId: 'g' }), rect('fundo')]
    expect(ordem(dropShapesOrder(shapes, ['rosto'], 'olho'))).toEqual(['rosto', 'olho', 'fundo'])
  })
})
