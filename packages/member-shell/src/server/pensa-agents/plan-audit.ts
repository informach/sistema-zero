import type { PensaStageView, PensaTaskView } from '../../lib/types'
import {
  type availablePlannerCatalog,
  clipText,
  type PlanReviewArtifact,
  type VisualDirectionArtifact,
} from './planner-contract'

type PlannerCatalog = ReturnType<typeof availablePlannerCatalog>
type ToolCapabilities = {
  moldaAvailable: boolean
  pintaAvailable: boolean
  studioAvailable: boolean
}

/*
 * Toda mensagem daqui aparece na TELA da criança (a lista da Revisão do Plano). Por isso o
 * cartão é chamado pelo TÍTULO que ela vê, o item pelo nome da Bíblia Visual e o bloco pelo
 * rótulo da paleta; nunca um id, "asset", "metadados" ou "auditoria".
 */
/**
 * Cada mensagem cabe nos 500 caracteres do artefato mesmo com título e nome compridos. O corte é
 * por CARACTERE: por unidade UTF-16 um emoji na borda virava meio par e o artefato não salvava.
 */
const short = (text: string) => (Array.from(text).length > 120 ? `${clipText(text, 119)}…` : text)
const card = (task: PensaTaskView) => `O cartão "${short(task.title)}"`

function addVisualCoverageFindings(
  stage: PensaStageView,
  visual: VisualDirectionArtifact,
  findings: PlanReviewArtifact['findings'],
): void {
  const inventory = new Map(visual.assets.map((asset) => [asset.id, asset]))
  const coverage = new Map<string, number>()
  if (inventory.size !== visual.assets.length) {
    findings.push({
      severity: 'error',
      message: 'A Bíblia Visual tem itens repetidos.',
      taskKey: null,
    })
  }
  for (const task of stage.tasks) {
    if (task.context.kind === 'molda') {
      const asset = inventory.get(task.context.assetId)
      const inventoryKind = task.context.artKind === 'texture' ? 'material' : task.context.artKind
      if (!asset || asset.kind !== inventoryKind)
        findings.push({
          severity: 'error',
          message: `${card(task)} não combina com nenhuma criação 3D da Bíblia Visual.`,
          taskKey: task.id,
        })
      else coverage.set(asset.id, (coverage.get(asset.id) ?? 0) + 1)
      continue
    }
    if (task.context.kind === 'pinta') {
      const asset = inventory.get(task.context.assetId)
      if (!asset || asset.kind !== task.context.artKind) {
        findings.push({
          severity: 'error',
          message: `${card(task)} não combina com nenhum desenho da Bíblia Visual.`,
          taskKey: task.id,
        })
        continue
      }
      coverage.set(asset.id, (coverage.get(asset.id) ?? 0) + 1)
      continue
    }
    for (const assetId of task.context.visualAssetIds) {
      const asset = inventory.get(assetId)
      if (!asset) {
        findings.push({
          severity: 'error',
          message: `${card(task)} usa uma criação que não está na Bíblia Visual.`,
          taskKey: task.id,
        })
        continue
      }
      if (['sprite', 'background', 'tileset', 'tilemap'].includes(asset.kind)) {
        findings.push({
          severity: 'error',
          message: `${card(task)} quer criar "${short(asset.name)}", mas esse desenho é feito no Pinta.`,
          taskKey: task.id,
        })
        continue
      }
      coverage.set(asset.id, (coverage.get(asset.id) ?? 0) + 1)
    }
  }
  for (const asset of visual.assets) {
    const count = coverage.get(asset.id) ?? 0
    if (count === 0)
      findings.push({
        severity: 'error',
        message: `"${short(asset.name)}" ainda não tem um Cartão de Criação.`,
        taskKey: null,
      })
    else if (count > 1)
      findings.push({
        severity: 'error',
        message: `"${short(asset.name)}" aparece em mais de um Cartão de Criação.`,
        taskKey: null,
      })
  }
}

/** Auditoria determinística executada ao gerar a revisão e novamente no avanço O. */
export function auditPlan(
  stage: PensaStageView,
  catalog: PlannerCatalog,
  dimension: '2d' | '3d',
  approved: boolean,
  visual: VisualDirectionArtifact | undefined,
  capabilities: ToolCapabilities,
): PlanReviewArtifact {
  const findings: PlanReviewArtifact['findings'] = []
  const blocks = new Map(catalog.blocks.map((block) => [block.type, block]))
  const documents = new Set(catalog.documents.map((document) => document.extension))
  const extensions = new Set([
    ...catalog.blocks.flatMap((block) => (block.extension ? [block.extension] : [])),
    ...documents,
  ])
  if (stage.tasks.length === 0)
    findings.push({
      severity: 'error',
      message: 'O plano ainda não tem nenhum Cartão de Criação.',
      taskKey: null,
    })
  const completed = new Set<string>()
  const existing = new Set(stage.tasks.map((task) => task.id))
  for (const task of stage.tasks) {
    if (task.context.kind === 'molda' && (!capabilities.moldaAvailable || dimension !== '3d'))
      findings.push({
        severity: 'error',
        message: `${card(task)} vai para o Molda, que não está liberado para este plano.`,
        taskKey: task.id,
      })
    if (task.context.kind === 'pinta' && !capabilities.pintaAvailable)
      findings.push({
        severity: 'error',
        message: `${card(task)} vai para o Pinta, que ainda não está liberado para você.`,
        taskKey: task.id,
      })
    if (task.context.kind === 'studio' && !capabilities.studioAvailable)
      findings.push({
        severity: 'error',
        message: `${card(task)} vai para o Estúdio, que ainda não está liberado para você.`,
        taskKey: task.id,
      })
    if (!task.guide.steps.some((item) => item.required)) {
      findings.push({
        severity: 'error',
        message: `${card(task)} precisa de pelo menos um passo obrigatório.`,
        taskKey: task.id,
      })
    }
    if (!task.guide.criteria.some((item) => item.required)) {
      findings.push({
        severity: 'error',
        message: `${card(task)} precisa de pelo menos um critério de conclusão obrigatório.`,
        taskKey: task.id,
      })
    }
    if (!task.dependencies.every((id) => completed.has(id))) {
      findings.push({
        severity: 'error',
        message: task.dependencies.every((id) => existing.has(id))
          ? `${card(task)} depende de um cartão que vem depois dele.`
          : `${card(task)} depende de um cartão que não existe mais.`,
        taskKey: task.id,
      })
    }
    if (task.context.kind === 'studio') {
      const resolved = new Map(task.context.blocks.map((block) => [block.id, block]))
      if (task.context.dimension !== dimension) {
        findings.push({
          severity: 'error',
          message: `${card(task)} foi feito para um jogo ${task.context.dimension.toUpperCase()}, e este jogo é ${dimension.toUpperCase()}.`,
          taskKey: task.id,
        })
      }
      for (const blockId of task.context.blockIds) {
        const label = resolved.get(blockId)?.label
        const named = label ? `o bloco "${short(label)}"` : 'um bloco'
        if (!blocks.has(blockId)) {
          findings.push({
            severity: 'error',
            message: `${card(task)} usa ${named}, que não está disponível neste jogo agora.`,
            taskKey: task.id,
          })
        }
        if (!label) {
          findings.push({
            severity: 'error',
            message: `${card(task)} usa um bloco que o Estúdio não reconhece.`,
            taskKey: task.id,
          })
        }
      }
      for (const block of task.context.blocks) {
        const official = blocks.get(block.id)
        if (
          !task.context.blockIds.includes(block.id) ||
          !official ||
          official.label !== block.label ||
          official.category !== block.category ||
          official.subcategory !== block.subcategory ||
          official.area !== block.area ||
          official.extension !== block.extension
        ) {
          findings.push({
            severity: 'error',
            message: `${card(task)} usa o bloco "${short(block.label)}", que mudou no Estúdio.`,
            taskKey: task.id,
          })
        }
      }
      for (const documentId of task.context.mechanicDocumentIds) {
        if (!documents.has(documentId))
          findings.push({
            severity: 'error',
            message: `${card(task)} usa um manual do Estúdio que não está liberado para você.`,
            taskKey: task.id,
          })
      }
      for (const extensionId of task.context.extensionIds) {
        if (!extensions.has(extensionId))
          findings.push({
            severity: 'error',
            message: `${card(task)} usa uma ferramenta do Estúdio que não está liberada para você.`,
            taskKey: task.id,
          })
      }
    }
    completed.add(task.id)
  }
  if (visual) addVisualCoverageFindings(stage, visual, findings)
  const hasError = findings.some((finding) => finding.severity === 'error')
  if (!hasError)
    findings.push({
      severity: 'info',
      message: 'Tudo certo: os cartões estão na ordem e cada criação tem o seu.',
      taskKey: null,
    })
  return {
    approved: approved && !hasError,
    findings,
    recommendations: hasError ? ['Arrume os cartões marcados e revise o plano de novo.'] : [],
    auditedAt: new Date().toISOString(),
  }
}
