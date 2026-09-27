import { BBMODEL_INPUT_LIMITS } from '../import/bbmodelInput'
import type { BbmodelPaintImageIssue } from '../import/bbmodelPaintImages'
import { bbmodelNumber } from '../import/bbmodelValues'
import { nativeImportName } from '../import/nativeImportName'
import { SCENE_LIMITS } from '../scene/limits'
import * as v from '../scene/validation'
import {
  type BbmodelReportContext,
  bbmodelReportChoice,
  bbmodelReportTexture,
} from './bbmodelImportReportValues'

/** Closed owned layer provenance, checked against both the chosen policy and every native layer. */
export function readBbmodelImportPaintIssue(
  raw: unknown,
  context: BbmodelReportContext,
): BbmodelPaintImageIssue {
  const row = v.record(raw, 'issue.detail', [
      'code',
      'texture',
      'path',
      'targetId',
      'rootBitmap',
      'composition',
      'layers',
    ]),
    texture = bbmodelReportTexture(row.texture, context),
    targetId = `bbmodel_image_${texture}`,
    image = context.images.get(targetId)!,
    path = `textures[${texture}].layers`
  bbmodelReportChoice(context.options.images.layers === 'molda-layers')
  v.requireScene(
    row.targetId === targetId && row.path === path,
    'issue.targetId',
    'A composição não corresponde à imagem de origem.',
  )
  const layers = v.list(row.layers, 'issue.layers', SCENE_LIMITS.layersPerImage)
  v.requireScene(
    layers.length > 0 && layers.length === image.layers.length,
    'issue.layers',
    'Faltam camadas da imagem importada.',
  )
  return {
    code: v.choice(row.code, ['paint-layers-adapted'], 'issue.code'),
    texture,
    targetId,
    path,
    rootBitmap: v.choice(row.rootBitmap, ['dimensions-only'], 'issue.rootBitmap'),
    composition: v.choice(row.composition, ['molda-source-over'], 'issue.composition'),
    layers: layers.map((raw, index) => {
      const layer = v.record(raw, 'issue.layer', [
          'layer',
          'targetId',
          'sourceName',
          'nameChange',
          'visible',
          'sourceOpacity',
          'declared',
          'actual',
          'rgba16',
        ]),
        native = image.layers[index]!,
        id = `${targetId}_layer_${index}`
      v.requireScene(
        typeof layer.sourceName === 'string' &&
          layer.sourceName.length <= BBMODEL_INPUT_LIMITS.identifierChars,
        'issue.sourceName',
        'Nome de camada inválido.',
      )
      const sourceName = layer.sourceName,
        name = nativeImportName(sourceName, `Camada ${index + 1}`),
        visible = v.boolean(layer.visible, 'issue.visible'),
        sourceOpacity = bbmodelNumber(layer.sourceOpacity, 'issue.sourceOpacity'),
        rgba16 = v.boolean(layer.rgba16, 'issue.rgba16'),
        declared = v.list(layer.declared, 'issue.declared', 2),
        actual = v.tuple(layer.actual, 2, 'issue.actual')
      v.requireScene(
        layer.layer === index &&
          layer.targetId === id &&
          native.id === id &&
          native.name === name.name &&
          layer.nameChange === name.change,
        'issue.layer',
        'A ordem, identidade ou nome da camada não corresponde ao documento.',
      )
      v.requireScene(
        visible === native.visible &&
          sourceOpacity >= 0 &&
          sourceOpacity <= 100 &&
          sourceOpacity / 100 === native.opacity,
        'issue.sourceOpacity',
        'A força ou visibilidade da camada não corresponde ao documento.',
      )
      if (rgba16) bbmodelReportChoice(context.options.images.rgba16 === 'round-to-rgba8')
      v.requireScene(
        declared.length === 2 && actual[0] === image.width && actual[1] === image.height,
        'issue.actual',
        'O tamanho da camada não corresponde à imagem inteira.',
      )
      const dimension = (value: unknown) =>
        value === null ? null : v.number(value, 'issue.declared', 0, Number.MAX_SAFE_INTEGER, true)
      return {
        layer: index,
        targetId: id,
        sourceName,
        nameChange: name.change,
        visible,
        sourceOpacity,
        rgba16,
        declared: [dimension(declared[0]), dimension(declared[1])],
        actual: [image.width, image.height],
      }
    }),
  }
}
