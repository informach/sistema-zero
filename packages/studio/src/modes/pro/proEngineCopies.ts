import { studioProDigest } from '@sistemazero/core/studio/pro-revision'
import { isDocumentRecord } from '../../core/projectDocument'
import type { ProjectTree } from '../../core/proProject'
import { loadExtensionBootstrapScript } from '../../extensions/runtime'
import { findExtension } from '../../official-extensions'
import { PRO_ENGINE_COPIES } from './proEngineCopies.generated'

/**
 * "Atualizar o motor" no Pro (decisão de 23/11/2026: sem troca automática, com uma troca segura).
 * A conversão para o Pro escreve o motor 2D como arquivo do projeto (`public/sz-ext/<id>.js`) e ele
 * fica parado na versão daquele dia. Só oferecemos o motor de agora quando a cópia ainda é, byte a
 * byte, um motor que o próprio Estúdio escreveu: o inventário `proEngineCopies.generated.ts` guarda
 * o sha256 de cada cópia publicada. Uma cópia que não está lá foi editada (ou é de antes de 13/08,
 * quando a fonte ainda morava dentro do motor) e não é trocada nem oferecida.
 */
export const PRO_ENGINE_EXTENSION_IDS = ['game-2d', 'game-2d-advanced'] as const
export type ProEngineExtensionId = (typeof PRO_ENGINE_EXTENSION_IDS)[number]
/** `completo` leva o cenário do Pinta; `sem-cenario-pinta` é a variante que a conversão escreve para quem não o usa. */
export const PRO_ENGINE_VARIANTS = ['completo', 'sem-cenario-pinta'] as const
export type ProEngineVariant = (typeof PRO_ENGINE_VARIANTS)[number]
export type ProEngineInventory = Readonly<
  Record<ProEngineExtensionId, Readonly<Record<ProEngineVariant, readonly string[]>>>
>

export const proEngineCopyPath = (extensionId: ProEngineExtensionId) =>
  `public/sz-ext/${extensionId}.js`
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
