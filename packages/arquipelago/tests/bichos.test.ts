import { describe, expect, test } from 'bun:test'
import {
  BICHOS_ADOTADOS_MAXIMO,
  BICHOS_DO_BOSQUE,
  type BichoAdotado,
} from '@sistemazero/arquipelago-contracts'
import {
  adotados,
  adotar,
  alimentar,
  CUIDADO,
  contarDiaCuidado,
  crescer,
  darBanho,
  ensinar,
  falaDaTroca,
  fazerCarinho,
  fazTruque,
  NOME_DO_BICHO,
  nomeValido,
  passarTempoDoBicho,
  podeAdotarMais,
  podeCrescer,
  QUEDA_DO_BICHO_POR_MINUTO,
  TRUQUE,
  tristinho,
  trocarBicho,
} from '../src/sistemas/bichos'
import {
  achar,
  type Bichos,
  calor,
  deveFalarDoCalor,
  ESCONDERIJOS,
  escondidos,
  FALA_DA_PISTA,
  FALA_DO_CALOR,
  INTERVALO_DO_CALOR,
  maisPertoEscondido,
  RAIO_DE_ACHAR,
} from '../src/sistemas/esconde'

const nenhum = (): Bichos => ({ achados: [], adotado: null, outros: [] })

function filhote(medidas: Partial<BichoAdotado> = {}): BichoAdotado {
  const b = adotar({ achados: ['gato'], adotado: null, outros: [] }, 'gato', 'Frida')?.adotado
  if (!b) throw new Error('não adotou')
  return { ...b, ...medidas }
}

const dia = (n: number) => `2026-11-${String(n).padStart(2, '0')}`

describe('esconde-esconde', () => {
  test('cada bicho tem um esconderijo e uma pista só dele', () => {
    const ancoras = BICHOS_DO_BOSQUE.map((b) => ESCONDERIJOS[b].ancora)
    expect(new Set(ancoras).size).toBe(4)
    expect(ancoras.sort()).toEqual([
      'esconderijo-1',
      'esconderijo-2',
      'esconderijo-3',
      'esconderijo-4',
    ])
    expect(new Set(BICHOS_DO_BOSQUE.map((b) => ESCONDERIJOS[b].pista)).size).toBe(4)
  })

  test('o calor vai de pertinho a frio', () => {
    expect(calor(0)).toBe('pertinho')
    expect(calor(RAIO_DE_ACHAR * 1.5)).toBe('pertinho')
    expect(calor(5)).toBe('quentinho')
    expect(calor(10)).toBe('morno')
    expect(calor(40)).toBe('frio')
  })

  test('acha o bicho escondido mais perto, sem contar os já achados', () => {
    const onde = { cachorro: { x: 0, z: 0 }, gato: { x: 10, z: 0 }, coelho: { x: 0, z: 30 } }
    expect(maisPertoEscondido(nenhum(), { x: 1, z: 0 }, onde)?.bicho).toBe('cachorro')
    const r = maisPertoEscondido(
      { achados: ['cachorro'], adotado: null, outros: [] },
      { x: 1, z: 0 },
      onde,
    )
    expect(r?.bicho).toBe('gato')
    expect(r?.distancia).toBeCloseTo(9)
    expect(
      maisPertoEscondido(
        { achados: [...BICHOS_DO_BOSQUE], adotado: null, outros: [] },
        { x: 0, z: 0 },
        onde,
      ),
    ).toBeNull()
  })

  test('achar guarda o bicho uma vez só', () => {
    const a = achar(nenhum(), 'coelho')
    expect(a.achados).toEqual(['coelho'])
    expect(achar(a, 'coelho')).toBe(a)
    expect(escondidos(a)).toEqual(['cachorro', 'gato', 'porquinho'])
  })

  test('o Zappy fala do calor só quando esquenta, e não toda hora', () => {
    expect(deveFalarDoCalor(null, 'morno', 99)).toBe(false)
    expect(deveFalarDoCalor('frio', 'morno', INTERVALO_DO_CALOR)).toBe(true)
    expect(deveFalarDoCalor('morno', 'quentinho', INTERVALO_DO_CALOR - 1)).toBe(false)
    expect(deveFalarDoCalor('quentinho', 'morno', 99)).toBe(false)
    expect(deveFalarDoCalor('morno', 'morno', 99)).toBe(false)
  })

  test('as falas do Zappy seguem as regras de texto', () => {
    for (const f of [...Object.values(FALA_DO_CALOR), ...Object.values(FALA_DA_PISTA)])
      expect(f).not.toMatch(/[—!?]/)
  })
})

describe('adotar', () => {
  test('o nome tem de 1 a 16 caracteres, só letras, espaço e hífen', () => {
    expect(nomeValido('  Pé   de-Moleque ')).toBe('Pé de-Moleque')
    expect(nomeValido('Ana')).toBe('Ana')
    // O acento digitado separado da letra vira a letra acentuada (NFC).
    expect(nomeValido('Jose\u0301')).toBe('José')
    expect(nomeValido('')).toBeNull()
    expect(nomeValido('   ')).toBeNull()
    expect(nomeValido('a'.repeat(17))).toBeNull()
    expect(nomeValido('a'.repeat(16))).toBe('a'.repeat(16))
    expect(nomeValido('Rex2')).toBeNull()
    expect(nomeValido('-Rex')).toBeNull()
    expect(nomeValido('<b>')).toBeNull()
  })

  test('só adota um bicho achado, com nome válido, e o segundo vai junto (V23)', () => {
    expect(adotar(nenhum(), 'gato', 'Frida')).toBeNull()
    expect(adotar({ achados: ['gato'], adotado: null, outros: [] }, 'gato', '1')).toBeNull()
    const b = adotar({ achados: ['gato', 'coelho'], adotado: null, outros: [] }, 'gato', 'Frida')
    expect(b?.adotado).toMatchObject({
      id: 'gato',
      nome: 'Frida',
      fase: 'filhote',
      diasCuidados: 0,
    })
    // Desde a V23 dá para adotar mais: o coelho vai junto e a Frida espera no Bosque.
    const c = b && adotar(b, 'coelho', 'Tito')
    expect(c?.adotado?.nome).toBe('Tito')
    expect(c?.outros.map((o) => o.nome)).toEqual(['Frida'])
  })

  test('todo bicho tem truque e nome', () => {
    for (const b of BICHOS_DO_BOSQUE) {
      expect(TRUQUE[b].length).toBeGreaterThan(0)
      expect(NOME_DO_BICHO[b].length).toBeGreaterThan(0)
    }
  })
})

describe('cuidar', () => {
  test('as medidas caem com o tempo jogado e param no zero', () => {
    const b = passarTempoDoBicho(filhote(), 10 * 60)
    expect(b.fome).toBeCloseTo(80 - QUEDA_DO_BICHO_POR_MINUTO.fome * 10)
    expect(b.limpeza).toBeCloseTo(80 - QUEDA_DO_BICHO_POR_MINUTO.limpeza * 10)
    expect(b.carinho).toBeCloseTo(80 - QUEDA_DO_BICHO_POR_MINUTO.carinho * 10)
    const z = passarTempoDoBicho(filhote(), 10 * 3600)
    expect([z.fome, z.limpeza, z.carinho]).toEqual([0, 0, 0])
    expect(passarTempoDoBicho(filhote(), -60).fome).toBe(80)
  })

  test('alimentar usa uma comida do inventário', () => {
    const r = alimentar(filhote({ fome: 10 }), { tomate: 2 }, 'tomate')
    expect(r?.bicho.fome).toBe(10 + 10 * CUIDADO.comidaVezes)
    expect(r?.inv).toEqual({ tomate: 1 })
    expect(alimentar(filhote({ fome: 90 }), { salada: 1 }, 'salada')?.bicho.fome).toBe(100)
    expect(alimentar(filhote(), {}, 'tomate')).toBeNull()
    expect(alimentar(filhote(), { 'semente-milho': 1 }, 'semente-milho')).toBeNull()
  })

  test('banho e carinho repõem e param no 100', () => {
    expect(darBanho(filhote({ limpeza: 10 })).limpeza).toBe(10 + CUIDADO.banho)
    expect(darBanho(filhote({ limpeza: 90 })).limpeza).toBe(100)
    expect(fazerCarinho(filhote({ carinho: 10 })).carinho).toBe(10 + CUIDADO.carinho)
  })

  test('medida baixa deixa tristinho, e cuidar desfaz', () => {
    const b = filhote({ limpeza: 20 })
    expect(tristinho(b)).toBe(true)
    expect(tristinho(darBanho(b))).toBe(false)
  })
})

describe('crescer e aprender o truque', () => {
  test('o dia conta uma vez, só com as três medidas acima de 60', () => {
    expect(contarDiaCuidado(filhote({ fome: 60 }), dia(1)).diasCuidados).toBe(0)
    const a = contarDiaCuidado(filhote(), dia(1))
    expect(a.diasCuidados).toBe(1)
    expect(contarDiaCuidado(a, dia(1))).toBe(a)
    expect(contarDiaCuidado(a, dia(2)).diasCuidados).toBe(2)
  })

  test('vira adulto depois de 7 dias bem cuidado', () => {
    let b = filhote()
    for (let d = 1; d < CUIDADO.diasParaCrescer; d++) b = contarDiaCuidado(b, dia(d))
    expect(podeCrescer(b)).toBe(false)
    expect(crescer(b)).toBe(b)
    b = contarDiaCuidado(b, dia(CUIDADO.diasParaCrescer))
    expect(podeCrescer(b)).toBe(true)
    const adulto = crescer(b)
    expect(adulto.fase).toBe('adulto')
    expect(podeCrescer(adulto)).toBe(false)
  })

  test('aprende o truque em 5 sessões em dias diferentes, bem cuidado', () => {
    let b = filhote()
    expect(ensinar(filhote({ carinho: 50 }), dia(1)).resultado).toBe('precisa-cuidado')
    for (let d = 1; d < CUIDADO.sessoesDoTruque; d++) {
      const r = ensinar(b, dia(d))
      expect(r.resultado).toBe('mais-uma')
      expect(ensinar(r.bicho, dia(d)).resultado).toBe('ja-hoje')
      b = r.bicho
    }
    expect(fazTruque(b)).toBe(false)
    const ultima = ensinar(b, dia(CUIDADO.sessoesDoTruque))
    expect(ultima.resultado).toBe('aprendeu')
    expect(fazTruque(ultima.bicho)).toBe(true)
    expect(ensinar(ultima.bicho, dia(9)).resultado).toBe('ja-sabe')
    expect(fazTruque({ ...ultima.bicho, fome: 10 })).toBe(false)
  })
})

describe('adotar mais de um bicho (lacunas, 01/11/2026, V23)', () => {
  const vazio = { achados: [...BICHOS_DO_BOSQUE], adotado: null, outros: [] }
  test('até três adotados: o novo vai junto e o de antes espera no Bosque', () => {
    const um = adotar(vazio, 'gato', 'Mia')
    if (!um) throw new Error('não adotou')
    expect(um.adotado?.nome).toBe('Mia')
    const dois = adotar(um, 'cachorro', 'Rex')
    if (!dois) throw new Error('não adotou o segundo')
    expect(dois.adotado?.nome).toBe('Rex')
    expect(dois.outros.map((b) => b.nome)).toEqual(['Mia'])
    const tres = adotar(dois, 'coelho', 'Bolinha')
    if (!tres) throw new Error('não adotou o terceiro')
    expect(adotados(tres)).toHaveLength(BICHOS_ADOTADOS_MAXIMO)
    expect(podeAdotarMais(tres)).toBe(false)
    expect(adotar(tres, 'porquinho', 'Rosinha')).toBeNull()
    // O mesmo bicho não se adota duas vezes.
    expect(adotar(dois, 'gato', 'Outra')).toBeNull()
  })

  test('trocar quem vai junto devolve o de antes ao Bosque', () => {
    const dois = adotar(adotar(vazio, 'gato', 'Mia') ?? vazio, 'cachorro', 'Rex')
    if (!dois) throw new Error('não adotou')
    const trocado = trocarBicho(dois, 'gato')
    expect(trocado.adotado?.nome).toBe('Mia')
    expect(trocado.outros.map((b) => b.nome)).toEqual(['Rex'])
    expect(trocarBicho(trocado, 'gato')).toBe(trocado)
    expect(falaDaTroca('Mia', 'Rex')).not.toMatch(/[—–!?]/)
  })
})
