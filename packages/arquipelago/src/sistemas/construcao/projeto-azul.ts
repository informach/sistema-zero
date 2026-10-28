import {
  CATALOGO_DE_OBJETOS,
  GELADEIRA_GUARDA,
  type ObjetoDaCasa,
  type Obra,
  POSTOS_DA_JORNADA,
  type ProjetoAzul,
  type Salvamento,
} from '@sistemazero/arquipelago-contracts'
import { ITENS } from '../itens'
import { planta } from './comodos'
import { type Celula, chaveDaCelula, type Lote, naArea, noFixo, ocupante } from './lote'
import type { Resultado } from './obra'

/**
 * O projeto azul (modo construção, fase1-12): o objeto chega com a função pronta e funciona em
 * holograma; com aparência ele fica completo (a geladeira guarda 12 em vez de 4). A moeda compra o
 * visual; a função vem dos pedidos e desafios (proposta).
 */

/** Onde cada objeto vai: dentro de um cômodo novo ou no quintal (a casinha é de bicho). */
export const LUGAR_DO_OBJETO: Readonly<Record<ObjetoDaCasa, 'dentro' | 'fora'>> = {
  geladeira: 'dentro',
  forno: 'dentro',
  aquario: 'dentro',
  lareira: 'dentro',
  banda: 'dentro',
  fliperama: 'dentro',
  museu: 'dentro',
  casinha: 'fora',
}

/** A área na grade com o giro (em quartos de volta): de lado, largura e fundo trocam. */
export function areaComGiro(id: ObjetoDaCasa, giro: number): { largura: number; fundo: number } {
  const { largura, fundo } = CATALOGO_DE_OBJETOS[id].molde.area
  return giro % 2 === 0 ? { largura, fundo } : { largura: fundo, fundo: largura }
}

/** As células que o objeto ocupa (a célula guardada é o canto de x e z menores). */
export function celulasDoObjeto(o: {
  id: ObjetoDaCasa
  x: number
  z: number
  giro: number
}): Celula[] {
  const { largura, fundo } = areaComGiro(o.id, o.giro)
  const celulas: Celula[] = []
  for (let dz = 0; dz < fundo; dz++)
    for (let dx = 0; dx < largura; dx++) celulas.push({ x: o.x + dx, z: o.z + dz })
  return celulas
}

/** O objeto que está na célula (o índice em `obra.objetos`, ou -1). */
export function objetoEm(obra: Obra, c: Celula): number {
  const k = chaveDaCelula(c)
  return obra.objetos.findIndex((o) => celulasDoObjeto(o).some((x) => chaveDaCelula(x) === k))
}

/** O canto do objeto com o meio na célula tocada (para o dedo cair no meio dele). */
export function cantoNoToque(id: ObjetoDaCasa, giro: number, c: Celula): Celula {
  const { largura, fundo } = areaComGiro(id, giro)
  return { x: c.x - Math.floor((largura - 1) / 2), z: c.z - Math.floor((fundo - 1) / 2) }
}

/**
 * Pôr (ou mudar de lugar) um objeto ganho. Dentro de casa: todas as células no mesmo cômodo novo
 * (o quarto é o da plataforma). No quintal: fora de casa, sem caminho nem canteiro. Nunca em cima
 * do que está ocupado nem de outro objeto.
 */
export function porObjeto(
  obra: Obra,
  lote: Lote,
  projetos: Salvamento['projetos'],
  id: ObjetoDaCasa,
  canto: Celula,
  giro: number,
): Resultado {
  if (!projetos[id]) return { ok: false, motivo: 'sem-projeto' }
  const novo = { id, x: canto.x, z: canto.z, giro }
  const celulas = celulasDoObjeto(novo)
  const p = planta(obra, lote)
  const outros = obra.objetos.filter((o) => o.id !== id)
  const usadas = new Set(outros.flatMap(celulasDoObjeto).map(chaveDaCelula))
  const doQuintal = new Set([...obra.caminhos, ...obra.canteiros].map((c) => chaveDaCelula(c)))
  const comodos = new Set<number>()
  for (const c of celulas) {
    if (!naArea(lote.area, c)) return { ok: false, motivo: 'fora-do-lote' }
    const nome = ocupante(lote, c)
    if (nome) return { ok: false, motivo: 'ocupado', nome }
    if (noFixo(lote, c)) return { ok: false, motivo: 'no-quarto' }
    const k = chaveDaCelula(c)
    if (usadas.has(k)) return { ok: false, motivo: 'tem-objeto' }
    const i = p.comodoDe.get(k)
    if (LUGAR_DO_OBJETO[id] === 'dentro') {
      if (i === undefined) return { ok: false, motivo: 'fora-de-comodo' }
      comodos.add(i)
    } else {
      if (i !== undefined) return { ok: false, motivo: 'dentro-de-casa' }
      if (doQuintal.has(k)) return { ok: false, motivo: 'tem-caminho' }
    }
  }
  if (comodos.size > 1) return { ok: false, motivo: 'fora-de-comodo' }
  const igual = obra.objetos.find((o) => o.id === id)
  if (igual && igual.x === novo.x && igual.z === novo.z && igual.giro === novo.giro)
    return { ok: false, motivo: 'nada' }
  return { ok: true, obra: { ...obra, objetos: [...outros, novo] } }
}

/** Tirar o objeto da célula (ele volta para a lista dos guardados, com a função e o que tem dentro). */
export function tirarObjeto(obra: Obra, c: Celula): Resultado {
  const i = objetoEm(obra, c)
  if (i < 0) return { ok: false, motivo: 'nada' }
  return { ok: true, obra: { ...obra, objetos: obra.objetos.filter((_, j) => j !== i) } }
}

/**
 * Os projetos que a pessoa ganhou e ainda não estavam guardados: a geladeira vem do primeiro
 * pedido entregue (o da Capi, o único pedido do jogo hoje) e a casinha de adotar um bicho no
 * Bosque. Devolve o mesmo salvamento quando nada mudou.
 */
export function ganharProjetos(
  s: Salvamento,
  agora: Date,
): { salvamento: Salvamento; ganhos: ObjetoDaCasa[] } {
  const ganhos: ObjetoDaCasa[] = []
  if (!s.projetos.geladeira && s.moradores.capi.pedido?.entregue) ganhos.push('geladeira')
  if (!s.projetos.casinha && s.bichos.adotado) ganhos.push('casinha')
  if (ganhos.length === 0) return { salvamento: s, ganhos }
  const projetos = { ...s.projetos }
  for (const id of ganhos) projetos[id] = { ganhoEm: agora.toISOString(), aparencia: null }
  return { salvamento: { ...s, projetos }, ganhos }
}

/** O que o Zappy diz quando um projeto azul chega. */
export function falaDoGanho(id: ObjetoDaCasa): string {
  const nome = CATALOGO_DE_OBJETOS[id].molde.nome.toLowerCase()
  return `Chegou o projeto azul: ${nome}. Ponha em casa no modo Construir.`
}

// ------------------------------------------------------------------ a geladeira

/** Quantos alimentos cabem: 4 no holograma, 12 com aparência. */
export function capacidade(p: ProjetoAzul): number {
  return p.aparencia ? GELADEIRA_GUARDA.completa : GELADEIRA_GUARDA.holograma
}

export function guardados(p: ProjetoAzul): number {
  return Object.values(p.guardado ?? {}).reduce((a, b) => a + b, 0)
}

/** É alimento (o que se come)? Só alimento vai na geladeira. */
export function ehAlimento(item: string): boolean {
  return Boolean(ITENS[item]?.comida)
}

/** Guardar um alimento da mochila na geladeira (um por vez, até a capacidade). */
export function guardarNaGeladeira(
  p: ProjetoAzul,
  inventario: Record<string, number>,
  item: string,
): { projeto: ProjetoAzul; inventario: Record<string, number> } | null {
  if (!ehAlimento(item) || (inventario[item] ?? 0) < 1 || guardados(p) >= capacidade(p)) return null
  const guardado = { ...(p.guardado ?? {}), [item]: (p.guardado?.[item] ?? 0) + 1 }
  const resto = (inventario[item] ?? 0) - 1
  const inv = { ...inventario }
  if (resto > 0) inv[item] = resto
  else delete inv[item]
  return { projeto: { ...p, guardado }, inventario: inv }
}

/** Tirar um alimento da geladeira para a mochila. */
export function tirarDaGeladeira(
  p: ProjetoAzul,
  inventario: Record<string, number>,
  item: string,
): { projeto: ProjetoAzul; inventario: Record<string, number> } | null {
  const tem = p.guardado?.[item] ?? 0
  if (tem < 1 || (inventario[item] ?? 0) >= 999) return null
  const guardado = { ...(p.guardado ?? {}) }
  if (tem > 1) guardado[item] = tem - 1
  else delete guardado[item]
  return {
    projeto: { ...p, guardado },
    inventario: { ...inventario, [item]: (inventario[item] ?? 0) + 1 },
  }
}

// ------------------------------------------------------------------ a aparência

/** A posição da jornada em que o Molda abre no molde (o posto Explorador(a) de Mundos). */
export const POSICAO_DO_MOLDA = POSTOS_DA_JORNADA.indexOf('explorer') + 1

export function moldaAberto(jornada: number): boolean {
  return jornada >= POSICAO_DO_MOLDA
}
