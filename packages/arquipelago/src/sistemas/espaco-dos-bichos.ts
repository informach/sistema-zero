import { CORPO } from './corpo'

/**
 * O espaço dos bichos (31/10/2026, pedido dela: o personagem atravessava o cachorro do quarto).
 * Cada bicho ganha uma cápsula do tamanho do corpo que só segura o CORPO da criança (a câmera
 * passa), e o bicho dá passagem: o do quarto para e vira quando ela chega pela frente, os que
 * seguem mantêm uma folga dela, e um empurrão de meio segundo faz qualquer um dar um passinho para
 * o lado livre (ninguém fica preso numa porta). O passarinho sobe acima da cabeça dela quando ela
 * chega perto. Regras puras; o Rapier e o desenho ficam em `mundo/espaco-dos-bichos.tsx`,
 * `mundo/pet-que-acompanha.tsx` e `mundo/bicho-adotado.tsx`.
 */
export const ESPACO = {
  /** O bicho do quarto para e vira quando ela está mais perto que isto, à frente dele (m). */
  raioDeDesvio: 0.9,
  /** Folga entre a cápsula dela e a do bicho que a segue (m). */
  folga: 0.06,
  /** Até esta distância além do encosto ela conta como encostada (m). */
  encosta: 0.12,
  /** O controle precisa pedir pelo menos isto (0 a 1) para contar como empurrão. */
  pedidoMinimo: 0.3,
  /** O pedido precisa apontar para o bicho com pelo menos este cosseno (uns 50°). */
  contra: Math.cos((50 * Math.PI) / 180),
  /** Empurrando por tanto tempo (s), ele dá o passinho. */
  empurraoPor: 0.5,
  /** O passinho (m) e a pressa dele (m/s). */
  passinho: 0.6,
  velocidadeDoPassinho: 2,
  /** Se ele já está dentro da folga (um teletransporte), sai com esta pressa (m/s). */
  saida: 3,
  /** O passarinho sobe quando ela chega mais perto que isto, e desce quando ela passa daquilo (m). */
  passaroSobeDe: 1.4,
  passaroDesceDe: 2,
  /** O pé do passarinho no alto, acima do pé dela: o topo da cabeça desenhada mais um palmo. */
  passaroAcimaDoPe: CORPO.desenho.cabeca + CORPO.desenho.raioDaCabeca + 0.15,
  /** Quão rápido ele sobe e desce (maior, mais rápido). */
  rapidezDoPassaro: 10,
  /**
   * A cápsula de quem anda no chão tem pelo menos esta altura: mais baixa, o corpo dela subiria
   * nele pelo degrau automático (até uns 0,58; ver `ALTURA_QUE_SEGURA`).
   */
  alturaQueSegura: 0.75,
  /** Só segura e só dá passagem com os dois no mesmo andar (pés a menos disto, m). */
  mesmoAndar: 1.2,
} as const

/** A cápsula do espaço de um bicho: raio e altura do corpo (do pé ao topo), em metros. */
export interface EspacoDoBicho {
  raio: number
  altura: number
}

/**
 * Medidos nos GLBs reais (31/10/2026; `tests/espaco-dos-bichos.test.ts` confere): o raio é o maior
 * entre meia largura e 30% do comprimento (o tronco; focinho e rabo ficam de fora), a altura é a do
 * modelo, com o mínimo de `alturaQueSegura` para quem anda no chão. Os do quarto vão sem escala
 * (`community-kids/public/room3d/items/pet-*.glb`); os do Bosque com `ESCALA_DOS_BICHOS` (1,8).
 */
export const ESPACO_DOS_BICHOS = {
  'pet-cachorro': { raio: 0.33, altura: 0.75 },
  'pet-gato': { raio: 0.31, altura: 0.75 },
  'pet-passaro': { raio: 0.2, altura: 0.51 },
  'cachorro-adulto': { raio: 0.53, altura: 1.28 },
  'cachorro-filhote': { raio: 0.36, altura: 0.86 },
  'gato-adulto': { raio: 0.49, altura: 1.06 },
  'gato-filhote': { raio: 0.32, altura: 0.75 },
  'coelho-adulto': { raio: 0.31, altura: 1.22 },
  'coelho-filhote': { raio: 0.21, altura: 0.89 },
  'porquinho-adulto': { raio: 0.28, altura: 0.75 },
  'porquinho-filhote': { raio: 0.19, altura: 0.75 },
} as const satisfies Record<string, EspacoDoBicho>

export type IdDoEspaco = keyof typeof ESPACO_DOS_BICHOS

/** O espaço de um bicho pelo id; um bichinho novo sem medida usa o do cachorro do quarto. */
export function espacoDoBicho(id: string): EspacoDoBicho {
  return (
    (ESPACO_DOS_BICHOS as Record<string, EspacoDoBicho>)[id] ?? ESPACO_DOS_BICHOS['pet-cachorro']
  )
}

/** A cápsula do Rapier: raio, meia altura do meio reto e o centro acima do pé. */
export function capsulaDoEspaco(e: EspacoDoBicho): { raio: number; meiaAltura: number; y: number } {
  const raio = Math.min(e.raio, e.altura / 2)
  return { raio, meiaAltura: Math.max(0, e.altura / 2 - raio), y: e.altura / 2 }
}

/** O `userData` do corpo de um bicho: o controlador da criança deixa ele segurar o corpo dela. */
export const BICHO_QUE_SEGURA = { bichoQueSegura: true } as const

/**
 * O controlador da criança deixa este corpo segurar o dela? Os bichos só com ela no modo chão
 * (andando, correndo, pulando, nadando: no cipó, na escada, montada ou no barco o bicho não
 * atrapalha); o resto (o chão, as peças, as plataformas e pontes cinemáticas) sempre.
 *
 * ⚠️ Decide só pelo `userData` (lado JS): dentro do filtro da consulta do controlador, qualquer
 * chamada ao Rapier no corpo (`isKinematic()`, `bodyType()`) lança "recursive use of an object" e
 * o Rapier conta o colisor como sólido. Até 31/10/2026 o filtro do personagem chamava
 * `isKinematic()` e por isso todo cinemático já segurava o corpo dela (o "um passa pelo outro"
 * do bicho adotado não valia); `tests/espaco-dos-bichos-fisica.test.ts` prova as duas coisas.
 */
export function corpoQueSegura(userData: unknown, modo: string): boolean {
  const u = userData as { bichoQueSegura?: boolean } | undefined
  return u?.bichoQueSegura !== true || modo === 'chao'
}

/** A distância mínima entre o meio dela e o do bicho que a segue. */
export function distanciaMinima(raioDoBicho: number): number {
  return CORPO.raio + raioDoBicho + ESPACO.folga
}

interface NoChao {
  x: number
  z: number
}
interface ComPe extends NoChao {
  /** A altura do pé (m). */
  pe: number
}

/**
 * O bicho que segue nunca entra na cápsula dela: corta do deslocamento `desloc` (muda no lugar) o
 * que levaria o meio dele para mais perto que `minimo` do meio dela, sem tirar o que vai de lado
 * (ele contorna). Ela chegando perto não o empurra (quem dá passagem é o passinho, depois de meio
 * segundo); só se as cápsulas já se cruzam (ela apareceu em cima dele) ele sai aos poucos
 * (`saida`) até encostar.
 */
export function respeitarFolga(
  bicho: ComPe,
  desloc: NoChao,
  crianca: ComPe,
  minimo: number,
  dt: number,
): void {
  if (Math.abs(bicho.pe - crianca.pe) > ESPACO.mesmoAndar) return
  const nx = bicho.x + desloc.x - crianca.x
  const nz = bicho.z + desloc.z - crianca.z
  const d = Math.hypot(nx, nz)
  if (d >= minimo) return
  const atual = Math.hypot(bicho.x - crianca.x, bicho.z - crianca.z)
  const encosto = minimo - ESPACO.folga
  // Não chega mais perto do que já está (nem passa da folga, vindo de fora).
  let alvo = Math.max(d, Math.min(atual, minimo))
  if (atual < encosto) alvo = Math.max(alvo, Math.min(encosto, atual + ESPACO.saida * dt))
  if (alvo <= d) return
  let ux = nx
  let uz = nz
  let tam = d
  if (tam < 1e-6) {
    ux = bicho.x - crianca.x
    uz = bicho.z - crianca.z
    tam = atual
  }
  if (tam < 1e-6) {
    ux = 1
    uz = 0
    tam = 1
  }
  desloc.x = crianca.x + (ux / tam) * alvo - bicho.x
  desloc.z = crianca.z + (uz / tam) * alvo - bicho.z
}

/**
 * Para onde ela pede para ir no chão (o mesmo do `personagem.tsx`: o eixo do controle girado pela
 * câmera), escrito em `out`. Tamanho até 1.
 */
export function pedidoNoChao(eixoX: number, eixoZ: number, giro: number, out: NoChao): NoChao {
  let ix = eixoX
  let iz = eixoZ
  const tam = Math.hypot(ix, iz)
  if (tam > 1) {
    ix /= tam
    iz /= tam
  }
  out.x = -Math.sin(giro) * iz + Math.cos(giro) * ix
  out.z = -Math.cos(giro) * iz - Math.sin(giro) * ix
  return out
}

/** O corpo dela encosta no bicho e o controle pede para ir contra ele? */
export function empurrando(
  bicho: ComPe,
  raioDoBicho: number,
  crianca: ComPe,
  pedido: NoChao,
): boolean {
  if (Math.abs(bicho.pe - crianca.pe) > ESPACO.mesmoAndar) return false
  const dx = bicho.x - crianca.x
  const dz = bicho.z - crianca.z
  const d = Math.hypot(dx, dz)
  if (d > CORPO.raio + raioDoBicho + ESPACO.encosta || d < 1e-6) return false
  const p = Math.hypot(pedido.x, pedido.z)
  if (p < ESPACO.pedidoMinimo) return false
  return (pedido.x * dx + pedido.z * dz) / (p * d) >= ESPACO.contra
}

/** O empurrão em curso e o passinho que ele dá. */
export interface Empurrao {
  /** Segundos empurrando sem parar. */
  tempo: number
  /** Quanto falta do passinho (m) e para onde. */
  resta: number
  dirX: number
  dirZ: number
}

export function criarEmpurrao(): Empurrao {
  return { tempo: 0, resta: 0, dirX: 0, dirZ: 0 }
}

/**
 * Conta o empurrão. Devolve `true` no passo em que completa `empurraoPor` (hora do passinho) e
 * recomeça a contar: empurrando sem parar, ele dá outro passinho meio segundo depois.
 */
export function passoDoEmpurrao(e: Empurrao, empurrandoAgora: boolean, dt: number): boolean {
  if (!empurrandoAgora) {
    e.tempo = 0
    return false
  }
  e.tempo += dt
  if (e.tempo < ESPACO.empurraoPor) return false
  e.tempo = 0
  return true
}

/**
 * Para que lado dar o passinho: de lado em relação ao empurrão, de preferência o lado em que ele
 * já está (sai da frente dela pelo caminho mais curto), senão o outro, senão para a frente (longe
 * dela). `livre(x, z)` diz se o lugar de chegada está livre (sem ele, todos estão). `null` se
 * nenhum está.
 */
export function ladoDoPassinho(
  bicho: NoChao,
  crianca: NoChao,
  pedido: NoChao,
  livre?: (x: number, z: number) => boolean,
): NoChao | null {
  let fx = pedido.x
  let fz = pedido.z
  let tam = Math.hypot(fx, fz)
  if (tam < 1e-6) {
    fx = bicho.x - crianca.x
    fz = bicho.z - crianca.z
    tam = Math.hypot(fx, fz)
  }
  if (tam < 1e-6) return null
  fx /= tam
  fz /= tam
  // O lado em que ele está em relação à linha do empurrão.
  const lado = (bicho.x - crianca.x) * -fz + (bicho.z - crianca.z) * fx
  const a = { x: -fz, z: fx }
  const b = { x: fz, z: -fx }
  const primeiro = lado >= 0 ? a : b
  const segundo = primeiro === a ? b : a
  for (const c of [primeiro, segundo, { x: fx, z: fz }]) {
    const x = bicho.x + c.x * ESPACO.passinho
    const z = bicho.z + c.z * ESPACO.passinho
    if (!livre || livre(x, z)) return c
  }
  return null
}

export function comecarPassinho(e: Empurrao, dir: NoChao): void {
  e.resta = ESPACO.passinho
  e.dirX = dir.x
  e.dirZ = dir.z
}

/** Soma ao deslocamento `desloc` o pedaço do passinho deste passo (se houver um em curso). */
export function passoDoPassinho(e: Empurrao, dt: number, desloc: NoChao): boolean {
  if (e.resta <= 0) return false
  const anda = Math.min(e.resta, ESPACO.velocidadeDoPassinho * dt)
  e.resta -= anda
  desloc.x += e.dirX * anda
  desloc.z += e.dirZ * anda
  return true
}

/** O passarinho no alto: sobe com ela perto, desce com ela longe (com folga entre os dois). */
export function passaroNoAlto(noAlto: boolean, distancia: number): boolean {
  return noAlto ? distancia < ESPACO.passaroDesceDe : distancia < ESPACO.passaroSobeDe
}

/** A subida do passarinho (m acima do voo de sempre) indo para `alvo`, sem saltos. */
export function subidaDoPassaro(atual: number, alvo: number, dt: number): number {
  return atual + (alvo - atual) * (1 - Math.exp(-ESPACO.rapidezDoPassaro * dt))
}
