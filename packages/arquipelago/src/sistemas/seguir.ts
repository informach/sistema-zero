/**
 * O bicho adotado seguindo a criança (regras puras). Ele anda pelo chão até ficar a uns dois passos
 * dela, corre quando ela se afasta, espera parado quando ela está no cipó, no tronco ou nadando, e
 * senta depois de um tempo sem nada acontecer. Longe demais (ela atravessou a ponte correndo, voltou
 * para casa pelo cochilo), caído da ilha ou preso contra uma parede, ele reaparece atrás dela. O corpo dele é um controlador de personagem do
 * Rapier: esta regra só diz para onde e com que pressa ir.
 */

export const SEGUIR = {
  /** Dois passos: onde ele para atrás da criança. */
  perto: 1.6,
  /** Começa a andar quando ela passa disto (folga para não ficar dando passinho). */
  comecaAAndar: 2.6,
  /** Corre quando ela passa disto. */
  correrDe: 5,
  /** Velocidades (m/s): andando, correndo. */
  andar: 2.2,
  correr: 5.4,
  /** Quão rápido chega na velocidade pedida (maior, mais rápido). */
  aceleracao: 8,
  /** Mais longe que isto, ele reaparece atrás dela. */
  reaparecerDe: 14,
  /** Parado por tanto tempo (s), senta. */
  sentaDepois: 6,
  /** Abaixo disto (o mar fica em 0 e as ilhas em 1), ele caiu da ilha: reaparece atrás dela. */
  abaixoDoMar: -0.5,
  /** Querendo andar e quase sem sair do lugar por tanto tempo (s), ele ficou preso: reaparece. */
  presoPor: 2.5,
  /** Andou menos que esta parte do que queria: conta como preso. */
  andouPouco: 0.25,
} as const

export type ClipeDoBicho = 'parado' | 'andar' | 'correr' | 'sentar'

export interface EstadoDoSeguir {
  /** Velocidade no chão agora (m/s). */
  vx: number
  vz: number
  /** Indo atrás dela (entre o "começa a andar" e o "perto"). */
  andando: boolean
  /** Segundos parado. */
  parado: number
  /** Segundos querendo andar sem sair do lugar (contra uma parede, um canteiro, a casa). */
  preso: number
}

export function criarSeguir(): EstadoDoSeguir {
  return { vx: 0, vz: 0, andando: false, parado: 0, preso: 0 }
}

/**
 * Conta o tempo preso: ele queria andar `vx, vz` por `dt` e andou só `andou` (o controlador parou
 * o corpo numa parede). Devolve `true` quando passou de `presoPor` (hora de reaparecer).
 */
export function ficouPreso(e: EstadoDoSeguir, andou: number, dt: number): boolean {
  const queria = Math.hypot(e.vx, e.vz) * dt
  if (e.andando && queria > 1e-4 && andou < queria * SEGUIR.andouPouco) e.preso += dt
  else e.preso = 0
  return e.preso > SEGUIR.presoPor
}

/** Onde ele reaparece: dois passos atrás de para onde ela olha. */
export function atrasDela(crianca: { x: number; z: number; direcao: number }): {
  x: number
  z: number
} {
  return {
    x: crianca.x - Math.sin(crianca.direcao) * SEGUIR.perto,
    z: crianca.z - Math.cos(crianca.direcao) * SEGUIR.perto,
  }
}

/**
 * Um passo: a velocidade nova (o estado muda no lugar, sem alocar), o clipe e se ele deve
 * reaparecer atrás dela. `espera` = ela está onde ele não vai (cipó, tronco, água).
 */
export function passoDoSeguir(
  e: EstadoDoSeguir,
  bicho: { x: number; y: number; z: number },
  crianca: { x: number; z: number },
  espera: boolean,
  dt: number,
): { clipe: ClipeDoBicho; reaparecer: boolean } {
  const dx = crianca.x - bicho.x
  const dz = crianca.z - bicho.z
  const d = Math.hypot(dx, dz)
  const caiu = bicho.y < SEGUIR.abaixoDoMar
  if ((d > SEGUIR.reaparecerDe || caiu || e.preso > SEGUIR.presoPor) && !espera) {
    e.vx = 0
    e.vz = 0
    e.andando = false
    e.parado = 0
    e.preso = 0
    return { clipe: 'parado', reaparecer: true }
  }
  if (!e.andando && d > SEGUIR.comecaAAndar && !espera) e.andando = true
  if (e.andando && (d <= SEGUIR.perto || espera)) e.andando = false
  let alvoVx = 0
  let alvoVz = 0
  if (e.andando && d > 0) {
    const v = d > SEGUIR.correrDe ? SEGUIR.correr : SEGUIR.andar
    alvoVx = (dx / d) * v
    alvoVz = (dz / d) * v
  }
  const k = 1 - Math.exp(-SEGUIR.aceleracao * dt)
  e.vx += (alvoVx - e.vx) * k
  e.vz += (alvoVz - e.vz) * k
  const rapidez = Math.hypot(e.vx, e.vz)
  if (rapidez < 0.15) {
    e.parado += dt
    return { clipe: e.parado > SEGUIR.sentaDepois ? 'sentar' : 'parado', reaparecer: false }
  }
  e.parado = 0
  return {
    clipe: rapidez > (SEGUIR.andar + SEGUIR.correr) / 2 ? 'correr' : 'andar',
    reaparecer: false,
  }
}
