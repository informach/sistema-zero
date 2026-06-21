import * as THREE from 'three'

/**
 * Paleta low-poly COMPARTILHADA (`flatShading` = facetas). Singletons de módulo reusados
 * por todos os móveis (constantes, não dispostos). Materiais que mudam por instância
 * (paredes/chão) vivem nos próprios componentes e são dispostos lá. Só carregada pela
 * árvore client-only do `<Canvas>`.
 */
function mat(color: string, opts?: { emissive?: string; emissiveIntensity?: number }) {
  const m = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.9,
    metalness: 0,
    flatShading: true,
  })
  if (opts?.emissive) {
    m.emissive = new THREE.Color(opts.emissive)
    m.emissiveIntensity = opts.emissiveIntensity ?? 0.3
  }
  return m
}

export const MAT = {
  wood: mat('#b9824f'),
  woodDark: mat('#7c5836'),
  white: mat('#f3efe7'),
  cream: mat('#e7ddc8'),
  gray: mat('#9aa3ab'),
  grayDark: mat('#565d65'),
  black: mat('#30343a'),
  red: mat('#e0584f'),
  green: mat('#5cb673'),
  blue: mat('#5b8fd6'),
  yellow: mat('#f2c14e'),
  pink: mat('#e88bb6'),
  purple: mat('#9b6fd0'),
  leaf: mat('#4e9c5a'),
  leafLight: mat('#73bd6c'),
  terracotta: mat('#c8714e'),
  metal: mat('#b9c0c7'),
  glass: mat('#bfe3f0', { emissive: '#bfe3f0', emissiveIntensity: 0.06 }),
  lamp: mat('#ffe9b0', { emissive: '#ffd27a', emissiveIntensity: 0.5 }),
  screen: mat('#2a2f3a', { emissive: '#3a86c8', emissiveIntensity: 0.25 }),
} as const

export type MatKey = keyof typeof MAT
