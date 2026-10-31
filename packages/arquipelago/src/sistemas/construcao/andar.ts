import {
  type AndarDeCima,
  AndarDeCimaSchema,
  MOVEIS_NA_CASA_MAXIMO,
  type Obra,
} from '@sistemazero/arquipelago-contracts'
import { type Planta, planta } from './comodos'
import {
  type Aresta,
  arestaDaChave,
  arestasDaAbertura,
  chaveDaAresta,
  chavesDosTrechos,
  ladosDaAresta,
} from './grade'
import { type Celula, chaveDaCelula, type Lote, noFixo, OBRA_VAZIA } from './lote'
import { celulasDoMovel, moveisDaObra, movelNoLugar } from './moveis'
import {
  type CaixaDaObra,
  type Corte,
  colisoresDaObra,
  type FolhaDaPorta,
  giroDaParede,
  type PecaDoKit,
  pecasDaObra,
} from './pecas'
import { celulasDoObjeto } from './projeto-azul'
import { telhadosDaObra } from './telhado'

/**
 * O andar de cima da casa (E04, a proposta: "Pico: segundo andar"; arte `casa-andar.glb` e
 * `casa-paredes-andar.glb`, contrato no README de `arte/casa`). Guardado no documento à parte do
 * serviço (`obra-estendida`, campo `andar`), porque o salvamento está cheio.
 *
 * - A escada interna (1 × 4) fica num cômodo do térreo, fora do quarto e de móveis e objetos; o
 *   pé dela tem uma célula de dentro de casa na frente, e lá em cima ela chega a uma célula de piso.
 * - O piso de cima cobre todas as células de dentro de casa do térreo, menos o vão da escada. Sem
 *   escada, não há andar de cima.
 * - Lá em cima se põem paredes, portas, janelas e pisos com as ferramentas de sempre, numa obra
 *   do mesmo formato (`obraDeCima`), no lote de cima (`loteDeCima`). As paredes de cima ficam na
 *   beira de uma célula de piso, e todo cômodo de cima fica em cima do piso.
 * - Onde o piso termina sem parede, o guarda-corpo segura.
 * - A porta de cima tem piso dos dois lados (entre cômodos, ou de um cômodo para o piso aberto),
 *   nunca para o ar. Como no térreo, a família vem do lado da parede (`ladoDaParede`): entre
 *   cômodos, a porta lisa do andar (folha `porta-interna`); do cômodo para o piso aberto, a de
 *   lambri do andar (`parede-porta-lambri-andar`, folha `porta`, B7c), com o lambri no piso aberto.
 */
export const POSICAO_DO_ANDAR = 5
/** A altura do piso de cima, a partir do piso de baixo (o topo das peças do andar). */
export const ALTURA_DO_ANDAR = 4.1
/** Quantas células a escada ocupa, do pé ao alto. */
export const COMPRIMENTO_DA_ESCADA = 4

export function podeTerAndar(jornada: number): boolean {
  return jornada >= POSICAO_DO_ANDAR
}

export const ANDAR_VAZIO: AndarDeCima = { escada: null, paredes: [], aberturas: [], pisos: [] }

export type Escada = NonNullable<AndarDeCima['escada']>

export type RecusaDoAndar =
  | 'fora-de-casa'
  | 'no-quarto'
  | 'com-coisa'
  | 'parede-no-meio'
  | 'sem-entrada'
  | 'sem-saida'
  | 'sem-escada'
  | 'ja-tem-escada'
  | 'fora-do-piso'
  | 'comodo-no-ar'
  | 'porta-de-fora'
  | 'na-escada'
  | 'escada-com-obra'
  | 'quebra-o-andar'
  | 'movel-fora'
  | 'limite'

export const FALA_DO_ANDAR: Readonly<Record<RecusaDoAndar, string>> = {
  'fora-de-casa': 'A escada fica dentro de casa, num cômodo.',
  'no-quarto': 'O quarto fica como está. Ponha a escada em outro cômodo.',
  'com-coisa': 'Tem um móvel ou um objeto no caminho da escada.',
  'parede-no-meio': 'Tem uma parede no meio da escada.',
  'sem-entrada': 'Na frente do pé da escada precisa ter chão de dentro de casa para subir.',
  'sem-saida': 'Lá em cima a escada precisa chegar num pedaço de piso.',
  'sem-escada': 'Primeiro ponha a escada, com a ferramenta Escada.',
  'ja-tem-escada': 'A casa já tem uma escada. Apague a de agora para pôr em outro lugar.',
  'fora-do-piso': 'Lá em cima a parede vai na beira do piso.',
  'comodo-no-ar': 'Esse cômodo de cima ficaria fora do piso.',
  'porta-de-fora': 'Lá em cima a porta dá para um cômodo ou para o piso, nunca para o ar.',
  'na-escada': 'Aqui é o vão da escada.',
  'escada-com-obra': 'Tire antes as paredes de cima. Depois a escada sai.',
  'quebra-o-andar': 'Essa mudança deixaria o andar de cima sem chão.',
  'movel-fora': 'Lá em cima o móvel fica dentro de um cômodo, longe do vão e da chegada da escada.',
  limite: 'O andar de cima já está cheio.',
}

type Resultado = { ok: true; andar: AndarDeCima } | { ok: false; motivo: RecusaDoAndar }

/** Para onde a escada sobe (no giro 0, para -z; cada giro é um quarto de volta, como o kit). */
export function rumoDaEscada(giro: number): { dx: number; dz: number } {
  const g = (giro * Math.PI) / 2
  // A rotação do three em volta do y leva (0, -1) a (-sen, -cos).
  // O `+ 0` tira o -0 do arredondamento.
  return { dx: Math.round(-Math.sin(g)) + 0, dz: Math.round(-Math.cos(g)) + 0 }
}

/** A célula `i` passos acima do pé (0 é o pé; -1 é a da frente do pé; 4 é a de chegada). */
function passo(e: Escada, i: number): Celula {
  const { dx, dz } = rumoDaEscada(e.giro)
  return { x: e.x + dx * i, z: e.z + dz * i }
}

export function celulasDaEscada(e: Escada): Celula[] {
  return Array.from({ length: COMPRIMENTO_DA_ESCADA }, (_, i) => passo(e, i))
}

export const celulaDeEntrada = (e: Escada): Celula => passo(e, -1)
export const celulaDeChegada = (e: Escada): Celula => passo(e, COMPRIMENTO_DA_ESCADA)

/** A aresta entre duas células vizinhas. */
function arestaEntre(a: Celula, b: Celula): Aresta {
  if (a.x !== b.x) return { eixo: 'z', x: Math.max(a.x, b.x), z: a.z }
  return { eixo: 'x', x: a.x, z: Math.max(a.z, b.z) }
}

/**
 * A peça da escada no referencial da grade: a origem no meio do pé, na linha da grade (o kit sobe
 * para -z no giro 0), e o giro em radianos.
 */
export function lugarDaEscada(e: Escada): { x: number; z: number; giro: number } {
  const { dx, dz } = rumoDaEscada(e.giro)
  return { x: e.x + 0.5 - dx * 0.5, z: e.z + 0.5 - dz * 0.5, giro: (e.giro * Math.PI) / 2 }
}

/** As arestas do lado comprido +x local do vão (à direita de quem sobe), do pé ao alto. */
function ladoDireitoDoVao(e: Escada): Aresta[] {
  const { dx, dz } = rumoDaEscada(e.giro)
  // À direita de quem olha para (dx, dz): (-dz, dx).
  return celulasDaEscada(e).map((c) => arestaEntre(c, { x: c.x - dz, z: c.z + dx }))
}

/** As outras arestas da beira do vão (o lado esquerdo e o pé), onde o guarda-corpo do kit fica. */
function beiraDoVao(e: Escada): Aresta[] {
  const { dx, dz } = rumoDaEscada(e.giro)
  const esquerda = celulasDaEscada(e).map((c) => arestaEntre(c, { x: c.x + dz, z: c.z - dx }))
  return [...esquerda, arestaEntre(passo(e, 0), passo(e, -1))]
}

/** As células onde algo do térreo está de pé no chão (móveis e objetos). */
function celulasComCoisa(obra: Obra): Set<string> {
  const s = new Set<string>()
  for (const o of obra.objetos) for (const c of celulasDoObjeto(o)) s.add(chaveDaCelula(c))
  for (const m of moveisDaObra(obra)) for (const c of celulasDoMovel(m)) s.add(chaveDaCelula(c))
  return s
}

/** A escada cabe nesta obra do térreo? `null` se sim. */
export function escadaNoTerreo(
  e: Escada,
  obra: Obra,
  lote: Lote,
  p: Planta = planta(obra, lote),
): RecusaDoAndar | null {
  const celulas = celulasDaEscada(e)
  const coisa = celulasComCoisa(obra)
  for (const c of celulas) {
    if (!p.dentro.has(chaveDaCelula(c))) return 'fora-de-casa'
    if (noFixo(lote, c)) return 'no-quarto'
    if (coisa.has(chaveDaCelula(c))) return 'com-coisa'
  }
  for (let i = 0; i < COMPRIMENTO_DA_ESCADA - 1; i++)
    if (p.paredes.has(chaveDaAresta(arestaEntre(passo(e, i), passo(e, i + 1)))))
      return 'parede-no-meio'
  const entrada = celulaDeEntrada(e)
  if (
    !p.dentro.has(chaveDaCelula(entrada)) ||
    coisa.has(chaveDaCelula(entrada)) ||
    p.paredes.has(chaveDaAresta(arestaEntre(entrada, passo(e, 0))))
  )
    return 'sem-entrada'
  if (!p.dentro.has(chaveDaCelula(celulaDeChegada(e)))) return 'sem-saida'
  return null
}

/** O piso de cima: as células de dentro de casa do térreo, menos o vão. Vazio sem escada. */
export function pisoDeCima(andar: AndarDeCima | null, p: Planta): Set<string> {
  const piso = new Set<string>()
  if (!andar?.escada) return piso
  for (const k of p.dentro) piso.add(k)
  for (const c of celulasDaEscada(andar.escada)) piso.delete(chaveDaCelula(c))
  return piso
}

/** O lote de cima: a mesma área, sem nada ocupado, sem quarto, sem paredes travadas, sem varanda. */
export function loteDeCima(lote: Lote): Lote {
  return {
    id: lote.id,
    area: lote.area,
    ocupadas: [],
    fixo: null,
    paredesTravadas: [],
    paredesDoMeuQuarto: null,
    obraInicial: OBRA_VAZIA,
    limites: {
      ...lote.limites,
      trechosDeParede: 120,
      aberturas: 30,
      pisos: 20,
      arestasDeCerca: 0,
      trechosDeCerca: 0,
      caminhos: 0,
      canteiros: 0,
      // Os móveis vão só nos cômodos de cima (o `porMovel` já pede cômodo).
      moveis: MOVEIS_NA_CASA_MAXIMO,
    },
  }
}

/** O andar de cima como uma obra (para as ferramentas de sempre). */
export function obraDeCima(andar: AndarDeCima | null): Obra {
  return {
    ...OBRA_VAZIA,
    paredes: andar?.paredes ?? [],
    aberturas: andar?.aberturas ?? [],
    pisos: andar?.pisos ?? [],
    moveis: andar?.moveis ?? [],
    objetos: andar?.objetos ?? [],
  }
}

/** A obra de cima de volta ao andar (a escada fica a mesma). */
export function andarDaObra(obra: Obra, escada: Escada | null): AndarDeCima {
  return {
    escada,
    paredes: obra.paredes,
    aberturas: obra.aberturas,
    pisos: obra.pisos,
    // Sem móvel nem objeto, o campo não vai (o andar fica igual aos gravados antes).
    ...(obra.moveis.length > 0 ? { moveis: obra.moveis } : {}),
    ...(obra.objetos.length > 0 ? { objetos: obra.objetos } : {}),
  }
}

export function plantaDeCima(andar: AndarDeCima | null, lote: Lote): Planta {
  return planta(obraDeCima(andar), loteDeCima(lote))
}

/** O andar vale com esta obra do térreo? `null` se sim (sem escada, vale vazio). */
export function conferirAndar(
  andar: AndarDeCima | null,
  obra: Obra,
  lote: Lote,
): RecusaDoAndar | null {
  if (!andar) return null
  if (!andar.escada)
    return andar.paredes.length > 0 || andar.aberturas.length > 0 ? 'sem-escada' : null
  const p = planta(obra, lote)
  const noTerreo = escadaNoTerreo(andar.escada, obra, lote, p)
  if (noTerreo)
    return noTerreo === 'sem-saida' || noTerreo === 'fora-de-casa' ? 'quebra-o-andar' : noTerreo
  const piso = pisoDeCima(andar, p)
  const vao = new Set(celulasDaEscada(andar.escada).map(chaveDaCelula))
  for (const k of chavesDosTrechos(andar.paredes)) {
    const [a, b] = ladosDaAresta(arestaDaChave(k)).map(chaveDaCelula)
    if (!piso.has(a as string) && !piso.has(b as string)) return 'fora-do-piso'
  }
  const pc = plantaDeCima(andar, lote)
  for (const k of pc.dentro) if (!piso.has(k)) return vao.has(k) ? 'na-escada' : 'comodo-no-ar'
  // As paredes na beira do vão: só do lado direito, inteiro (o vão na parede, sem o guarda-corpo).
  const paredes = pc.paredes
  if (beiraDoVao(andar.escada).some((a) => paredes.has(chaveDaAresta(a)))) return 'na-escada'
  const direita = ladoDireitoDoVao(andar.escada).map((a) => paredes.has(chaveDaAresta(a)))
  if (direita.some(Boolean) && !direita.every(Boolean)) return 'na-escada'
  if (
    paredes.has(chaveDaAresta(arestaEntre(passo(andar.escada, 3), celulaDeChegada(andar.escada))))
  )
    return 'sem-saida'
  for (const ab of andar.aberturas) {
    if (ab.tipo !== 'porta') continue
    for (const a of arestasDaAbertura(ab)) {
      const [m, n] = ladosDaAresta(a).map(chaveDaCelula)
      if (!piso.has(m as string) || !piso.has(n as string)) return 'porta-de-fora'
    }
  }
  // Os móveis de cima: num cômodo de cima, fora do vão e da célula onde a escada chega.
  const deCima = obraDeCima(andar)
  const chegada = chaveDaCelula(celulaDeChegada(andar.escada))
  for (const m of moveisDaObra(deCima)) {
    if (!movelNoLugar(m, deCima, pc)) return 'movel-fora'
    for (const c of celulasDoMovel(m)) {
      const k = chaveDaCelula(c)
      if (vao.has(k) || k === chegada) return 'movel-fora'
    }
  }
  // Os objetos com função de cima (lacunas, 01/11/2026): num cômodo de cima, fora do vão e da
  // chegada da escada, como os móveis.
  for (const o of deCima.objetos) {
    for (const c of celulasDoObjeto(o)) {
      const k = chaveDaCelula(c)
      if (!pc.comodoDe.has(k) || vao.has(k) || k === chegada) return 'movel-fora'
    }
  }
  if (!AndarDeCimaSchema.safeParse(andar).success) return 'limite'
  return null
}

/** Pôr a escada (a primeira, com o andar vazio), com o pé em `pe` e o giro escolhido. */
export function porEscada(
  andar: AndarDeCima | null,
  obra: Obra,
  lote: Lote,
  pe: Celula,
  giro: number,
): Resultado {
  if (andar?.escada) return { ok: false, motivo: 'ja-tem-escada' }
  const escada: Escada = { x: pe.x, z: pe.z, giro: ((giro % 4) + 4) % 4 }
  const recusa = escadaNoTerreo(escada, obra, lote)
  if (recusa) return { ok: false, motivo: recusa }
  return { ok: true, andar: { ...(andar ?? ANDAR_VAZIO), escada } }
}

/** A célula é do vão da escada? */
export function naEscada(andar: AndarDeCima | null, c: Celula): boolean {
  return !!andar?.escada && celulasDaEscada(andar.escada).some((x) => x.x === c.x && x.z === c.z)
}

/** Tirar a escada (só com o andar sem paredes, portas e janelas: o andar inteiro sai). */
export function tirarEscada(andar: AndarDeCima | null): Resultado {
  if (!andar?.escada) return { ok: false, motivo: 'sem-escada' }
  if (andar.paredes.length > 0 || andar.aberturas.length > 0 || (andar.moveis?.length ?? 0) > 0)
    return { ok: false, motivo: 'escada-com-obra' }
  return { ok: true, andar: ANDAR_VAZIO }
}

// ------------------------------------------------------------------ desenho

function peca(
  no: string,
  arquivo: PecaDoKit['arquivo'],
  x: number,
  z: number,
  giro: number,
  y?: number,
): PecaDoKit {
  return {
    chave: `${no}@${x},${y ?? 0},${z},${giro.toFixed(3)}`,
    arquivo,
    no,
    x,
    z,
    giro,
    ...(y === undefined ? {} : { y }),
  }
}

/** Os pisos de cima (o tipo do cômodo de cima, ou a tábua no piso aberto) e o vão da escada. */
export function pisosDoAndar(andar: AndarDeCima, p: Planta, pc: Planta): PecaDoKit[] {
  const pecas: PecaDoKit[] = []
  for (const k of pisoDeCima(andar, p)) {
    const [x, z] = k.split(',').map(Number) as [number, number]
    const i = pc.comodoDe.get(k)
    const tipo = i === undefined ? 'tabua' : (pc.comodos[i]?.piso ?? 'tabua')
    pecas.push(peca(`piso-andar-${tipo}`, 'andar', x + 0.5, z + 0.5, 0))
  }
  if (andar.escada) {
    const l = lugarDaEscada(andar.escada)
    pecas.push(peca('escada-interna', 'andar', l.x, l.z, l.giro))
    pecas.push(
      peca(
        vaoNaParede(andar, pc) ? 'piso-andar-vao-parede' : 'piso-andar-vao',
        'andar',
        l.x,
        l.z,
        l.giro,
      ),
    )
  }
  return pecas.sort((a, b) => a.chave.localeCompare(b.chave))
}

/** O vão encosta numa parede de cima (o lado direito inteiro)? */
export function vaoNaParede(andar: AndarDeCima, pc: Planta): boolean {
  return (
    !!andar.escada && ladoDireitoDoVao(andar.escada).every((a) => pc.paredes.has(chaveDaAresta(a)))
  )
}

/**
 * Os guarda-corpos: em toda beira do piso de cima sem parede (menos a do vão, que tem o dela). O
 * +Y local do kit (o -z no giro 0) é o lado do piso, como o lado de dentro da parede.
 */
export function guardaCorpos(andar: AndarDeCima, p: Planta, pc: Planta): PecaDoKit[] {
  if (!andar.escada) return []
  const piso = pisoDeCima(andar, p)
  const vao = new Set(celulasDaEscada(andar.escada).map(chaveDaCelula))
  const pecas: PecaDoKit[] = []
  const vistas = new Set<string>()
  for (const k of piso) {
    const [x, z] = k.split(',').map(Number) as [number, number]
    for (const a of [
      { eixo: 'x' as const, x, z },
      { eixo: 'x' as const, x, z: z + 1 },
      { eixo: 'z' as const, x, z },
      { eixo: 'z' as const, x: x + 1, z },
    ]) {
      const ka = chaveDaAresta(a)
      if (vistas.has(ka) || pc.paredes.has(ka)) continue
      vistas.add(ka)
      const [menos, mais] = ladosDaAresta(a).map(chaveDaCelula) as [string, string]
      const noMenos = piso.has(menos)
      const noMais = piso.has(mais)
      if (noMenos === noMais || vao.has(menos) || vao.has(mais)) continue
      const giro = giroDaParede(a.eixo, { familia: 'lisa', dentro: noMenos ? -1 : 1 })
      const meio = a.eixo === 'x' ? { x: a.x + 0.5, z: a.z } : { x: a.x, z: a.z + 0.5 }
      pecas.push(peca('guarda-corpo-andar', 'andar', meio.x, meio.z, giro))
    }
  }
  return pecas.sort((a, b) => a.chave.localeCompare(b.chave))
}

/** As peças de parede e de quina do térreo viram as de cima (`-andar`; a janela baixa não há). */
export function noDoAndar(no: string): string {
  // O kit não tem a janela cortada do andar: no corte, a parede baixa lisa do mesmo lado.
  const baixa = /^parede-janela-[a-z]+-(lambri|lisa)-baixa$/.exec(no)
  if (baixa) return `parede-${baixa[1]}-baixa-andar`
  return `${no}-andar`
}

/** As caixas do piso de cima (de 4,00 a 4,10), uma por fileira de células em x. */
export function caixasDoPiso(andar: AndarDeCima, p: Planta): CaixaDaObra[] {
  const piso = pisoDeCima(andar, p)
  const linhas = new Map<number, number[]>()
  for (const k of piso) {
    const [x, z] = k.split(',').map(Number) as [number, number]
    const l = linhas.get(z) ?? []
    l.push(x)
    linhas.set(z, l)
  }
  const caixas: CaixaDaObra[] = []
  for (const [z, xs] of linhas) {
    xs.sort((a, b) => a - b)
    let ini = xs[0] as number
    let fim = ini
    const fechar = () => {
      const n = fim - ini + 1
      caixas.push({
        nome: `col-andar-piso-${ini},${z}`,
        posicao: [ini + n / 2, ALTURA_DO_ANDAR - 0.05, z + 0.5],
        meio: [n / 2, 0.05, 0.5],
      })
    }
    for (const x of xs.slice(1)) {
      if (x === fim + 1) fim = x
      else {
        fechar()
        ini = x
        fim = x
      }
    }
    fechar()
  }
  return caixas.sort((a, b) => a.nome.localeCompare(b.nome))
}

/** As caixas dos guarda-corpos (1,0 de altura em cima do piso, de 0,02 a 0,10 da linha). */
export function caixasDosGuardaCorpos(guardas: readonly PecaDoKit[]): CaixaDaObra[] {
  return guardas.map((g) => {
    // O lado do piso, no giro da peça: o +Y local do kit é o -z do jogo no giro 0.
    const px = -Math.sin(g.giro) * 0.06
    const pz = -Math.cos(g.giro) * 0.06
    const emX = Math.abs(Math.sin(g.giro)) < 0.5
    return {
      nome: `col-andar-guarda-${g.x},${g.z}`,
      posicao: [g.x + px, ALTURA_DO_ANDAR + 0.5, g.z + pz],
      meio: emX ? [0.5, 0.5, 0.04] : [0.04, 0.5, 0.5],
    }
  })
}

/**
 * O que do andar se desenha: inteiro (lá em cima, de fora de casa ou na camada de cima do Construir)
 * ou só a escada, que fica de pé no térreo (com a criança dentro de casa embaixo e no Construir do
 * térreo, onde a ferramenta Escada a põe; sem ela, a escada ficava invisível e se subia no ar).
 */
export function pecasVisiveisDoAndar(d: PecasDoAndar, inteiro: boolean): PecaDoKit[] {
  return inteiro ? d.pecas : d.pecas.filter((x) => x.no === 'escada-interna')
}

/**
 * A caixa simples de uma peça do andar enquanto o kit do andar não chega (a reserva da obra): o piso
 * de cima como uma laje fina na altura dele, e as paredes e quinas de cima em cima dele (as `-baixa`
 * com 1,0). A escada, o vão e o guarda-corpo esperam o arquivo. Antes, a reserva tratava tudo como
 * parede de baixo: cada piso de cima virava uma caixa de 4 m no térreo, e a casa aparecia como um
 * bloco cinza (31/10/2026, B7c). `y` é o meio da caixa, a partir do piso de baixo.
 */
export function caixaDeAntesDoAndar(
  peca: Pick<PecaDoKit, 'arquivo' | 'no'>,
): { largura: number; altura: number; fundo: number; y: number } | null {
  if (peca.arquivo === 'andar') {
    if (!/^piso-andar-(tabua|ladrilho|azulejo)$/.test(peca.no)) return null
    return { largura: 1, altura: 0.1, fundo: 1, y: ALTURA_DO_ANDAR - 0.05 }
  }
  if (peca.arquivo !== 'paredes-andar') return null
  const altura = peca.no.endsWith('-baixa-andar') ? 1 : 4
  const y = ALTURA_DO_ANDAR + altura / 2
  if (peca.no.startsWith('quina')) return { largura: 0.36, altura, fundo: 0.36, y }
  const largura =
    peca.no.includes('porta') || peca.no.includes('grande') ? 3 : peca.no.includes('arco') ? 2 : 1
  return { largura, altura, fundo: 0.2, y }
}

export interface PecasDoAndar {
  /** Paredes, quinas, pisos, a escada com o vão e os guarda-corpos. */
  pecas: PecaDoKit[]
  folhas: FolhaDaPorta[]
  telhados: PecaDoKit[]
  colisores: CaixaDaObra[]
}

/**
 * Tudo o que desenha o andar de cima (no referencial da grade, y 0 no piso de baixo: as peças do
 * andar já vêm na altura) e a colisão dele, menos a da escada e a do vão (do arquivo).
 */
export function pecasDoAndar(
  andar: AndarDeCima,
  p: Planta,
  pc: Planta,
  cortada: Corte,
): PecasDoAndar {
  const obra = obraDeCima(andar)
  const kit = pecasDaObra(obra, pc, cortada)
  const doAndar = (x: PecaDoKit): PecaDoKit => {
    const no = noDoAndar(x.no)
    return { ...x, no, arquivo: 'paredes-andar', chave: `${no}@${x.chave.split('@')[1]}` }
  }
  const guardas = guardaCorpos(andar, p, pc)
  const telhados = telhadosDaObra(pc).map((t) => ({
    ...t,
    y: t.y + ALTURA_DO_ANDAR,
    chave: `andar:${t.chave}`,
  }))
  const colisores = [
    ...colisoresDaObra(obra, pc, cortada).map((c) => ({
      ...c,
      // O prefixo fica (a parede cortada continua deixando a câmera passar).
      nome: c.nome.replace(/^(col-obra-(?:cortada-)?)/, '$1andar-'),
      posicao: [
        c.posicao[0],
        c.posicao[1] + ALTURA_DO_ANDAR,
        c.posicao[2],
      ] as CaixaDaObra['posicao'],
    })),
    ...caixasDoPiso(andar, p),
    ...caixasDosGuardaCorpos(guardas),
  ]
  return {
    pecas: [
      ...kit.paredes.map(doAndar),
      ...kit.quinas.map(doAndar),
      ...pisosDoAndar(andar, p, pc),
      ...guardas,
    ],
    folhas: kit.folhas.map((f) => ({ ...f, y: ALTURA_DO_ANDAR, chave: `andar:${f.chave}` })),
    telhados,
    colisores,
  }
}
