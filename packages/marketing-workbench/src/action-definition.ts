import {
  approvedEditionSchema,
  approveEditionSchema,
  batchResultSchema,
  configureMonitoringSchema,
  createDeliverySchema,
  deliveryActionSchema,
  deliverySchema,
  idSchema,
  importCalendarApplySchema,
  importCalendarResultSchema,
  importReconcileApplySchema,
  importReconcileResultSchema,
  importStructureApplySchema,
  importStructureResultSchema,
  learningPieceSchema,
  metricsAnalysisSchema,
  monitoringObservationSchema,
  monitoringViewSchema,
  productionRecordSchema,
  recordProductionSchema,
  voidProductionResultSchema,
  voidProductionSchema,
} from '@sistemazero/marketing-contracts'

/** Only known editorial commands can be recovered. Local storage never defines arbitrary requests. */
export function actionDefinition(
  path: string,
  input: Record<string, unknown>,
  operationId: string,
) {
  const parts = path.split('/'),
    projectId = idSchema.parse(parts[2]),
    body = { ...input, operationId }
  if (parts[0] !== '' || parts[1] !== 'projects') throw new Error('Pedido local fora de um projeto')
  if (parts.length === 4 && parts[3] === 'production-records')
    return {
      projectId,
      body: recordProductionSchema.parse(body),
      label: 'Registrar produção',
      detail: 'Tempo declarado ou avaliação de um resultado, com histórico.',
      result: productionRecordSchema,
    }
  if (parts.length === 5 && parts[3] === 'production-records' && parts[4] === 'void')
    return {
      projectId,
      body: voidProductionSchema.parse(body),
      label: 'Anular registro de produção',
      detail: 'Retira o registro do relatório e preserva seu histórico.',
      result: voidProductionResultSchema,
    }
  if (parts.length === 6 && parts[3] === 'monitors') {
    idSchema.parse(parts[4])
    if (parts[5] === 'configure')
      return {
        projectId,
        body: configureMonitoringSchema.parse(body),
        label: 'Configurar acompanhamento',
        detail: 'Agenda e orçamento da fonte selecionada.',
        result: monitoringViewSchema,
      }
    if (parts[5] === 'observations')
      return {
        projectId,
        body: monitoringObservationSchema.parse(body),
        label: 'Registrar observação da pesquisa',
        detail: 'Vincula a revisão conferida sem alterar a estratégia.',
        result: monitoringViewSchema,
      }
  }
  if (parts.length === 4 && parts[3] === 'learning-pieces') {
    const parsed = learningPieceSchema.parse(body)
    return {
      projectId,
      body: parsed,
      label: 'Criar pauta a partir da análise',
      detail: parsed.title,
      result: batchResultSchema,
    }
  }
  if (parts.length === 6 && parts[3] === 'imports' && parts[5] === 'reconcile') {
    idSchema.parse(parts[4])
    return {
      projectId,
      body: importReconcileApplySchema.parse(body),
      label: 'Reaproveitar origens sem mudanças',
      detail:
        'Mantém decisões, conferências e vínculos compatíveis sem substituir revisões da equipe.',
      result: importReconcileResultSchema,
    }
  }
  if (parts.length === 4 && parts[3] === 'import-calendars') {
    const parsed = importCalendarApplySchema.parse(body)
    return {
      projectId,
      body: parsed,
      label: 'Vincular pauta ao calendário',
      detail: `Peça ${parsed.key}. Preserva a copy e a data editorial.`,
      result: importCalendarResultSchema,
    }
  }
  if (parts.length === 4 && parts[3] === 'import-structures') {
    const parsed = importStructureApplySchema.parse(body)
    return {
      projectId,
      body: parsed,
      label: 'Converter fonte em peça editável',
      detail: `Peça ${parsed.key}. Mantém a origem e confere alterações da equipe.`,
      result: importStructureResultSchema,
    }
  }
  if (parts.length === 4 && parts[3] === 'editions') {
    const parsed = approveEditionSchema.parse(body)
    return {
      projectId,
      body: parsed,
      label: 'Aprovar a edição conferida',
      detail: 'Copy, visual e destino confirmados no pedido original.',
      result: approvedEditionSchema,
    }
  }
  if (parts.length === 4 && parts[3] === 'deliveries') {
    const parsed = createDeliverySchema.parse(body)
    return {
      projectId,
      body: parsed,
      label: parsed.sourcePublicationId ? 'Preparar repostagem' : 'Preparar entrega',
      detail: `Formato: ${parsed.format}. A preparação não agenda a publicação.`,
      result: deliverySchema,
    }
  }
  if (parts.length === 6 && parts[3] === 'deliveries') {
    idSchema.parse(parts[4])
    if (parts[5] === 'analysis') {
      const parsed = metricsAnalysisSchema.parse(body)
      return {
        projectId,
        body: parsed,
        label: 'Preparar análise de resultados',
        detail: parsed.objective,
        result: batchResultSchema,
      }
    }
    if (parts[5] === 'actions') {
      const parsed = deliveryActionSchema.parse(body)
      const labels = {
        schedule: 'Agendar entrega',
        cancel: 'Cancelar entrega',
        'mark-published': 'Registrar publicação manual',
        'link-external': 'Vincular post verificado',
        'reconcile-published': 'Conferir envio com resultado incerto',
        'cancel-local': 'Encerrar envio localmente',
      }
      const detail =
        parsed.action === 'schedule'
          ? `${parsed.publishMode === 'auto' ? 'Publicação automática' : 'Publicação manual'} em ${new Date(parsed.scheduledAt).toLocaleString('pt-BR')}.`
          : 'externalUrl' in parsed
            ? parsed.externalUrl
            : 'O post já existente na rede social não será removido.'
      return {
        projectId,
        body: parsed,
        label: labels[parsed.action],
        detail,
        result: deliverySchema,
      }
    }
  }
  throw new Error('Este tipo de pedido local não tem recuperação disponível nesta versão')
}
