import {
  APARENCIAS_GUARDADAS_MAXIMO,
  BIT_DA_SEGREDO_MAXIMO,
  type CartaoDaRotina,
  criarSalvamentoInicial,
  DIAS_CUIDADOS_MAXIMO,
  DIAS_PARA_CHOCAR,
  ID_DA_APARENCIA_MAXIMO,
  LIMITES_DA_ROTINA,
  LUMIS,
  type LumiId,
  MAPAS_DAS_ILHAS,
  MORADORES_DO_ANEL,
  OBJETOS_DA_CASA,
  type Obra,
  PERCURSOS,
  POSTOS_DA_VILA,
} from '../src'

const AGORA = new Date('2026-10-29T12:00:00Z')

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
  })
  const aparencias = Array.from({ length: APARENCIAS_GUARDADAS_MAXIMO }, (_, i) => ({
    origem: 'criacao' as const,
    id: `${i}`.padStart(ID_DA_APARENCIA_MAXIMO, 'x'),
  }))
  const projeto = { ganhoEm: AGORA.toISOString(), aparencia: aparencias[0], aparencias }
  const turno = { pagoEm: '2026-10-29', melhor: 3, vezes: 9999 }
  const percurso = {
    estrelas: { chegada: true, tempo: true, vagalumes: true },
    melhorTempoMs: 3_599_999,
  }
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
    vale: { pegadas: false, escavacao: 3, ninhos: ['ninho-1', 'ninho-2', 'ninho-3'], filhote },
    construcao: { casa: cheia(), cabanas: { bosque: cheia() } },
    projetos: Object.fromEntries(OBJETOS_DA_CASA.map((id) => [id, projeto])),
    turnos: Object.fromEntries(POSTOS_DA_VILA.map((p) => [p, turno])),
    percursos: Object.fromEntries(PERCURSOS.map((p) => [p, percurso])),
    lumis: Object.fromEntries(LUMIS.map((id) => [id, 999])),
    // V19 no teto: todas as visitas, chaves, segredos e células do mapa; "adotado" pesa mais.
    ilhasVisitadas: 255,
    chaves: 15,
    segredos: BIT_DA_SEGREDO_MAXIMO * 2 - 1,
    mapa: Object.fromEntries(MAPAS_DAS_ILHAS.map((id) => [id, 'f'.repeat(16)])),
    companhia: 'adotado' as const,
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
  return Array.from({ length: LUMIS.length - 1 }, (_, i) => ({
    ...base,
    rotinas: porRotina(i + 2),
    recife: { bau: false, pagina: false, tesouro: false, corais: 15 },
  }))
}
