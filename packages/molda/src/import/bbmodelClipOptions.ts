import { readBbmodelAnimationBindingOptions } from './bbmodelAnimationBindings'
import type { BbmodelClipOptions } from './bbmodelClipPlanTypes'
import { requireBbmodel } from './bbmodelInput'
import { readBbmodelNativeClipOptions } from './bbmodelNativeClips'
import { bbmodelNumber } from './bbmodelValues'

export function readBbmodelClipOptions(value: BbmodelClipOptions) {
  requireBbmodel(
    value !== null && typeof value === 'object' && !Array.isArray(value),
    'options',
    'Escolha como preparar os movimentos.',
  )
  for (const key of Object.keys(value))
    requireBbmodel(
      [
        'fps',
        'duration',
        'nameReferences',
        'unresolved',
        'metadata',
        'unmapped',
        'adaptation',
        'discontinuities',
        'zeroScale',
      ].includes(key),
      `options.${key}`,
      'Esta opção de movimento não é conhecida.',
    )
  const fps = value.fps === undefined ? 24 : bbmodelNumber(value.fps, 'options.fps'),
    duration = value.duration === undefined ? 'declared' : value.duration,
    unresolved = value.unresolved === undefined ? 'reject' : value.unresolved,
    metadata = value.metadata === undefined ? 'reject' : value.metadata,
    unmapped = value.unmapped === undefined ? 'reject' : value.unmapped,
    native = readBbmodelNativeClipOptions({
      adaptation: value.adaptation,
      discontinuities: value.discontinuities,
      zeroScale: value.zeroScale,
    }),
    binding = readBbmodelAnimationBindingOptions({ nameReferences: value.nameReferences })
  requireBbmodel(
    Number.isInteger(fps) && fps >= 1 && fps <= 120,
    'options.fps',
    'Escolha de 1 a 120 quadros por segundo, sem frações.',
  )
  requireBbmodel(
    duration === 'declared' || duration === 'fit-keys',
    'options.duration',
    'Escolha a duração declarada ou a duração até a última chave.',
  )
  requireBbmodel(
    unresolved === 'reject' || unresolved === 'omit-clip',
    'options.unresolved',
    'Escolha se movimentos incompatíveis devem ser omitidos por inteiro.',
  )
  requireBbmodel(
    metadata === 'reject' || metadata === 'discard',
    'options.metadata',
    'Escolha como tratar os metadados do editor de origem.',
  )
  requireBbmodel(
    unmapped === 'reject' || unmapped === 'discard',
    'options.unmapped',
    'Escolha como tratar os campos ainda não mapeados.',
  )
  return { fps, duration, unresolved, metadata, unmapped, ...native, ...binding }
}
