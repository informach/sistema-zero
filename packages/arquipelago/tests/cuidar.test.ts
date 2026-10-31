import { describe, expect, test } from 'bun:test'
import { criarSalvamentoInicial, type Salvamento } from '@sistemazero/arquipelago-contracts'
import { CUIDADO, motivoDoNome } from '../src/sistemas/bichos'
import { adotarPelaCapi, podeAdotar } from '../src/sistemas/conversa-da-capi'
import { cuidar } from '../src/sistemas/cuidar'
import { atrasDela, criarSeguir, ficouPreso, passoDoSeguir, SEGUIR } from '../src/sistemas/seguir'

const dia = (n: number) => `2026-11-${String(n).padStart(2, '0')}`

function comGato(medidas: Partial<NonNullable<Salvamento['bichos']['adotado']>> = {}): Salvamento {
  const base = criarSalvamentoInicial(new Date('2026-10-28T12:00:00Z'))
  const r = adotarPelaCapi(
    { ...base, bichos: { achados: ['gato'], adotado: null, outros: [] } },
    'gato',
    'Mia',
  )
  if (!('salvamento' in r) || !r.salvamento.bichos.adotado) throw new Error('não adotou')
  const s = r.salvamento
  return { ...s, bichos: { ...s.bichos, adotado: { ...r.salvamento.bichos.adotado, ...medidas } } }
}

const semPergunta = (f: string) => !f.split(/(?<=[.?])\s/)[0]?.endsWith('?')

describe('adotar pela conversa com a Capi', () => {
  test('a Capi só oferece depois do primeiro achado e enquanto ninguém foi adotado', () => {
    const base = criarSalvamentoInicial(new Date('2026-10-28T12:00:00Z'))
    expect(podeAdotar(base)).toBe(false)
    expect(
      podeAdotar({ ...base, bichos: { achados: ['coelho'], adotado: null, outros: [] } }),
    ).toBe(true)
    expect(podeAdotar(comGato())).toBe(false)
  })

  test('o nome que não serve diz por quê, e nada muda', () => {
    expect(motivoDoNome('')).toContain('Escreva')
    expect(motivoDoNome('a'.repeat(17))).toContain('16')
    expect(motivoDoNome('2x')).toContain('letra')
    expect(motivoDoNome('Rex!')).toContain('só letras')
    expect(motivoDoNome('Pé de-Moleque')).toBeNull()
    const base = criarSalvamentoInicial(new Date('2026-10-28T12:00:00Z'))
    expect(
      adotarPelaCapi(
        { ...base, bichos: { achados: ['gato'], adotado: null, outros: [] } },
        'gato',
        '',
      ),
    ).toEqual({
      motivo: 'Escreva um nome.',
    })
  })

  test('adotar guarda o nome e a fala da Capi usa o nome, sem pronome', () => {
    const s = comGato()
    expect(s.bichos.adotado).toMatchObject({ id: 'gato', nome: 'Mia', fase: 'filhote' })
    const base = criarSalvamentoInicial(new Date('2026-10-28T12:00:00Z'))
    const r = adotarPelaCapi(
      { ...base, bichos: { achados: ['gato'], adotado: null, outros: [] } },
      'gato',
      'Mia',
    )
    expect('fala' in r && r.fala.startsWith('Mia')).toBe(true)
    expect('fala' in r && /\b(ele|ela|dele|dela)\b/.test(r.fala)).toBe(false)
  })
})

describe('cuidar do bicho adotado', () => {
  test('comida da mochila enche a barriga e sai do inventário', () => {
    const s = { ...comGato({ fome: 20 }), inventario: { milho: 2 } }
    const r = cuidar(s, { tipo: 'comida', itemId: 'milho' }, dia(1))
    expect(r.salvamento.bichos.adotado?.fome).toBe(20 + 10 * CUIDADO.comidaVezes)
    expect(r.salvamento.inventario).toEqual({ milho: 1 })
    expect(r.reacao).toBe('feliz')
  })

  test('sem a comida ou com o que não é comida, nada muda', () => {
    const s = { ...comGato(), inventario: { 'semente-milho': 1 } }
    const semItem = cuidar(s, { tipo: 'comida', itemId: 'milho' }, dia(1))
    expect(semItem.salvamento).toBe(s)
    expect(semItem.falas[0]).toContain('acabou')
    const naoE = cuidar(s, { tipo: 'comida', itemId: 'semente-milho' }, dia(1))
    expect(naoE.salvamento).toBe(s)
    expect(naoE.falas[0]).toContain('não é comida')
  })

  test('banho e carinho repõem e contam para o dia bem cuidado', () => {
    const s = comGato({ fome: 70, limpeza: 10, carinho: 70 })
    const r = cuidar(s, { tipo: 'banho' }, dia(1))
    expect(r.salvamento.bichos.adotado?.limpeza).toBe(10 + CUIDADO.banho)
    expect(r.salvamento.bichos.adotado?.diasCuidados).toBe(1)
    expect(
      cuidar(r.salvamento, { tipo: 'carinho' }, dia(1)).salvamento.bichos.adotado?.diasCuidados,
    ).toBe(1)
  })

  test('a aula do truque: uma por dia, e no fim ele aprende e faz quando pedem', () => {
    let s = comGato()
    for (let d = 1; d < CUIDADO.sessoesDoTruque; d++) {
      const r = cuidar(s, { tipo: 'ensinar' }, dia(d))
      expect(r.falas[0]).toContain('aprendendo')
      expect(cuidar(r.salvamento, { tipo: 'ensinar' }, dia(d)).falas[0]).toContain('chega de aula')
      s = r.salvamento
    }
    expect(cuidar(s, { tipo: 'truque' }, dia(9)).falas[0]).toContain('ainda não aprendeu')
    const aprendeu = cuidar(s, { tipo: 'ensinar' }, dia(CUIDADO.sessoesDoTruque))
    expect(aprendeu.reacao).toBe('truque')
    const pedido = cuidar(aprendeu.salvamento, { tipo: 'truque' }, dia(9))
    expect(pedido.falas[0]).toBe('Mia rolou no chão.')
    expect(pedido.reacao).toBe('truque')
  })

  test('sem cuidado, a aula espera; triste, o truque também', () => {
    expect(cuidar(comGato({ carinho: 40 }), { tipo: 'ensinar' }, dia(1)).falas[0]).toContain(
      'precisa',
    )
    const sabe = comGato({ truque: { sessoes: 5, ultimaEm: dia(1), aprendido: true }, fome: 10 })
    expect(cuidar(sabe, { tipo: 'truque' }, dia(2)).reacao).toBeNull()
  })

  test('no sétimo dia bem cuidado o filhote cresce na hora', () => {
    let s = comGato({ diasCuidados: CUIDADO.diasParaCrescer - 1, diaCuidadoEm: dia(1) })
    const r = cuidar(s, { tipo: 'carinho' }, dia(2))
    expect(r.cresceu).toBe(true)
    expect(r.salvamento.bichos.adotado?.fase).toBe('adulto')
    expect(r.falas.at(-1)).toContain('cresceu')
    s = r.salvamento
    expect(cuidar(s, { tipo: 'carinho' }, dia(3)).cresceu).toBe(false)
  })

  test('as falas seguem as regras de texto e não usam pronome', () => {
    const todas = [
      ...cuidar(
        { ...comGato(), inventario: { milho: 1 } },
        { tipo: 'comida', itemId: 'milho' },
        dia(1),
      ).falas,
      ...cuidar(comGato(), { tipo: 'banho' }, dia(1)).falas,
      ...cuidar(comGato(), { tipo: 'carinho' }, dia(1)).falas,
      ...cuidar(comGato(), { tipo: 'ensinar' }, dia(1)).falas,
      ...cuidar(comGato(), { tipo: 'truque' }, dia(1)).falas,
    ]
    for (const f of todas) {
      expect(f).not.toMatch(/[—!]/)
      expect(semPergunta(f)).toBe(true)
      expect(/\b(ele|ela|dele|dela)\b/.test(f)).toBe(false)
    }
  })
})

describe('seguir a criança', () => {
  test('perto, fica parado; longe, anda; mais longe, corre', () => {
    const e = criarSeguir()
    expect(passoDoSeguir(e, { x: 0, y: 1, z: 0 }, { x: 1, z: 0 }, false, 0.1).clipe).toBe('parado')
    let clipe = ''
    for (let i = 0; i < 30; i++)
      clipe = passoDoSeguir(e, { x: 0, y: 1, z: 0 }, { x: 4, z: 0 }, false, 0.05).clipe
    expect(clipe).toBe('andar')
    expect(e.vx).toBeGreaterThan(0)
    for (let i = 0; i < 30; i++)
      clipe = passoDoSeguir(e, { x: 0, y: 1, z: 0 }, { x: 10, z: 0 }, false, 0.05).clipe
    expect(clipe).toBe('correr')
  })

  test('esperando (cipó, tronco, água), para; muito longe, reaparece atrás dela', () => {
    const e = criarSeguir()
    for (let i = 0; i < 30; i++) passoDoSeguir(e, { x: 0, y: 1, z: 0 }, { x: 4, z: 0 }, true, 0.05)
    expect(Math.hypot(e.vx, e.vz)).toBeLessThan(0.15)
    expect(passoDoSeguir(e, { x: 0, y: 1, z: 0 }, { x: 30, z: 0 }, false, 0.05).reaparecer).toBe(
      true,
    )
    const p = atrasDela({ x: 0, z: 0, direcao: 0 })
    expect(p.z).toBeCloseTo(-SEGUIR.perto)
  })

  test('caído da ilha (abaixo do mar), reaparece; esperando por ela, espera', () => {
    const e = criarSeguir()
    const caido = { x: 0, y: -3, z: 0 }
    expect(passoDoSeguir(e, caido, { x: 2, z: 0 }, true, 0.05).reaparecer).toBe(false)
    expect(passoDoSeguir(e, caido, { x: 2, z: 0 }, false, 0.05).reaparecer).toBe(true)
  })

  test('querendo andar sem sair do lugar (preso na parede), reaparece depois de um tempo', () => {
    const e = criarSeguir()
    const bicho = { x: 0, y: 1, z: 0 }
    let reaparecer = false
    let t = 0
    while (!reaparecer && t < 10) {
      reaparecer = passoDoSeguir(e, bicho, { x: 6, z: 0 }, false, 0.05).reaparecer
      if (!reaparecer) ficouPreso(e, 0, 0.05)
      t += 0.05
    }
    expect(reaparecer).toBe(true)
    expect(t).toBeGreaterThan(SEGUIR.presoPor)
    expect(t).toBeLessThan(SEGUIR.presoPor + 1)
    // Andando de verdade, nunca conta como preso.
    const solto = criarSeguir()
    for (let i = 0; i < 200; i++) {
      passoDoSeguir(solto, bicho, { x: 6, z: 0 }, false, 0.05)
      expect(ficouPreso(solto, Math.hypot(solto.vx, solto.vz) * 0.05, 0.05)).toBe(false)
    }
  })

  test('parado por um tempo, senta', () => {
    const e = criarSeguir()
    let clipe = ''
    for (let i = 0; i < 70; i++)
      clipe = passoDoSeguir(e, { x: 0, y: 1, z: 0 }, { x: 1, z: 0 }, false, 0.1).clipe
    expect(clipe).toBe('sentar')
  })
})
