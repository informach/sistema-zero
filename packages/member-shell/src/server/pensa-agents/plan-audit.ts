import type { PensaStageView } from '../../lib/types'
import type {
  availablePlannerCatalog,
  PlanReviewArtifact,
  VisualDirectionArtifact,
} from './planner-contract'

type PlannerCatalog = ReturnType<typeof availablePlannerCatalog>

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
      message: 'A Bíblia Visual possui IDs de asset repetidos.',
      taskKey: null,
    })
  }
  for (const task of stage.tasks) {
    if (task.context.kind === 'pinta') {
      const asset = inventory.get(task.context.assetId)
      if (!asset || asset.kind !== task.context.artKind) {
        findings.push({
          severity: 'error',
          message: 'O brief não corresponde a uma arte 2D da Bíblia Visual.',
          taskKey: task.id,
        })
        continue
      }
      coverage.set(asset.id, (coverage.get(asset.id) ?? 0) + 1)
      continue
    }
    for (const assetId of task.context.visualAssetIds) {
      const asset = inventory.get(assetId)
      if (!asset || ['sprite', 'background', 'tileset', 'tilemap'].includes(asset.kind)) {
        findings.push({
          severity: 'error',
          message: `O asset ${assetId} foi atribuído à ferramenta errada.`,
          taskKey: task.id,
        })
        continue
      }
      coverage.set(asset.id, (coverage.get(asset.id) ?? 0) + 1)
    }
  }
  for (const asset of visual.assets) {
    if (coverage.get(asset.id) !== 1) {
      findings.push({
        severity: 'error',
        message: `O asset ${asset.name} precisa de exatamente um Cartão de Criação.`,
        taskKey: null,
      })
    }
  }
}

/** Auditoria determinística executada ao gerar a revisão e novamente no avanço O. */
export function auditPlan(
  stage: PensaStageView,
  catalog: PlannerCatalog,
  dimension: '2d' | '3d',
  approved: boolean,
  visual?: VisualDirectionArtifact,
): PlanReviewArtifact {
  const findings: PlanReviewArtifact['findings'] = []
  const blocks = new Map(catalog.blocks.map((block) => [block.type, block]))
  const documents = new Set(catalog.documents.map((document) => document.extension))
  const extensions = new Set([
    ...catalog.blocks.flatMap((block) => (block.extension ? [block.extension] : [])),
    ...documents,
  ])
  if (stage.tasks.length === 0)
    findings.push({ severity: 'error', message: 'O plano não possui tarefas.', taskKey: null })
  const completed = new Set<string>()
  for (const task of stage.tasks) {
    if (!task.guide.steps.some((item) => item.required)) {
      findings.push({
        severity: 'error',
        message: 'A tarefa não possui passos obrigatórios.',
        taskKey: task.id,
      })
    }
    if (!task.guide.criteria.some((item) => item.required)) {
      findings.push({
        severity: 'error',
        message: 'A tarefa não possui critérios obrigatórios.',
        taskKey: task.id,
      })
    }
    if (!task.dependencies.every((id) => completed.has(id))) {
      findings.push({
        severity: 'error',
        message: 'A ordem das dependências ficou inválida.',
        taskKey: task.id,
      })
    }
    if (task.context.kind === 'studio') {
      const resolvedBlockIds = new Set(task.context.blocks.map((block) => block.id))
      if (task.context.dimension !== dimension) {
        findings.push({
          severity: 'error',
          message: 'A tarefa usa a dimensão errada.',
          taskKey: task.id,
        })
      }
      for (const blockId of task.context.blockIds) {
        if (!blocks.has(blockId)) {
          findings.push({
            severity: 'error',
            message: `O bloco ${blockId} não está mais disponível.`,
            taskKey: task.id,
          })
        }
        if (!resolvedBlockIds.has(blockId)) {
          findings.push({
            severity: 'error',
            message: `O bloco ${blockId} não possui metadados resolvidos.`,
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
            message: `Os dados do bloco ${block.id} divergiram do catálogo oficial.`,
            taskKey: task.id,
          })
        }
      }
      for (const documentId of task.context.mechanicDocumentIds) {
        if (!documents.has(documentId))
          findings.push({
            severity: 'error',
            message: `O manual ${documentId} não está mais disponível.`,
            taskKey: task.id,
          })
      }
      for (const extensionId of task.context.extensionIds) {
        if (!extensions.has(extensionId))
          findings.push({
            severity: 'error',
            message: `A extensão ${extensionId} não está mais disponível.`,
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
      message: 'Ordem, dependências, guias, artes e catálogo estão consistentes.',
      taskKey: null,
    })
  return {
    approved: approved && !hasError,
    findings,
    recommendations: hasError ? ['Corrija os itens marcados e execute uma nova auditoria.'] : [],
    auditedAt: new Date().toISOString(),
  }
}
