/** Campo contínuo do jogo. As unidades são calibradas para uma brisa, não uma previsão do tempo. */
export interface CampoDeVento {
  tempo: number
  hora: number
}
export interface Vento {
  x: number
  z: number
}
export function forcaPorHora(hora: number): number {
  return 0.45 + 0.55 * Math.max(0, Math.cos(((hora - 15) * Math.PI) / 12))
}
export function ventoEm(x: number, z: number, campo: CampoDeVento, saida: Vento): void {
  const t = campo.tempo
  const rumo = 0.6 + 0.35 * Math.sin(t * 0.035)
  const rajada =
    0.65 + 0.25 * Math.sin(x * 0.23 + z * 0.17 - t * 0.8) + 0.1 * Math.sin(z * 0.41 - t * 0.43)
  const forca = forcaPorHora(campo.hora) * rajada
  saida.x = Math.cos(rumo) * forca
  saida.z = Math.sin(rumo) * forca
}
/** A mesma conta do CPU, com a força por hora enviada em uniform. */
export const VENTO_GLSL = `
vec2 arqVento(vec2 p, float t, float base) {
  float rumo = 0.6 + 0.35 * sin(t * 0.035);
  float rajada = 0.65 + 0.25 * sin(p.x * 0.23 + p.y * 0.17 - t * 0.8) + 0.1 * sin(p.y * 0.41 - t * 0.43);
  return vec2(cos(rumo), sin(rumo)) * base * rajada;
}`
