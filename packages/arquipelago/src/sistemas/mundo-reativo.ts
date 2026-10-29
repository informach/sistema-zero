export const VIDA_DA_ONDA = 1.6
export const TOTAL_DE_ONDAS = 16
export interface Onda {
  x: number
  z: number
  idade: number
  forca: number
}
export interface Ondas {
  lista: Onda[]
  proxima: number
  emitidas: number
}
export interface RastroNaAgua {
  x: number
  z: number
  dentro: boolean
  espera: number
}
export function criarOndas(): Ondas {
  return {
    lista: Array.from({ length: TOTAL_DE_ONDAS }, () => ({
      x: 0,
      z: 0,
      idade: VIDA_DA_ONDA,
      forca: 0,
    })),
    proxima: 0,
    emitidas: 0,
  }
}
export function criarRastroNaAgua(): RastroNaAgua {
  return { x: 0, z: 0, dentro: false, espera: 0 }
}
export function passoDasOndas(ondas: Ondas, dt: number): void {
  for (const o of ondas.lista) o.idade = Math.min(VIDA_DA_ONDA, o.idade + dt)
}
/** Entrada faz uma onda maior. Movimento contínuo deixa ondas espaçadas, parado não emite. */
export function rastroNaAgua(
  ondas: Ondas,
  rastro: RastroNaAgua,
  dentro: boolean,
  x: number,
  z: number,
  dt: number,
): void {
  rastro.espera = Math.max(0, rastro.espera - dt)
  if (
    dentro &&
    (!rastro.dentro || (rastro.espera === 0 && Math.hypot(x - rastro.x, z - rastro.z) > 0.18))
  ) {
    const o = ondas.lista[ondas.proxima]!
    o.x = x
    o.z = z
    o.idade = 0
    o.forca = rastro.dentro ? 0.4 : 0.8
    ondas.proxima = (ondas.proxima + 1) % TOTAL_DE_ONDAS
    ondas.emitidas++
    rastro.espera = 0.25
    rastro.x = x
    rastro.z = z
  }
  if (!dentro) {
    rastro.x = x
    rastro.z = z
    rastro.espera = 0
  }
  rastro.dentro = dentro
}
export interface Galho {
  carga: number
  quebrado: boolean
}
/** Galho baixo fora do percurso. O peso precisa permanecer um instante, não basta passar ao lado. */
export function passoDoGalho(galho: Galho, peso: boolean, dt: number): boolean {
  if (galho.quebrado) return false
  galho.carga = peso ? galho.carga + dt : Math.max(0, galho.carga - dt * 2)
  if (galho.carga < 0.12) return false
  galho.quebrado = true
  return true
}
