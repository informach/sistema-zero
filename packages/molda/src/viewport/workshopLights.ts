import { AmbientLight, DirectionalLight } from 'three'

/**
 * A MESMA luz que o Jogo 3D cria em toda cena (`LIGHT_AMBIENT` e `LIGHT_SUN` no runtime do
 * Jogo 3D, 27/10/2026): o modelo feito aqui aparece com a mesma cara no jogo. Com ela a cor da
 * tela é a cor escolhida (o three.js divide a luz por pi; a soma antiga, céu 1,4 + sol 2,2 +
 * fill 0,5, estourava o topo e deixava a frente em ~75%). O teste `workshopLights` do Estúdio
 * confere que os números continuam iguais aos do jogo.
 */
export const WORKSHOP_AMBIENT = 2.1
export const WORKSHOP_SUN = 1.7

/** Consistent neutral workshop lighting for legacy and hierarchical documents. */
export function workshopLights() {
  const ambient = new AmbientLight(0xffffff, WORKSHOP_AMBIENT)
  const sun = new DirectionalLight(0xffffff, WORKSHOP_SUN)
  sun.position.set(12, 24, 10)
  return [ambient, sun] as const
}
