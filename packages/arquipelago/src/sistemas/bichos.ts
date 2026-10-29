import {
  BICHOS_DO_BOSQUE,
  type BichoAdotado,
  type BichoDoBosque,
  SALVAMENTO_MAX_BYTES,
  type Salvamento,
} from '@sistemazero/arquipelago-contracts'
import type { Bichos } from './esconde'
import { adicionar, type Inventario, ITENS, quantidade, remover } from './itens'

/** A salada já existe e alimenta tanto a pessoa quanto o bicho adotado. */
export const PRESENTE_DOS_BICHOS = { item: 'salada', quantidade: 1 } as const

/** Inventário e recibo mudam juntos. Mochila cheia mantém o presente para outra conversa. */
export function receberPresenteDosBichos(s: Salvamento): {
  salvamento: Salvamento
  resultado: 'entregue' | 'sem-espaco' | 'nada'
} {
  if (s.presenteDosBichosEntregue || !BICHOS_DO_BOSQUE.every((b) => s.bichos.achados.includes(b)))
    return { salvamento: s, resultado: 'nada' }
  const { item, quantidade: qtd } = PRESENTE_DOS_BICHOS
  if (quantidade(s.inventario, item) + qtd > 999) return { salvamento: s, resultado: 'sem-espaco' }
  const salvamento: Salvamento = {
    ...s,
    inventario: adicionar(s.inventario, item, qtd),
    presenteDosBichosEntregue: true,
  }
  if (new TextEncoder().encode(JSON.stringify(salvamento)).length > SALVAMENTO_MAX_BYTES)
    return { salvamento: s, resultado: 'sem-espaco' }
  return { salvamento, resultado: 'entregue' }
}

/**
 * O bicho adotado (regras puras). Fome, limpeza e carinho caem devagar com o tempo JOGADO (quem
 * ficou longe não volta para um bicho triste). Medida baixa só deixa o bicho tristinho e sem
 * truque até ser cuidado: ele nunca morre nem foge. Ensinar o truque e crescer contam por dia do
 * calendário (`diaDe` em `moradores.ts`).
 */

/** Quanto cada medida cai por minuto jogado. */
export const QUEDA_DO_BICHO_POR_MINUTO = { fome: 1.5, limpeza: 0.8, carinho: 1 } as const

export const CUIDADO = {
  /** Quanto o banho e o carinho repõem. */
  banho: 60,
  carinho: 25,
  /** A comida repõe a fome da criança vezes isto (bicho come menos que gente). */
  comidaVezes: 2,
  /** Acima disto nas três medidas, o dia conta como bem cuidado. */
  diaBemCuidado: 60,
  /** Acima disto nas três medidas, dá para ensinar o truque. */
  paraEnsinar: 50,
  /** Abaixo disto em qualquer medida, ele fica tristinho e não faz o truque. */
  tristinho: 30,
  /** Sessões, em dias diferentes, para aprender o truque. */
  sessoesDoTruque: 5,
  /** Dias bem cuidado para virar adulto. */
  diasParaCrescer: 7,
} as const

/** O truque de cada bicho (o clipe "truque" do modelo). */
export const TRUQUE: Readonly<Record<BichoDoBosque, string>> = {
  cachorro: 'dar a pata',
  gato: 'rolar',
  coelho: 'dar um pulinho',
  porquinho: 'girar',
}

/** O desenho de cada bicho nos botões (o modelo 3D aparece no mundo). */
export const EMOJI_DO_BICHO: Readonly<Record<BichoDoBosque, string>> = {
  cachorro: '🐶',
  gato: '🐱',
  coelho: '🐰',
  porquinho: '🐹',
}

export const NOME_DO_BICHO: Readonly<Record<BichoDoBosque, string>> = {
  cachorro: 'cachorro caramelo',
  gato: 'gato frajola',
  coelho: 'coelho',
  porquinho: 'porquinho-da-índia',
}

const limitar = (v: number) => Math.max(0, Math.min(100, v))

/** O nome que a criança dá: de 1 a 16 caracteres, só letras, espaço e hífen. */
export function nomeValido(nome: string): string | null {
  // NFC: um acento digitado separado da letra (alguns teclados) vira a letra acentuada.
  const limpo = nome.normalize('NFC').trim().replace(/\s+/g, ' ')
  if (limpo.length < 1 || limpo.length > 16) return null
  return /^[\p{L}][\p{L} -]*$/u.test(limpo) ? limpo : null
}

/** Por que o nome não serve, numa frase para a criança (`null` = serve). */
export function motivoDoNome(nome: string): string | null {
  const limpo = nome.normalize('NFC').trim().replace(/\s+/g, ' ')
  if (limpo.length === 0) return 'Escreva um nome.'
  if (limpo.length > 16) return 'Esse nome é comprido demais. Use até 16 letras.'
  if (!/^[\p{L}]/u.test(limpo)) return 'Comece o nome com uma letra.'
  if (!/^[\p{L} -]*$/u.test(limpo)) return 'Use só letras, espaço e hífen.'
  return null
}

/** Adotar um bicho achado, com o nome. Só um bicho adotado nesta fase. */
export function adotar(bichos: Bichos, bicho: BichoDoBosque, nome: string): Bichos | null {
  const limpo = nomeValido(nome)
  if (!limpo || bichos.adotado || !bichos.achados.includes(bicho)) return null
  return {
    ...bichos,
    adotado: {
      id: bicho,
      nome: limpo,
      fase: 'filhote',
      fome: 80,
      limpeza: 80,
      carinho: 80,
      diasCuidados: 0,
      diaCuidadoEm: null,
      truque: { sessoes: 0, ultimaEm: null, aprendido: false },
    },
  }
}

/** O tempo jogado passando. */
export function passarTempoDoBicho(b: BichoAdotado, segundos: number): BichoAdotado {
  const min = Math.max(0, segundos) / 60
  return {
    ...b,
    fome: limitar(b.fome - QUEDA_DO_BICHO_POR_MINUTO.fome * min),
    limpeza: limitar(b.limpeza - QUEDA_DO_BICHO_POR_MINUTO.limpeza * min),
    carinho: limitar(b.carinho - QUEDA_DO_BICHO_POR_MINUTO.carinho * min),
  }
}

/** Alimentar com uma comida do inventário (o item sai). Sem o item ou sem ser comida, nada muda. */
export function alimentar(
  b: BichoAdotado,
  inv: Inventario,
  itemId: string,
): { bicho: BichoAdotado; inv: Inventario } | null {
  const comida = ITENS[itemId]?.comida
  const novo = comida && remover(inv, itemId, 1)
  if (!comida || !novo) return null
  return { bicho: { ...b, fome: limitar(b.fome + comida.fome * CUIDADO.comidaVezes) }, inv: novo }
}

export function darBanho(b: BichoAdotado): BichoAdotado {
  return { ...b, limpeza: limitar(b.limpeza + CUIDADO.banho) }
}

export function fazerCarinho(b: BichoAdotado): BichoAdotado {
  return { ...b, carinho: limitar(b.carinho + CUIDADO.carinho) }
}

const todasAcima = (b: BichoAdotado, limite: number) =>
  b.fome > limite && b.limpeza > limite && b.carinho > limite

export function tristinho(b: BichoAdotado): boolean {
  return (
    b.fome < CUIDADO.tristinho || b.limpeza < CUIDADO.tristinho || b.carinho < CUIDADO.tristinho
  )
}

/**
 * Conta o dia de hoje como bem cuidado se as três medidas passaram de 60 agora (uma vez por dia).
 * O jogo chama depois de cada cuidado.
 */
export function contarDiaCuidado(b: BichoAdotado, dia: string): BichoAdotado {
  if (b.diaCuidadoEm === dia || !todasAcima(b, CUIDADO.diaBemCuidado)) return b
  return { ...b, diasCuidados: Math.min(999, b.diasCuidados + 1), diaCuidadoEm: dia }
}

export function podeCrescer(b: BichoAdotado): boolean {
  return b.fase === 'filhote' && b.diasCuidados >= CUIDADO.diasParaCrescer
}

export function crescer(b: BichoAdotado): BichoAdotado {
  return podeCrescer(b) ? { ...b, fase: 'adulto' } : b
}

export type ResultadoDaAula = 'aprendeu' | 'mais-uma' | 'ja-hoje' | 'precisa-cuidado' | 'ja-sabe'

/** Uma sessão de ensinar o truque (uma por dia, com o bicho bem cuidado). */
export function ensinar(
  b: BichoAdotado,
  dia: string,
): { bicho: BichoAdotado; resultado: ResultadoDaAula } {
  if (b.truque.aprendido) return { bicho: b, resultado: 'ja-sabe' }
  if (b.truque.ultimaEm === dia) return { bicho: b, resultado: 'ja-hoje' }
  if (!todasAcima(b, CUIDADO.paraEnsinar)) return { bicho: b, resultado: 'precisa-cuidado' }
  const sessoes = b.truque.sessoes + 1
  const aprendido = sessoes >= CUIDADO.sessoesDoTruque
  return {
    bicho: { ...b, truque: { sessoes, ultimaEm: dia, aprendido } },
    resultado: aprendido ? 'aprendeu' : 'mais-uma',
  }
}

/** Faz o truque quando pedem: só se já aprendeu e não está tristinho. */
export function fazTruque(b: BichoAdotado): boolean {
  return b.truque.aprendido && !tristinho(b)
}
