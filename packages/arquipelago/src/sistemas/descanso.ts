import type { LugarDeDescanso } from '../estado/contexto'
import { CORPO } from './corpo'
import type { Necessidades } from './necessidades'

/**
 * O descanso (fase2-13, combinado com a dona em 29/10/2026): sentar num banco ou deitar na cama
 * devolve a energia aos poucos, mais rápido na cama que no banco, e dá para levantar a qualquer
 * hora sem perder o que já voltou. Regras puras, sem three nem React; o modo do corpo fica em
 * `modos/descanso.ts` e o mundo diz onde ficam os bancos e a cama.
 *
 * O cochilo automático continua em `estado/relogios.tsx`, com as regras abaixo: a energia no zero
 * espera a ação em andamento acabar, cochila ali mesmo uns segundos e acorda em casa com 60.
 */

/** Quanto de energia volta por segundo descansando (de 0 a 100). */
export const ENERGIA_POR_SEGUNDO = {
  /** No banco: de vazia a cheia em uns 3 minutos. */
  sentar: 0.55,
  /** Na cama: de vazia a cheia em 1 minuto (`100 / 1,7` ≈ 59 s). */
  deitar: 1.7,
} as const satisfies Record<LugarDeDescanso['jeito'], number>

/** A energia que volta em `segundos` descansando, até 100. Fome e diversão não mudam. */
export function descansar(
  n: Necessidades,
  jeito: LugarDeDescanso['jeito'],
  segundos: number,
): Necessidades {
  return { ...n, energia: Math.min(100, n.energia + ENERGIA_POR_SEGUNDO[jeito] * segundos) }
}

/** Na cama, com a energia cheia, a soneca acaba e ela levanta sozinha. */
export function sonecaAcabou(n: Necessidades, jeito: LugarDeDescanso['jeito']): boolean {
  return jeito === 'deitar' && n.energia >= 100
}

export const FALA_DE_SENTAR = 'Que bom sentar um pouco. A energia volta devagar.'
export const FALA_DE_DEITAR = 'Hora de uma soneca. A energia vai voltando.'
export const FALA_DA_SONECA_CHEIA = 'Que soneca boa. A energia voltou toda.'

/**
 * O cochilo da energia no zero (proposta: "o avatar cochila onde está e acorda em casa, sem perder
 * nada"; lacunas de 01/11/2026). Ele espera o fim do que está em andamento: corrida, barco, balão,
 * mergulho, montaria, trenó e escorregador, cipó, planador, escalada, borda, escada e equilíbrio.
 */
const MODOS_SEM_COCHILO = new Set([
  'balao',
  'montar',
  'mergulho',
  'barco',
  'cipo',
  'escorregar',
  'planar',
  'escalada',
  'borda',
  'escada',
  'equilibrio',
])

/** Dá para cochilar agora? (energia no zero, sem painel aberto e sem nada em andamento) */
export function podeCochilar(s: {
  energia: number
  corrida: unknown
  modo: string
  painelAberto: string | null
}): boolean {
  return (
    s.energia <= 0 &&
    s.corrida === null &&
    s.painelAberto === null &&
    !MODOS_SEM_COCHILO.has(s.modo)
  )
}

/** Quantos segundos ela fica cochilando no lugar antes de acordar em casa. */
export const SEGUNDOS_DE_COCHILO = 4
/** A energia com que acorda. */
export const ENERGIA_AO_ACORDAR = 60
export const FALA_DO_COCHILO = 'Você cansou e cochilou aqui mesmo.'
export const FALA_DE_ACORDAR_EM_CASA = 'Você acordou em casa, descansada. Nada se perdeu.'

// ── Os bancos ──────────────────────────────────────────────────────────────────────────────────

/**
 * O banco do `lib_ilhas.py` (`banco`): assento a 0,53 do chão, 0,5 de fundo, encosto atrás. A
 * frente é o −Z do colisor `col-banco-N` (girado com ele). Os números do desenho sentado são os do
 * `arte/avatar/mixamo.py` (`ASSENTO` e `BACIA_ATRAS`: a bacia 18 cm atrás da origem do desenho).
 */
export const BANCO = {
  /** O assento fica um pouco à frente do meio do colisor (o encosto ocupa o fundo). */
  assentoAFrente: 0.05,
  /** O clipe "Sentar" põe a bacia este tanto atrás dos pés (`BACIA_ATRAS` do script). */
  baciaAtras: 0.18,
  /** Meia profundidade do colisor do banco. */
  meioFundo: 0.275,
  /** Folga entre o corpo de pé e o banco. */
  folga: 0.12,
} as const

/** A cama do quarto (`room3d/items/cama.glb`): colchão a 0,72, travesseiro no −Z (rot 0). */
export const CAMA = {
  colchao: 0.72,
  /** Metade da grossura do corpo deitado (as costas ficam abaixo da linha dos pés). */
  costas: 0.1,
  /** A origem do desenho (os pés) fica a isto do meio da cama, para o lado dos pés. */
  pesAFrente: 0.68,
  /** Meia largura da cama (o corpo fica de pé ao lado dela). */
  meiaLargura: 0.97,
  folga: 0.12,
} as const

/**
 * O lugar de sentar num banco: o meio do assento no mundo (o chão embaixo dele) e para onde a
 * frente do banco olha (`frente`, giro `d` olha para `(sin d, cos d)`).
 */
export function lugarNoBanco(
  id: string,
  meio: { x: number; y: number; z: number },
  frente: number,
): LugarDeDescanso {
  const fx = Math.sin(frente)
  const fz = Math.cos(frente)
  const desenho = BANCO.assentoAFrente + BANCO.baciaAtras
  const corpo = BANCO.meioFundo + CORPO.raio + BANCO.folga
  return {
    id,
    jeito: 'sentar',
    desenho: { x: meio.x + fx * desenho, y: meio.y, z: meio.z + fz * desenho },
    giro: frente,
    corpo: { x: meio.x + fx * corpo, z: meio.z + fz * corpo },
  }
}

/**
 * O lugar de deitar na cama: `meio` é o meio da cama no chão e `rumoDosPes`, para onde ficam os pés
 * (o +Z da cama girada). Deitado de costas, o desenho olha para os pés e a cabeça cai no
 * travesseiro; o corpo fica de pé ao lado dela.
 */
export function lugarNaCama(
  meio: { x: number; y: number; z: number },
  rumoDosPes: number,
): LugarDeDescanso {
  const fx = Math.sin(rumoDosPes)
  const fz = Math.cos(rumoDosPes)
  const lado = CAMA.meiaLargura + CORPO.raio + CAMA.folga
  return {
    id: 'cama',
    jeito: 'deitar',
    desenho: {
      x: meio.x + fx * CAMA.pesAFrente,
      y: meio.y + CAMA.colchao + CAMA.costas,
      z: meio.z + fz * CAMA.pesAFrente,
    },
    giro: rumoDosPes,
    // Ao lado da cama, de través do rumo dos pés: (cos d, −sin d).
    corpo: { x: meio.x + fz * lado, z: meio.z - fx * lado },
  }
}
