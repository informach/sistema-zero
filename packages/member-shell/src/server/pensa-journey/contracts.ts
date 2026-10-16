import type { PensaCapabilitySnapshot, PensaProposal } from '@sistemazero/core/pensa'
import { z } from 'zod'
import { dimensionAllows } from '../pensa-agents/planner-contract'

const short = (max: number) => z.string().trim().min(1).max(max)
const ids = (max = 30) => z.array(short(160)).max(max)
export const ProposalDraftSchema = z.strictObject({
  title: short(100),
  summary: short(600),
  firstResult: short(400),
  essentials: z.array(short(180)).min(1).max(3),
  suggestions: z.array(short(180)).max(3),
  later: z.array(z.strictObject({ text: short(500), origin: z.enum(['child', 'zappy']) })).max(12),
  dimension: z.enum(['2d', '3d']),
  missions: z
    .array(
      z.strictObject({
        key: short(80),
        destination: z.enum(['studio', 'pinta', 'molda']),
        title: short(120),
        result: short(400),
        dependencies: ids(8),
        // Missão CURTA: até 16 blocos. É também o que deixa o guia de oito missões caber no teto
        // do pedido (os blocos da missão vão sempre, com nome e caminho na paleta).
        blockIds: ids(16),
        extensionIds: ids(10),
        mechanicIds: ids(10),
        toolIds: ids(16),
        asset: z
          .strictObject({
            id: short(100),
            kind: z.enum(['sprite', 'background', 'tileset', 'tilemap', 'model', 'texture', 'sky']),
            source: z.enum(['new', 'existing', 'editor']),
            creationId: short(120).nullable(),
            description: short(1000),
          })
          .nullable(),
      }),
    )
    .min(1)
    .max(8),
  test: z.strictObject({ action: short(400), expected: short(400) }),
  referenceIds: ids(6),
})
export type ProposalDraft = z.infer<typeof ProposalDraftSchema>
export const PlanningReplySchema = z.strictObject({
  question: short(500).nullable(),
  proposal: ProposalDraftSchema.nullable(),
})
export const GuideDraftSchema = z.strictObject({
  missions: z
    .array(
      z.strictObject({
        key: short(80),
        steps: z
          .array(z.strictObject({ action: short(180), where: short(180), effect: short(180) }))
          .min(1)
          .max(6),
        testAction: short(300),
        expected: short(300),
      }),
    )
    .min(1)
    .max(8),
})
export const HelpReplySchema = z.strictObject({ text: short(1500) })

/** Lista curta de ids para o motivo: o reparo precisa saber QUAL, não receber o catálogo. */
function list(ids: readonly string[]): string {
  const shown = ids.slice(0, 8).join(', ')
  return ids.length > 8 ? `${shown} e mais ${ids.length - 8}` : shown
}

/**
 * A revisão editorial não substitui estas restrições determinísticas. Cada motivo diz a MISSÃO
 * (pela chave) e o id que reprovou: é o que o revisor e a tentativa de reparo recebem (antes era
 * "Bloco indisponível.", e o modelo não tinha como saber qual trocar).
 */
export function validateJourneyProposal(
  proposal: Pick<PensaProposal, 'dimension' | 'missions'>,
  caps: PensaCapabilitySnapshot,
  mechanics: readonly string[],
  existingCreations: readonly string[] = [],
  inventory?: readonly { id: string; kind: string }[],
  blocks?: readonly { type: string; extension: string | null; category?: string }[],
): string[] {
  const issues: string[] = []
  if (!caps.studio || !caps.dimensions.includes(proposal.dimension))
    issues.push(`O Estúdio não está disponível para um jogo ${proposal.dimension.toUpperCase()}.`)
  if (!proposal.missions.some((m) => m.destination === 'studio'))
    issues.push('Falta uma missão do Estúdio que construa o jogo.')
  const previous = new Map<string, (typeof proposal.missions)[number]>()
  const assetIds = new Set<string>()
  const blockById = new Map(blocks?.map((block) => [block.type, block]))
  for (const mission of proposal.missions) {
    const at = `Missão "${mission.key}"`
    if (previous.has(mission.key)) issues.push(`${at}: a chave se repete.`)
    const badDependencies = mission.dependencies.filter((id) => !previous.has(id))
    if (badDependencies.length)
      issues.push(
        `${at}: depende de ${list(badDependencies)}, que não é uma missão anterior a ela.`,
      )
    if (!caps[mission.destination])
      issues.push(`${at}: a ferramenta ${mission.destination} não está disponível.`)
    const lockedBlocks = mission.blockIds.filter((id) => !caps.blockIds.includes(id))
    if (lockedBlocks.length)
      issues.push(`${at}: blocos fora da paleta da criança: ${list(lockedBlocks)}.`)
    const lockedExtensions = mission.extensionIds.filter((id) => !caps.extensionIds.includes(id))
    if (lockedExtensions.length)
      issues.push(`${at}: extensões indisponíveis: ${list(lockedExtensions)}.`)
    const threeD = [
      ...[...mission.extensionIds, ...mission.mechanicIds].filter(
        (extension) => !dimensionAllows({ extension }, proposal.dimension),
      ),
      ...mission.blockIds.filter((id) => {
        const block = blockById.get(id)
        return block ? !dimensionAllows(block, proposal.dimension) : false
      }),
    ]
    if (threeD.length) issues.push(`${at}: recurso 3D num jogo 2D: ${list([...new Set(threeD)])}.`)
    if (blocks) {
      const missing = new Map<string, string[]>()
      for (const id of mission.blockIds) {
        const extension = blockById.get(id)?.extension
        if (extension && !mission.extensionIds.includes(extension))
          missing.set(extension, [...(missing.get(extension) ?? []), id])
      }
      for (const [extension, ids] of missing)
        issues.push(
          `${at}: os blocos ${list(ids)} são da extensão ${extension}, que falta em extensionIds.`,
        )
    }
    const unknownManuals = mission.mechanicIds.filter((id) => !mechanics.includes(id))
    if (unknownManuals.length)
      issues.push(`${at}: manuais desconhecidos em mechanicIds: ${list(unknownManuals)}.`)
    const lockedTools = mission.toolIds.filter((id) => !caps.moldaTools.includes(id))
    if (lockedTools.length)
      issues.push(`${at}: ferramentas do Molda indisponíveis: ${list(lockedTools)}.`)
    if (
      mission.destination === 'studio' &&
      caps.studioAuthoring !== 'code' &&
      !mission.blockIds.length
    )
      issues.push(`${at}: missão do Estúdio sem nenhum bloco em blockIds.`)
    if (mission.destination === 'molda' && !mission.toolIds.length)
      issues.push(`${at}: missão do Molda sem nenhuma ferramenta em toolIds.`)
    if (mission.destination !== 'studio' && !mission.asset)
      issues.push(`${at}: missão de arte sem asset definido.`)
    if (mission.asset) {
      const asset = mission.asset
      if (proposal.dimension === '2d' && ['model', 'texture', 'sky'].includes(asset.kind))
        issues.push(`${at}: a arte ${asset.id} (${asset.kind}) precisa de um jogo 3D.`)
      if (asset.source === 'existing' && mission.destination !== 'studio')
        issues.push(
          `${at}: a arte guardada ${asset.creationId ?? asset.id} entra direto numa missão do Estúdio, sem missão para desenhar de novo.`,
        )
      if (
        asset.source === 'existing' &&
        (!asset.creationId || !existingCreations.includes(asset.creationId))
      )
        issues.push(
          `${at}: a criação guardada ${asset.creationId ?? '(sem creationId)'} não está no inventário.`,
        )
      else if (asset.source === 'existing' && inventory) {
        const found = inventory.find((item) => item.id === asset.creationId)
        if (found && found.kind !== asset.kind)
          issues.push(
            `${at}: a criação guardada ${asset.creationId} é ${found.kind}, não ${asset.kind}.`,
          )
      }
      if (
        mission.destination === 'pinta' &&
        !['sprite', 'background', 'tileset', 'tilemap'].includes(asset.kind)
      )
        issues.push(`${at}: arte ${asset.kind} não é feita no Pinta.`)
      if (mission.destination === 'molda' && !['model', 'texture', 'sky'].includes(asset.kind))
        issues.push(`${at}: arte ${asset.kind} não é feita no Molda.`)
      if (assetIds.has(asset.id)) issues.push(`${at}: a arte ${asset.id} se repete.`)
      assetIds.add(asset.id)
    }
    previous.set(mission.key, mission)
  }
  // Toda arte produzida tem uma etapa posterior que a leva para dentro do jogo.
  const dependsOn = (key: string, wanted: string, seen = new Set<string>()): boolean => {
    if (seen.has(key)) return false
    seen.add(key)
    return (
      previous
        .get(key)
        ?.dependencies.some((dep) => dep === wanted || dependsOn(dep, wanted, seen)) ?? false
    )
  }
  for (const mission of proposal.missions.filter((m) => m.destination !== 'studio')) {
    if (!proposal.missions.some((m) => m.destination === 'studio' && dependsOn(m.key, mission.key)))
      issues.push(
        `Missão "${mission.key}": a arte não entra no jogo; falta uma missão do Estúdio que dependa dela.`,
      )
  }
  return [...new Set(issues)]
}
