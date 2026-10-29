/**
 * O movimento com peso e com tolerância (controlador universal, parte 1). Regras puras, rodadas a
 * cada passo da física pelo personagem:
 * - **aceleração e desaceleração**: a velocidade no chão vai até a pedida em vez de pular para ela
 *   (o corpo tem peso, mas responde logo); para mais rápido do que acelera; virar para trás freia
 *   antes de ir. Cada modo tem o seu perfil (`PERFIS`): as ilhas novas (gelo, planar, montaria)
 *   acrescentam o delas sem mexer no controlador;
 * - **coyote time**: dá para pular um instante depois de sair da beirada;
 * - **jump buffer**: o pulo apertado um instante antes de tocar o chão acontece ao tocar. Cada
 *   toque vale um pulo (segurar o botão não fica pulando a cada aterrissagem).
 * Os números são do jogo, testados na sala de testes; os levantamentos da dona deram o ponto de
 * partida (`docs/pesquisa/2026-10-28-animacao-camera-controles.md`).
 */

export interface PerfilDeMovimento {
  /** m/s² para chegar na velocidade pedida. */
  aceleracao: number
  /** m/s² para parar (soltou o controle) ou para virar para trás. */
  freio: number
}

export const PERFIS = {
  /** No chão: anda (2,2 m/s) em 0,12 s, corre (4,6 m/s) em 0,26 s, para da corrida em 0,19 s. */
  chao: { aceleracao: 18, freio: 24 },
  /** No ar (pulo sem embalo): a direção corrige devagar, o pulo guarda o embalo de quem corria. */
  ar: { aceleracao: 7, freio: 3 },
  /** Nadando: a água segura, para acelerar e para parar. */
  agua: { aceleracao: 6, freio: 4 },
  /**
   * De patins no chão (`sistemas/patins.ts`): chega aos 2,9 m/s em 0,36 s e aos 6 m/s em 0,75 s;
   * soltando, desliza 1,2 s (uns 3,6 m) até parar.
   */
  patins: { aceleracao: 8, freio: 5 },
} as const satisfies Record<string, PerfilDeMovimento>

export const TOLERANCIA_DO_PULO = {
  /** Segundos depois de sair do chão em que o pulo ainda vale. */
  coyote: 0.12,
  /** Segundos antes de tocar o chão em que o pulo apertado fica guardado. */
  buffer: 0.12,
} as const

/** Leva a velocidade `v` (no chão, x e z) em direção à pedida, no lugar e sem alocar. */
export function aproximarVelocidade(
  v: { x: number; z: number },
  alvoX: number,
  alvoZ: number,
  perfil: PerfilDeMovimento,
  dt: number,
): void {
  const dx = alvoX - v.x
  const dz = alvoZ - v.z
  const falta = Math.hypot(dx, dz)
  if (falta < 1e-9) return
  const pedindo = Math.hypot(alvoX, alvoZ) > 1e-6
  // Pedindo para o lado contrário de onde vai (virar para trás), freia primeiro.
  const contra = pedindo && v.x * alvoX + v.z * alvoZ < 0
  const taxa = pedindo && !contra ? perfil.aceleracao : perfil.freio
  const passo = taxa * dt
  if (falta <= passo) {
    v.x = alvoX
    v.z = alvoZ
    return
  }
  v.x += (dx / falta) * passo
  v.z += (dz / falta) * passo
}

export interface EstadoDoPulo {
  /** Segundos desde a última vez no chão. */
  foraDoChao: number
  /** Segundos desde o último toque de pular ainda não atendido. */
  pedidoHa: number
}

export function criarPulo(): EstadoDoPulo {
  return { foraDoChao: Number.POSITIVE_INFINITY, pedidoHa: Number.POSITIVE_INFINITY }
}

/**
 * Um passo do pulo: `noChao` (o corpo está no chão agora), `apertou` (um toque novo de pular neste
 * passo). Devolve `true` quando é hora de pular: houve um toque nos últimos `buffer` segundos e o
 * corpo esteve no chão nos últimos `coyote` segundos. Pular gasta o toque e o chão (sem pulo duplo).
 */
export function passoDoPulo(
  e: EstadoDoPulo,
  noChao: boolean,
  apertou: boolean,
  dt: number,
): boolean {
  e.foraDoChao = noChao ? 0 : e.foraDoChao + dt
  e.pedidoHa = apertou ? 0 : e.pedidoHa + dt
  if (e.pedidoHa <= TOLERANCIA_DO_PULO.buffer && e.foraDoChao <= TOLERANCIA_DO_PULO.coyote) {
    e.pedidoHa = Number.POSITIVE_INFINITY
    e.foraDoChao = Number.POSITIVE_INFINITY
    return true
  }
  return false
}
