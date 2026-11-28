import {
  STUDIO_PRO_ENGINE_COPIES as PRO_ENGINE_COPIES,
  STUDIO_PRO_ENGINE_EXTENSION_IDS as PRO_ENGINE_EXTENSION_IDS,
  STUDIO_PRO_ENGINE_VARIANTS as PRO_ENGINE_VARIANTS,
  type StudioProEngineExtensionId as ProEngineExtensionId,
  type StudioProEngineInventory as ProEngineInventory,
  type StudioProEngineVariant as ProEngineVariant,
  studioProEngineCopyPath as proEngineCopyPath,
  studioProEngineCopyEquivalent,
} from '@sistemazero/core/studio/pro-engine-copies'
import { type StudioProPlatformFiles, studioProDigest } from '@sistemazero/core/studio/pro-revision'
import { isDocumentRecord } from '../../core/projectDocument'
import type { ProjectTree } from '../../core/proProject'
import { loadExtensionBootstrapScript } from '../../extensions/runtime'
import { findExtension } from '../../official-extensions'

/**
 * "Atualizar o motor" no Pro (decisão de 23/11/2026: sem troca automática, com uma troca segura).
 * A conversão para o Pro escreve o motor 2D como arquivo do projeto (`public/sz-ext/<id>.js`) e ele
 * fica parado na versão daquele dia. Só oferecemos o motor de agora quando a cópia ainda é, byte a
 * byte, um motor que o próprio Estúdio escreveu: o inventário do core
 * (`@sistemazero/core/studio/pro-engine-copies`, o mesmo que os servidores usam) guarda o sha256 de
 * cada cópia publicada. Uma cópia que não está lá foi editada (ou é de antes de 13/08, quando a
 * fonte ainda morava dentro do motor) e não é trocada nem oferecida.
 */
export {
  PRO_ENGINE_COPIES,
  PRO_ENGINE_EXTENSION_IDS,
  PRO_ENGINE_VARIANTS,
  type ProEngineExtensionId,
  type ProEngineInventory,
  type ProEngineVariant,
  proEngineCopyPath,
}
export const PRO_ENGINE_COPY_PATHS = PRO_ENGINE_EXTENSION_IDS.map(proEngineCopyPath)

/** Os dois textos que a conversão escreve hoje para o motor (os mesmos que o build regional aceita). */
export async function currentProEngineCopies(
  extensionId: ProEngineExtensionId,
): Promise<Record<ProEngineVariant, string>> {
  const extension = findExtension(extensionId)
  if (!extension) throw new Error(`O motor ${extensionId} não está disponível neste Estúdio.`)
  const [full, withoutScene] = await Promise.all([
    loadExtensionBootstrapScript(extension),
    loadExtensionBootstrapScript(extension, { code: '' }),
  ])
  return { completo: full, 'sem-cenario-pinta': withoutScene }
}

/**
 * As cópias do motor que a revisão do Pro aceita como da plataforma, nos caminhos do motor entre
 * `paths`: o sha256 de toda cópia publicada (as duas variantes) e o das duas de agora. A cópia tem
 * perto de 400 mil caracteres, acima do teto de 256 mil por arquivo da revisão; com um destes
 * sha256 ela fica na revisão e no hash, mas fora do orçamento dos arquivos da criança. Uma cópia
 * editada (ou o motor de um jogo em outro caminho) é dela e segue o teto como qualquer arquivo.
 * `undefined` quando nenhum caminho é do motor: nada a carregar.
 */
export async function proEngineRevisionFiles(
  paths: Iterable<string>,
  known: ProEngineInventory = PRO_ENGINE_COPIES,
): Promise<StudioProPlatformFiles | undefined> {
  const present = new Set(paths)
  const files: Record<string, string[]> = {}
  for (const extensionId of PRO_ENGINE_EXTENSION_IDS) {
    const path = proEngineCopyPath(extensionId)
    if (!present.has(path)) continue
    const current = await currentProEngineCopies(extensionId)
    const digests = await Promise.all(
      PRO_ENGINE_VARIANTS.map((variant) => studioProDigest(current[variant])),
    )
    files[path] = [
      ...new Set([
        ...PRO_ENGINE_VARIANTS.flatMap((variant) => known[extensionId][variant]),
        ...digests,
      ]),
    ]
  }
  return Object.keys(files).length ? files : undefined
}

export type ProEngineCopyState =
  | { kind: 'current' }
  | { kind: 'known'; variant: ProEngineVariant }
  | { kind: 'changed' }

export async function classifyProEngineCopy(
  extensionId: ProEngineExtensionId,
  content: string,
  known: ProEngineInventory = PRO_ENGINE_COPIES,
): Promise<ProEngineCopyState> {
  const current = await currentProEngineCopies(extensionId)
  if (PRO_ENGINE_VARIANTS.some((variant) => current[variant] === content))
    return { kind: 'current' }
  const digest = await studioProDigest(content)
  const currentDigests = await Promise.all(
    PRO_ENGINE_VARIANTS.map((variant) => studioProDigest(current[variant])),
  )
  if (
    currentDigests.some((currentDigest) =>
      studioProEngineCopyEquivalent(extensionId, currentDigest, digest),
    )
  )
    return { kind: 'current' }
  const variant = PRO_ENGINE_VARIANTS.find((name) => known[extensionId][name].includes(digest))
  return variant ? { kind: 'known', variant } : { kind: 'changed' }
}

export interface ProEngineCopyUpdate {
  path: string
  extensionId: ProEngineExtensionId
  variant: ProEngineVariant
  /** A cópia que está no projeto, exatamente como foi conferida. */
  before: string
  /** O motor de agora, na mesma variante da cópia antiga. */
  content: string
}

/**
 * As trocas de motor que este projeto pode receber, ou `null` quando não há o que oferecer. Basta
 * uma cópia editada (ou um caminho do motor que não é arquivo) para nada ser oferecido: a troca é
 * do projeto inteiro ou de nenhum arquivo.
 */
export async function proEngineUpdatePlan(
  tree: Readonly<ProjectTree> | undefined,
  known: ProEngineInventory = PRO_ENGINE_COPIES,
): Promise<ProEngineCopyUpdate[] | null> {
  const updates: ProEngineCopyUpdate[] = []
  for (const extensionId of PRO_ENGINE_EXTENSION_IDS) {
    const path = proEngineCopyPath(extensionId)
    const node: unknown = tree?.[path]
    if (node === undefined) continue
    if (!isDocumentRecord(node) || node.kind !== 'file' || typeof node.content !== 'string')
      return null
    const state = await classifyProEngineCopy(extensionId, node.content, known)
    if (state.kind === 'changed') return null
    if (state.kind === 'known')
      updates.push({
        path,
        extensionId,
        variant: state.variant,
        before: node.content,
        content: (await currentProEngineCopies(extensionId))[state.variant],
      })
  }
  return updates.length ? updates : null
}
