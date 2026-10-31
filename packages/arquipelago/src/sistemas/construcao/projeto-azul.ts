import {
  CATALOGO_DE_OBJETOS,
  capacidadeDaGeladeira,
  guardadosNaGeladeira,
  guardarAlimentoNaGeladeira,
  INSTRUMENTOS_DA_BANDA,
  OBJETOS_DA_CASA,
  type ObjetoDaCasa,
  type Obra,
  POSTOS_DA_JORNADA,
  type ProjetoAzul,
  type Salvamento,
} from '@sistemazero/arquipelago-contracts'
import { ITENS } from '../itens'
import { coracoes } from '../moradores'
import { planta } from './comodos'
import { loteDaObra } from './entrada'
import { chaveDaAresta, chavesDosTrechos } from './grade'
import { type Celula, chaveDaCelula, type Lote, naArea, noFixo, ocupante } from './lote'
import { celulasDosMoveisAltos } from './moveis'
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
  'planta-interior': 'dentro',
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
  loteDoLugar: Lote,
  projetos: Salvamento['projetos'],
  id: ObjetoDaCasa,
  canto: Celula,
  giro: number,
): Resultado {
  // A varanda da entrada ocupa o lugar (ela segue a porta de entrada da obra).
  const lote = loteDaObra(loteDoLugar, obra)
  if (!projetos[id]) return { ok: false, motivo: 'sem-projeto' }
  const novo = { id, x: canto.x, z: canto.z, giro }
  const celulas = celulasDoObjeto(novo)
  const p = planta(obra, lote)
  const outros = obra.objetos.filter((o) => o.id !== id)
  const usadas = new Set(outros.flatMap(celulasDoObjeto).map(chaveDaCelula))
  const caminhos = new Set(obra.caminhos.map((c) => chaveDaCelula(c)))
  const canteiros = new Set(obra.canteiros.map((c) => chaveDaCelula(c)))
  // Em cima do tapete pode; de outro móvel, não.
  const moveis = celulasDosMoveisAltos(obra)
  const comodos = new Set<number>()
  for (const c of celulas) {
    if (!naArea(lote.area, c)) return { ok: false, motivo: 'fora-do-lote' }
    const nome = ocupante(lote, c)
    if (nome) return { ok: false, motivo: 'ocupado', nome }
    if (noFixo(lote, c)) return { ok: false, motivo: 'objeto-no-quarto' }
    const k = chaveDaCelula(c)
    if (usadas.has(k)) return { ok: false, motivo: 'tem-objeto' }
    if (moveis.has(k)) return { ok: false, motivo: 'tem-movel' }
    const i = p.comodoDe.get(k)
    if (LUGAR_DO_OBJETO[id] === 'dentro') {
      if (i === undefined) return { ok: false, motivo: 'objeto-fora-de-comodo' }
      comodos.add(i)
    } else {
      if (i !== undefined) return { ok: false, motivo: 'dentro-de-casa' }
      if (caminhos.has(k)) return { ok: false, motivo: 'tem-caminho' }
      if (canteiros.has(k)) return { ok: false, motivo: 'ocupado', nome: 'o canteiro' }
    }
  }
  if (comodos.size > 1) return { ok: false, motivo: 'objeto-fora-de-comodo' }
  // Nenhuma parede (nem cerca) passa entre duas células do objeto: um toco de parede dentro do
  // cômodo não deixa o objeto em cima dele.
  const cercas = chavesDosTrechos(obra.cercas)
  const dele = new Set(celulas.map(chaveDaCelula))
  for (const c of celulas) {
    const vizinhas: [Celula, string][] = [
      [{ x: c.x + 1, z: c.z }, chaveDaAresta({ eixo: 'z', x: c.x + 1, z: c.z })],
      [{ x: c.x, z: c.z + 1 }, chaveDaAresta({ eixo: 'x', x: c.x, z: c.z + 1 })],
    ]
    for (const [v, aresta] of vizinhas)
      if (dele.has(chaveDaCelula(v)) && (p.paredes.has(aresta) || cercas.has(aresta)))
        return { ok: false, motivo: 'tem-parede' }
  }
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
 * pedido entregue à Capi, o forno da primeira receita do Bento (um coração de amizade), a casinha
 * de adotar um bicho no Bosque, a planta de interior da primeira obra (da casa ou de uma cabana) e
 * o aquário do primeiro coral replantado no Recife (fase3-03). No modo livre (o final do Farol
 * concluído), todos os que faltam.
 * Devolve o mesmo salvamento quando nada mudou.
 */
export function ganharProjetos(
  s: Salvamento,
  agora: Date,
  temMinijogo = false,
): { salvamento: Salvamento; ganhos: ObjetoDaCasa[] } {
  const ganhos: ObjetoDaCasa[] = []
  if (!s.projetos.fliperama && temMinijogo) ganhos.push('fliperama')
  if (!s.projetos.geladeira && s.moradores.capi.pedido?.entregue) ganhos.push('geladeira')
  // O forno chega com a primeira receita que o Bento lembra (o bolo de fubá, com um coração).
  if (!s.projetos.forno && coracoes(s.moradores.bento.amizade) >= 1) ganhos.push('forno')
  if (!s.projetos.casinha && s.bichos.adotado) ganhos.push('casinha')
  if (!s.projetos.aquario && s.recife.corais !== 0) ganhos.push('aquario')
  // O museu dos fósseis chega com o fóssil descoberto no Vale (fase4-03).
  if (!s.projetos.museu && s.vale.escavacao === 3) ganhos.push('museu')
  // Os instrumentos da banda chegam com o festival de inverno do Pico (fase3-08).
  if (!s.projetos.banda && s.pico.banda === 2 ** INSTRUMENTOS_DA_BANDA - 1) ganhos.push('banda')
  const temObra = s.construcao.casa !== null || Object.keys(s.construcao.cabanas).length > 0
  if (!s.projetos['planta-interior'] && temObra) ganhos.push('planta-interior')
  // O modo livre da Lenda (fase4-12): com o final do Farol concluído, todos os que faltam chegam.
  if (s.farol.concluido)
    for (const id of OBJETOS_DA_CASA) if (!s.projetos[id] && !ganhos.includes(id)) ganhos.push(id)
  if (ganhos.length === 0) return { salvamento: s, ganhos }
  const projetos = { ...s.projetos }
  for (const id of ganhos)
    projetos[id] = { ganhoEm: agora.toISOString(), aparencia: null, aparencias: [] }
  return { salvamento: { ...s, projetos }, ganhos }
}

/**
 * Um projeto azul que chega por um gesto num lugar, não por uma regra do salvamento (a lareira, com
 * o primeiro chocolate quente feito no iglu do Pico). O mesmo salvamento se ele já existe.
 */
export function ganharProjeto(s: Salvamento, id: ObjetoDaCasa, agora: Date): Salvamento {
  if (s.projetos[id]) return s
  return {
    ...s,
    projetos: {
      ...s.projetos,
      [id]: { ganhoEm: agora.toISOString(), aparencia: null, aparencias: [] },
    },
  }
}

/** O que o Zappy diz quando um projeto azul chega. */
export function falaDoGanho(id: ObjetoDaCasa): string {
  const nome = CATALOGO_DE_OBJETOS[id].molde.nome.toLowerCase()
  const onde = LUGAR_DO_OBJETO[id] === 'fora' ? 'no quintal' : 'em casa'
  return `Chegou o projeto azul: ${nome}. Ponha ${onde} no modo Construir.`
}

// ------------------------------------------------------------------ a geladeira

/** Quantos alimentos cabem: 4 no holograma, 12 com aparência. */
export function capacidade(p: ProjetoAzul): number {
  return capacidadeDaGeladeira(p)
}

export function guardados(p: ProjetoAzul): number {
  return guardadosNaGeladeira(p)
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
  return ehAlimento(item) ? guardarAlimentoNaGeladeira(p, inventario, item) : null
}

/**
 * A geladeira completa conserva (a proposta: "guarda 12 e conserva", "mantém fresco"; §6.28, A31):
 * comido direto dela, o alimento vem fresquinho e sacia um quarto a mais. Nada estraga fora dela,
 * e o holograma continua guardando e devolvendo do mesmo jeito.
 */
export const FRESQUINHO = 1.25

export const FALA_DO_FRESQUINHO = 'Fresquinho da geladeira. Matou a fome mais um pouco.'

/** Pode comer fresquinho este alimento: a geladeira tem aparência e ele está guardado nela. */
export function podeComerFresquinho(p: ProjetoAzul, item: string): boolean {
  return Boolean(p.aparencia) && (p.guardado?.[item] ?? 0) > 0 && ehAlimento(item)
}

/** Comer direto da geladeira completa: tira um da geladeira e sacia com o bônus de fresquinho. */
export function comerDaGeladeira(
  p: ProjetoAzul,
  necessidades: Salvamento['necessidades'],
  item: string,
): { projeto: ProjetoAzul; necessidades: Salvamento['necessidades'] } | null {
  const comida = ITENS[item]?.comida
  if (!comida || !podeComerFresquinho(p, item)) return null
  const tem = p.guardado?.[item] ?? 0
  const guardado = { ...(p.guardado ?? {}) }
  if (tem > 1) guardado[item] = tem - 1
  else delete guardado[item]
  const mais = (v = 0) => Math.round(v * FRESQUINHO)
  const limitar = (v: number) => Math.max(0, Math.min(100, v))
  return {
    projeto: { ...p, guardado },
    necessidades: {
      fome: limitar(necessidades.fome + mais(comida.fome)),
      energia: limitar(necessidades.energia + mais(comida.energia)),
      diversao: limitar(necessidades.diversao + mais(comida.diversao)),
    },
  }
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

const NOME_DA_FACE: Readonly<Record<string, string>> = {
  frente: 'a frente',
  'lado-esq': 'os lados',
  'lado-dir': 'os lados',
  topo: 'o topo',
  tela: 'a tela',
}

/** O que o Pinta pinta neste objeto, pelas faces do molde ("A frente, os lados e o topo"). */
export function oQueOPintaPinta(faces: readonly { face: string }[]): string | null {
  const partes = [...new Set(faces.map((f) => NOME_DA_FACE[f.face] ?? f.face))]
  const ultima = partes.at(-1)
  if (!ultima) return null
  const texto = partes.length === 1 ? ultima : `${partes.slice(0, -1).join(', ')} e ${ultima}`
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

/**
 * O recado quando a plataforma não abre a ferramenta no molde (28/10/2026, a página já abre o
 * Pinta e o Molda de verdade): sem acesso à ferramenta, o modelo ainda sem faces para pintar, ou
 * o resto (fora do ar, outra ferramenta aberta).
 */
export function recadoDaFerramentaFechada(ferramenta: 'pinta' | 'molda', motivo: string): string {
  const nome = ferramenta === 'molda' ? 'O Molda' : 'O Pinta'
  if (motivo === 'acesso-necessario') return `${nome} ainda não está liberado para você.`
  if (motivo === 'sem-faces') return 'Este objeto ainda não tem as faces para pintar.'
  return 'O molde não abriu agora. Tente de novo daqui a pouco.'
}

/**
 * A posição da jornada em que o Pinta abre no molde: o posto Construtor(a), como na proposta e no
 * Estúdio livre da plataforma (§6.28, A5). Na Faísca, a aparência vem pronta da galeria.
 */
export const POSICAO_DO_PINTA = POSTOS_DA_JORNADA.indexOf('coder') + 1

export function pintaAberto(jornada: number): boolean {
  return jornada >= POSICAO_DO_PINTA
}

/** A posição da jornada em que o Molda abre no molde (o posto Explorador(a) de Mundos). */
export const POSICAO_DO_MOLDA = POSTOS_DA_JORNADA.indexOf('explorer') + 1

export function moldaAberto(jornada: number): boolean {
  return jornada >= POSICAO_DO_MOLDA
}
