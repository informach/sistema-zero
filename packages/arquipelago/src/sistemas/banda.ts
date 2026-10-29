import { INSTRUMENTOS_DA_BANDA, type Salvamento } from '@sistemazero/arquipelago-contracts'
import { ganharProjeto } from './construcao/projeto-azul'
import { ITENS } from './itens'
import { fazerReceita, ingredientesPorExtenso, RECEITAS } from './receitas'

/**
 * A banda do festival de inverno do Pico Gelado (fase3-08). Os três pinguins músicos esperam no
 * palco do Floco, cada um sem o seu instrumento: o xilofone ficou dentro do iglu, o violão perto
 * do lago congelado e a bateria no platô do cume. "Levar … ao palco" devolve o instrumento (um bit
 * de `pico.banda`, V14, na ordem desta lista); com os três de volta, a banda toca e o festival de
 * inverno começa, para sempre, e os instrumentos chegam como projeto azul. Sem prazo nem castigo.
 */
export const INSTRUMENTOS = ['xilofone', 'violao', 'bateria'] as const
export type Instrumento = (typeof INSTRUMENTOS)[number]

const NOME: Readonly<Record<Instrumento, { nome: string; o: 'o' | 'a' }>> = {
  xilofone: { nome: 'xilofone', o: 'o' },
  violao: { nome: 'violão', o: 'o' },
  bateria: { nome: 'bateria', o: 'a' },
}
/** Onde cada um ficou, para a dica do Floco. */
const ONDE_FICOU: Readonly<Record<Instrumento, string>> = {
  xilofone: 'O xilofone ficou dentro do iglu.',
  violao: 'O violão ficou perto do lago congelado.',
  bateria: 'A bateria ficou lá no alto da montanha, no platô do cume.',
}

export const BANDA = {
  /** De que distância (no chão) dá para pegar um instrumento perdido. */
  alcance: 1.8,
  /** De que distância do fogareiro aparece "Fazer chocolate quente" (só lá dentro do iglu). */
  alcanceDoFogareiro: 1.5,
  /** Os pinguins músicos na escala dos bichos (o `pinguim.glb` tem 0,51 m). */
  escalaDoPinguim: 1.8,
} as const

export const TODA_A_BANDA = 2 ** INSTRUMENTOS_DA_BANDA - 1

export function instrumentoDeVolta(banda: number, i: number): boolean {
  return (banda & (1 << i)) !== 0
}

export function instrumentosDeVolta(banda: number): number {
  let n = 0
  for (let i = 0; i < INSTRUMENTOS.length; i++) if (instrumentoDeVolta(banda, i)) n++
  return n
}

/** O festival de inverno: os três instrumentos de volta ao palco. */
export function festivalDeInverno(s: Salvamento): boolean {
  return s.pico.banda === TODA_A_BANDA
}

/** Devolver o instrumento `i` ao palco. O mesmo salvamento quando ele já tinha voltado. */
export function devolverInstrumento(s: Salvamento, i: number): Salvamento {
  if (i < 0 || i >= INSTRUMENTOS.length || instrumentoDeVolta(s.pico.banda, i)) return s
  return { ...s, pico: { banda: s.pico.banda | (1 << i) } }
}

export function rotuloDoInstrumento(i: number): string {
  const n = NOME[INSTRUMENTOS[i] ?? 'xilofone']
  return `Levar ${n.o} ${n.nome} ao palco`
}

/** O que o Zappy diz depois de levar (com a banda já contando o novo). */
export function falaDaVolta(i: number, banda: number): string {
  const faltam = INSTRUMENTOS.length - instrumentosDeVolta(banda)
  if (faltam === 0)
    return 'A banda está completa. Os pinguins voltaram a tocar, e o festival de inverno começou no palco do Floco.'
  const n = NOME[INSTRUMENTOS[i] ?? 'xilofone']
  const inicio = `${n.o === 'a' ? 'A' : 'O'} ${n.nome} voltou para o palco.`
  return `${inicio} ${faltam === 1 ? 'Falta 1 instrumento' : `Faltam ${faltam} instrumentos`} para a banda tocar.`
}

/** A conversa do Floco: antes, onde ficou cada instrumento que falta; depois, o festival. */
export function falasDoFloco(s: Salvamento): string[] {
  if (festivalDeInverno(s))
    return [
      'A banda voltou a tocar. É o festival de inverno do Pico Gelado.',
      'Os instrumentos da banda chegaram para você como projeto azul. Leve a música para casa.',
    ]
  const voltaram = instrumentosDeVolta(s.pico.banda)
  return [
    'Sou Floco. Toco cavaquinho no palco do Pico Gelado.',
    voltaram === 0
      ? 'Os pinguins da banda perderam os instrumentos na neve, e sem eles não tem festival de inverno.'
      : `Já ${voltaram === 1 ? 'voltou 1 instrumento' : `voltaram ${voltaram} instrumentos`}. Falta pouco para o festival de inverno.`,
    ...INSTRUMENTOS.filter((_, i) => !instrumentoDeVolta(s.pico.banda, i)).map(
      (id) => ONDE_FICOU[id],
    ),
  ]
}

// ------------------------------------------------------------------ o fogareiro do iglu

const nomeDoItem = (id: string) => ITENS[id]?.nome.toLowerCase() ?? id

/** O chocolate quente que o fogareiro do iglu faz (a receita do Bento, sem precisar dos corações). */
export const CHOCOLATE_DO_IGLU = RECEITAS.find((r) => r.id === 'chocolate-quente')
export const ROTULO_DO_FOGAREIRO = 'Fazer chocolate quente'

/**
 * Fazer um chocolate quente no fogareiro do iglu. O primeiro traz a lareira como projeto azul
 * (o calor do iglu para a casa). Sem os ingredientes, diz o que falta, sem mudar nada.
 */
export function fazerChocolateNoIglu(
  s: Salvamento,
  agora: Date,
): { salvamento: Salvamento; falas: string[] } {
  const r = CHOCOLATE_DO_IGLU
  if (!r) return { salvamento: s, falas: [] }
  const feito = fazerReceita(s, r)
  if (!feito)
    return {
      salvamento: s,
      falas: [`Para o chocolate quente, traga ${ingredientesPorExtenso(r, nomeDoItem)}.`],
    }
  const falas = [feito.fala]
  if (s.projetos.lareira) return { salvamento: feito.salvamento, falas }
  falas.push(
    'O calor do iglu deu uma ideia: chegou o projeto azul da lareira. Ponha em casa no modo Construir.',
  )
  return { salvamento: ganharProjeto(feito.salvamento, 'lareira', agora), falas }
}
