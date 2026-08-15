import type { CourseAudience } from '../course/course'

/** Uma conquista congelada: o que ESTE curso deu a ESTE aluno. */
export interface StudioBlockGrant {
  courseId: string
  blocks: string[]
}

/**
 * SNAPSHOT dos blocos que cada curso já entregou ao aluno.
 *
 * ⚠️ Existe por uma regra só: **bloco liberado não é revogado**. A paleta é a união dos
 * cursos elegíveis segundo a regra atual (bônus Kids: conclusão; demais: conclusão +
 * Mural), e essa união é calculada AO VIVO sobre o `metadata.studioUnlockBlocks` de cada
 * curso — o que faz um bloco ACRESCENTADO ao JSON chegar sozinho em quem já atende ao
 * critério (desejado), mas também faria um bloco REMOVIDO (ou um curso despublicado/
 * apagado) sumir da mão de quem já o tinha, inclusive de projetos que já o usam. O
 * snapshot é o piso que impede isso.
 *
 * É gravado na LEITURA, como UNIÃO com o que já estava lá (ver `GetStudioUnlocksService`):
 * o aluno nunca perde o que já lhe foi servido, e nada precisa de hook nos dois caminhos
 * de marco. Mesmo espírito do `xp_events.source_level`, que existe para o rank não
 * regredir quando um curso é re-nivelado.
 */
export interface StudioUnlockRepository {
  /** Conquistas congeladas do aluno na vitrine (vazio = nada congelado ainda). */
  listGrants(userId: string, audience: CourseAudience): Promise<StudioBlockGrant[]>
  /**
   * Congela (ou amplia) o que um curso deu ao aluno. O repositório garante uma UNIÃO
   * atômica com a linha existente, mesmo quando o chamador parte de uma leitura atrasada;
   * é idempotente por (aluno, vitrine, curso).
   */
  saveGrants(
    userId: string,
    audience: CourseAudience,
    grants: readonly StudioBlockGrant[],
  ): Promise<void>
}
