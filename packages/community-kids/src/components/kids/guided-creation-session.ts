export interface GuidedCreationIdentity {
  lessonId: string
  viewerId: string | null
}

// Estado de vista da aula, não dado do curso: precisa sobreviver à remontagem que
// o router.refresh() provoca depois do envio, mas um reload real pode começar no
// modo normal. A identidade inclui o perfil para irmãos não compartilharem a tela.
const activeGuidedLessons = new Set<string>()

function identityKey({ lessonId, viewerId }: GuidedCreationIdentity): string {
  return JSON.stringify([viewerId, lessonId])
}

export function isGuidedCreationActive(identity: GuidedCreationIdentity): boolean {
  return activeGuidedLessons.has(identityKey(identity))
}

export function setGuidedCreationActive(identity: GuidedCreationIdentity, active: boolean): void {
  const key = identityKey(identity)
  if (active) activeGuidedLessons.add(key)
  else activeGuidedLessons.delete(key)
}
