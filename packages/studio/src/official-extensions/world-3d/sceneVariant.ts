// O cenário do Molda só entra no Mundo 3D que usa cenário; a regra é a comum (`../sceneVariant.ts`).
export {
  sceneRuntimeVariant as world3DRuntimeVariant,
  usesMoldaScene as world3DUsesScene,
  WITHOUT_SCENE_VARIANT as WORLD_3D_WITHOUT_SCENE_VARIANT,
} from '../sceneVariant'
