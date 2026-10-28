/**
 * O Bosque dos Bichos no referencial do modelo (o mesmo das âncoras do `bosque.glb`: y = 0 no mar,
 * tampo em y = 1, a chegada da ponte em +x). Cipó, escalada e percurso nas copas leem daqui; a
 * ilha passa tudo para o mundo quando fica ativa. Os testes conferem estes números contra o
 * arquivo (`tests/movimento-do-bosque.test.ts`).
 */
import type { BichoDoBosque } from '@sistemazero/arquipelago-contracts'
import type { Ponto } from '../sistemas/cipo'
import type { Tronco } from '../sistemas/escalada'
import type { DequeDoPercurso, PontosDoPercurso } from '../sistemas/percurso'
import { RAIO_DA_ILHA_DO_ANEL } from './medidas'

/** O tampo da ilha (o chão onde se pisa). */
export const TOPO_DO_BOSQUE = 1
/** Clareira livre junto à chegada, longe da casa, deques e árvores. */
export const FOGUEIRA_DO_BOSQUE = { x: 8, y: TOPO_DO_BOSQUE, z: 0 } as const
export const PECAS_SOLTAS_DO_BOSQUE = [
  { tipo: 'pedra', x: 9, y: 1, z: 2.6 },
  { tipo: 'pedra', x: 7.5, y: 1, z: 1.5 },
  { tipo: 'cogumelo', x: 10, y: 1, z: 1.5 },
  { tipo: 'cogumelo', x: 9, y: 1, z: -1 },
] as const
export const GALHO_SECO_DO_BOSQUE = { x: 10.2, y: 1, z: -0.7 } as const

/** Os três cipós do galho por cima do lago (nós `cipo-1`…`cipo-3`, pivô no galho). */
export const CIPOS_DO_BOSQUE = ['cipo-1', 'cipo-2', 'cipo-3'] as const

/** O raio de cada deque do percurso, na ordem (T1 a T4 do `bosque.py`). */
export const RAIOS_DOS_DEQUES = [2.9, 2.0, 2.1, 2.0] as const

/**
 * O tronco de escalar: a árvore do galho dos cipós (T6 do `bosque.py`). Lá de cima, pular para
 * longe do tronco cai no `cipo-1`. Medido nos colisores `col-cil-tronco` dela, com o raio da casca
 * desenhada (o colisor tem 85% dela). Ainda não há nó no GLB: quando o Blender ganhar o nó
 * `escalada-cil-tronco-dos-cipos` (README de `arte/ilhas`), estes números saem de lá.
 */
export const TRONCO_DOS_CIPOS: Tronco = {
  base: { x: 8.6, y: TOPO_DO_BOSQUE, z: 5.21 },
  topo: { x: 8.84, y: 6.5, z: 5.07 },
  raioBase: 0.86,
  raioTopo: 0.5,
}

/** A placa de largada, ao lado do pé da escada (na trilha, sem tapar o primeiro degrau). */
export const PLACA_DA_LARGADA = { x: 0.6, z: 1.3 } as const

/**
 * Os cinco vagalumes do percurso, na altura em que flutuam:
 * 1. no meio da escada (pega subindo);
 * 2. no meio da ponte comprida, alto (pega pulando);
 * 3. no deque da T3, do outro lado do tronco (pega dando a volta);
 * 4. no meio da última ponte;
 * 5. no meio do escorregador.
 */
export const VAGALUMES_DAS_COPAS: readonly Ponto[] = [
  { x: 1.33, y: 4.0, z: -3.89 },
  { x: -7.89, y: 7.3, z: -2.35 },
  { x: -10.04, y: 6.8, z: 2.03 },
  { x: -6.27, y: 6.3, z: 4.14 },
  { x: 0.36, y: 3.8, z: 8.92 },
]

/**
 * Onde cada bicho se esconde, no chão (`giro`: para onde ele olha, `(sin g, cos g)`). Medidos
 * contra os colisores do `bosque.glb` (bicho e criança cabem, `tests/movimento-do-bosque.test.ts`):
 * - cachorro: atrás da moita da beira norte (`col-cil-moita-6`), de frente para ela, rabo para fora;
 * - gato: entre os cogumelos e as pedras do lago (`col-cil-cogumelo-8`, `col-cil-pedra-lago-5`),
 *   só as orelhas aparecem (embaixo do deque da casa na árvore a câmera não enxerga a criança);
 * - coelho: na boca da toca do oeste (`col-cil-toca-1`), meio para dentro dela;
 * - porquinho: atrás da cabana, entre a parede e a moita (`col-cabana-1`, `col-cil-moita-4`).
 * O `bosque.glb` tem as âncoras `esconderijo-1`…`esconderijo-4` (`ESCONDERIJOS` em
 * `sistemas/esconde.ts`) com estas mesmas medidas (`arte/ilhas/bosque.py`): o jogo lê a posição e o
 * giro de lá, e estes números ficam como reserva (o teste confere que os dois batem).
 */
export const ESCONDERIJOS_NO_MODELO: Readonly<
  Record<BichoDoBosque, { x: number; z: number; giro: number }>
> = {
  cachorro: { x: -6.2, z: 10.2, giro: -2.21 },
  gato: { x: 1.2, z: 5.4, giro: -2.65 },
  coelho: { x: -8.0, z: -7.4, giro: 0 },
  porquinho: { x: 7.3, z: -8.9, giro: 1.34 },
}

/**
 * Os lugares dos bichos achados dentro do cercadinho (âncora `cercado`), na ordem em que foram
 * achados: na palha, longe da casinha, do cocho, do feno e da cerca.
 */
export const LUGARES_NO_CERCADO: readonly { x: number; z: number }[] = [
  { x: 2.3, z: -9.9 },
  { x: 3.4, z: -9.9 },
  { x: 2.5, z: -9.15 },
  { x: 3.4, z: -9.2 },
]

/** Da placa até onde a corrida começa (no caminho da escada). */
export const LARGADA_ANTES_DA_PLACA = 0.9

/** Quanto para dentro da borda do deque o corpo volta depois de uma queda. */
export const VOLTA_PARA_DENTRO_DO_DEQUE = 0.7

/** As âncoras que o percurso usa (posição no modelo). */
export interface AncorasDoPercurso {
  escada: Ponto
  'copas-1': Ponto
  'copas-2': Ponto
  'copas-3': Ponto
  'copas-4': Ponto
  'escorregador-fim': Ponto
}

export const NOMES_DAS_ANCORAS_DO_PERCURSO = [
  'escada',
  'copas-1',
  'copas-2',
  'copas-3',
  'copas-4',
  'escorregador-fim',
] as const

/**
 * O percurso no referencial do modelo. A volta de cada deque fica na borda de dentro, do lado por
 * onde o caminho segue (a ponte seguinte; no último, o escorregador), olhando para lá.
 */
export function percursoNoModelo(a: AncorasDoPercurso): PontosDoPercurso {
  const centros = [a['copas-1'], a['copas-2'], a['copas-3'], a['copas-4']]
  const fim = a['escorregador-fim']
  const deques: DequeDoPercurso[] = centros.map((c, i) => {
    const raio = RAIOS_DOS_DEQUES[i] ?? 2
    const seguinte = centros[i + 1] ?? fim
    const dx = seguinte.x - c.x
    const dz = seguinte.z - c.z
    const d = Math.hypot(dx, dz) || 1
    const r = raio - VOLTA_PARA_DENTRO_DO_DEQUE
    return {
      x: c.x,
      y: c.y,
      z: c.z,
      raio,
      volta: { x: c.x + (dx / d) * r, y: c.y, z: c.z + (dz / d) * r },
      rumoDaVolta: Math.atan2(dx, dz),
    }
  })
  const ex = a.escada.x - PLACA_DA_LARGADA.x
  const ez = a.escada.z - PLACA_DA_LARGADA.z
  const de = Math.hypot(ex, ez) || 1
  return {
    largada: {
      x: PLACA_DA_LARGADA.x + (ex / de) * LARGADA_ANTES_DA_PLACA,
      y: TOPO_DO_BOSQUE,
      z: PLACA_DA_LARGADA.z + (ez / de) * LARGADA_ANTES_DA_PLACA,
    },
    rumoDaLargada: Math.atan2(ex, ez),
    deques,
    chegada: { x: fim.x, y: fim.y, z: fim.z },
    vagalumes: VAGALUMES_DAS_COPAS.map((v) => ({ ...v })),
    centro: { x: 0, y: TOPO_DO_BOSQUE, z: 0 },
    raioDaIlha: RAIO_DA_ILHA_DO_ANEL,
  }
}

/** Uma posição do modelo levada para o mundo (a ilha está no centro dela, girada por `giro`). */
export function paraOMundo(p: Ponto, centro: Ponto, giro: number, saida: Ponto): Ponto {
  const c = Math.cos(giro)
  const s = Math.sin(giro)
  const x = p.x
  const z = p.z
  saida.x = centro.x + x * c + z * s
  saida.y = centro.y + p.y
  saida.z = centro.z - x * s + z * c
  return saida
}

/**
 * Para onde um nó do modelo olha (o rumo `(sin r, cos r)` da frente +Z dele no chão), lido do
 * quatérnio. O `rotation.y` do three não serve: um giro de mais de 90° em Y vira `x = z = π` com
 * outro `y` (o glTF guarda quatérnio, e o three decompõe em XYZ).
 */
export function rumoDoNo(q: { x: number; y: number; z: number; w: number }): number {
  return Math.atan2(2 * (q.x * q.z + q.w * q.y), 1 - 2 * (q.x * q.x + q.y * q.y))
}

/** Um rumo (`(sin r, cos r)`) do modelo levado para o mundo. */
export function rumoNoMundo(rumo: number, giro: number): number {
  return rumo + giro
}

/** O percurso inteiro levado para o mundo (uma vez, quando a ilha fica ativa). */
export function percursoNoMundo(
  p: PontosDoPercurso,
  centro: Ponto,
  giro: number,
): PontosDoPercurso {
  const levar = (q: Ponto) => paraOMundo(q, centro, giro, { x: 0, y: 0, z: 0 })
  return {
    largada: levar(p.largada),
    rumoDaLargada: rumoNoMundo(p.rumoDaLargada, giro),
    deques: p.deques.map((d) => ({
      ...levar(d),
      raio: d.raio,
      volta: levar(d.volta),
      rumoDaVolta: rumoNoMundo(d.rumoDaVolta, giro),
    })),
    chegada: levar(p.chegada),
    vagalumes: p.vagalumes.map(levar),
    centro: levar(p.centro),
    raioDaIlha: p.raioDaIlha,
  }
}

/** O tronco de escalar levado para o mundo. */
export function troncoNoMundo(t: Tronco, centro: Ponto, giro: number): Tronco {
  return {
    base: paraOMundo(t.base, centro, giro, { x: 0, y: 0, z: 0 }),
    topo: paraOMundo(t.topo, centro, giro, { x: 0, y: 0, z: 0 }),
    raioBase: t.raioBase,
    raioTopo: t.raioTopo,
  }
}

/** A elipse de uma água rasa (agora em `sistemas/agua.ts`, junto das regras do nado). */
export { dentroDaAgua } from '../sistemas/agua'
