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
}
export interface RepositorioDaMedicao {
  agregar(filtro: FiltroDaMedicao, hoje: string): Promise<AgregadosDaMedicao>
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

export function montarMedicao(
  filtro: FiltroDaMedicao,
  dados: AgregadosDaMedicao,
  hoje: string,
  agora: Date,
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
    desafiosAprovados: protegerContagem(dados.desafiosAprovados),
    semFonte: [
      ...(filtro.publico === 'adulto' ? ['volta-adulto' as const] : []),
      'compras',
      'minijogos',
      'curso-24h',
      'conclusoes-curso',
    ],
  }
}
