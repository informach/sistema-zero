import {
  type CartaoDaRotina,
  type FiltroDaMedicao,
  GRUPO_MINIMO_DA_MEDICAO,
  type LumiId,
  migrarSalvamento,
  type NumeroDaMedicao,
  type RelatorioDaMedicao,
  rodarRotina,
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
  /** Tentativas, dicas e reenvios (A26); ausente no repositório anterior. */
  aprendizagem?: {
    conclusoesMedidas: ContagemDaMedicao
    acertoNaPrimeira: ContagemDaMedicao
    tentativas: ContagemDaMedicao
    semDica: ContagemDaMedicao
    dicas: ContagemDaMedicao
    reenvios: ContagemDaMedicao
  }
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
/** As rotinas dos Lumis guardadas hoje e as que rodam até o fim sem erro (A26). */
export interface RotinasDaMedicao {
  rotinas: ContagemDaMedicao
  funcionam: ContagemDaMedicao
}
/** As compras pagas no jogo, pelo Members (A26). */
export interface ComprasDaMedicao {
  quantidade: number
  pessoas: number
  moedas: number
}
export interface RepositorioDaMedicao {
  agregar(filtro: FiltroDaMedicao, hoje: string): Promise<AgregadosDaMedicao>
  /** Os salvamentos do público com alguma rotina montada (só o documento). */
  salvamentosComRotina?(
    publico: FiltroDaMedicao['publico'],
  ): Promise<{ jogadorId: string; dados: unknown }[]>
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

/**
 * Roda cada rotina guardada no mundo de quem a montou (a horta, a mochila e a geladeira do
 * salvamento), sem os cartões da mão: funciona quem vai até o fim sem erro. Salvamento ilegível
 * fica de fora.
 */
export function contarRotinas(
  linhas: readonly { jogadorId: string; dados: unknown }[],
  agora: Date,
): RotinasDaMedicao {
  const comRotina = new Set<string>()
  const comRotinaQueFunciona = new Set<string>()
  let rotinas = 0
  let funcionam = 0
  for (const linha of linhas) {
    const s = migrarSalvamento(linha.dados)
    if (!s) continue
    for (const [lumi, lista] of Object.entries(s.rotinas) as [LumiId, CartaoDaRotina[]][]) {
      if (!lista || lista.length === 0) continue
      rotinas++
      comRotina.add(linha.jogadorId)
      const mundo = {
        horta: structuredClone(s.horta),
        inventario: { ...s.inventario },
        geladeira: s.projetos.geladeira ? structuredClone(s.projetos.geladeira) : null,
        geladeiraPosta: Boolean(s.projetos.geladeira),
      }
      if (rodarRotina(lumi, lista, mundo, agora, null).erro === null) {
        funcionam++
        comRotinaQueFunciona.add(linha.jogadorId)
      }
    }
  }
  return {
    rotinas: { quantidade: rotinas, pessoas: comRotina.size },
    funcionam: { quantidade: funcionam, pessoas: comRotinaQueFunciona.size },
  }
}

export function montarMedicao(
  filtro: FiltroDaMedicao,
  dados: AgregadosDaMedicao,
  hoje: string,
  agora: Date,
  volta: VoltaAoCursoDaMedicao | null = null,
  extras: { rotinas?: RotinasDaMedicao | null; compras?: ComprasDaMedicao | null } = {},
): RelatorioDaMedicao {
  const compras = extras.compras ?? null
  const a = dados.aprendizagem
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
    ...(a
      ? {
          aprendizagem: {
            conclusoesMedidas: protegerContagem(a.conclusoesMedidas),
            acertoNaPrimeira: protegerContagem(a.acertoNaPrimeira),
            tentativas: protegerContagem(a.tentativas),
            semDica: protegerContagem(a.semDica),
            dicas: protegerContagem(a.dicas),
            rotinas: protegerContagem(extras.rotinas?.rotinas ?? { quantidade: 0, pessoas: 0 }),
            rotinasQueFuncionam: protegerContagem(
              extras.rotinas?.funcionam ?? { quantidade: 0, pessoas: 0 },
            ),
            reenvios: protegerContagem(a.reenvios),
            ...(compras
              ? {
                  compras: protegerContagem(compras),
                  moedasNasCompras: protegerContagem({
                    quantidade: compras.moedas,
                    pessoas: compras.pessoas,
                  }),
                }
              : {}),
          },
        }
      : {}),
    semFonte: [
      ...(filtro.publico === 'adulto' ? ['volta-adulto' as const] : []),
      ...(compras && a ? [] : ['compras' as const]),
      ...(dados.minijogos ? [] : ['minijogos' as const]),
      ...(volta ? [] : ['curso-24h' as const]),
      'conclusoes-curso',
    ],
  }
}
