import {
  DEMONSTRATION_RECIPES,
  type DemonstrationSource,
  demonstrationSources,
  type ExecutionContext,
  isDemonstrationAsset,
} from '@sistemazero/marketing-contracts'

const sourceKey = (source: Pick<DemonstrationSource, 'assetId' | 'evidenceRevisionId'>) =>
  `${source.assetId}:${source.evidenceRevisionId}`

/** Bound source selection to this task's factual context, not the entire shared archive. */
export function demonstrationCandidates(context: ExecutionContext, clipId?: string) {
  const document = context.source.document
  const selected =
    document.kind === 'video' && clipId
      ? document.timeline.clips.find((clip) => clip.id === clipId)
      : undefined
  const selectedSources = selected?.demonstration?.sources ?? []
  const usedSources = document.kind === 'video' ? demonstrationSources(document.timeline) : []
  const preferred = new Set(selectedSources.map((source) => source.assetId))
  const used = new Set(usedSources.map((source) => source.assetId))
  const preferredRevisions = new Set(selectedSources.map(sourceKey))
  const usedRevisions = new Set(usedSources.map(sourceKey))
  const candidates = context.evidence.flatMap((revision) => {
    const evidence = revision.document
    if (
      revision.projectId !== context.source.projectId ||
      evidence.kind !== 'evidence' ||
      evidence.classification !== 'fact' ||
      evidence.validity !== 'current'
    )
      return []
    return (evidence.assetIds ?? []).flatMap((id) => {
      const asset = context.assets?.find((asset) => asset.id === id)
      if (!asset || !isDemonstrationAsset(asset) || asset.projectId !== revision.projectId)
        return []
      return [
        {
          assetId: asset.id,
          sha256: asset.sha256,
          width: asset.width,
          height: asset.height,
          evidenceId: revision.entityId,
          evidenceRevisionId: revision.id,
          evidenceTitle: evidence.title,
        },
      ]
    })
  })
  candidates.sort(
    (a, b) =>
      Number(preferred.has(b.assetId)) - Number(preferred.has(a.assetId)) ||
      Number(used.has(b.assetId)) - Number(used.has(a.assetId)) ||
      a.assetId.localeCompare(b.assetId) ||
      Number(preferredRevisions.has(sourceKey(b))) - Number(preferredRevisions.has(sourceKey(a))) ||
      Number(usedRevisions.has(sourceKey(b))) - Number(usedRevisions.has(sourceKey(a))) ||
      a.evidenceRevisionId.localeCompare(b.evidenceRevisionId),
  )
  const seen = new Set<string>()
  return candidates.filter((source) => {
    if (seen.has(source.assetId) || seen.size >= 6) return false
    seen.add(source.assetId)
    return true
  })
}

export function demonstrationGuide(context: ExecutionContext, clipId?: string) {
  const sources = demonstrationCandidates(context, clipId)
  return [
    'Guia de demonstrações marketing v1. Receitas mantidas nesta versão: ' +
      JSON.stringify(DEMONSTRATION_RECIPES),
    'Em clipe kind image use demonstration {schemaVersion:1, recipeId, headline, sources}. Cada fonte tem id UUID estável, assetId, sha256, width, height, evidenceId, evidenceRevisionId, label e focus {x,y,width,height} normalizado. Copie identidades, hashes e dimensões das fontes abaixo; não invente fatos, capturas ou verificações. assetId do clipe é o da primeira fonte. fit contain; effect none. A receita controla somente o movimento de câmera/destaque, sem outro relógio. Não use demonstration em clipe de vídeo.',
    'As imagens anexas da demonstração, quando presentes, seguem a ordem das fontes elegíveis após as amostras de gravação. Só identifique regiões visíveis nelas; se não houver imagem ou localização comprovada, use focus {x:0,y:0,width:1,height:1}. Nunca transforme prints em evidência de movimento do jogo.',
    'Preserve a direção, os fatos, as falas e o CTA da pauta. Duração deve permitir leitura, não comprimir a peça inteira automaticamente. Confira início, final, foco, legibilidade e fontes; aprovação só depois do final renderizado. Null em demonstration quando não usado. Uma revisão não exporta MP4.',
    `Fontes elegíveis deste pedido (até 6; demais arquivos exigem uma seleção mais específica): ${JSON.stringify(sources)}`,
    sources.length
      ? 'Use somente essas fontes para criar demonstrações novas; conserve fontes já vinculadas sem alterar identidade ou conteúdo.'
      : 'Não há imagem factual elegível: não crie uma demonstração. Informe que é preciso vincular uma captura normalizada, sem rotação EXIF e com dimensões verificadas, a uma evidência conferida da pauta.',
  ].join('\n\n')
}
