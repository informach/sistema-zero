/** Artes disponíveis para as unidades da trilha Kids. O arquivo SVG é servido pelo app Kids. */
export const MODULE_ILLUSTRATIONS = [
  { key: 'desafio-nave', label: 'Nave ganha vida', src: '/trilha/desafio-nave.svg' },
  { key: 'desafio-asteroides', label: 'Tiros e asteroides', src: '/trilha/desafio-asteroides.svg' },
  {
    key: 'desafio-conquista',
    label: 'Jogo completo e conquista',
    src: '/trilha/desafio-conquista.svg',
  },
] as const

export type ModuleIllustrationKey = (typeof MODULE_ILLUSTRATIONS)[number]['key']

export function moduleIllustration(key: string | null | undefined) {
  return MODULE_ILLUSTRATIONS.find((illustration) => illustration.key === key)
}
