import { THREE_CDN, THREE_VERSION } from './threeRuntimeContract'

export interface ModuloDeCenas3D {
  script: string
  imports: Record<string, string>
}

/** Lazy, account-independent code only. Scene bytes remain with the caller's captured assets. */
export async function carregarModuloDeCenas3D(): Promise<ModuloDeCenas3D> {
  const { SCENE3D_RUNTIME, SCENE3D_RUNTIME_META } = await import('./scene3dRuntime.generated')
  if (SCENE3D_RUNTIME_META.threeVersion !== THREE_VERSION)
    throw Error('O carregador e o renderer precisam usar a mesma versão do Three.')
  return {
    script: SCENE3D_RUNTIME,
    imports: Object.fromEntries(
      SCENE3D_RUNTIME_META.imports.map((specifier) => [
        specifier,
        specifier === 'three'
          ? THREE_CDN
          : `${THREE_CDN}/examples/jsm/${specifier.slice('three/addons/'.length)}?external=three`,
      ]),
    ),
  }
}
