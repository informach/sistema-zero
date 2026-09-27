import type { MtlRepeatedPropertyPolicy } from './mtlEffectiveProperties'
import type {
  MtlRgbSpace,
  MtlTextureIssue,
  MtlTexturePlan,
  MtlTextureRole,
} from './mtlTexturePlanTypes'
import type { MtlProperty, MtlTextureOption } from './mtlTypes'
import { ObjInputError } from './objInput'

export function unsupportedMtlMap(line: number, message: string): never {
  throw new ObjInputError('unsupported', `lines[${line}]`, message)
}

/** Only selected source map settings. Raster validity and dimensions belong to the next stage. */
export function planMtlTextureSettings(
  source: Extract<MtlProperty, { kind: 'map' }>,
  property: number,
  role: MtlTextureRole,
  rgbSpace: MtlRgbSpace,
  repeated: MtlRepeatedPropertyPolicy,
  invert: boolean,
  issues: MtlTextureIssue[],
): MtlTexturePlan {
  const line = source.line,
    selected = new Map<MtlTextureOption['key'], { option: MtlTextureOption; count: number }>()
  for (const option of source.value.options) {
    const existing = selected.get(option.key)
    if (!existing) selected.set(option.key, { option, count: 1 })
    else {
      if (repeated === 'reject')
        unsupportedMtlMap(line, `A opção -${option.key} se repete. Escolha qual definição usar.`)
      existing.count++
      if (repeated === 'last') existing.option = option
    }
  }
  const plan: MtlTexturePlan = {
    property,
    line,
    keyword: source.keyword,
    filename: source.value.filename,
    role,
    sample:
      role === 'color'
        ? { kind: 'color', rgbSpace }
        : role === 'normal'
          ? { kind: 'normal', strength: 1 }
          : { kind: 'scalar', channel: 'l', rgbSpace, invert },
    uv: { offset: [0, 0], scale: [1, 1] },
    range: [0, 1],
  }
  let blendu = true,
    blendv = true,
    clamp = false,
    tagged = false
  for (const [key, { option, count }] of selected) {
    if (count > 1)
      issues.push({ code: 'option-redeclared', property, line, key, ignored: count - 1 })
    switch (option.key) {
      case 'o':
      case 's': {
        const fallback = option.key === 'o' ? 0 : 1
        plan.uv[option.key === 'o' ? 'offset' : 'scale'] = [
          option.value[0],
          option.value[1] ?? fallback,
        ]
        if ((option.value[2] ?? fallback) !== fallback)
          issues.push({ code: 'third-texture-axis-omitted', property, line, key: option.key })
        break
      }
      case 't':
        if (option.value.some((value) => value !== 0))
          unsupportedMtlMap(
            line,
            'Turbulência não pode ser representada por uma transformação UV simples.',
          )
        break
      case 'mm':
        plan.range = [...option.value]
        break
      case 'imfchan':
        if (plan.sample.kind !== 'scalar')
          unsupportedMtlMap(line, 'Um normal RGB não pode usar somente um canal de altura.')
        if (option.value === 'z')
          unsupportedMtlMap(line, 'PNG/JPEG não fornecem o canal de profundidade solicitado.')
        plan.sample.channel = option.value
        break
      case 'bm':
        if (plan.sample.kind !== 'normal') throw new Error('Bump interpretation was not selected')
        if (option.value < 0 || option.value > 4)
          unsupportedMtlMap(line, 'A força do normal precisa caber em 0–4, sem recorte.')
        plan.sample.strength = option.value
        break
      case 'colorspace': {
        const space = option.value.toLowerCase()
        if (space !== 'linear' && space !== 'srgb')
          unsupportedMtlMap(line, 'Este espaço de cor de textura ainda não tem conversão própria.')
        if (plan.sample.kind === 'normal') {
          if (space !== 'linear')
            unsupportedMtlMap(line, 'Normal RGB precisa de canais de dados, sem curva sRGB.')
        } else plan.sample.rgbSpace = space
        tagged = true
        break
      }
      case 'cc':
        if (option.value)
          unsupportedMtlMap(
            line,
            'A correção de cor -cc não especifica uma transformação portátil. Ela não foi presumida como sRGB.',
          )
        break
      case 'blendu':
        blendu = option.value
        break
      case 'blendv':
        blendv = option.value
        break
      case 'clamp':
        clamp = option.value
        break
      case 'boost':
      case 'texres':
        issues.push({ code: 'option-omitted', property, line, key: option.key })
        break
      case 'type':
        throw new Error('Environment map reached surface texture planning')
    }
  }
  const [base, gain] = plan.range,
    end = base + gain
  if (!Number.isFinite(end) || base < 0 || base > 1 || end < 0 || end > 1)
    unsupportedMtlMap(
      line,
      'A faixa -mm pode sair de 0–1; os pixels não serão recortados silenciosamente.',
    )
  if (plan.sample.kind === 'normal') {
    if (base !== 0 || gain !== 1)
      unsupportedMtlMap(
        line,
        'A faixa -mm de uma altura não é uma transformação de vetores normais RGB.',
      )
    if (plan.uv.scale.some((value) => value === 0))
      unsupportedMtlMap(line, 'Escala UV zero não define uma base tangente para normal RGB.')
  } else if (plan.sample.kind === 'scalar' && plan.sample.channel === 'm') {
    plan.sample.rgbSpace = 'linear'
    issues.push({ code: 'matte-linear', property, line })
  } else {
    issues.push({
      code: 'texture-rgb-interpreted',
      property,
      line,
      space: plan.sample.rgbSpace,
      origin: tagged ? 'colorspace' : 'policy',
    })
    if (plan.sample.kind === 'scalar' && plan.sample.channel === 'l')
      issues.push({ code: 'luminance-rec709', property, line })
  }
  // Both Wavefront wrapping modes differ from native edge extension. Even nearest is an adaptation,
  // not a claim that blendu/blendv exactly encode modern GPU min/mag filters.
  issues.push({ code: 'sampler-filter-nearest', property, line, blendu, blendv })
  issues.push({
    code: 'sampler-wrap-clamp',
    property,
    line,
    source: clamp ? 'underlying-material' : 'repeat',
  })
  return plan
}
