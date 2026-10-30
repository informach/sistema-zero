import {
  type FiltroDaMedicao,
  GRUPO_MINIMO_DA_MEDICAO,
  type NumeroDaMedicao,
  type RelatorioDaMedicao,
} from '@sistemazero/arquipelago-contracts'

export interface ContagemDaMedicao {
  quantidade: number
  pessoas: number
}
export interface CoorteDaMedicao {
  dia: string
  pessoas: number
  seguinte: number
  dia7: number
}
export interface AgregadosDaMedicao {
  coortes: CoorteDaMedicao[]
  pintaMolda: ContagemDaMedicao
  criacaoGuardada: ContagemDaMedicao
  galeria: ContagemDaMedicao
  desafiosAprovados: ContagemDaMedicao
  minijogos?: ContagemDaMedicao
  mudancasDeAparencia?: {
    pintaMolda: ContagemDaMedicao
    criacaoGuardada: ContagemDaMedicao
    galeria: ContagemDaMedicao
  }
}
/** A volta ao curso somada na equipe; `pessoas` são as que jogaram em algum dia contado. */
export interface VoltaAoCursoDaMedicao {
  pessoas: number
  pessoasComAula: number
  diasDeJogo: number
  diasComAula: number
}
export interface RepositorioDaMedicao {
  agregar(filtro: FiltroDaMedicao, hoje: string): Promise<AgregadosDaMedicao>
  /** O fim de cada sessão que contou tempo entre `de` e `ate`, por pessoa. */
  finsDeSessao(de: Date, ate: Date): Promise<Map<string, Date[]>>
}

const poucos: NumeroDaMedicao = { situacao: 'poucos-dados', valor: null }
const aguardando: NumeroDaMedicao = { situacao: 'aguardando', valor: null }
const numero = (valor: number): NumeroDaMedicao => ({ situacao: 'disponivel', valor })
export function protegerContagem(c: ContagemDaMedicao): NumeroDaMedicao {
  return c.pessoas < GRUPO_MINIMO_DA_MEDICAO ? poucos : numero(c.quantidade)
}
export function somarDias(dia: string, dias: number): string {
  return new Date(Date.parse(dia) + dias * 86_400_000).toISOString().slice(0, 10)
}
const pequeno = (n: number) => n > 0 && n < GRUPO_MINIMO_DA_MEDICAO

/** Dia 7 é o sétimo dia desde a entrada (D+6). Só dias inteiros permitem medir a volta. */
export function protegerCoorte(
  c: CoorteDaMedicao,
  hoje: string,
): RelatorioDaMedicao['volta']['coortes'][number] {
  const seguinteCompleto = somarDias(c.dia, 1) < hoje
  const seteCompleto = somarDias(c.dia, 6) < hoje
  const revelar =
    c.pessoas >= GRUPO_MINIMO_DA_MEDICAO &&
    (!seguinteCompleto || (!pequeno(c.seguinte) && !pequeno(c.pessoas - c.seguinte))) &&
    (!seteCompleto || (!pequeno(c.dia7) && !pequeno(c.pessoas - c.dia7)))
  return {
    dia: c.dia,
    dia1: revelar ? numero(c.pessoas) : poucos,
    diaSeguinte: !seguinteCompleto ? aguardando : revelar ? numero(c.seguinte) : poucos,
    dia7: !seteCompleto ? aguardando : revelar ? numero(c.dia7) : poucos,
  }
}

/** Como a coorte: grupo pequeno, ou um complementar pequeno, esconde os dois números. */
export function protegerVoltaAoCurso(
  v: VoltaAoCursoDaMedicao,
): NonNullable<RelatorioDaMedicao['voltaAoCurso']> {
  const revelar =
    v.pessoas >= GRUPO_MINIMO_DA_MEDICAO &&
    !pequeno(v.pessoasComAula) &&
    !pequeno(v.pessoas - v.pessoasComAula)
  return {
    diasDeJogo: revelar ? numero(v.diasDeJogo) : poucos,
    diasComAula: revelar ? numero(v.diasComAula) : poucos,
  }
}

export function montarMedicao(
  filtro: FiltroDaMedicao,
  dados: AgregadosDaMedicao,
  hoje: string,
  agora: Date,
  volta: VoltaAoCursoDaMedicao | null = null,
): RelatorioDaMedicao {
  return {
    periodo: filtro,
    calculadoEm: agora.toISOString(),
    volta: {
      situacao: filtro.publico === 'kids' ? 'disponivel' : 'sem-fonte',
      coortes: filtro.publico === 'kids' ? dados.coortes.map((c) => protegerCoorte(c, hoje)) : [],
    },
    criacao: {
      pintaMolda: protegerContagem(dados.pintaMolda),
      criacaoGuardada: protegerContagem(dados.criacaoGuardada),
      galeria: protegerContagem(dados.galeria),
    },
    ...(dados.mudancasDeAparencia
      ? {
          mudancasDeAparencia: {
            pintaMolda: protegerContagem(dados.mudancasDeAparencia.pintaMolda),
            criacaoGuardada: protegerContagem(dados.mudancasDeAparencia.criacaoGuardada),
            galeria: protegerContagem(dados.mudancasDeAparencia.galeria),
          },
        }
      : {}),
    desafiosAprovados: protegerContagem(dados.desafiosAprovados),
    ...(volta ? { voltaAoCurso: protegerVoltaAoCurso(volta) } : {}),
    ...(dados.minijogos ? { minijogos: protegerContagem(dados.minijogos) } : {}),
    semFonte: [
      ...(filtro.publico === 'adulto' ? ['volta-adulto' as const] : []),
      'compras',
      ...(dados.minijogos ? [] : ['minijogos' as const]),
      ...(volta ? [] : ['curso-24h' as const]),
      'conclusoes-curso',
    ],
  }
}
