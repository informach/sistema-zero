import type { MtlTexturePolicy } from './mtlTexturePlanTypes'
import { requireObj } from './objInput'

export function readMtlTexturePolicy(value: MtlTexturePolicy) {
  requireObj(
    value !== null && typeof value === 'object' && !Array.isArray(value),
    'options',
    'Escolha como interpretar as texturas MTL.',
  )
  for (const key of Object.keys(value))
    requireObj(
      [
        'colorSpace',
        'scalarSpace',
        'repeatedOptions',
        'roleConflicts',
        'unsupportedMaps',
        'bump',
        'specularMap',
        'transparencyMap',
      ].includes(key),
      `options.${key}`,
      'Esta opção de textura não é conhecida.',
    )
  const colorSpace = value.colorSpace,
    scalarSpace = value.scalarSpace,
    repeatedOptions = value.repeatedOptions === undefined ? 'reject' : value.repeatedOptions,
    roleConflicts = value.roleConflicts === undefined ? 'reject' : value.roleConflicts,
    unsupportedMaps = value.unsupportedMaps === undefined ? 'reject' : value.unsupportedMaps,
    bump = value.bump === undefined ? 'reject' : value.bump,
    specularMap = value.specularMap === undefined ? 'reject' : value.specularMap,
    transparencyMap = value.transparencyMap === undefined ? 'reject' : value.transparencyMap
  for (const [key, space] of [
    ['colorSpace', colorSpace],
    ['scalarSpace', scalarSpace],
  ])
    requireObj(
      space === 'linear' || space === 'srgb',
      `options.${key}`,
      'Escolha se os canais RGB são lineares ou sRGB.',
    )
  for (const [key, choice] of [
    ['repeatedOptions', repeatedOptions],
    ['roleConflicts', roleConflicts],
  ])
    requireObj(
      choice === 'reject' || choice === 'first' || choice === 'last',
      `options.${key}`,
      'Escolha como tratar definições repetidas.',
    )
  requireObj(
    unsupportedMaps === 'reject' || unsupportedMaps === 'omit',
    'options.unsupportedMaps',
    'Escolha se mapas sem representação podem ser omitidos.',
  )
  requireObj(
    bump === 'reject' || bump === 'normal',
    'options.bump',
    'Escolha a interpretação do bump.',
  )
  requireObj(
    specularMap === 'reject' || specularMap === 'roughness',
    'options.specularMap',
    'Escolha a interpretação de map_Ns.',
  )
  requireObj(
    transparencyMap === 'reject' ||
      transparencyMap === 'opacity' ||
      transparencyMap === 'transparency',
    'options.transparencyMap',
    'Escolha a interpretação de map_Tr.',
  )
  return {
    colorSpace,
    scalarSpace,
    repeatedOptions,
    roleConflicts,
    unsupportedMaps,
    bump,
    specularMap,
    transparencyMap,
  }
}
