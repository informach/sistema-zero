import { describe, expect, test } from 'bun:test'
import {
  aoAlcance,
  type ChaoNoPonto,
  caminhoDoToque,
  comandoCancela,
  criarIda,
  destinoDaIda,
  foiUmToque,
  IR_TOCANDO,
  interativoDoLembrete,
  interativoNoToque,
  LUGARES_DOS_LEMBRETES,
  passoDaIda,
  pontosParaUsar,
  restanteDaIda,
} from '../src/sistemas/ir-tocando'

/** Um mundo de mentira: chão plano em y = 0, com o que a função disser por cima. */
const plano =
  (regra: (x: number, z: number) => Partial<ChaoNoPonto> = () => ({})) =>
  (x: number, z: number): ChaoNoPonto => ({ y: 0, cabe: true, ...regra(x, z) })

/** Anda a ida até o fim, como o corpo do jogo andaria (em linha reta até o ponto da vez). */
function andar(caminho: { x: number; z: number }[], de = { x: 0, z: 0 }, velocidade = 2.2) {
  const ida = criarIda(caminho, de)
  if (!ida) throw new Error('sem ida')
  const p = { ...de }
  const rumo = { x: 0, z: 0, correr: false }
  let correu = false
  for (let i = 0; i < 60 * 60; i++) {
    const situacao = passoDaIda(ida, p, 1 / 60, rumo)
    if (situacao !== 'andando') return { situacao, p, correu }
    correu ||= rumo.correr
    p.x += rumo.x * velocidade * (1 / 60)
    p.z += rumo.z * velocidade * (1 / 60)
  }
  return { situacao: 'andando' as const, p, correu }
}

describe('o toque', () => {
  test('descer e subir no mesmo lugar, depressa, é um toque; arrastar ou segurar não', () => {
    expect(foiUmToque(0, 0, 120)).toBe(true)
    expect(foiUmToque(6, 6, 300)).toBe(true)
    expect(foiUmToque(30, 0, 120)).toBe(false)
    expect(foiUmToque(0, 0, IR_TOCANDO.toqueMs + 1)).toBe(false)
  })

  test('o direcional, o pulo e o usar devolvem o comando a ela', () => {
    expect(comandoCancela(0, 0, false, false)).toBe(false)
    expect(comandoCancela(0.1, 0.1, false, false)).toBe(false)
    expect(comandoCancela(0, 1, false, false)).toBe(true)
    expect(comandoCancela(0, 0, true, false)).toBe(true)
    expect(comandoCancela(0, 0, false, true)).toBe(true)
  })
})

describe('o caminho do toque', () => {
  test('no chão livre, vai reto até o ponto tocado', () => {
    const r = caminhoDoToque({ x: 0, z: 0 }, { x: 5, z: 3 }, plano())
    if (!('caminho' in r)) throw new Error('recusou')
    expect(r.caminho).toEqual([{ x: 5, z: 3 }])
  })

  test('com uma parede no meio, dá a volta e chega', () => {
    // Uma parede em x = 3, de z = −4 a z = 4.
    const chao = plano((x, z) => ({ cabe: !(Math.abs(x - 3) < 0.4 && Math.abs(z) <= 4) }))
    const r = caminhoDoToque({ x: 0, z: 0 }, { x: 6, z: 0 }, chao)
    if (!('caminho' in r)) throw new Error('recusou')
    expect(r.caminho.length).toBeGreaterThan(1)
    expect(r.caminho.at(-1)).toEqual({ x: 6, z: 0 })
    // Nenhum ponto do caminho fica dentro da parede, e ele passa por fora da ponta dela.
    for (const p of r.caminho) expect(Math.abs(p.x - 3) < 0.4 && Math.abs(p.z) <= 4).toBe(false)
    expect(Math.max(...r.caminho.map((p) => Math.abs(p.z)))).toBeGreaterThan(4)
    expect(andar(r.caminho).situacao).toBe('chegou')
  })

  test('recusa o que está longe demais, o que não tem chão e onde o corpo não cabe', () => {
    expect(caminhoDoToque({ x: 0, z: 0 }, { x: IR_TOCANDO.alcance + 1, z: 0 }, plano())).toEqual({
      recusa: 'longe',
    })
    // Um buraco (sem chão) em volta do ponto tocado.
    const buraco = plano((x, z) => (Math.hypot(x - 8, z) < 2 ? { y: null } : {}))
    expect(caminhoDoToque({ x: 0, z: 0 }, { x: 8, z: 0 }, buraco)).toEqual({
      recusa: 'sem-caminho',
    })
    // Água funda (o corpo teria de nadar): não cabe.
    const lago = plano((x, z) => ({ cabe: Math.hypot(x - 8, z) >= 2 }))
    expect(caminhoDoToque({ x: 0, z: 0 }, { x: 8, z: 0 }, lago)).toEqual({ recusa: 'sem-caminho' })
  })

  test('um deque alto sem escada não se alcança andando; com rampa, sim', () => {
    // O chão sobe 2 m de uma vez em x = 5 (um barranco): do lado de cima não se chega.
    const barranco = plano((x) => ({ y: x >= 5 ? 2 : 0 }))
    expect(caminhoDoToque({ x: 0, z: 0 }, { x: 8, z: 0 }, barranco)).toEqual({
      recusa: 'sem-caminho',
    })
    // A mesma subida numa rampa de 0,2 m por casa: chega.
    const rampa = plano((x) => ({ y: Math.max(0, Math.min(2, (x - 2) * 0.4)) }))
    expect('caminho' in caminhoDoToque({ x: 0, z: 0 }, { x: 8, z: 0 }, rampa)).toBe(true)
  })

  test('cercada por todos os lados, não há caminho', () => {
    const cercada = plano((x, z) => ({ cabe: Math.hypot(x, z) < 1.2 || Math.hypot(x, z) > 2.4 }))
    expect(caminhoDoToque({ x: 0, z: 0 }, { x: 6, z: 0 }, cercada)).toEqual({
      recusa: 'sem-caminho',
    })
  })
})

describe('a ida', () => {
  test('anda até o destino; longe corre, perto anda', () => {
    const longe = andar([{ x: 20, z: 0 }])
    expect(longe.situacao).toBe('chegou')
    expect(longe.correu).toBe(true)
    expect(Math.hypot(longe.p.x - 20, longe.p.z)).toBeLessThanOrEqual(IR_TOCANDO.chegou)
    expect(andar([{ x: 3, z: 0 }]).correu).toBe(false)
  })

  test('passa pelos pontos do meio sem parar em cada um', () => {
    const ida = criarIda(
      [
        { x: 2, z: 0 },
        { x: 2, z: 4 },
      ],
      { x: 0, z: 0 },
    )
    if (!ida) throw new Error('sem ida')
    expect(destinoDaIda(ida)).toEqual({ x: 2, z: 4 })
    expect(restanteDaIda(ida, { x: 0, z: 0 })).toBeCloseTo(6, 6)
    const rumo = { x: 0, z: 0, correr: false }
    // Perto do primeiro ponto, já mira o segundo.
    expect(passoDaIda(ida, { x: 1.7, z: 0 }, 1 / 60, rumo)).toBe('andando')
    expect(ida.indice).toBe(1)
    expect(rumo.z).toBeGreaterThan(0.9)
  })

  test('sem avançar por um tempo, desiste (alguma coisa segurou o corpo)', () => {
    const ida = criarIda([{ x: 10, z: 0 }], { x: 0, z: 0 })
    if (!ida) throw new Error('sem ida')
    const rumo = { x: 0, z: 0, correr: false }
    let situacao = passoDaIda(ida, { x: 0, z: 0 }, 1 / 60, rumo)
    for (let t = 0; t < IR_TOCANDO.travada + 0.1 && situacao === 'andando'; t += 1 / 60)
      situacao = passoDaIda(ida, { x: 0.01, z: 0 }, 1 / 60, rumo)
    expect(situacao).toBe('travada')
    expect(criarIda([], { x: 0, z: 0 })).toBeNull()
  })
})

describe('tocar num objeto', () => {
  const objeto = (x: number, z: number, raio = 1.5, extra: object = {}) => ({
    x,
    z,
    raio,
    rotulo: () => 'Sentar no banco',
    ...extra,
  })

  test('o toque no objeto ou no chão junto dele escolhe o objeto; longe dele, não', () => {
    const lista: [string, ReturnType<typeof objeto>][] = [
      ['banco', objeto(5, 0)],
      ['placa', objeto(5, 4, 0.8)],
    ]
    expect(interativoNoToque(lista, { x: 5.3, z: 0.2 })?.id).toBe('banco')
    // A placa tem alcance curto, mas o toque vale até `PERTO_DO_OBJETO`.
    expect(interativoNoToque(lista, { x: 5.9, z: 4.5 })?.id).toBe('placa')
    expect(interativoNoToque(lista, { x: 12, z: 0 })).toBeNull()
  })

  test('o bicho que segue e o objeto sem nada a fazer não contam', () => {
    const lista: [string, ReturnType<typeof objeto>][] = [
      ['bicho', objeto(1, 0, 1.5, { deFundo: true })],
      ['porta', objeto(1.2, 0, 1.5, { rotulo: () => null })],
    ]
    expect(interativoNoToque(lista, { x: 1, z: 0 })).toBeNull()
  })

  test('para usar, para dentro do alcance, primeiro do lado de quem chega', () => {
    const alvo = { x: 0, z: 0, raio: 1.5 }
    const pontos = pontosParaUsar(alvo, { x: 0, z: -10 })
    expect(pontos).toHaveLength(8)
    for (const p of pontos) expect(Math.hypot(p.x, p.z)).toBeLessThan(alvo.raio)
    expect(pontos[0]?.z).toBeLessThan(0)
    expect(aoAlcance(alvo, { x: 1, z: 1 })).toBe(true)
    expect(aoAlcance(alvo, { x: 2, z: 2 })).toBe(false)
  })

  test('a ida guarda o objeto a usar ao chegar', () => {
    expect(criarIda([{ x: 1, z: 0 }], { x: 0, z: 0 }, 'banco')?.usar).toBe('banco')
    expect(criarIda([{ x: 1, z: 0 }], { x: 0, z: 0 })?.usar).toBeNull()
  })
})

describe('levar até a tarefa do "Agora"', () => {
  const it = (x: number, rotulo: string | null) => ({ x, z: 0, raio: 1.5, rotulo: () => rotulo })

  test('cada lembrete do "Agora" tem onde ser feito', () => {
    for (const id of ['porta', 'fome', 'energia', 'regar', 'colher', 'primeiro-pedido', 'desafio'])
      expect(LUGARES_DOS_LEMBRETES[id]?.length, id).toBeGreaterThan(0)
  })

  test('vai ao mais perto com algo a fazer; sem nenhum assim, ao mais perto mesmo', () => {
    const lista: [string, ReturnType<typeof it>][] = [
      ['canteiro-a', it(2, null)],
      ['canteiro-b', it(6, 'Regar')],
      ['canteiro-c', it(9, 'Regar')],
      ['cama', it(1, 'Deitar')],
    ]
    expect(interativoDoLembrete(lista, ['canteiro-'], { x: 0, z: 0 })?.id).toBe('canteiro-b')
    expect(interativoDoLembrete(lista.slice(0, 1), ['canteiro-'], { x: 0, z: 0 })?.id).toBe(
      'canteiro-a',
    )
    // O id inteiro só casa com o id inteiro; o começo, só quando termina em "-".
    expect(interativoDoLembrete(lista, ['cam'], { x: 0, z: 0 })).toBeNull()
    expect(interativoDoLembrete(lista, ['cama'], { x: 0, z: 0 })?.id).toBe('cama')
    expect(interativoDoLembrete(lista, ['quadro-'], { x: 0, z: 0 })).toBeNull()
  })
})
