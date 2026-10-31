/**
 * Os borrões do Cinza e os Lumis da Vila Doce (fase2-06). À noite os borrões de névoa saem pela
 * ilha; sem a lanterna acesa eles fogem de quem chega perto, e com ela acesa a luz prende um: ele
 * chacoalha, se desfaz em faíscas e vira um Lumi colorido da família da ilha (na Vila, o Quindim,
 * comum, e o Brigadeiro, raro). Tensão boa, sem dano: nada se perde por não pegar.
 *
 * Regras puras, sem three nem React. O que muda o salvamento é só `prenderBorrao` (os Lumis presos,
 * `salvamento.lumis`) e `receberLanterna` (o item na mochila). Quais borrões já foram presos nesta
 * noite não vai para o salvamento: fica no aparelho, por perfil (`lerPresos`, `gravarPresos`), para
 * recarregar a página na mesma noite não trazer de volta os já presos.
 */
import type { IlhaId, LumiId, Salvamento } from '@sistemazero/arquipelago-contracts'
import { adicionar, type Inventario, quantidade } from './itens'
import { ESPECIES_DE_LUMI } from './lumis'

export const ID_DA_LANTERNA = 'lanterna'

/** A família de Lumis de cada ilha que já tem borrões (a comum e a rara). */
export const FAMILIA_DA_VILA = { comum: 'quindim', raro: 'brigadeiro' } as const satisfies Record<
  'comum' | 'raro',
  LumiId
>

/**
 * As ilhas que têm uma família de Lumis (a praia é a sua ilha) e como o texto diz de onde ela é.
 * A proposta: "cada ilha tem a sua família de Lumis" e os borrões saem à noite em todas.
 */
export type IlhaDosLumis = Exclude<IlhaId, 'farol'>
export const FAMILIAS_DOS_LUMIS: Readonly<
  Record<IlhaDosLumis, { comum: LumiId; raro: LumiId; de: string }>
> = {
  'sua-ilha': { comum: 'estrelinha', raro: 'buzio', de: 'da praia' },
  bosque: { comum: 'pitanga', raro: 'ipe', de: 'do Bosque' },
  'vila-doce': { ...FAMILIA_DA_VILA, de: 'da Vila Doce' },
  recife: { comum: 'bolha', raro: 'perola', de: 'do Recife' },
  pico: { comum: 'gelinho', raro: 'cristal', de: 'do Pico' },
  'vale-dos-dinos': { comum: 'ovinho', raro: 'brotinho', de: 'do Vale' },
  nuvens: { comum: 'algodao', raro: 'pluma', de: 'das Nuvens' },
}

/** As espécies de nome feminino levam "uma" e "a rara" nas falas. */
const FEMININOS: ReadonlySet<LumiId> = new Set([
  'pitanga',
  'ipe',
  'bolha',
  'perola',
  'pluma',
  'estrelinha',
])

/** Quantos borrões saem em cada noite em cada ilha. */
export const BORROES_POR_NOITE = 2
/** Um borrão em cada `RARO_A_CADA` vira o Lumi raro (o primeiro Lumi de todos é sempre o comum). */
export const RARO_A_CADA = 5
/** As âncoras `lumi-1` a `lumi-4` do `vila-doce.glb`: os borrões saem perto delas. */
export const ANCORAS_DOS_LUMIS = 4

/** Andando sem a lanterna acesa, o borrão foge quando ela chega a esta distância (m). */
export const FOGE_A = 3
/** Ele foge até ficar a esta distância dela, sem passar de `SOLTO_ATE` do lugar dele. */
export const FOGE_ATE = 4.5
export const SOLTO_ATE = 3
/** Com a lanterna acesa, dá para prender a esta distância (m). */
export const PRENDE_A = 2.2

/** Quanto dura cada parte da captura (s): preso na luz e depois virando faíscas (o clipe `virar`). */
export const PRESO_POR = 1.2
export const VIRANDO_POR = 1.5

export interface BorraoDaNoite {
  /** Único na noite (o dia do jogo e a ordem). */
  id: string
  /** Perto de qual âncora `lumi-N` ele sai (0 a 3). */
  ancora: number
  /** O Lumi que ele vira se for preso. */
  lumi: LumiId
}

/** Um número de 0 a 1 que só depende do texto (o mesmo em qualquer aparelho). */
function sorteio(texto: string): number {
  let h = 2166136261
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) / 4294967296
}

/**
 * Os borrões de uma noite (pelo dia do jogo): em âncoras diferentes, cada um com o Lumi que vira.
 * `lumis` são os já presos: enquanto nenhum Lumi foi preso, todos viram o comum.
 */
export function borroesDaNoite(
  dia: number,
  lumis: Salvamento['lumis'],
  ilha: IlhaDosLumis = 'vila-doce',
): BorraoDaNoite[] {
  const familia = FAMILIAS_DOS_LUMIS[ilha]
  // A Vila guarda os ids de antes (sem a ilha), para os presos de uma noite continuarem presos.
  const prefixo = ilha === 'vila-doce' ? '' : `${ilha}:`
  const primeiraAncora = Math.floor(sorteio(`${prefixo}ancora:${dia}`) * ANCORAS_DOS_LUMIS)
  // Enquanto nenhum Lumi da família foi preso, todos viram o comum.
  const nenhumAinda = !lumis[familia.comum] && !lumis[familia.raro]
  return Array.from({ length: BORROES_POR_NOITE }, (_, i) => {
    const id = `${prefixo}${dia}:${i}`
    const raro = !nenhumAinda && sorteio(`raro:${id}`) < 1 / RARO_A_CADA
    return {
      id,
      ancora: (primeiraAncora + i * 2) % ANCORAS_DOS_LUMIS,
      lumi: raro ? familia.raro : familia.comum,
    }
  })
}

export function falaDoLumiNovo(lumi: LumiId, quantos: number): string {
  const nome = ESPECIES_DE_LUMI[lumi].nome
  const ilha = ESPECIES_DE_LUMI[lumi].ilha
  if (ilha !== 'vila-doce' && ilha !== 'farol') {
    const { de } = FAMILIAS_DOS_LUMIS[ilha]
    const a = FEMININOS.has(lumi)
    if (ESPECIES_DE_LUMI[lumi].raro)
      return quantos === 1
        ? `${a ? 'Uma' : 'Um'} ${nome}. É ${a ? 'a rara' : 'o raro'} ${de}, e brilha diferente quando comemora.`
        : `Mais ${a ? 'uma' : 'um'} ${nome}, ${a ? 'a rara' : 'o raro'} ${de}.`
    return quantos === 1
      ? `${a ? 'Uma' : 'Um'} ${nome}. O borrão virou um Lumi ${de}, e já quer ajudar.`
      : `Mais ${a ? 'uma' : 'um'} ${nome} para a turma ${de}.`
  }
  if (ESPECIES_DE_LUMI[lumi].raro)
    return quantos === 1
      ? `Um ${nome}. É o raro da Vila: quando ele comemora, o granulado acende.`
      : `Mais um ${nome}. O granulado dele já está aceso.`
  return quantos === 1
    ? `Um ${nome}. O borrão virou um Lumi da Vila Doce, e ele já quer ajudar na cozinha.`
    : `Mais um ${nome} para a turma da Vila.`
}

/** Prender um borrão: mais um Lumi daquela espécie no salvamento, e a fala do Zappy. */
export function prenderBorrao(
  s: Salvamento,
  lumi: LumiId,
): { salvamento: Salvamento; quantos: number; fala: string } {
  const quantos = Math.min(999, (s.lumis[lumi] ?? 0) + 1)
  return {
    salvamento: { ...s, lumis: { ...s.lumis, [lumi]: quantos } },
    quantos,
    fala: falaDoLumiNovo(lumi, quantos),
  }
}

/**
 * Os Lumis que moram na Vila (um em cada âncora `lumi-N`, na ordem): o primeiro Quindim, o
 * primeiro Brigadeiro e depois mais Quindins, até as quatro âncoras.
 */
export function lumisNaVila(lumis: Salvamento['lumis']): { ancora: number; lumi: LumiId }[] {
  return lumisNaIlha(lumis, 'vila-doce')
}

/** Os Lumis presos que moram numa ilha, do mesmo jeito que os da Vila. */
export function lumisNaIlha(
  lumis: Salvamento['lumis'],
  ilha: IlhaDosLumis,
): { ancora: number; lumi: LumiId }[] {
  const familia = FAMILIAS_DOS_LUMIS[ilha]
  const comuns = lumis[familia.comum] ?? 0
  const raros = lumis[familia.raro] ?? 0
  const fila: LumiId[] = []
  if (comuns > 0) fila.push(familia.comum)
  if (raros > 0) fila.push(familia.raro)
  for (let i = 1; i < comuns && fila.length < ANCORAS_DOS_LUMIS; i++) fila.push(familia.comum)
  for (let i = 1; i < raros && fila.length < ANCORAS_DOS_LUMIS; i++) fila.push(familia.raro)
  return fila.slice(0, ANCORAS_DOS_LUMIS).map((lumi, ancora) => ({ ancora, lumi }))
}

export const FALA_DA_LANTERNA =
  'Leve esta lanterna. À noite os borrões do Cinza saem pela vila, e a luz dela prende um. Acenda na mochila.'
export const FALA_DE_ACENDER = 'Lanterna acesa. Chegue perto de um borrão e use a luz para prender.'
export const FALA_DE_APAGAR = 'Lanterna apagada e guardada.'
export const FALA_DO_BORRAO_FUGINDO =
  'O borrão fugiu da escuridão. Com a lanterna acesa ele não foge.'

export function temLanterna(inv: Inventario): boolean {
  return quantidade(inv, ID_DA_LANTERNA) > 0
}

/** A lanterna vale só acesa e na mochila. */
export function comLanterna(acesa: boolean, inv: Inventario): boolean {
  return acesa && temLanterna(inv)
}

/** A fala do Zappy quando ele entrega a lanterna na primeira noite (a da HUD da proposta). */
export const FALA_DA_LANTERNA_DO_ZAPPY =
  'Chegou a noite. Os borrões do Cinza saem pelas ilhas, e a luz desta lanterna prende um. Acenda na mochila.'

/** O Zappy dá a lanterna na primeira noite a quem ainda não tem. */
export function lanternaDoZappy(s: Salvamento): { salvamento: Salvamento; fala: string } | null {
  if (temLanterna(s.inventario)) return null
  return {
    salvamento: { ...s, inventario: adicionar(s.inventario, ID_DA_LANTERNA) },
    fala: FALA_DA_LANTERNA_DO_ZAPPY,
  }
}

/** O Bento dá a lanterna a quem ainda não tem (de novo, se ela sumir da mochila). */
export function receberLanterna(s: Salvamento): { salvamento: Salvamento; fala: string } | null {
  if (temLanterna(s.inventario)) return null
  return {
    salvamento: { ...s, inventario: adicionar(s.inventario, ID_DA_LANTERNA) },
    fala: FALA_DA_LANTERNA,
  }
}

// ── O borrão no mundo (o passo de cada quadro, sem alocar) ─────────────────────────────────────

/** Fugindo, quantos metros por segundo ele anda; voltando para o lugar dele, bem mais devagar. */
export const RAPIDEZ_DA_FUGA = 3.2
export const RAPIDEZ_DA_VOLTA = 0.8

/** `solto` flutua (e foge); `preso` chacoalha na luz; `virando` se desfaz; `pronto` já virou Lumi. */
export type FaseDoBorrao = 'solto' | 'preso' | 'virando' | 'pronto'

export interface EstadoDoBorrao {
  x: number
  z: number
  /** O lugar dele (perto da âncora `lumi-N`), de onde ele não se afasta mais que `SOLTO_ATE`. */
  casaX: number
  casaZ: number
  fase: FaseDoBorrao
  /** Segundos na fase de agora. */
  tempo: number
  fugindo: boolean
}

export function criarBorrao(casa: { x: number; z: number }): EstadoDoBorrao {
  return {
    x: casa.x,
    z: casa.z,
    casaX: casa.x,
    casaZ: casa.z,
    fase: 'solto',
    tempo: 0,
    fugindo: false,
  }
}

/**
 * O borrão desbota o chão em volta dele (a proposta: "borrões de névoa saem para desbotar o que
 * está do lado de fora", §6.28 A38): uma mancha cinza que cresce enquanto ele fica solto e some
 * quando ele é preso e vira Lumi. Nada fica desbotado: a mancha não é guardada.
 */
export const MANCHA_DO_BORRAO = { raio: 2.4, opacidade: 0.42, cresceEm: 4 } as const

/** A opacidade da mancha agora (0 a `MANCHA_DO_BORRAO.opacidade`). */
export function opacidadeDaMancha(b: Pick<EstadoDoBorrao, 'fase' | 'tempo'>): number {
  const { opacidade, cresceEm } = MANCHA_DO_BORRAO
  if (b.fase === 'solto') return opacidade * Math.min(1, b.tempo / cresceEm)
  if (b.fase === 'preso') return opacidade * (1 - 0.5 * Math.min(1, b.tempo / PRESO_POR))
  if (b.fase === 'virando') return opacidade * 0.5 * (1 - Math.min(1, b.tempo / VIRANDO_POR))
  return 0
}

/** Dá para prender agora: solto, com a lanterna acesa e perto. */
export function podePrender(b: EstadoDoBorrao, px: number, pz: number, lanterna: boolean): boolean {
  return b.fase === 'solto' && lanterna && (b.x - px) ** 2 + (b.z - pz) ** 2 <= PRENDE_A ** 2
}

export function prender(b: EstadoDoBorrao): void {
  b.fase = 'preso'
  b.tempo = 0
  b.fugindo = false
}

/**
 * Um quadro do borrão. Solto e sem a lanterna acesa por perto, foge de quem chega a `FOGE_A` até
 * ficar a `FOGE_ATE`, sem sair de `SOLTO_ATE` do lugar dele (encurralado, desliza pela borda); com
 * a lanterna ele não foge. Sem a lanterna e com a pessoa ainda a menos de `FOGE_ATE`, espera
 * parado; depois volta devagar para o lugar dele. Preso, conta o tempo da captura. Devolve `fugiu` no quadro em que
 * começa a fugir e `virou` no quadro em que termina de virar Lumi.
 */
export function passoDoBorrao(
  b: EstadoDoBorrao,
  dt: number,
  px: number,
  pz: number,
  lanterna: boolean,
): 'fugiu' | 'virou' | null {
  if (b.fase === 'pronto') return null
  b.tempo += dt
  if (b.fase === 'preso') {
    if (b.tempo >= PRESO_POR) {
      b.fase = 'virando'
      b.tempo = 0
    }
    return null
  }
  if (b.fase === 'virando') {
    if (b.tempo < VIRANDO_POR) return null
    b.fase = 'pronto'
    b.tempo = 0
    return 'virou'
  }
  const dx = b.x - px
  const dz = b.z - pz
  const d = Math.hypot(dx, dz)
  const foge = !lanterna && (d < FOGE_A || (b.fugindo && d < FOGE_ATE))
  let evento: 'fugiu' | null = null
  if (foge) {
    if (!b.fugindo) evento = 'fugiu'
    b.fugindo = true
    // Em cima da pessoa (d = 0), foge para longe do lugar dela mesmo assim: para fora da casa.
    const ux = d > 1e-6 ? dx / d : 1
    const uz = d > 1e-6 ? dz / d : 0
    b.x += ux * RAPIDEZ_DA_FUGA * dt
    b.z += uz * RAPIDEZ_DA_FUGA * dt
    const cx = b.x - b.casaX
    const cz = b.z - b.casaZ
    const c = Math.hypot(cx, cz)
    if (c > SOLTO_ATE) {
      b.x = b.casaX + (cx / c) * SOLTO_ATE
      b.z = b.casaZ + (cz / c) * SOLTO_ATE
    }
  } else if (!lanterna && d < FOGE_ATE) {
    // Longe o bastante, mas ela ainda está por perto: espera parado, de olho.
    b.fugindo = false
  } else {
    b.fugindo = false
    const cx = b.casaX - b.x
    const cz = b.casaZ - b.z
    const c = Math.hypot(cx, cz)
    const passo = Math.min(c, RAPIDEZ_DA_VOLTA * dt)
    if (c > 1e-6) {
      b.x += (cx / c) * passo
      b.z += (cz / c) * passo
    }
  }
  return evento
}

// ── Os borrões já presos nesta noite (neste aparelho, por perfil) ───────────────────────────────

/** Os ids presos numa noite: recarregar a página na mesma noite não traz de volta os já presos. */
export interface PresosDaNoite {
  dia: number
  ids: string[]
}

export function lerPresos(texto: string | null, dia: number): string[] {
  if (!texto) return []
  try {
    const p = JSON.parse(texto) as Partial<PresosDaNoite>
    return p.dia === dia && Array.isArray(p.ids) ? p.ids.filter((i) => typeof i === 'string') : []
  } catch {
    return []
  }
}

export function gravarPresos(dia: number, ids: readonly string[]): string {
  return JSON.stringify({ dia, ids: [...ids] } satisfies PresosDaNoite)
}
