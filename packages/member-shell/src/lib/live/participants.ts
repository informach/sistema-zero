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

/**
 * O que o cartão da criança diz à professora. `sections` são as partes da aula do encontro (ou,
 * numa turma antiga, as etapas do roteiro). Desde 14/10/2026 a criança relata a PARTE em que está
 * (`activity.sectionId`) e as partes que já concluiu (`completedSectionIds`, do progresso real da
 * aula): o cartão diz "Parte 2 · Título" e se ela já concluiu a parte em que a turma está.
 */
export function participantStatus(
  participant: LiveParticipation,
  serverTime: string,
  sections: { id: string; title: string }[],
  currentSectionId: string | null = null,
) {
  const activity = participant.activity
  const fresh = !!activity && Date.parse(serverTime) - Date.parse(activity.reportedAt) < 15_000
  const present = Date.parse(serverTime) - Date.parse(participant.seenAt) < 15_000
  const sectionIndex = activity?.sectionId
    ? sections.findIndex((section) => section.id === activity.sectionId)
    : -1
  const legacyStep = activity?.stepId
    ? sections.find((section) => section.id === activity.stepId)
    : undefined
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
      ? sectionIndex >= 0
        ? `Parte ${sectionIndex + 1} · ${sections[sectionIndex]!.title}`
        : (legacyStep?.title ?? (activity?.sectionId ? 'Parte ainda não informada' : 'No Estúdio'))
      : activity?.sectionId !== undefined
        ? 'Aguardando atualização da parte'
        : 'Aguardando atualização do passo',
    /**
     * Já concluiu a parte em que a turma está. A conclusão é durável (vem do progresso da aula),
     * então vale mesmo num relato que envelheceu.
     */
    done: Boolean(currentSectionId && activity?.completedSectionIds?.includes(currentSectionId)),
    save: fresh
      ? {
          'not-open': 'Estúdio ainda não abriu',
          saving: 'Guardando o projeto…',
          saved: 'Projeto guardado',
          offline: 'Rascunho aguardando recuperação',
        }[activity!.saveState]
      : 'Salvamento sem atualização recente',
  }
}
