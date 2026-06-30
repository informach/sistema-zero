/**
 * Porta de PURGA de dados do aluno (exclusão de usuário pelo painel). Apaga tudo
 * que é keyado no aprendiz — progresso, quiz, Estúdio, gamificação, avatar, quarto,
 * certificados, classificações, matrículas. NÃO toca conteúdo (cursos/aulas) nem
 * `processed_webhooks`. Idempotente.
 */
export interface UserDataPurgeRepository {
  /**
   * Apaga as linhas onde `user_id ∈ userIds` OU (nas tabelas que têm) `account_id`
   * = `accountId`. `userIds` = a conta + os perfis (kids) sob ela; `accountId` = a
   * conta — cobre os dados kids keyados na conta responsável.
   */
  purgeForUser(params: { userIds: string[]; accountId: string }): Promise<void>
}
