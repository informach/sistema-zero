import {
  APARENCIAS_GUARDADAS_MAXIMO,
  BICHOS_DO_BOSQUE,
  BIT_DA_SEGREDO_MAXIMO,
  CANTEIROS_DO_CEU,
  type CartaoDaRotina,
  criarSalvamentoInicial,
  DIAS_CUIDADOS_MAXIMO,
  DIAS_PARA_CHOCAR,
  type ExposicaoDoFarol,
  FLORADA_MAXIMA,
  FOSSEIS_DO_VALE,
  ID_DA_APARENCIA_MAXIMO,
  ILHA_IDS,
  LIMITES_DA_ROTINA,
  LUMIS,
  type LumiId,
  MAPAS_DAS_ILHAS,
  MORADORES_DO_ANEL,
  MOVEIS,
  MOVEIS_NA_CASA_MAXIMO,
  type MovelNaObra,
  OBJETOS_DA_CASA,
  type Obra,
  PERCURSOS,
  type PlantaDoCeu,
  POSTOS_DA_VILA,
  type ResultadoCompacto,
  SEMENTES_DO_CEU,
  VAGAS_DA_GALERIA_DO_FAROL,
} from '../src'
import { ehLumiDeLuz } from '../src/lumis-de-luz'

const AGORA = new Date('2026-10-29T12:00:00Z')
/** Uma medida de 0 a 100 com dízima (as medidas caem aos poucos e não são inteiras). */
const DIZIMA = 57.333333333333336

/** O cartão mais pesado em bytes de cada tipo, com os de dentro no nível de baixo. */
function pesado(nivel: number): CartaoDaRotina {
  const folha: CartaoDaRotina = { c: 'guardar-na-memoria', n: LIMITES_DA_ROTINA.memoria.max }
  if (nivel === 0) return folha
  return { c: 'enquanto', se: 'lembra-menos-que', n: 99, d: [pesado(nivel - 1)] }
}

/** Uma rotina pesada com exatamente `n` cartões (o QUANDO e cadeias de enquanto até o fundo). */
function rotinaPesada(n: number): CartaoDaRotina[] {
  const lista: CartaoDaRotina[] = [{ c: 'quando-anoitecer' }]
  let falta = n - 1
  while (falta > 0) {
    const nivel = Math.min(LIMITES_DA_ROTINA.profundidade, falta - 1)
    lista.push(pesado(nivel))
    falta -= nivel + 1
  }
  return lista
}

export function cenariosDeSalvamentoCheio(inventario?: Record<string, number>) {
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
  // V20: os móveis da casa no teto, cada um no formato mais pesado (índice de dois dígitos, as duas
  // coordenadas negativas de três caracteres). A cabana não guarda móvel.
  const movelPesado: MovelNaObra = [MOVEIS.length - 1, -60, -60, 3]
  const casaCheia = (): Obra => ({
    ...cheia(),
    moveis: Array.from({ length: MOVEIS_NA_CASA_MAXIMO }, () => movelPesado),
  })
  // A galeria do Farol: as seis vagas com a exposição mais pesada (a aparência do objeto de nome
  // mais comprido, com o id no teto), cada uma de uma criação diferente.
  const maisComprido = [...OBJETOS_DA_CASA].sort((a, b) => b.length - a.length)[0]!
  const galeria = Array.from(
    { length: VAGAS_DA_GALERIA_DO_FAROL },
    (_, i): ExposicaoDoFarol => ['a', maisComprido, `${i}`.padStart(ID_DA_APARENCIA_MAXIMO, 'x')],
  )
  const aparencias = Array.from({ length: APARENCIAS_GUARDADAS_MAXIMO }, (_, i) => ({
    origem: 'criacao' as const,
    id: `${i}`.padStart(ID_DA_APARENCIA_MAXIMO, 'x'),
  }))
  const projeto = { ganhoEm: AGORA.toISOString(), aparencia: aparencias[0], aparencias }
  const turno = { pagoEm: '2026-10-29', melhor: 3, vezes: 9999 }
  // V22: o percurso em tupla, com as três estrelas e o maior tempo que se guarda.
  const percurso: ResultadoCompacto = [7, 3_599_999]
  // O filhote do Vale mais pesado (V15): nome de 16 letras, as três datas e dois dígitos nos dias.
  const filhote = {
    ovo: DIAS_PARA_CHOCAR,
    aquecidoEm: '2026-10-29',
    nome: 'x'.repeat(16),
    comeuEm: '2026-10-29',
    carinhoEm: '2026-10-29',
    dias: DIAS_CUIDADOS_MAXIMO,
  }
  const base = {
    ...criarSalvamentoInicial(AGORA),
    ...(inventario ? { inventario } : {}),
    moradores: Object.fromEntries(
      MORADORES_DO_ANEL.map((nome) => [
        nome,
        {
          amizade: 500,
          conversaEm: '2026-10-29',
          presenteEm: '2026-10-29',
          pedido: { dia: '2026-10-29', id: '界'.repeat(40), entregue: false },
        },
      ]),
    ),
    nuvens: { constelacoes: 63 },
    clima: 'nublado' as const,
    // Os três ids pesam mais que a lista vazia. false ocupa um byte a mais que true.
    vale: {
      pegadas: false,
      escavacao: 3,
      ninhos: ['ninho-1', 'ninho-2', 'ninho-3'],
      filhote,
      // V22: todos os fósseis do museu (dois dígitos).
      fosseis: 2 ** FOSSEIS_DO_VALE.length - 1,
    },
    // V22: a florada no teto e os seis canteiros do céu plantados, cada um com o minuto de sete
    // dígitos.
    florada: FLORADA_MAXIMA,
    ceu: Array.from(
      { length: CANTEIROS_DO_CEU },
      (_, i): PlantaDoCeu => [i + 1, SEMENTES_DO_CEU.length - 1, 9_999_999],
    ),
    construcao: { casa: casaCheia(), cabanas: { bosque: cheia() } },
    farol: { pagina: true, concluido: true, galeria },
    projetos: Object.fromEntries(OBJETOS_DA_CASA.map((id) => [id, projeto])),
    turnos: Object.fromEntries(POSTOS_DA_VILA.map((p) => [p, turno])),
    percursos: Object.fromEntries(PERCURSOS.map((p) => [p, percurso])),
    // Os Lumis de luz não têm contador (vêm dos baús, `segredos`).
    lumis: Object.fromEntries(LUMIS.filter((id) => !ehLumiDeLuz(id)).map((id) => [id, 999])),
    // V19 no teto: todas as visitas, chaves, segredos e células do mapa; "adotado" pesa mais.
    ilhasVisitadas: 255,
    chaves: 15,
    segredos: BIT_DA_SEGREDO_MAXIMO * 2 - 1,
    mapa: Object.fromEntries(MAPAS_DAS_ILHAS.map((id) => [id, 'f'.repeat(16)])),
    companhia: 'adotado' as const,
    // 01/11/2026: o que o cenário deixava de fora. A horta com os 24 canteiros plantados e regados
    // (as datas com milissegundos), todos os bichos achados e o adotado mais pesado (nome de 16
    // letras acentuadas, medidas com dízima), a posição e as necessidades com dízima e todas as
    // pontes vistas. Juntos pesam uns 2,8 KB.
    horta: Array.from({ length: 24 }, (_, i) => ({
      id: `c${i + 1}`,
      semente: 'tomate' as const,
      plantadoEm: '2026-10-29T12:00:00.000Z',
      regadoEm: '2026-10-29T12:00:00.000Z',
    })),
    bichos: {
      achados: [...BICHOS_DO_BOSQUE],
      adotado: {
        id: BICHOS_DO_BOSQUE[BICHOS_DO_BOSQUE.length - 1]!,
        nome: 'Á'.repeat(16),
        fase: 'filhote' as const,
        fome: DIZIMA,
        limpeza: DIZIMA,
        carinho: DIZIMA,
        diasCuidados: 999,
        diaCuidadoEm: '2026-10-29',
        truque: { sessoes: 99, ultimaEm: '2026-10-29', aprendido: false },
      },
      // V23: os outros dois bichos adotados, no mesmo formato mais pesado.
      outros: BICHOS_DO_BOSQUE.slice(0, 2).map((id) => ({
        id,
        nome: 'Á'.repeat(16),
        fase: 'filhote' as const,
        fome: DIZIMA,
        limpeza: DIZIMA,
        carinho: DIZIMA,
        diasCuidados: 999,
        diaCuidadoEm: '2026-10-29',
        truque: { sessoes: 99, ultimaEm: '2026-10-29', aprendido: false },
      })),
    },
    posicao: { x: -123.45678901234567, y: 12.345678901234567, z: -98.76543210987654 },
    necessidades: { fome: DIZIMA, energia: DIZIMA, diversao: DIZIMA },
    pontesVistas: [...ILHA_IDS],
    casa: { portaNova: false },
  }
  const L = LIMITES_DA_ROTINA
  // Os jeitos de gastar o teto somando as rotinas: poucas rotinas cheias ou muitas curtas.
  const porRotina = (quantas: number): Partial<Record<LumiId, CartaoDaRotina[]>> => {
    const cada = Math.floor(L.cartoesNasRotinas / quantas)
    const ids = [...LUMIS].sort((a, b) => b.length - a.length).slice(0, quantas)
    return Object.fromEntries(
      ids.map((id) => [id, rotinaPesada(Math.min(cada, L.cartoesPorRotina))]),
    )
  }
  // Toda rotina tem pelo menos dois cartões (um QUANDO e uma ação): até 16 rotinas.
  const maisRotinas = Math.min(LUMIS.length, Math.floor(L.cartoesNasRotinas / 2))
  return Array.from({ length: maisRotinas - 1 }, (_, i) => ({
    ...base,
    rotinas: porRotina(i + 2),
    recife: { bau: false, pagina: false, tesouro: false, corais: 15 },
  }))
}
