import type { PensaOperationStepResult, PensaOperationWork } from '@sistemazero/core/pensa'
import type { completePensaJson } from '../pensa-llm'
import type { PensaContext } from './context'
import { HelpReplySchema } from './contracts'
import { generatePensaReply } from './planning'

export async function answerPensaHelp(
  work: PensaOperationWork,
  context: PensaContext,
  complete: typeof completePensaJson,
  rejected: string | null = null,
): Promise<PensaOperationStepResult> {
  const requestedId = typeof work.input.missionId === 'string' ? work.input.missionId : null
  const currentId =
    requestedId ??
    (context.view.nextAction.type === 'mission' ? context.view.nextAction.missionId : null)
  const mission = context.view.revision?.plan.missions.find((item) => item.id === currentId) ?? null
  const availability = context.view.availability.find((item) => item.missionId === currentId)
  const reply = await generatePensaReply(
    HelpReplySchema,
    'pensa_help',
    `Ajude somente na dúvida atual, em até 150 palavras.
Esclareça objetivo, regras, resultado ou organização. Ajuda técnica localizada pode responder ao pedido expresso, sem produzir solução inteira nem transformar o plano em tutorial.
Indique somente aula/ajuda recebida com acesso confirmado. Não prometa tutor indisponível.
Se a criança travou outra vez, mude a abordagem. Quando faltar observação, peça uma observação concreta.
Uma missão atribuída a outra pessoa não deve ser assumida pela criança que perguntou.`,
    {
      request: work.input.message,
      definition: context.view.revision?.definition ?? context.view.draft?.definition ?? null,
      mission: mission
        ? {
            title: mission.title,
            objective: mission.objective,
            rules: mission.rules,
            checks: mission.checks,
            destination: mission.destination,
          }
        : null,
      availability: availability
        ? {
            available: availability.available,
            reason: availability.reason,
            message: availability.message,
          }
        : null,
      resources: context.capabilities.participants.find(
        (item) => item.profileId === work.actor.profileId,
      ),
      references: context.references.filter((item) => item.href),
      sources: context.sources.slice(0, 3),
      conversation: context.view.messages
        .filter((item) => item.kind === 'help' && item.missionId === currentId)
        .slice(-6)
        .map((item) => ({ role: item.role, text: item.text })),
    },
    complete,
    rejected,
  )
  const links = context.references
    .filter((item) => item.href && reply.referenceIds.includes(item.id))
    .slice(0, 2)
  return {
    type: 'answer',
    text: [
      reply.text,
      ...links.map(
        (item) =>
          `[${item.kind === 'lesson' ? 'Veja esta fase' : 'Veja esta ajuda'}: ${item.title}](${item.href})`,
      ),
    ].join('\n\n'),
  }
}
