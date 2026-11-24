import type { StudioProPlatformFiles } from './pro-build'
import { STUDIO_PRO_ENGINE_COPIES } from './pro-engine-copies.generated'

/**
 * As cópias do motor 2D que a conversão para o Pro escreve como arquivo do projeto
 * (`public/sz-ext/<id>.js`, perto de 400 mil caracteres). Este inventário guarda o sha256 de cada
 * cópia que o Estúdio já publicou e é a fonte única de quem precisa reconhecê-las: o "Atualizar o
 * motor" e a revisão local do Estúdio, e os servidores (BFF, Members e o compilador remoto), que
 * aceitam uma cópia intacta fora do orçamento dos arquivos da criança. O gerador do Estúdio o
 * atualiza: `bun run --cwd packages/studio gen:pro-engine-copies` (o teste do Estúdio falha quando
 * o motor de agora não está aqui).
 */
export const STUDIO_PRO_ENGINE_EXTENSION_IDS = ['game-2d', 'game-2d-advanced'] as const
export type StudioProEngineExtensionId = (typeof STUDIO_PRO_ENGINE_EXTENSION_IDS)[number]
/** `completo` leva o cenário do Pinta; `sem-cenario-pinta` é a variante que a conversão escreve para quem não o usa. */
export const STUDIO_PRO_ENGINE_VARIANTS = ['completo', 'sem-cenario-pinta'] as const
export type StudioProEngineVariant = (typeof STUDIO_PRO_ENGINE_VARIANTS)[number]
export type StudioProEngineInventory = Readonly<
  Record<StudioProEngineExtensionId, Readonly<Record<StudioProEngineVariant, readonly string[]>>>
>

export const studioProEngineCopyPath = (extensionId: StudioProEngineExtensionId) =>
  `public/sz-ext/${extensionId}.js`

export { STUDIO_PRO_ENGINE_COPIES }

/** Cada caminho do motor com todo sha256 publicado nele, nas duas variantes. */
export function studioProEnginePlatformFiles(
  inventory: StudioProEngineInventory = STUDIO_PRO_ENGINE_COPIES,
): StudioProPlatformFiles {
  return Object.fromEntries(
    STUDIO_PRO_ENGINE_EXTENSION_IDS.map((extensionId) => [
      studioProEngineCopyPath(extensionId),
      [
        ...new Set(
          STUDIO_PRO_ENGINE_VARIANTS.flatMap((variant) => inventory[extensionId][variant]),
        ),
      ],
    ]),
  )
}

/** Os arquivos da plataforma que todo host reconhece num Pro JavaScript: as cópias publicadas do motor. */
export const STUDIO_PRO_PLATFORM_FILES: StudioProPlatformFiles = studioProEnginePlatformFiles()
