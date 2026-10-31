import { describe, expect, test } from 'bun:test'
import {
  CARTAS_LUMI,
  type CartaoDaRotina,
  criarSalvamentoInicial,
  LIMITES_DA_ROTINA,
  migrarSalvamento,
  type Salvamento,
} from '@sistemazero/arquipelago-contracts'
import { criarPlataformaFalsa } from '../src/plataforma/falsa'
import { obraDeExemplo, PROJETOS_DE_EXEMPLO } from '../src/plataforma/obra-de-exemplo'
import { CRESCIMENTO_MS } from '../src/sistemas/horta'
import {
  alvoExiste,
  apagarRotina,
  aplicarPasso,
  CARTOES_POR_EXECUCAO,
  cartaoNovo,
  cartasNaMao,
  comecarExecucao,
  daRotinaDo,
  guardarRotina,
  listaNoAlvo,
  lugarDaGeladeira,
  moverCartao,
  mudarCartao,
  NOME_DA_CONDICAO,
  NOME_DO_CASO,
  NOME_DO_LUGAR,
  porCartao,
  proximoPasso,
  quandoDaVirada,
  rodarRotina,
  rotinasDoQuando,
  TEXTOS_DA_ROTINA,
  type TipoDoPasso,
  temGeladeira,
  tirarCartao,
  validarRotina,
} from '../src/sistemas/rotina'

/**
 * A rotina dos Lumis (fase2-07): validar, os cartões travados, o intérprete sobre a horta e a
 * geladeira, e o painel montando a sequência. O exemplo é o da proposta ("Rotina da Pitanga")
 * com o Lumi que existe hoje, o Quindim da Vila Doce.
 */

const AGORA = new Date('2026-10-29T12:00:00Z')
const TODOS = new Set(CARTAS_LUMI.map((c) => c.id))
/**
 * O que a pessoa do playground tem (`cartas-falsas.ts`): quem está no quarto posto tem os cartões
 * que chegam até ele (os cartões chegam pelo posto desde as lacunas de 01/11/2026).
 */
const ALGUNS = new Set(CARTAS_LUMI.filter((c) => c.posto <= 4).map((c) => c.id))
/** Quem está no primeiro posto: os do jogo e o Repetir (repetição no começo). */
const DO_PRIMEIRO_POSTO = new Set(CARTAS_LUMI.filter((c) => c.posto === 1).map((c) => c.id))

/** O exemplo da proposta: quando amanhecer, voar até a horta, para cada canteiro regar e, se
 * está maduro, colher, voar até a geladeira e guardar tudo. */
const ROTINA_DO_QUINDIM: CartaoDaRotina[] = [
  { c: 'quando-amanhecer' },
  { c: 'voar-ate', a: 'horta' },
  { c: 'para-cada', d: [{ c: 'regar' }, { c: 'se', se: 'maduro', d: [{ c: 'colher' }] }] },
  { c: 'voar-ate', a: 'geladeira' },
  { c: 'guardar' },
]

/** Um jogo com o Quindim, a geladeira na casa e a horta: c1 com semente sem água, c2 madura. */
function jogo(): Salvamento {
  const s = criarSalvamentoInicial(AGORA)
  const muitoAntes = new Date(AGORA.getTime() - CRESCIMENTO_MS.alface - 1000).toISOString()
  const horta = s.horta.map((c, i) =>
    i === 0
      ? { ...c, semente: 'alface' as const, plantadoEm: AGORA.toISOString() }
      : i === 1
        ? { ...c, semente: 'alface' as const, plantadoEm: muitoAntes, regadoEm: muitoAntes }
        : c,
  )
  return {
    ...s,
    horta,
    lumis: { quindim: 1 },
    construcao: { ...s.construcao, casa: obraDeExemplo() },
    projetos: { ...PROJETOS_DE_EXEMPLO },
  }
}

describe('validar a rotina', () => {
  test('o exemplo vale com os cartões de controle na mão', () => {
    expect(validarRotina(ROTINA_DO_QUINDIM, TODOS)).toBeNull()
  })

  test('começa com um QUANDO, só ele é QUANDO, e tem cartão depois', () => {
    expect(validarRotina([], TODOS)?.motivo).toBe(TEXTOS_DA_ROTINA.comecaComQuando)
    expect(validarRotina([{ c: 'regar' }], TODOS)?.motivo).toBe(TEXTOS_DA_ROTINA.comecaComQuando)
    expect(validarRotina([{ c: 'quando-anoitecer' }], TODOS)?.motivo).toBe(
      TEXTOS_DA_ROTINA.depoisDoQuando,
    )
    const dois: CartaoDaRotina[] = [{ c: 'quando-anoitecer' }, { c: 'quando-amanhecer' }]
    expect(validarRotina(dois, TODOS)?.motivo).toBe(TEXTOS_DA_ROTINA.soUmQuando)
    const dentro: CartaoDaRotina[] = [
      { c: 'quando-anoitecer' },
      { c: 'repetir', n: 2, d: [{ c: 'quando-amanhecer' }] },
    ]
    expect(validarRotina(dentro, TODOS)?.motivo).toBe(TEXTOS_DA_ROTINA.soUmQuando)
  })

  test('cartão de controle travado diz qual e de onde vem; sem a leitura do serviço, não confere', () => {
    expect(validarRotina(ROTINA_DO_QUINDIM, DO_PRIMEIRO_POSTO)?.motivo).toBe(
      'O cartão Para cada ainda não está com você. Ele chega num posto mais adiante da Jornada.',
    )
    expect(validarRotina(ROTINA_DO_QUINDIM, ALGUNS)).toBeNull()
    expect(validarRotina(ROTINA_DO_QUINDIM, null)?.motivo).toBe(TEXTOS_DA_ROTINA.cartasForaDoAr)
    // Sem cartão de controle, a rotina vale até sem a leitura do serviço.
    const simples: CartaoDaRotina[] = [{ c: 'quando-amanhecer' }, { c: 'voar-ate', a: 'horta' }]
    expect(validarRotina(simples, null)).toBeNull()
  })

  test('controle vazio e Escolha sem caso pedem um cartão dentro', () => {
    expect(validarRotina([{ c: 'quando-amanhecer' }, cartaoNovo('repetir')], TODOS)?.motivo).toBe(
      'Ponha pelo menos um cartão dentro do Repetir.',
    )
    expect(validarRotina([{ c: 'quando-amanhecer' }, cartaoNovo('escolha')], TODOS)?.motivo).toBe(
      'No Escolha, ponha um cartão em pelo menos um caso.',
    )
  })

  test('os tetos da rotina', () => {
    const L = LIMITES_DA_ROTINA
    const comprida: CartaoDaRotina[] = [
      { c: 'quando-amanhecer' },
      ...Array.from({ length: L.cartoesPorRotina }, () => ({ c: 'regar' as const })),
    ]
    expect(validarRotina(comprida, TODOS)?.motivo).toContain(`até ${L.cartoesPorRotina} cartões`)
    let fundo: CartaoDaRotina = { c: 'regar' }
    for (let i = 0; i <= L.profundidade; i++) fundo = { c: 'repetir', n: 2, d: [fundo] }
    expect(validarRotina([{ c: 'quando-amanhecer' }, fundo], TODOS)?.motivo).toContain(
      `até ${L.profundidade} vezes`,
    )
  })
})

describe('guardar a rotina', () => {
  test('guarda só de Lumi preso, sem os casos vazios do Escolha, e o salvamento continua válido', () => {
    const s = jogo()
    expect(guardarRotina(s, 'pitanga', ROTINA_DO_QUINDIM, TODOS)).toEqual({
      motivo: TEXTOS_DA_ROTINA.semLumi,
    })
    const comEscolha: CartaoDaRotina[] = [
      { c: 'quando-anoitecer' },
      { c: 'voar-ate', a: 'horta' },
      { c: 'escolha', casos: { maduro: [{ c: 'colher' }], vazio: [] } },
    ]
    const r = guardarRotina(s, 'quindim', comEscolha, TODOS)
    if (!('salvamento' in r)) throw new Error(r.motivo)
    expect(r.salvamento.rotinas.quindim?.[2]).toEqual({
      c: 'escolha',
      casos: { maduro: [{ c: 'colher' }] },
    })
    expect(migrarSalvamento(r.salvamento)).toEqual(r.salvamento)
    expect(apagarRotina(r.salvamento, 'quindim').rotinas).toEqual({})
  })

  test('o teto somando as rotinas de todos os Lumis', () => {
    const L = LIMITES_DA_ROTINA
    const cheia = (n: number): CartaoDaRotina[] => [
      { c: 'quando-amanhecer' },
      ...Array.from({ length: n - 1 }, () => ({ c: 'regar' as const })),
    ]
    let s: Salvamento = { ...jogo(), lumis: { quindim: 1, brigadeiro: 1, pitanga: 1 } }
    for (const lumi of ['quindim', 'brigadeiro'] as const) {
      const r = guardarRotina(s, lumi, cheia(L.cartoesPorRotina), TODOS)
      if (!('salvamento' in r)) throw new Error(r.motivo)
      s = r.salvamento
    }
    expect(guardarRotina(s, 'pitanga', cheia(2), TODOS)).toMatchObject({
      motivo: expect.stringContaining(`até ${L.cartoesNasRotinas} cartões`),
    })
    // Trocar a rotina de um Lumi não conta a antiga dele.
    expect('salvamento' in guardarRotina(s, 'quindim', cheia(L.cartoesPorRotina), TODOS)).toBe(true)
  })
})

describe('o intérprete', () => {
  test('o exemplo da proposta: rega a semente, colhe a madura e guarda na geladeira', () => {
    const s = jogo()
    expect(temGeladeira(s)).toBe(true)
    const r = rodarRotina('quindim', ROTINA_DO_QUINDIM, s, AGORA, TODOS)
    expect(r.erro).toBeNull()
    expect(r.passos).toEqual([
      'voar',
      ...s.horta.flatMap((_, i): TipoDoPasso[] =>
        i === 0 ? ['regar'] : i === 1 ? ['voar', 'regar', 'colher'] : ['voar', 'regar'],
      ),
      'voar',
      'guardar',
    ])
    expect(r.salvamento.horta[0]?.regadoEm).toBe(AGORA.toISOString())
    expect(r.salvamento.horta[1]).toMatchObject({ semente: null, regadoEm: null })
    // Duas alfaces e uma pelo humor ótimo vão para a geladeira; a semente volta para a mochila.
    expect(r.salvamento.projetos.geladeira?.guardado).toEqual({ alface: 3 })
    expect(r.salvamento.inventario['semente-alface']).toBe(s.inventario['semente-alface']! + 1)
    expect(r.salvamento.inventario.alface).toBeUndefined()
    expect(r.registro).toContain('Regou o canteiro 1.')
    expect(r.registro).toContain(
      'Colheu 3 alface no canteiro 2. Colheita especial: mais um pelo humor ótimo.',
    )
    expect(r.registro).toContain('O canteiro 3 está vazio.')
    expect(r.registro.at(-1)).toBe('Guardou 3 na geladeira.')
  })

  test('o que não cabe na geladeira vai para a mochila; nada se perde', () => {
    const s = jogo()
    const cheia = {
      ...s,
      projetos: { ...s.projetos, geladeira: { ...s.projetos.geladeira!, guardado: { milho: 3 } } },
    }
    const r = rodarRotina('quindim', ROTINA_DO_QUINDIM, cheia, AGORA, TODOS)
    expect(r.salvamento.projetos.geladeira?.guardado).toEqual({ milho: 3, alface: 1 })
    expect(r.salvamento.inventario.alface).toBe(2)
    expect(r.registro.at(-1)).toBe(
      'Guardou 1 na geladeira. 2 não couberam e ficaram na sua mochila.',
    )
  })

  test('com erro, para com o motivo e devolve o que o Lumi carregava, sem castigo', () => {
    const s = jogo()
    const semVoar: CartaoDaRotina[] = [
      { c: 'quando-amanhecer' },
      { c: 'voar-ate', a: 'horta' },
      { c: 'para-cada', d: [{ c: 'colher' }] },
      { c: 'guardar' },
    ]
    const r = rodarRotina('quindim', semVoar, s, AGORA, TODOS)
    expect(r.erro).toBe(
      'Para guardar tudo, o Lumi precisa estar na geladeira. Ponha um Voar até a geladeira antes.',
    )
    expect(r.salvamento.inventario.alface).toBe(3)
    expect(r.registro.at(-1)).toBe('O que o Lumi colheu ficou na sua mochila.')
    expect(
      rodarRotina('quindim', [{ c: 'quando-amanhecer' }, { c: 'regar' }], s, AGORA, TODOS).erro,
    ).toBe('Para regar, o Lumi precisa estar na horta. Ponha um Voar até a horta antes.')
  })

  test('sem a geladeira na casa, voar até ela para com o motivo', () => {
    const s = { ...jogo(), construcao: { casa: null, cabanas: {} } }
    expect(temGeladeira(s)).toBe(false)
    expect(lugarDaGeladeira(s)).toBeNull()
    expect(rodarRotina('quindim', ROTINA_DO_QUINDIM, s, AGORA, TODOS).erro).toBe(
      TEXTOS_DA_ROTINA.semGeladeira,
    )
    expect(lugarDaGeladeira(jogo())).toEqual({ x: -4.5, z: 2.5 })
  })

  test('Repetir, Esperar e a memória com Enquanto e Contar mais um', () => {
    const s = jogo()
    const repetir: CartaoDaRotina[] = [
      { c: 'quando-anoitecer' },
      { c: 'repetir', n: 3, d: [{ c: 'esperar', n: 2 }] },
    ]
    const r = rodarRotina('quindim', repetir, s, AGORA, TODOS)
    expect(r.passos).toEqual(['esperar', 'esperar', 'esperar'])
    expect(r.registro).toEqual([
      'Esperou 2 segundos.',
      'Esperou 2 segundos.',
      'Esperou 2 segundos.',
    ])
    const contando: CartaoDaRotina[] = [
      { c: 'quando-anoitecer' },
      { c: 'guardar-na-memoria', n: 1 },
      {
        c: 'enquanto',
        se: 'lembra-menos-que',
        n: 4,
        d: [{ c: 'esperar', n: 1 }, { c: 'contar' }],
      },
    ]
    expect(rodarRotina('quindim', contando, s, AGORA, TODOS).passos).toEqual([
      'esperar',
      'esperar',
      'esperar',
    ])
    const semMemoria: CartaoDaRotina[] = [{ c: 'quando-anoitecer' }, { c: 'contar' }]
    expect(rodarRotina('quindim', semMemoria, s, AGORA, TODOS).erro).toContain(
      'precisa lembrar de um número antes',
    )
  })

  test('um Enquanto que nunca termina para no teto, sem travar o jogo', () => {
    const s = jogo()
    const sem: CartaoDaRotina[] = [
      { c: 'quando-anoitecer' },
      { c: 'guardar-na-memoria', n: 0 },
      { c: 'enquanto', se: 'lembra-menos-que', n: 5, d: [{ c: 'esperar', n: 1 }] },
    ]
    const r = rodarRotina('quindim', sem, s, AGORA, TODOS)
    expect(r.erro).toContain(`passou de ${CARTOES_POR_EXECUCAO} cartões`)
    expect(r.passos.length).toBeLessThan(CARTOES_POR_EXECUCAO)
  })

  test('o Escolha olha o canteiro: rega a semente, colhe a madura, nada no vazio', () => {
    const s = jogo()
    const escolha: CartaoDaRotina[] = [
      { c: 'quando-amanhecer' },
      {
        c: 'para-cada',
        d: [
          {
            c: 'escolha',
            casos: { 'precisa-de-agua': [{ c: 'regar' }], maduro: [{ c: 'colher' }] },
          },
        ],
      },
    ]
    const r = rodarRotina('quindim', escolha, s, AGORA, TODOS)
    expect(r.erro).toBeNull()
    expect(r.passos.filter((p) => p !== 'voar')).toEqual(['regar', 'colher'])
    expect(r.salvamento.inventario.alface).toBe(3)
  })

  test('o laço passo a passo reaproveita o passo e a pilha', () => {
    const s = jogo()
    const e = comecarExecucao('quindim', ROTINA_DO_QUINDIM)
    const pilha = e.pilha
    const quadros = [...e.pilha]
    let atual = s
    const vistos = new Set<object>()
    for (
      let p = proximoPasso(e, atual, AGORA.getTime());
      p;
      p = proximoPasso(e, atual, AGORA.getTime())
    ) {
      vistos.add(p)
      atual = aplicarPasso(e, atual, AGORA).salvamento
    }
    expect(e.situacao).toBe('terminou')
    expect(vistos.size).toBe(1)
    expect([...vistos][0]).toBe(e.passo)
    expect(e.pilha).toBe(pilha)
    expect(e.pilha.every((q, i) => q === quadros[i])).toBe(true)
  })
})

describe('quando a rotina começa', () => {
  test('a noite chegando é o Quando anoitecer; indo embora, o Quando amanhecer', () => {
    expect(quandoDaVirada(false, true)).toBe('quando-anoitecer')
    expect(quandoDaVirada(true, false)).toBe('quando-amanhecer')
    expect(quandoDaVirada(true, true)).toBeNull()
  })

  test('só os Lumis presos com rotina daquele Quando', () => {
    const s: Salvamento = {
      ...jogo(),
      lumis: { quindim: 1, brigadeiro: 1 },
      rotinas: {
        quindim: ROTINA_DO_QUINDIM,
        brigadeiro: [{ c: 'quando-anoitecer' }, { c: 'voar-ate', a: 'horta' }],
      },
    }
    expect(rotinasDoQuando(s, 'quando-amanhecer')).toEqual(['quindim'])
    expect(rotinasDoQuando(s, 'quando-anoitecer')).toEqual(['brigadeiro'])
  })
})

describe('montar no painel', () => {
  test('pôr, tirar, mover e mudar cartões, até dentro de um controle', () => {
    let r: CartaoDaRotina[] = [{ c: 'quando-amanhecer' }]
    r = porCartao(r, [], cartaoNovo('para-cada'))
    r = porCartao(r, [{ i: 1 }], cartaoNovo('regar'))
    r = porCartao(r, [{ i: 1 }], cartaoNovo('se'))
    r = porCartao(r, [{ i: 1 }, { i: 1 }], cartaoNovo('colher'))
    expect(r).toEqual([
      { c: 'quando-amanhecer' },
      { c: 'para-cada', d: [{ c: 'regar' }, { c: 'se', se: 'maduro', d: [{ c: 'colher' }] }] },
    ])
    r = porCartao(r, [], cartaoNovo('escolha'))
    r = porCartao(r, [{ i: 2, caso: 'maduro' }], cartaoNovo('colher'))
    expect(listaNoAlvo(r, [{ i: 2, caso: 'maduro' }])).toEqual([{ c: 'colher' }])
    r = moverCartao(r, [{ i: 1 }], 1, -1)
    expect(listaNoAlvo(r, [{ i: 1 }]).map((c) => c.c)).toEqual(['se', 'regar'])
    r = mudarCartao(r, [], 0, { c: 'quando-anoitecer' })
    r = tirarCartao(r, [], 2)
    expect(r.map((c) => c.c)).toEqual(['quando-anoitecer', 'para-cada'])
    expect(listaNoAlvo(r, [{ i: 9 }])).toEqual([])
    expect(alvoExiste(r, [{ i: 1 }])).toBe(true)
    expect(alvoExiste(r, [{ i: 9 }])).toBe(false)
    expect(alvoExiste(r, [{ i: 0 }])).toBe(false)
    expect(alvoExiste(r, [])).toBe(true)
  })

  test('cada cartão novo já vale na régua, com o de dentro', () => {
    for (const carta of CARTAS_LUMI) {
      const novo = porCartao([cartaoNovo(carta.id as CartaoDaRotina['c'])], [{ i: 0 }], {
        c: 'regar',
      })
      expect(novo[0]?.c as string).toBe(carta.id)
    }
  })

  test('as cartas na mão vêm da leitura do serviço, como no caderno', async () => {
    const p = criarPlataformaFalsa({ persistir: false })
    const r = await p.servico.buscar('/cartas')
    const naMao = cartasNaMao(r.corpo as never)
    expect(naMao && [...naMao].sort()).toEqual([...ALGUNS].sort())
    expect(cartasNaMao(null)).toBeNull()
  })
})

test('os textos não usam travessão nem exclamação nem começam com pergunta', () => {
  const s = jogo()
  const textos = [
    ...Object.values(TEXTOS_DA_ROTINA),
    ...Object.values(NOME_DO_LUGAR),
    ...Object.values(NOME_DA_CONDICAO),
    ...Object.values(NOME_DO_CASO),
    ...rodarRotina('quindim', ROTINA_DO_QUINDIM, s, AGORA, TODOS).registro,
    daRotinaDo('quindim'),
    daRotinaDo('pitanga'),
  ]
  for (const t of textos) {
    expect(t).not.toContain('—')
    expect(t).not.toContain('!')
    expect(t.split(/[.]/)[0]).not.toContain('?')
  }
  expect(daRotinaDo('pitanga')).toBe('da Pitanga')
  expect(daRotinaDo('quindim')).toBe('do Quindim')
})
