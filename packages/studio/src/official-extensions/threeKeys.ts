/**
 * As teclas dos blocos de tecla das extensões 3D (review 3D, 10/2026): um dropdown COMUM, para a
 * criança achar a mesma lista no Jogo 3D, no Mundo 3D e no Avançado. O valor é o
 * `KeyboardEvent.code` (`KeyW`, `Space`, `ArrowUp`…); cada runtime traduz para o próprio mapa de
 * teclas (o Mundo 3D guarda as teclas por `e.key` em minúsculas e aceita estes códigos no
 * `keyName`).
 */
export const THREE_KEY_OPTIONS = [
  ['W (frente)', 'KeyW'],
  ['S (trás)', 'KeyS'],
  ['A (esquerda)', 'KeyA'],
  ['D (direita)', 'KeyD'],
  ['espaço (pular)', 'Space'],
  // Rótulo NEUTRO onde a tecla não faz nada sozinha (quem decide é o bloco da criança).
  // ShiftLeft vale pelos dois shifts nos três runtimes.
  ['F', 'KeyF'],
  ['shift', 'ShiftLeft'],
  ['↑ seta para cima', 'ArrowUp'],
  ['↓ seta para baixo', 'ArrowDown'],
  ['← seta esquerda', 'ArrowLeft'],
  ['→ seta direita', 'ArrowRight'],
  ['Enter', 'Enter'],
  ['E', 'KeyE'],
  ['Q', 'KeyQ'],
  ['R', 'KeyR'],
  ['P', 'KeyP'],
] as const satisfies readonly (readonly [string, string])[]

export type ThreeKeyCode = (typeof THREE_KEY_OPTIONS)[number][1]

export function isThreeKeyCode(value: unknown): value is ThreeKeyCode {
  return typeof value === 'string' && THREE_KEY_OPTIONS.some(([, code]) => code === value)
}
