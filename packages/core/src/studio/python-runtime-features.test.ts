import { expect, test } from 'bun:test'
import {
  PYTHON_MOLDA_SCENE_FEATURE,
  PYTHON_PINTA_WORLD_FEATURE,
  PYTHON_PROJECT_MISSION_FEATURE,
  type StudioPythonRuntimeFeature,
  StudioPythonRuntimeFeaturesSchema,
} from './python-runtime-features'

test('cenários por assets têm capacidade explícita; listas de releases anteriores continuam válidas', () => {
  const anteriores: StudioPythonRuntimeFeature[] = [
    'turtle-compound-shapes',
    PYTHON_PROJECT_MISSION_FEATURE,
    PYTHON_PINTA_WORLD_FEATURE,
  ]
  expect(StudioPythonRuntimeFeaturesSchema.parse(anteriores)).toEqual(anteriores)
  expect(
    StudioPythonRuntimeFeaturesSchema.parse([...anteriores, PYTHON_MOLDA_SCENE_FEATURE]),
  ).toEqual([...anteriores, 'molda-scene-assets-v1'])
})

test('capacidades repetidas e nomes desconhecidos são recusados', () => {
  expect(
    StudioPythonRuntimeFeaturesSchema.safeParse([
      PYTHON_MOLDA_SCENE_FEATURE,
      PYTHON_MOLDA_SCENE_FEATURE,
    ]).success,
  ).toBe(false)
  expect(StudioPythonRuntimeFeaturesSchema.safeParse(['molda-scene-assets-v999']).success).toBe(
    false,
  )
})
