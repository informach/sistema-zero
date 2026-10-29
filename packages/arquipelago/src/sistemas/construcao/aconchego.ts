import type {
  ObjetoDaCasa,
  Obra,
  QuartoDoJogo,
  Salvamento,
} from '@sistemazero/arquipelago-contracts'
import { ROOM_ITEM_INFO } from '@sistemazero/avatar-quarto/quarto/catalog'
import { type Comodo, planta } from './comodos'
import { arestasDaAbertura, chaveDaAresta, ladosDaAresta } from './grade'
import { type Celula, chaveDaCelula, type Lote } from './lote'

/** Balanceamento inicial: somas positivas, com tetos para não pedir acúmulo de coisas. */
export const PONTOS_DE_ACONCHEGO = {
  variedade: { porTipo: 2, tipos: 6 }, // Seis funções diferentes já preenchem esta parte.
  janelas: { porTipo: 2, tipos: 3 }, // Cada desenho de janela conta uma vez.
  luzes: { porTipo: 2, tipos: 2 }, // Duas fontes diferentes bastam, de dia ou de noite.
  plantas: { porTipo: 2, tipos: 3 }, // Repetir vasos não vira uma tarefa de acumular.
  piso: 2, // Os três pisos valem igual, inclusive a tábua inicial.
  porta: 2, // Um cômodo fechado com passagem já recebe a parcela.
  janela: 2, // Uma abertura já soma capricho, além da luz.
  tamanho: 2, // Bônus de espaço útil, nunca desconto por tamanho.
  proprio: { porTipo: 1, tipos: 3 }, // Extra pequeno, sem mudar a base de comprado ou holograma.
} as const
export const ESPACO_ACONCHEGANTE = {
  minimo: 9, // 3 × 3 células comportam um uso, sem premiar cubículos.
  semMobiliarAte: 36, // Até 6 × 6 o espaço sozinho recebe o bônus.
  celulasPorTipo: 12, // Cômodo maior recebe o mesmo bônus se tiver variedade proporcional.
} as const
/** Preparados para outra fase. Não chamam moradores nem iniciam festas nesta entrega. */
export const ACONCHEGO_QUE_CHAMA_VISITA = 12
export const ACONCHEGO_DA_FESTA = 22
export const NIVEIS_DE_ACONCHEGO = [
  { nome: 'Começando', minimo: 0, estrelas: 1 },
  { nome: 'Gostoso', minimo: 6, estrelas: 2 },
  { nome: 'Aconchegante', minimo: ACONCHEGO_QUE_CHAMA_VISITA, estrelas: 3 },
  { nome: 'Muito aconchegante', minimo: ACONCHEGO_DA_FESTA, estrelas: 4 },
] as const

/** IDs existentes no catálogo compartilhado, incluindo vasos de mesa e planta de parede. */
export const PLANTAS_DO_QUARTO = [
  'planta',
  'arvore',
  'cacto',
  'vaso-flores',
  'planta-pendurada',
] as const
export const LUZES_DO_QUARTO = [
  'luminaria',
  'vela',
  'luminaria-mesa',
  'lampada-lava',
  'varal-luzes',
  'letreiro-neon',
] as const
/** A planta de interior em vaso (`arte/objetos/planta_interior.py`), para os cômodos novos. */
export const PLANTAS_DA_OBRA: readonly ObjetoDaCasa[] = ['planta-interior']
export const LUZES_DA_OBRA: readonly ObjetoDaCasa[] = ['lareira']

export interface AconchegoDoComodo {
  comodo: Comodo
  variedade: number
  luz: number
  plantas: number
  capricho: number
  feitoPorVoce: number
  total: number
  nivel: (typeof NIVEIS_DE_ACONCHEGO)[number]['nome']
  estrelas: number
  dica: string
}

function pontos(tipos: number, regra: { porTipo: number; tipos: number }): number {
  return Math.min(tipos, regra.tipos) * regra.porTipo
}

/** Calculado só quando obra, projetos ou quarto mudam. Nunca grava no salvamento. */
export function aconchegoDosComodos(
  obra: Obra,
  lote: Lote,
  projetos: Salvamento['projetos'],
  quarto?: QuartoDoJogo,
): AconchegoDoComodo[] {
  const p = planta(obra, lote)
  const dados = p.comodos.map(() => ({
    tipos: new Set<string>(),
    janelas: new Set<string>(),
    luzes: new Set<string>(),
    plantas: new Set<string>(),
    proprios: new Set<string>(),
    porta: false,
  }))
  for (const a of obra.aberturas) {
    const arestas = arestasDaAbertura(a)
    if (!arestas.every((e) => p.paredes.has(chaveDaAresta(e)))) continue
    const vizinhos = new Set<number>()
    for (const e of arestas)
      for (const c of ladosDaAresta(e)) {
        const i = p.comodoDe.get(chaveDaCelula(c))
        if (i !== undefined) vizinhos.add(i)
      }
    for (const i of vizinhos) {
      const d = dados[i]
      if (!d) continue
      if (a.tipo === 'porta') d.porta = true
      else d.janelas.add(a.tipo)
    }
  }
  for (const o of obra.objetos) {
    const i = p.comodoDe.get(chaveDaCelula(o))
    const d = i === undefined ? undefined : dados[i]
    if (!d) continue
    d.tipos.add(o.id)
    if (LUZES_DA_OBRA.includes(o.id)) d.luzes.add(o.id)
    if (PLANTAS_DA_OBRA.includes(o.id)) d.plantas.add(o.id)
    // Feito por ela conta pelas aparências que ela guarda, não só pela em uso: comprar (ou usar) a
    // da galeria nunca tira o ponto de quem já fez a dela (29/10/2026).
    if (projetos[o.id]?.aparencias.some((a) => a.origem !== 'galeria')) d.proprios.add(o.id)
  }
  return p.comodos.map((comodo, i) => {
    const d = dados[i]!
    if (comodo.quarto && quarto)
      for (const item of quarto.placedItems) {
        // O catálogo desconhecido não desenha no quarto, portanto também não pontua.
        if (!Object.hasOwn(ROOM_ITEM_INFO, item.itemId)) continue
        d.tipos.add(item.itemId)
        if ((PLANTAS_DO_QUARTO as readonly string[]).includes(item.itemId))
          d.plantas.add(item.itemId)
        if ((LUZES_DO_QUARTO as readonly string[]).includes(item.itemId)) d.luzes.add(item.itemId)
        if (item.itemId === 'janela') d.janelas.add('janela-do-quarto')
      }
    const r = PONTOS_DE_ACONCHEGO
    const area = comodo.celulas.length
    const tamanhoBom =
      area >= ESPACO_ACONCHEGANTE.minimo &&
      (area <= ESPACO_ACONCHEGANTE.semMobiliarAte ||
        d.tipos.size >= Math.ceil(area / ESPACO_ACONCHEGANTE.celulasPorTipo))
    const variedade = pontos(d.tipos.size, r.variedade)
    const luz = pontos(d.janelas.size, r.janelas) + pontos(d.luzes.size, r.luzes)
    const plantas = pontos(d.plantas.size, r.plantas)
    const capricho =
      r.piso +
      (d.porta ? r.porta : 0) +
      (d.janelas.size ? r.janela : 0) +
      (tamanhoBom ? r.tamanho : 0)
    const feitoPorVoce = pontos(d.proprios.size, r.proprio)
    const total = variedade + luz + plantas + capricho + feitoPorVoce
    const nivel = NIVEIS_DE_ACONCHEGO.filter((n) => total >= n.minimo).at(-1)!
    const dica = !d.janelas.size
      ? 'Uma janela deixa o cômodo mais claro.'
      : !d.porta
        ? 'Uma porta faz uma passagem para este cômodo.'
        : d.tipos.size < r.variedade.tipos && comodo.quarto
          ? 'Móveis diferentes no Meu quarto somam variedade.'
          : comodo.quarto && !d.plantas.size
            ? 'Uma planta no Meu quarto traz mais aconchego.'
            : !comodo.quarto && !d.plantas.size && projetos['planta-interior']
              ? 'A planta de interior traz mais aconchego a este cômodo.'
              : !comodo.quarto && lote.id === 'casa' && d.tipos.size < r.variedade.tipos
                ? 'Objetos diferentes somam variedade, mesmo em holograma.'
                : d.proprios.size < r.proprio.tipos &&
                    d.tipos.size > 0 &&
                    !comodo.quarto &&
                    lote.id === 'casa'
                  ? 'Pintar um objeto no Pinta dá um toque seu ao cômodo.'
                  : 'Este cantinho já tem o seu jeito. Você pode continuar experimentando.'
    return {
      comodo,
      variedade,
      luz,
      plantas,
      capricho,
      feitoPorVoce,
      total,
      nivel: nivel.nome,
      estrelas: nivel.estrelas,
      dica,
    }
  })
}

/** A seleção usa a célula, pois o id do cômodo pode mudar quando uma parede é editada. */
export function aconchegoNaCelula(comodos: readonly AconchegoDoComodo[], celula: Celula | null) {
  return celula
    ? comodos.find((c) => c.comodo.celulas.some((p) => p.x === celula.x && p.z === celula.z))
    : undefined
}
