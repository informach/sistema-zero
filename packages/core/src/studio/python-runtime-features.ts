import { z } from 'zod'

/** Implemented APIs, distinct from per-user permissions and browser requirements. */
export const PYTHON_PROJECT_MISSION_FEATURE = 'project-missions-v1' as const
export const PYTHON_PINTA_WORLD_FEATURE = 'pinta-map-world-v1' as const
/** Complete PNG-4 reader, including the earlier map/world formats and scene-3 physics. */
export const PYTHON_PINTA_PHYSICS_FEATURE = 'pinta-scene-physics-v1' as const
/** Complete Pinta worlds supplied with the three 2D extensions. */
export const PYTHON_PINTA_REGIONS_FEATURE = 'pinta-scene-regions-v1' as const
export const PYTHON_PINTA_SCENE_MODULE_PATHS = Object.freeze({
  'python-pygame': 'pinta-scenes/pygame/pinta.py',
  'python-pgzero': 'pinta-scenes/pgzero/pinta.py',
  'python-raylib-2d': 'pinta-scenes/raylib-2d/pinta.py',
} as const)
/** Bound candidate code separately from the project PNG and boot-resource quotas. */
export const PYTHON_PINTA_SCENE_MODULE_MAX_BYTES = 256 * 1024
export const PYTHON_MOLDA_SCENE_FEATURE = 'molda-scene-assets-v1' as const
/**
 * O `cenario.py` com regiões (lote 7b da conclusão do plano do Estúdio, 22/11/2026): a carga por
 * regiões (`atualizar`, `regiao`, `entrou_na_regiao`) e o `carregar(modulo)` dos blocos. Os blocos
 * de cenário do Raylib 3D só aparecem numa versão do runtime que traz isto.
 */
export const PYTHON_MOLDA_REGIONS_FEATURE = 'molda-scene-regions-v1' as const
/**
 * O `cenario.py` com o relevo de mundo grande (plano "Mundos de 2 km", lote 6, 23/11/2026): lê o
 * relevo "campo" do Molda Cenários (alturas e pesos, sem lotes de terreno) e o desenha em pedaços.
 * O Estúdio só pede o campo para um projeto Python numa versão do runtime que traz isto.
 */
export const PYTHON_MOLDA_RELEVO_FEATURE = 'molda-scene-relevo-v1' as const
/** Host-owned background execution never requests focus from its canvas. */
export const PYTHON_BACKGROUND_FOCUS_FEATURE = 'python-background-focus-v1' as const
export const STUDIO_PYTHON_RUNTIME_FEATURES = [
  'turtle-compound-shapes',
  PYTHON_PROJECT_MISSION_FEATURE,
  PYTHON_PINTA_WORLD_FEATURE,
  PYTHON_PINTA_PHYSICS_FEATURE,
  PYTHON_PINTA_REGIONS_FEATURE,
  PYTHON_MOLDA_SCENE_FEATURE,
  PYTHON_BACKGROUND_FOCUS_FEATURE,
  PYTHON_MOLDA_REGIONS_FEATURE,
  PYTHON_MOLDA_RELEVO_FEATURE,
] as const
export const StudioPythonRuntimeFeatureSchema = z.enum(STUDIO_PYTHON_RUNTIME_FEATURES)
export type StudioPythonRuntimeFeature = z.infer<typeof StudioPythonRuntimeFeatureSchema>
export const StudioPythonRuntimeFeaturesSchema = z
  .array(StudioPythonRuntimeFeatureSchema)
  .max(STUDIO_PYTHON_RUNTIME_FEATURES.length)
  .refine((features) => new Set(features).size === features.length, 'Há recursos Python repetidos.')
