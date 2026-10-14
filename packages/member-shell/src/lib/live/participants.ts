import type { LiveParticipation } from '@sistemazero/core/live'

export function orderedParticipants(participants: LiveParticipation[]) {
  const priority = (item: LiveParticipation) =>
    item.helpAt ? 0 : item.handAt ? 1 : item.admission === 'waiting' ? 2 : 3
  const requested = (item: LiveParticipation) =>
    Date.parse(item.helpAt ?? item.handAt ?? item.joinedAt)
  return [...participants].sort(
    (a, b) =>
      priority(a) - priority(b) ||
      requested(a) - requested(b) ||
      a.learnerId.localeCompare(b.learnerId),
  )
}

export function participantStatus(
  participant: LiveParticipation,
  serverTime: string,
  steps: { id: string; title: string }[],
) {
  const fresh =
    !!participant.activity &&
    Date.parse(serverTime) - Date.parse(participant.activity.reportedAt) < 15_000
  const present = Date.parse(serverTime) - Date.parse(participant.seenAt) < 15_000
  return {
    presence:
      participant.admission === 'waiting'
        ? 'Na recepção'
        : participant.admission === 'removed'
          ? 'Participação encerrada'
          : present
            ? 'Na sala'
            : 'Reconectando',
    step: fresh
      ? (steps.find((step) => step.id === participant.activity?.stepId)?.title ?? 'No Estúdio')
      : 'Aguardando atualização da etapa',
    save: fresh
      ? {
          'not-open': 'Estúdio ainda não abriu',
          saving: 'Guardando o projeto…',
          saved: 'Projeto guardado',
          offline: 'Rascunho aguardando recuperação',
        }[participant.activity!.saveState]
      : 'Salvamento sem atualização recente',
  }
}
