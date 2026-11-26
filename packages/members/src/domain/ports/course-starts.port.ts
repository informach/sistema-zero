/**
 * "Começaram o curso do presente" (Admin › campanha, 25/11/2026): entre as contas pedidas, as que
 * começaram o curso. Começar = qualquer atividade nas aulas publicadas (navegação, partes, blocos,
 * tentativas, entregas, posição de vídeo, conclusões), de um perfil da conta ou da própria conta,
 * a mesma régua dos lembretes do curso. `null` = o curso não existe.
 */
export interface CourseStartsReader {
  startedAccounts(courseSlug: string, accountIds: string[]): Promise<string[] | null>
}
