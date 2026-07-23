export interface Canvas3DAddon {
  name: string
  module: string
  preview: 'supported' | 'unavailable'
}

export interface Canvas3DAddonGroup {
  group: string
  items: readonly Canvas3DAddon[]
}

/** Valor de UI que pede ao Studio para resolver o módulo pelo catálogo. */
export const CANVAS3D_AUTO_ADDON_MODULE = 'automático'

/**
 * Catálogo completo para compatibilidade de parser e projetos salvos. O picker
 * usa somente as entradas suportadas pelo sandbox do Studio.
 */
export const CANVAS3D_ADDON_GROUPS: readonly Canvas3DAddonGroup[] = [
  {
    group: '📦 Carregadores',
    items: [
      {
        name: 'GLTFLoader',
        module: 'three/addons/loaders/GLTFLoader.js',
        preview: 'supported',
      },
      { name: 'FBXLoader', module: 'three/addons/loaders/FBXLoader.js', preview: 'supported' },
      { name: 'OBJLoader', module: 'three/addons/loaders/OBJLoader.js', preview: 'supported' },
      { name: 'RGBELoader', module: 'three/addons/loaders/RGBELoader.js', preview: 'supported' },
      {
        name: 'DRACOLoader',
        module: 'three/addons/loaders/DRACOLoader.js',
        preview: 'unavailable',
      },
      {
        name: 'KTX2Loader',
        module: 'three/addons/loaders/KTX2Loader.js',
        preview: 'unavailable',
      },
    ],
  },
  {
    group: '🎮 Controles',
    items: [
      {
        name: 'OrbitControls',
        module: 'three/addons/controls/OrbitControls.js',
        preview: 'supported',
      },
      {
        name: 'PointerLockControls',
        module: 'three/addons/controls/PointerLockControls.js',
        // O sandbox do preview ganhou `allow-pointer-lock` (PreviewIframe/StudioProjectPlayer),
        // então o modo FPS com `requestPointerLock` roda no preview — oferecido no picker.
        preview: 'supported',
      },
    ],
  },
  {
    group: '✨ Efeitos (pós-processamento)',
    items: [
      {
        name: 'EffectComposer',
        module: 'three/addons/postprocessing/EffectComposer.js',
        preview: 'supported',
      },
      {
        name: 'RenderPass',
        module: 'three/addons/postprocessing/RenderPass.js',
        preview: 'supported',
      },
      {
        name: 'ShaderPass',
        module: 'three/addons/postprocessing/ShaderPass.js',
        preview: 'supported',
      },
      {
        name: 'UnrealBloomPass',
        module: 'three/addons/postprocessing/UnrealBloomPass.js',
        preview: 'supported',
      },
      {
        name: 'OutputPass',
        module: 'three/addons/postprocessing/OutputPass.js',
        preview: 'supported',
      },
    ],
  },
  {
    group: '🌊 Objetos',
    items: [
      { name: 'Water', module: 'three/addons/objects/Water.js', preview: 'supported' },
      { name: 'Sky', module: 'three/addons/objects/Sky.js', preview: 'supported' },
    ],
  },
  {
    group: '📏 Linhas',
    items: [
      { name: 'Line2', module: 'three/addons/lines/Line2.js', preview: 'supported' },
      {
        name: 'LineGeometry',
        module: 'three/addons/lines/LineGeometry.js',
        preview: 'supported',
      },
      {
        name: 'LineMaterial',
        module: 'three/addons/lines/LineMaterial.js',
        preview: 'supported',
      },
    ],
  },
]

export const CANVAS3D_STUDIO_ADDON_GROUPS: readonly Canvas3DAddonGroup[] =
  CANVAS3D_ADDON_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.preview === 'supported'),
  })).filter((group) => group.items.length > 0)

export const CANVAS3D_ADDON_MODULES: Readonly<Record<string, string>> = Object.fromEntries(
  CANVAS3D_ADDON_GROUPS.flatMap((group) =>
    group.items.map((item) => [item.name, item.module] as const),
  ),
)

export const CANVAS3D_ADDON_CLASSES: ReadonlySet<string> = new Set(
  CANVAS3D_ADDON_GROUPS.flatMap((group) => group.items.map((item) => item.name)),
)

export const CANVAS3D_STUDIO_ADDON_NAMES: readonly string[] = CANVAS3D_STUDIO_ADDON_GROUPS.flatMap(
  (group) => group.items.map((item) => item.name),
)

export interface Canvas3DResolvedAddonImport {
  names: string[]
  module: string
}

/**
 * Resolve os nomes conhecidos pelo módulo real e preserva nomes livres no caminho
 * manual informado. Addons de arquivos diferentes não podem compartilhar uma
 * declaração import, inclusive quando a Ponte trouxe um caminho explícito.
 */
export function resolveCanvas3DAddonImports(
  names: readonly string[],
  selectedModule: string,
): Canvas3DResolvedAddonImport[] | null {
  const grouped = new Map<string, string[]>()
  for (const rawName of names) {
    const name = rawName.trim()
    if (!name) continue
    const module = CANVAS3D_ADDON_MODULES[name] ?? selectedModule
    if (!module || module === CANVAS3D_AUTO_ADDON_MODULE) return null
    const moduleNames = grouped.get(module) ?? []
    moduleNames.push(name)
    grouped.set(module, moduleNames)
  }
  if (grouped.size === 0) return null
  return Array.from(grouped, ([module, moduleNames]) => ({ names: moduleNames, module }))
}

/** Um import estruturado não pode ligar um nome conhecido a outro arquivo. */
export function isCanvas3DAddonImportCanonical(names: readonly string[], module: string): boolean {
  return names.every((rawName) => {
    const canonicalModule = CANVAS3D_ADDON_MODULES[rawName.trim()]
    return !canonicalModule || canonicalModule === module
  })
}

export function canvas3DAddonImport(name: string): { name: string; module: string } {
  const module = CANVAS3D_ADDON_MODULES[name]
  if (!module) throw new Error(`Addon Canvas 3D desconhecido: ${name}`)
  return { name, module }
}
