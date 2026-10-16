import {
  approvedEditionSchema,
  approveEditionSchema,
  batchResultSchema,
  createDeliverySchema,
  deliveryActionSchema,
  deliverySchema,
  idSchema,
  metricsAnalysisSchema,
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
