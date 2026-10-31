import {
  DIAS_DA_SEMANA_DA_FAMILIA,
  diaDeSaoPaulo,
  HORAS_DA_VOLTA_AO_CURSO,
  ILHAS,
  type IlhaId,
  ilha,
  ilhaAberta,
  type SemanaDaCrianca,
} from '@sistemazero/arquipelago-contracts'
import type { AparenciaAplicada } from './familia.port'

/**
 * A semana de cada criança para a área dos pais (28/10/2026, fase1-18), regra pura. A janela é
 * hoje e os 6 dias anteriores, no dia de São Paulo (o mesmo dia do tempo livre).
 */
export interface Janela {
  inicio: string
  fim: string
}

const DIA_MS = 86_400_000

/** Hoje e os 6 dias anteriores (contados pelo calendário, sem depender do fuso do servidor). */
export function janelaDaSemana(agora: Date): Janela {
  const fim = diaDeSaoPaulo(agora)
  const meioDia = Date.parse(`${fim}T12:00:00Z`)
  const inicio = new Date(meioDia - (DIAS_DA_SEMANA_DA_FAMILIA - 1) * DIA_MS)
    .toISOString()
    .slice(0, 10)
  return { inicio, fim }
}

export function dentroDaJanela(dia: string, janela: Janela): boolean {
  return dia >= janela.inicio && dia <= janela.fim
}

/** A posição (1 a 8) da ilha mais nova aberta para quem está nesta posição da jornada. */
export function posicaoDaIlhaMaisNova(posicao: number): number {
  return Math.max(0, ...ILHAS.filter((i) => ilhaAberta(i.id, posicao)).map((i) => i.posicao))
}

/**
 * Desafios aprovados (o principal passou) na janela e, quando a jornada da criança é conhecida,
 * quantos deles são de ilhas antes da mais nova aberta para ela.
 */
export function desafiosDaSemana(
  conclusoes: readonly { concluidoEm: Date; ilha: IlhaId }[],
  janela: Janela,
  posicao: number | null,
): NonNullable<SemanaDaCrianca['desafios']> {
  const daSemana = conclusoes.filter((c) => dentroDaJanela(diaDeSaoPaulo(c.concluidoEm), janela))
  if (posicao === null) return { aprovados: daSemana.length, deIlhasAnteriores: null }
  const maisNova = posicaoDaIlhaMaisNova(posicao)
  return {
    aprovados: daSemana.length,
    deIlhasAnteriores: daSemana.filter((c) => ilha(c.ilha).posicao < maisNova).length,
  }
}

/**
 * Em quantos dias da janela ela concluiu aula do curso até `HORAS_DA_VOLTA_AO_CURSO` depois de
 * uma sessão no jogo terminar (29/10/2026). O dia é o do fim da sessão, em São Paulo; a aula
 * precisa vir DEPOIS do fim (durante a sessão não conta).
 */
export function diasDeVoltaAoCurso(
  fins: readonly Date[],
  aulas: readonly Date[],
  janela: Janela,
): number {
  const prazo = HORAS_DA_VOLTA_AO_CURSO * 3_600_000
  const dias = new Set<string>()
  for (const fim of fins) {
    const dia = diaDeSaoPaulo(fim)
    if (dias.has(dia) || !dentroDaJanela(dia, janela)) continue
    const t = fim.getTime()
    if (aulas.some((a) => a.getTime() > t && a.getTime() <= t + prazo)) dias.add(dia)
  }
  return dias.size
}

/**
 * As criações do Pinta e do Molda que ela pôs em objetos do jogo NA JANELA (A33, 31/10/2026),
 * cada uma contada uma vez: a mesma criação em dois objetos, ou tirada e posta de novo, é uma só.
 * O dia é o de São Paulo. As linhas de antes da migração 0024 não têm o id; ali cada aplicação
 * conta por si (objeto e revisão). Antes o cartão contava os objetos desde o começo, pelo
 * salvamento, que não guarda data.
 */
export function criacoesDaSemana(
  aplicadas: readonly AparenciaAplicada[],
  janela: Janela,
): NonNullable<SemanaDaCrianca['objetos']> {
  const vistas = { pinta: new Set<string>(), molda: new Set<string>() }
  for (const a of aplicadas) {
    if (a.origem !== 'pinta' && a.origem !== 'molda') continue
    if (!dentroDaJanela(diaDeSaoPaulo(a.registradoEm), janela)) continue
    vistas[a.origem].add(a.criacao ?? `${a.objeto}#${a.revisao}`)
  }
  return { pinta: vistas.pinta.size, molda: vistas.molda.size }
}
