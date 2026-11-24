import type { PintaRecoveryHelpReport } from '@sistemazero/core/creations/pinta-recovery-help'

/**
 * Ajuda do Pinta (23/11/2026): o "Preciso de ajuda" do aviso de recuperação da galeria abre (ou
 * continua) UMA conversa de recados do perfil, sem aula. O pedido só identifica a recuperação: o
 * perfil (o armazenamento local do Pinta), cada edição guardada com os desenhos dela e a hora.
 * Nenhum byte viaja; os arquivos ficam no aparelho.
 */
export const PINTA_RECOVERY_HELP_TITLE = 'Ajuda do Pinta: recuperação de desenhos'
/** A âncora da conversa: uma por perfil (o índice único de recados deduplica por ela). */
export const PINTA_RECOVERY_HELP_REF = 'pinta:retained-recovery'

/** O nome do desenho entra no recado cortado aqui (o pedido aceita o nome inteiro do Pinta). */
const NAME_IN_BODY = 60

const WHEN = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  dateStyle: 'short',
  timeStyle: 'short',
})

function clip(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean
}

/** O recado que a equipe lê: o assunto na primeira linha e os dados da recuperação, em texto. */
export function pintaRecoveryHelpBody(report: PintaRecoveryHelpReport): string {
  const operations = report.operations.map(({ opId, drawings }, index) => {
    const listed = drawings.map(({ id, name }) => {
      const label = name ? clip(name, NAME_IN_BODY) : ''
      return label ? `${label} (${id})` : `${id} (sem nome)`
    })
    return `${index + 1}. Edição ${opId}: ${listed.length ? listed.join(', ') : 'sem desenhos'}`
  })
  return [
    PINTA_RECOVERY_HELP_TITLE,
    'Pedido pelo aviso de recuperação da galeria. As edições continuam guardadas no aparelho.',
    `Perfil no aparelho: ${report.profile}`,
    `Pedido em: ${WHEN.format(new Date(report.requestedAt))} (${report.requestedAt})`,
    `Edições guardadas (${report.operations.length}):`,
    ...operations,
  ].join('\n')
}
