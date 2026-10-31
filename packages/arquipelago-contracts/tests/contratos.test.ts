import { describe, expect, test } from 'bun:test'
import {
  AcessoSchema,
  APARENCIAS_GUARDADAS_MAXIMO,
  CATALOGO_DE_OBJETOS,
  criarSalvamentoInicial,
  diaDeSaoPaulo,
  GELADEIRA_GUARDA,
  GravarSalvamentoSchema,
  ID_DA_APARENCIA_MAXIMO,
  ILHA_IDS,
  ILHAS,
  ilhaAberta,
  ilhasDoAnel,
  LeituraDoLimiteDaFamiliaSchema,
  LIMITE_DIARIO_MAXIMO_MINUTOS,
  LIMITE_DIARIO_MINIMO_MINUTOS,
  LIMITE_DIARIO_PADRAO_MINUTOS,
  ManifestoDoClienteSchema,
  MOVEIS_NA_CASA_MAXIMO,
  MoldeDeObjetoSchema,
  type MovelNaObra,
  migrarDaV1,
  migrarDaV2,
  migrarDaV3,
  migrarDaV4,
  migrarDaV5,
  migrarDaV6,
  migrarDaV7,
  migrarDaV8,
  migrarDaV9,
  migrarSalvamento,
  normalizarLimiteDiario,
  OBJETOS_DA_CASA,
  type Obra,
  PERCURSOS,
  PERFIS_DA_FAMILIA_MAXIMO,
  PerfisDaFamiliaSchema,
  POSICOES_DA_JORNADA,
  posicaoDoPostoKids,
  type QuartoDoJogo,
  QuartoSchema,
  SALVAMENTO_MAX_BYTES,
  SalvamentoSchema,
  type SalvamentoV1,
  type SalvamentoV2,
  type SalvamentoV3,
  SalvamentoV21Schema,
  VERSAO_SALVAMENTO,
} from '../src'
import {
  migrarDaV10,
  migrarDaV11,
  migrarDaV12,
  migrarDaV13,
  migrarDaV14ParaAtual,
} from '../src/salvamento'

describe('ilhas', () => {
  test('oito ilhas, uma por posição da jornada, ids únicos', () => {
    expect(ILHAS).toHaveLength(POSICOES_DA_JORNADA)
    expect(new Set(ILHAS.map((i) => i.id)).size).toBe(ILHA_IDS.length)
    expect(ILHAS.map((i) => i.posicao)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
  })

  test('a sua ilha e o Farol ficam no centro; as outras seis em anel', () => {
    expect(ilhasDoAnel().map((i) => i.id)).toEqual([
      'bosque',
      'vila-doce',
      'recife',
      'pico',
      'vale-dos-dinos',
      'nuvens',
    ])
    const angulos = ilhasDoAnel().map((i) => i.angulo)
    expect(new Set(angulos).size).toBe(6)
  })

  test('a ilha abre na posição dela e continua aberta depois', () => {
    expect(ilhaAberta('sua-ilha', 1)).toBe(true)
    expect(ilhaAberta('bosque', 1)).toBe(false)
    expect(ilhaAberta('bosque', 2)).toBe(true)
    expect(ilhaAberta('farol', 7)).toBe(false)
    expect(ilhaAberta('farol', 8)).toBe(true)
  })

  test('posto do Kids vira posição; desconhecido vira 1', () => {
    expect(posicaoDoPostoKids('noob')).toBe(1)
    expect(posicaoDoPostoKids('coder')).toBe(2)
    expect(posicaoDoPostoKids('god')).toBe(8)
    expect(posicaoDoPostoKids('inventado')).toBe(1)
    expect(posicaoDoPostoKids(null)).toBe(1)
  })
})

describe('limite diário', () => {
  test('padrão de 30 minutos', () => {
    expect(LIMITE_DIARIO_PADRAO_MINUTOS).toBe(30)
  })

  test('os pais escolhem mais ou menos, em passos de 5, dentro da faixa', () => {
    expect(normalizarLimiteDiario(45)).toBe(45)
    expect(normalizarLimiteDiario(47)).toBe(45)
    expect(normalizarLimiteDiario(1)).toBe(LIMITE_DIARIO_MINIMO_MINUTOS)
    expect(normalizarLimiteDiario(10_000)).toBe(LIMITE_DIARIO_MAXIMO_MINUTOS)
    expect(normalizarLimiteDiario(Number.NaN)).toBe(30)
  })

  test('o dia é o de São Paulo', () => {
    expect(diaDeSaoPaulo(new Date('2026-10-28T02:30:00Z'))).toBe('2026-10-27')
    expect(diaDeSaoPaulo(new Date('2026-10-28T03:30:00Z'))).toBe('2026-10-28')
  })

  test('a leitura dos pais traz o limite e se alguma criança vê o jogo', () => {
    const lido = { limiteDiarioMinutos: 30, algumaCriancaVe: true }
    expect(LeituraDoLimiteDaFamiliaSchema.parse(lido)).toEqual(lido)
    // Sem a resposta, a área dos pais não sabe se mostra o cartão: leitura inválida.
    expect(LeituraDoLimiteDaFamiliaSchema.safeParse({ limiteDiarioMinutos: 30 }).success).toBe(
      false,
    )
    expect(
      LeituraDoLimiteDaFamiliaSchema.safeParse({ ...lido, algumaCriancaVe: 'sim' }).success,
    ).toBe(false)
    expect(LeituraDoLimiteDaFamiliaSchema.safeParse({ ...lido, outra: 1 }).success).toBe(false)
  })

  test('os perfis da família vão separados por vírgula, em minúsculas', () => {
    const a = '0190A2B3-C4D5-7E6F-8A9B-0C1D2E3F4A5B'
    const b = '0190a2b3-c4d5-7e6f-8a9b-0c1d2e3f4a5c'
    expect(PerfisDaFamiliaSchema.parse(`${a},${b}`)).toEqual([a.toLowerCase(), b])
    expect(PerfisDaFamiliaSchema.parse(undefined)).toEqual([])
    expect(PerfisDaFamiliaSchema.parse('')).toEqual([])
    expect(PerfisDaFamiliaSchema.safeParse('nao-e-id').success).toBe(false)
    expect(PerfisDaFamiliaSchema.safeParse(`${a},`).success).toBe(false)
    const muitos = Array.from({ length: PERFIS_DA_FAMILIA_MAXIMO }, () => b)
    expect(PerfisDaFamiliaSchema.parse(muitos.join(','))).toHaveLength(PERFIS_DA_FAMILIA_MAXIMO)
    expect(PerfisDaFamiliaSchema.safeParse([...muitos, b].join(',')).success).toBe(false)
  })
})

describe('salvamento', () => {
  const agora = new Date('2026-10-27T15:00:00Z')

  test('o inicial é válido e cabe no teto', () => {
    const s = criarSalvamentoInicial(agora)
    expect(SalvamentoSchema.parse(s)).toEqual(s)
    expect(new TextEncoder().encode(JSON.stringify(s)).length).toBeLessThan(SALVAMENTO_MAX_BYTES)
  })

  test('migrar devolve a versão atual; lixo e versão futura voltam null', () => {
    const s = criarSalvamentoInicial(agora)
    expect(migrarSalvamento(s)).toEqual(s)
    expect(migrarSalvamento({ ...s, versao: 99 })).toBeNull()
    expect(migrarSalvamento('nada')).toBeNull()
  })

  test('campo desconhecido é recusado (o formato é estrito)', () => {
    const s = criarSalvamentoInicial(agora)
    expect(SalvamentoSchema.safeParse({ ...s, moedas: 9999 }).success).toBe(false)
  })

  test('necessidade fora de 0 a 100 é recusada', () => {
    const s = criarSalvamentoInicial(agora)
    const ruim = { ...s, necessidades: { ...s.necessidades, fome: 150 } }
    expect(GravarSalvamentoSchema.safeParse({ revisaoBase: 0, salvamento: ruim }).success).toBe(
      false,
    )
  })
})

describe('salvamento V2 (percursos)', () => {
  const agora = new Date('2026-10-27T15:00:00Z')
  const v2 = (): SalvamentoV2 => {
    const {
      moradores: _m,
      bichos: _b,
      construcao: _c,
      projetos: _p,
      presenteDosBichosEntregue: _presente,
      turnos: _t,
      lumis: _l,
      rotinas: _r,
      recife: _recife,
      vale: _vale,
      pico: _pico,
      nuvens: _nuvens,
      farol: _farol,
      clima: _clima,
      ilhasVisitadas: _visitas,
      chaves: _chaves,
      segredos: _segredos,
      mapa: _mapa,
      companhia: _companhia,
      ...resto
    } = criarSalvamentoInicial(agora)
    return { ...resto, percursos: {}, versao: 2 }
  }
  const v1 = (): SalvamentoV1 => {
    const { percursos: _, ...resto } = v2()
    return { ...resto, versao: 1 }
  }
  const semMoradores = {
    ilhasVisitadas: 0,
    chaves: 0,
    segredos: 0,
    mapa: {},
    companhia: 'quarto' as const,
    nuvens: { constelacoes: 0 },
    farol: { pagina: false, concluido: false, galeria: [] },
    clima: 'sol' as const,
    pico: { banda: 0 },
    recife: { bau: false, pagina: false, tesouro: false, corais: 0 },
    vale: { pegadas: false, escavacao: 0, ninhos: [], filhote: null },
    presenteDosBichosEntregue: false,
    moradores: {
      capi: { amizade: 0, conversaEm: null, presenteEm: null, pedido: null },
      bento: { amizade: 0, conversaEm: null, presenteEm: null, pedido: null },
      mare: { amizade: 0, conversaEm: null, presenteEm: null, pedido: null },
      floco: { amizade: 0, conversaEm: null, presenteEm: null, pedido: null },
      jade: { amizade: 0, conversaEm: null, presenteEm: null, pedido: null },
      irie: { amizade: 0, conversaEm: null, presenteEm: null, pedido: null },
      nico: { amizade: 0, conversaEm: null, presenteEm: null, pedido: null },
    },
    bichos: { achados: [], adotado: null },
    construcao: { casa: null, cabanas: {} },
    projetos: {},
    turnos: {},
    lumis: {},
    rotinas: {},
  }

  test('o inicial já é da versão atual, sem nenhum percurso corrido', () => {
    const s = criarSalvamentoInicial(agora)
    expect(s.versao).toBe(VERSAO_SALVAMENTO)
    expect(s.percursos).toEqual({})
    expect(SalvamentoV21Schema.parse(s)).toEqual(s)
  })

  test('a V1 migra até a atual sem perder nada', () => {
    const antiga = { ...v1(), inventario: { alface: 7 }, casa: { portaNova: true } }
    const migrada = migrarSalvamento(antiga)
    expect(migrada).toEqual({ ...antiga, versao: 21, percursos: {}, ...semMoradores })
    expect(migrarDaV1(antiga)).toEqual({ ...antiga, versao: 2, percursos: {} })
  })

  test('gravar aceita a V1 de uma aba antiga e guarda já migrada', () => {
    const r = GravarSalvamentoSchema.parse({ revisaoBase: 3, salvamento: v1() })
    expect(r.salvamento.versao).toBe(21)
    expect(r.salvamento.percursos).toEqual({})
    expect(r.salvamento.bichos).toEqual({ achados: [], adotado: null })
  })

  test('guarda as três estrelas e o melhor tempo de cada percurso', () => {
    const s = {
      ...criarSalvamentoInicial(agora),
      percursos: {
        'bosque-copas': {
          estrelas: { chegada: true, tempo: false, vagalumes: true },
          melhorTempoMs: 41_250,
        },
      },
    }
    expect(migrarSalvamento(s)).toEqual(s)
  })

  test('percurso desconhecido, estrela a mais ou tempo inválido são recusados', () => {
    const base = criarSalvamentoInicial(agora)
    const resultado = {
      estrelas: { chegada: true, tempo: true, vagalumes: true },
      melhorTempoMs: 30_000,
    }
    expect(migrarSalvamento({ ...base, percursos: { 'pico-trilha': resultado } })).toBeNull()
    expect(
      migrarSalvamento({
        ...base,
        percursos: {
          'bosque-copas': { ...resultado, estrelas: { ...resultado.estrelas, quarta: true } },
        },
      }),
    ).toBeNull()
    for (const melhorTempoMs of [-1, 1.5, 60 * 60 * 1000 + 1]) {
      expect(
        migrarSalvamento({
          ...base,
          percursos: { 'bosque-copas': { ...resultado, melhorTempoMs } },
        }),
      ).toBeNull()
    }
  })

  test('uma V2 com percursos cabe com folga no teto', () => {
    const s = {
      ...criarSalvamentoInicial(agora),
      percursos: Object.fromEntries(
        PERCURSOS.map((p) => [
          p,
          { estrelas: { chegada: true, tempo: true, vagalumes: true }, melhorTempoMs: 3_599_999 },
        ]),
      ),
    }
    expect(new TextEncoder().encode(JSON.stringify(s)).length).toBeLessThan(SALVAMENTO_MAX_BYTES)
  })
})

describe('porta da plataforma', () => {
  test('o quarto da plataforma passa no espelho do contrato', () => {
    const quarto: QuartoDoJogo = {
      theme: 'padrao',
      placedItems: [
        { itemId: 'cama', x: 1, y: 2, rot: 1 },
        { itemId: 'quadro-cortica', x: 3, y: 1, wall: 'right' },
        { itemId: 'luminaria-mesa', x: 0, y: 0, on: 'criado-mudo', slot: 0 },
      ],
      pet: 'pet-gato',
      wallColors: { left: '#ffeedd' },
      floor: 'piso-madeira-clara',
    }
    expect(QuartoSchema.parse(quarto)).toEqual(quarto)
  })

  test('o manifesto só aceita a entrada com nome simples (a régua de quem publica e repassa)', () => {
    const base = { versao: 'v1', versaoContrato: 1, geradoEm: '2026-10-27T15:00:00Z' }
    expect(ManifestoDoClienteSchema.safeParse({ ...base, entrada: 'entrada-abc.js' }).success).toBe(
      true,
    )
    expect(
      ManifestoDoClienteSchema.safeParse({ ...base, entrada: 'assets/entrada-abc.js' }).success,
    ).toBe(false)
    expect(ManifestoDoClienteSchema.safeParse({ ...base, entrada: 'modelo.glb' }).success).toBe(
      false,
    )
    expect(ManifestoDoClienteSchema.safeParse({ ...base, entrada: '../segredo.js' }).success).toBe(
      false,
    )
    expect(
      ManifestoDoClienteSchema.safeParse({ ...base, entrada: 'https://x.com/a.js' }).success,
    ).toBe(false)
  })

  test('acesso do adulto não tem limite', () => {
    expect(
      AcessoSchema.parse({
        liberado: true,
        motivo: null,
        limiteDiarioMinutos: null,
        usadoHojeSegundos: 0,
      }),
    ).toBeTruthy()
  })
})

describe('salvamento V3 (a Capi e os bichos do Bosque)', () => {
  const agora = new Date('2026-10-28T12:00:00Z')
  const inicial = () => criarSalvamentoInicial(agora)
  const adotado = {
    id: 'gato' as const,
    nome: 'Frajola',
    fase: 'filhote' as const,
    fome: 80,
    limpeza: 70,
    carinho: 90,
    diasCuidados: 2,
    diaCuidadoEm: '2026-10-27',
    truque: { sessoes: 1, ultimaEm: '2026-10-27', aprendido: false },
  }

  test('a V2 migra para a V3 com a Capi sem amizade e nenhum bicho', () => {
    const {
      moradores: _m,
      bichos: _b,
      construcao: _c,
      projetos: _p,
      presenteDosBichosEntregue: _presente,
      turnos: _t,
      lumis: _l,
      rotinas: _r,
      recife: _recife,
      vale: _vale,
      pico: _pico,
      nuvens: _nuvens,
      farol: _farol,
      clima: _clima,
      ilhasVisitadas: _visitas,
      chaves: _chaves,
      segredos: _segredos,
      mapa: _mapa,
      companhia: _companhia,
      ...resto
    } = inicial()
    const v2: SalvamentoV2 = { ...resto, versao: 2, inventario: { milho: 3 } }
    const v3 = migrarSalvamento(v2)
    expect(v3?.versao).toBe(21)
    expect(v3?.inventario).toEqual({ milho: 3 })
    expect(v3?.moradores.capi).toEqual({
      amizade: 0,
      conversaEm: null,
      presenteEm: null,
      pedido: null,
    })
    expect(
      migrarDaV14ParaAtual(
        migrarDaV13(
          migrarDaV12(
            migrarDaV11(
              migrarDaV10(
                migrarDaV9(
                  migrarDaV8(
                    migrarDaV7(migrarDaV6(migrarDaV5(migrarDaV4(migrarDaV3(migrarDaV2(v2)))))),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    ).toEqual(v3 as NonNullable<typeof v3>)
  })

  test('guarda a amizade, o pedido do dia, os achados e o bicho adotado', () => {
    const s = {
      ...inicial(),
      moradores: {
        ...inicial().moradores,
        capi: {
          amizade: 130,
          conversaEm: '2026-10-28',
          presenteEm: null,
          pedido: { dia: '2026-10-28', id: 'alface-2', entregue: false },
        },
      },
      bichos: { achados: ['gato' as const, 'coelho' as const], adotado },
    }
    expect(migrarSalvamento(s)).toEqual(s)
  })

  test('recusa amizade fora da escala, dia malformado, bicho repetido ou desconhecido', () => {
    const base = inicial()
    const capi = base.moradores.capi
    expect(
      migrarSalvamento({
        ...base,
        moradores: { ...base.moradores, capi: { ...capi, amizade: 501 } },
      }),
    ).toBeNull()
    expect(
      migrarSalvamento({
        ...base,
        moradores: { ...base.moradores, capi: { ...capi, conversaEm: '28/10/2026' } },
      }),
    ).toBeNull()
    expect(
      migrarSalvamento({ ...base, bichos: { achados: ['gato', 'gato'], adotado: null } }),
    ).toBeNull()
    expect(migrarSalvamento({ ...base, bichos: { achados: ['dragao'], adotado: null } })).toBeNull()
  })

  test('o nome do bicho tem de 1 a 16 letras e as medidas ficam de 0 a 100', () => {
    const base = inicial()
    const com = (a: object) =>
      migrarSalvamento({ ...base, bichos: { achados: ['gato'], adotado: a } })
    expect(com({ ...adotado, nome: '' })).toBeNull()
    expect(com({ ...adotado, nome: 'Um nome comprido demais' })).toBeNull()
    expect(com({ ...adotado, fome: 101 })).toBeNull()
    expect(com({ ...adotado, fase: 'velhinho' })).toBeNull()
    expect(com(adotado)?.bichos.adotado?.nome).toBe('Frajola')
  })

  test('o salvamento cheio ainda cabe no teto', () => {
    const s = {
      ...inicial(),
      bichos: {
        achados: ['cachorro' as const, 'gato' as const, 'coelho' as const, 'porquinho' as const],
        adotado,
      },
    }
    expect(new TextEncoder().encode(JSON.stringify(s)).byteLength).toBeLessThan(
      SALVAMENTO_MAX_BYTES,
    )
  })
})

describe('salvamento V4 (o modo construção e os projetos azuis)', () => {
  const agora = new Date('2026-10-28T15:00:00Z')
  const inicial = () => criarSalvamentoInicial(agora)
  const obra = (): Obra => ({
    paredes: [{ x: 6, z: -8, eixo: 'x', n: 4 }],
    aberturas: [{ tipo: 'porta', x: 7, z: -8, eixo: 'x' }],
    pisos: [{ x: 7, z: -7, tipo: 'ladrilho' }],
    objetos: [{ id: 'geladeira', x: 8, z: -7, giro: 1 }],
    cercas: [{ x: -12, z: 2, eixo: 'z', n: 5 }],
    caminhos: [{ x: 2, z: 3, tipo: 'pedra' }],
    canteiros: [{ x: -10, z: 5 }],
    moveis: [],
  })

  test('a V3 migra para a V4 com a casa de antes e nenhum projeto azul', () => {
    const {
      construcao: _c,
      projetos: _p,
      presenteDosBichosEntregue: _presente,
      turnos: _t,
      lumis: _l,
      rotinas: _r,
      recife: _recife,
      vale: _vale,
      pico: _pico,
      nuvens: _nuvens,
      farol: _farol,
      clima: _clima,
      ilhasVisitadas: _visitas,
      chaves: _chaves,
      segredos: _segredos,
      mapa: _mapa,
      companhia: _companhia,
      ...resto
    } = inicial()
    const v3: SalvamentoV3 = {
      ...resto,
      versao: 3,
      casa: { portaNova: true },
      moradores: { capi: resto.moradores.capi },
    }
    const v4 = migrarSalvamento(v3)
    expect(v4?.versao).toBe(21)
    expect(v4?.casa).toEqual({ portaNova: true })
    expect(v4?.construcao).toEqual({ casa: null, cabanas: {} })
    expect(v4?.projetos).toEqual({})
    expect(
      migrarDaV14ParaAtual(
        migrarDaV13(
          migrarDaV12(
            migrarDaV11(
              migrarDaV10(
                migrarDaV9(
                  migrarDaV8(migrarDaV7(migrarDaV6(migrarDaV5(migrarDaV4(migrarDaV3(v3)))))),
                ),
              ),
            ),
          ),
        ),
      ),
    ).toEqual(v4 as NonNullable<typeof v4>)
  })

  test('guarda a obra da casa, a cabana do Bosque e a geladeira com o que está dentro', () => {
    const s = {
      ...inicial(),
      construcao: { casa: obra(), cabanas: { bosque: { ...obra(), objetos: [] } } },
      projetos: {
        geladeira: {
          ganhoEm: agora.toISOString(),
          aparencia: null,
          aparencias: [],
          guardado: { salada: 2, pipoca: 2 },
        },
        casinha: {
          ganhoEm: agora.toISOString(),
          aparencia: { origem: 'pinta' as const, id: 'c1' },
          aparencias: [{ origem: 'pinta' as const, id: 'c1' }],
        },
      },
    }
    expect(migrarSalvamento(s)).toEqual(s)
  })

  test('recusa abertura desconhecida, objeto repetido, cabana fora do Bosque e geladeira cheia demais', () => {
    const base = inicial()
    const comCasa = (o: object) =>
      migrarSalvamento({ ...base, construcao: { casa: o, cabanas: {} } })
    expect(
      comCasa({ ...obra(), aberturas: [{ tipo: 'alcapao', x: 0, z: 0, eixo: 'x' }] }),
    ).toBeNull()
    const geladeira = { id: 'geladeira', x: 0, z: 0, giro: 0 }
    expect(comCasa({ ...obra(), objetos: [geladeira, geladeira] })).toBeNull()
    expect(comCasa({ ...obra(), paredes: [{ x: 0, z: 0, eixo: 'y', n: 2 }] })).toBeNull()
    expect(comCasa({ ...obra(), paredes: [{ x: 0.5, z: 0, eixo: 'x', n: 2 }] })).toBeNull()
    expect(
      migrarSalvamento({ ...base, construcao: { casa: null, cabanas: { pico: obra() } } }),
    ).toBeNull()
    const cheia = { ganhoEm: agora.toISOString(), aparencia: null, guardado: { salada: 13 } }
    expect(migrarSalvamento({ ...base, projetos: { geladeira: cheia } })).toBeNull()
    const passou = { ...cheia, guardado: { salada: 7, pipoca: 6 } }
    expect(migrarSalvamento({ ...base, projetos: { geladeira: passou } })).toBeNull()
  })

  test('casa e cabana no teto com IDs canônicos cabem em 64 KB', () => {
    const ponto = (i: number) => ({ x: -60 + (i % 60), z: -60 + Math.floor(i / 60) })
    const trecho = (i: number) => ({ ...ponto(i), eixo: 'x' as const, n: 60 })
    const cheia = (): Obra => ({
      paredes: Array.from({ length: 200 }, (_, i) => trecho(i)),
      aberturas: Array.from({ length: 60 }, (_, i) => ({
        ...ponto(i),
        eixo: 'z' as const,
        tipo: 'janela-redonda' as const,
      })),
      pisos: Array.from({ length: 30 }, (_, i) => ({ ...ponto(i), tipo: 'azulejo' as const })),
      objetos: OBJETOS_DA_CASA.map((id, i) => ({ id, ...ponto(i), giro: 3 })),
      cercas: Array.from({ length: 120 }, (_, i) => trecho(i)),
      caminhos: Array.from({ length: 240 }, (_, i) => ({ ...ponto(i), tipo: 'grama' as const })),
      canteiros: Array.from({ length: 18 }, (_, i) => ponto(i)),
      moveis: [],
    })
    // IDs canônicos dos produtores (até 40). Referências antigas de 80 têm teste separado.
    const aparencias = Array.from({ length: APARENCIAS_GUARDADAS_MAXIMO }, (_, i) => ({
      origem: 'criacao' as const,
      id: `${i}`.padStart(ID_DA_APARENCIA_MAXIMO, 'x'),
    }))
    const projeto = {
      ganhoEm: agora.toISOString(),
      aparencia: aparencias[0],
      aparencias,
    }
    const s = {
      ...inicial(),
      construcao: {
        casa: {
          ...cheia(),
          moveis: Array.from(
            { length: MOVEIS_NA_CASA_MAXIMO },
            (): MovelNaObra => [20, -60, -60, 3],
          ),
        },
        cabanas: { bosque: cheia() },
      },
      projetos: Object.fromEntries(OBJETOS_DA_CASA.map((id) => [id, projeto])),
    }
    expect(migrarSalvamento(s)).not.toBeNull()
    expect(new TextEncoder().encode(JSON.stringify(s)).byteLength).toBeLessThan(
      SALVAMENTO_MAX_BYTES,
    )
  })
})

describe('objetos da casa e moldes', () => {
  test('cada objeto tem um molde válido, com a área e a caixa do modelo', () => {
    for (const id of OBJETOS_DA_CASA) {
      const { molde } = CATALOGO_DE_OBJETOS[id]
      expect(MoldeDeObjetoSchema.parse(molde)).toEqual(molde)
      expect(molde.objeto).toBe(id)
      // Nada passa da área na grade (README de arte/objetos).
      expect(molde.caixa.largura).toBeLessThanOrEqual(molde.area.largura)
      expect(molde.caixa.fundo).toBeLessThanOrEqual(molde.area.fundo)
    }
  })

  test('a geladeira: quatro faces do Pinta, a frente marcada e a função com os números', () => {
    const { molde } = CATALOGO_DE_OBJETOS.geladeira
    expect(molde.faces.map((f) => f.face)).toEqual(['frente', 'lado-esq', 'lado-dir', 'topo'])
    expect(molde.frente).toBe('frente')
    expect(molde.funcao).toContain(String(GELADEIRA_GUARDA.holograma))
    expect(molde.funcao).toContain(String(GELADEIRA_GUARDA.completa))
  })

  test('textos sem ponto de exclamação nem travessão', () => {
    for (const id of OBJETOS_DA_CASA) {
      const o = CATALOGO_DE_OBJETOS[id]
      expect(`${o.molde.nome} ${o.molde.funcao ?? ''} ${o.origem ?? ''}`).not.toMatch(/[!—…]/)
    }
  })
})
