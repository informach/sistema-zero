import type {
  Canteiro,
  Movel,
  ObjetoDaCasa,
  Obra,
  PisoDaCasa,
  PisoDoQuintal,
  Salvamento,
  TipoDeAbertura,
} from '@sistemazero/arquipelago-contracts'
import { celulasDaEscada, escadaNoTerreo } from './andar'
import { planta } from './comodos'
import { celulasDoRetangulo, entradaDaObra, ladoDeFora, retanguloDaVaranda } from './entrada'
import {
  type Aresta,
  aberturaNaAresta,
  arestaMaisPerto,
  arestasDaAbertura,
  arestasDoArrasto,
  celulaEm,
  chaveDaAresta,
  chavesDosTrechos,
  pontoMaisPerto,
} from './grade'
import { type Celula, chaveDaCelula, type Lote } from './lote'
import {
  arestaAtras,
  cantoDoMovelNoToque,
  celulasDoMovel,
  ehDeParede,
  giroDaParedeNoToque,
  lerMovel,
  movelNoToque,
  porMovel,
  tirarMovel,
} from './moveis'
import {
  aberturaEm,
  apagarParede,
  esticarParede,
  moverEntrada,
  porAbertura,
  type Resultado,
  tirarAbertura,
  trocarPiso,
} from './obra'
import { cantoNoToque, celulasDoObjeto, objetoEm, porObjeto, tirarObjeto } from './projeto-azul'
import {
  apagarCerca,
  apagarNaCelula,
  celulasDoArrasto,
  esticarCerca,
  pintarCaminho,
  porCanteiro,
} from './quintal'
import { celulasPlanas, podeMoldar } from './terreno'

/**
 * O que cada ferramenta do Construir faz com o dedo (ou o mouse): arrastar (parede, cerca,
 * caminho, apagar) ou tocar (porta, janela, piso, canteiro, e o toque do apagar). Regra pura: a
 * cena só lê onde o dedo cai no chão e chama aqui.
 */
export type Ferramenta =
  | 'olhar'
  | 'parede'
  | 'porta'
  | 'janela'
  | 'piso'
  | 'cerca'
  | 'caminho'
  | 'canteiro'
  | 'objeto'
  | 'movel'
  | 'apagar'
  /** Moldar o chão do lote da casa (Nuvens em diante): não mexe na obra, e sim no terreno. */
  | 'terreno'
  /** A escada do andar de cima (Pico em diante): um toque põe o pé dela; o Girar escolhe o rumo. */
  | 'escada'

export type TipoDeJanela = Exclude<TipoDeAbertura, 'porta'>

export interface Escolhas {
  janela: TipoDeJanela
  piso: PisoDaCasa
  caminho: PisoDoQuintal
  /** O objeto escolhido na ferramenta Objeto (um dos ganhos) e o giro dele. */
  objeto: ObjetoDaCasa | null
  /** O móvel escolhido na ferramenta Móveis (o giro é o mesmo; a peça de parede acha a parede). */
  movel: Movel | null
  giro: number
  /**
   * A porta de entrada está escolhida (ferramenta Porta): o próximo toque numa parede de fora leva
   * a entrada e a varanda para lá.
   */
  entradaSelecionada?: boolean
  /** O Terreno sobe (`1`) ou desce (`-1`) o chão. */
  moldar?: 1 | -1
}

export interface NoChao {
  x: number
  z: number
}

/** A ferramenta trabalha arrastando (as outras, com um toque). */
export function arrasta(f: Ferramenta): boolean {
  return f === 'parede' || f === 'cerca' || f === 'caminho' || f === 'apagar' || f === 'terreno'
}

/** As células que o Terreno molda num arrasto (ou num toque) e a prévia delas. */
export function celulasDoTerreno(
  obra: Obra,
  lote: Lote,
  a: NoChao,
  b: NoChao,
): { celulas: Celula[]; previa: Previa } {
  const celulas = celulasDoArrasto(celulaEm(a.x, a.z), celulaEm(b.x, b.z))
  const planas = celulasPlanas(obra, lote)
  const ok = celulas.some((c) => podeMoldar(c, lote, planas))
  return { celulas, previa: { tipo: 'celulas', celulas, ok } }
}

/** Até onde do meio de uma aresta um toque do apagar ainda é nela (senão é na célula). */
export const PERTO_DA_ARESTA = 0.3

export type Previa =
  | {
      tipo: 'arestas'
      arestas: Aresta[]
      ok: boolean
      /** As células da varanda que vai junto com a porta de entrada (ferramenta Porta). */
      varanda?: Celula[]
      /** É a porta de entrada de agora, destacada (tocar nela escolhe ou solta). */
      entrada?: true
    }
  | { tipo: 'celulas'; celulas: Celula[]; ok: boolean }
  | { tipo: 'ponto'; ponto: { x: number; z: number } }

/** O arrasto de `a` até `b` (posições no chão): o que muda e a prévia. */
export function arrasto(
  f: Ferramenta,
  obra: Obra,
  lote: Lote,
  a: NoChao,
  b: NoChao,
  escolhas: Escolhas,
): { resultado: Resultado | null; previa: Previa } {
  // O terreno não é obra: a cena manda as células para a loja do Construir (`moldarTerreno`).
  if (f === 'terreno') return { resultado: null, previa: celulasDoTerreno(obra, lote, a, b).previa }
  if (f === 'caminho') {
    const celulas = celulasDoArrasto(celulaEm(a.x, a.z), celulaEm(b.x, b.z))
    const r = pintarCaminho(obra, lote, celulas, escolhas.caminho)
    return { resultado: r, previa: { tipo: 'celulas', celulas, ok: r.ok } }
  }
  const pa = pontoMaisPerto(a.x, a.z)
  const pb = pontoMaisPerto(b.x, b.z)
  const arestas = arestasDoArrasto(pa, pb)
  if (arestas.length === 0) return { resultado: null, previa: { tipo: 'ponto', ponto: pa } }
  let r: Resultado | null = null
  if (f === 'parede') r = esticarParede(obra, lote, pa, pb)
  else if (f === 'cerca') r = esticarCerca(obra, lote, pa, pb)
  else if (f === 'apagar') r = apagarNaLinha(obra, lote, arestas)
  return { resultado: r, previa: { tipo: 'arestas', arestas, ok: f === 'apagar' || !!r?.ok } }
}

/** Apagar arrastando: as paredes (menos as do quarto) e as cercas do caminho. */
export function apagarNaLinha(obra: Obra, lote: Lote, arestas: readonly Aresta[]): Resultado {
  const r1 = apagarParede(obra, lote, arestas)
  const r2 = apagarCerca(r1.ok ? r1.obra : obra, arestas)
  if (r2.ok) return r2
  return r1
}

/**
 * O que o toque faz com a escolha da porta de entrada (ferramenta Porta): `selecionar` (tocou na
 * entrada), `soltar` (tocou nela de novo, ou a entrada mudou de lugar).
 */
export type MudancaNaEntrada = 'selecionar' | 'soltar'

/** Um toque em `onde` (posição no chão): o que muda e a prévia. */
export function toque(
  f: Ferramenta,
  obra: Obra,
  lote: Lote,
  onde: NoChao,
  escolhas: Escolhas,
  horta: readonly Canteiro[],
  projetos: Salvamento['projetos'] = {},
): { resultado: Resultado | null; previa: Previa; entrada?: MudancaNaEntrada } {
  const celula = celulaEm(onde.x, onde.z)
  // A escada não é obra do térreo: a cena manda o pé para a loja do Construir (`porAEscada`).
  if (f === 'escada') {
    const escada = { x: celula.x, z: celula.z, giro: escolhas.giro }
    return {
      resultado: null,
      previa: {
        tipo: 'celulas',
        celulas: celulasDaEscada(escada),
        ok: escadaNoTerreo(escada, obra, lote) === null,
      },
    }
  }
  if (f === 'piso') {
    const p = planta(obra, lote)
    const i = p.comodoDe.get(chaveDaCelula(celula))
    const comodo = i === undefined ? undefined : p.comodos[i]
    const r = trocarPiso(obra, lote, celula, escolhas.piso)
    return {
      resultado: r,
      previa: {
        tipo: 'celulas',
        celulas: comodo ? comodo.celulas : [celula],
        ok: !!comodo && !comodo.quarto,
      },
    }
  }
  if (f === 'canteiro') {
    const r = porCanteiro(obra, lote, celula)
    return { resultado: r, previa: { tipo: 'celulas', celulas: [celula], ok: r.ok } }
  }
  if (f === 'objeto') {
    if (!escolhas.objeto)
      return { resultado: null, previa: { tipo: 'celulas', celulas: [celula], ok: false } }
    const canto = cantoNoToque(escolhas.objeto, escolhas.giro, celula)
    const r = porObjeto(obra, lote, projetos, escolhas.objeto, canto, escolhas.giro)
    const celulas = celulasDoObjeto({ id: escolhas.objeto, ...canto, giro: escolhas.giro })
    return { resultado: r, previa: { tipo: 'celulas', celulas, ok: r.ok } }
  }
  if (f === 'movel') {
    if (!escolhas.movel)
      return { resultado: null, previa: { tipo: 'celulas', celulas: [celula], ok: false } }
    if (ehDeParede(escolhas.movel)) {
      // A peça de parede vai na parede mais perto do dedo, sem a criança precisar girar.
      const giro = giroDaParedeNoToque(obra, lote, onde) ?? escolhas.giro
      const r = porMovel(obra, lote, escolhas.movel, celula, giro)
      return {
        resultado: r,
        previa: { tipo: 'arestas', arestas: [arestaAtras(celula, giro)], ok: r.ok },
      }
    }
    const canto = cantoDoMovelNoToque(escolhas.movel, escolhas.giro, celula)
    const r = porMovel(obra, lote, escolhas.movel, canto, escolhas.giro)
    const celulas = celulasDoMovel({ id: escolhas.movel, ...canto, giro: escolhas.giro })
    return { resultado: r, previa: { tipo: 'celulas', celulas, ok: r.ok } }
  }
  const aresta = arestaMaisPerto(onde.x, onde.z)
  if (f === 'porta' && lote.varanda) {
    const naEntrada = toqueNaEntrada(obra, lote, aresta, escolhas)
    if (naEntrada) return naEntrada
  }
  if (f === 'porta' || f === 'janela') {
    const tipo = f === 'porta' ? 'porta' : escolhas.janela
    const r = porAbertura(obra, lote, tipo, aresta)
    return {
      resultado: r,
      previa: {
        tipo: 'arestas',
        arestas: arestasDaAbertura(aberturaNaAresta(tipo, aresta)),
        ok: r.ok,
      },
    }
  }
  if (f === 'apagar') {
    // Um objeto na célula sai primeiro (volta a ficar guardado).
    const io = objetoEm(obra, celula)
    const obj = obra.objetos[io]
    if (obj)
      return {
        resultado: tirarObjeto(obra, celula),
        previa: { tipo: 'celulas', celulas: celulasDoObjeto(obj), ok: true },
      }
    // Depois o móvel: o de chão, a peça de parede do lado mais perto, o tapete por último.
    const tupla = obra.moveis[movelNoToque(obra, onde)]
    const movel = tupla ? lerMovel(tupla) : null
    if (movel)
      return {
        resultado: tirarMovel(obra, onde),
        previa: ehDeParede(movel.id)
          ? { tipo: 'arestas', arestas: [arestaAtras(movel, movel.giro)], ok: true }
          : { tipo: 'celulas', celulas: celulasDoMovel(movel), ok: true },
      }
    // Perto de uma aresta com algo (porta, janela, parede, cerca): tira isso. Senão, a célula.
    const i = aberturaEm(obra, aresta)
    const ab = obra.aberturas[i]
    if (ab)
      return {
        // A porta de entrada não sai (o Zappy diz como mudar de lugar).
        resultado: tirarAbertura(obra, aresta, lote),
        previa: { tipo: 'arestas', arestas: arestasDaAbertura(ab), ok: true },
      }
    const k = chaveDaAresta(aresta)
    const perto = distanciaAteAAresta(onde, aresta) <= PERTO_DA_ARESTA
    // As paredes do quarto contam (o apagar recusa e o Zappy diz por quê).
    const temAlgo =
      chavesDosTrechos(obra.paredes).has(k) ||
      chavesDosTrechos(lote.paredesTravadas).has(k) ||
      chavesDosTrechos(obra.cercas).has(k)
    if (perto && temAlgo)
      return {
        resultado: apagarNaLinha(obra, lote, [aresta]),
        previa: { tipo: 'arestas', arestas: [aresta], ok: true },
      }
    return {
      resultado: apagarNaCelula(obra, celula, horta),
      previa: { tipo: 'celulas', celulas: [celula], ok: true },
    }
  }
  return { resultado: null, previa: { tipo: 'ponto', ponto: pontoMaisPerto(onde.x, onde.z) } }
}

/**
 * A ferramenta Porta e a porta de entrada (31/10/2026, pedido dela: a entrada muda de lugar e a
 * varanda vai junto). Tocar na entrada escolhe (ou solta) e a prévia mostra a porta e a varanda
 * destacadas; com ela escolhida, o toque numa parede leva a entrada para lá (`moverEntrada`), e a
 * prévia mostra onde a porta e a varanda ficariam. Fora disso, `null` (a Porta de sempre).
 */
function toqueNaEntrada(
  obra: Obra,
  lote: Lote,
  aresta: Aresta,
  escolhas: Escolhas,
): { resultado: Resultado | null; previa: Previa; entrada?: MudancaNaEntrada } | null {
  const p = planta(obra, lote)
  const e = entradaDaObra(obra, lote, p)
  if (!e) return null
  const k = chaveDaAresta(aresta)
  if (arestasDaAbertura(e.abertura).some((x) => chaveDaAresta(x) === k))
    return {
      resultado: null,
      previa: {
        tipo: 'arestas',
        arestas: arestasDaAbertura(e.abertura),
        ok: true,
        varanda: celulasDoRetangulo(retanguloDaVaranda(e)),
        entrada: true,
      },
      entrada: escolhas.entradaSelecionada ? 'soltar' : 'selecionar',
    }
  if (!escolhas.entradaSelecionada) return null
  const r = moverEntrada(obra, lote, aresta)
  const nova = aberturaNaAresta('porta', aresta)
  const fora = ladoDeFora(nova, p)
  return {
    resultado: r,
    previa: {
      tipo: 'arestas',
      arestas: arestasDaAbertura(nova),
      ok: r.ok,
      ...(fora === null
        ? {}
        : { varanda: celulasDoRetangulo(retanguloDaVaranda({ abertura: nova, fora })) }),
    },
    ...(r.ok ? { entrada: 'soltar' as const } : {}),
  }
}

function distanciaAteAAresta(p: NoChao, a: Aresta): number {
  return a.eixo === 'x' ? Math.abs(p.z - a.z) : Math.abs(p.x - a.x)
}
