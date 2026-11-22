import { pythonPgzeroRegional } from '../../../../pinta/src/export/pythonPgzeroRegional'
import { pythonPygameAffine } from '../../../../pinta/src/export/pythonPygameAffine'
import { pythonRaylib2dRegional } from '../../../../pinta/src/export/pythonRaylib2dRegional'
import {
  buildPygamePintaScenesModule,
  composePintaScenesModule,
} from '../../../../pinta/src/export/pythonScenesModuleSource'
import {
  pythonPintaPgzeroBrowserAdapter,
  pythonPintaRaylib2dBrowserAdapter,
} from './pintaBrowserSceneSource'
import type { PythonPintaScenesCanvas } from './pintaScenesContract'

type PintaSceneModuleTarget =
  | { canvas: 'python-pygame'; legacySource: string }
  | { canvas: Exclude<PythonPintaScenesCanvas, 'python-pygame'>; environment: 'browser' | 'native' }

/** Select the backend supplied by the active canvas extension. */
export function buildPythonPintaScenesModule(target: PintaSceneModuleTarget) {
  switch (target.canvas) {
    case 'python-pygame':
      return buildPygamePintaScenesModule(target.legacySource)
    case 'python-pgzero':
      return composePintaScenesModule(
        'CenarioRegionalPygameZero',
        target.environment === 'browser'
          ? pythonPintaPgzeroBrowserAdapter
          : pythonPygameAffine + pythonPgzeroRegional,
      )
    case 'python-raylib-2d':
      return composePintaScenesModule(
        'CenarioRegionalRaylib2D',
        target.environment === 'browser'
          ? pythonPintaRaylib2dBrowserAdapter
          : pythonRaylib2dRegional,
      )
  }
}
