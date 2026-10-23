/**
 * Mensagens ESPECÍFICAS para os 409 do salvar curso (antes: toast genérico com a
 * mensagem crua do upstream). O `hint` diz à UI o que fazer além do toast:
 * `occupancy` → recarregar a ocupação das posições da jornada; `reload` → o curso
 * mudou em outra aba (reabrir o form sobre a versão fresca — NUNCA rebasear as
 * edições em silêncio, isso anularia a concorrência otimista); `showcase` → CTA
 * "abrir o conteúdo do curso" (a correção é adicionar a vitrine numa AULA).
 */
export interface CourseSaveError {
  message: string
  hint?: 'occupancy' | 'reload' | 'showcase' | 'slug'
}

export function courseSaveError(code: string, fallbackMessage: string): CourseSaveError {
  switch (code) {
    case 'CAREER_SLOT_CONFLICT':
      return {
        message:
          'Outro curso acabou de ocupar esta posição da Jornada. A lista de posições já foi atualizada: escolha outra.',
        hint: 'occupancy',
      }
    case 'CONCURRENCY_CONFLICT':
      return {
        message:
          'Este curso mudou em outra aba ou com outra pessoa. Feche e abra o formulário de novo para editar a versão mais nova.',
        hint: 'reload',
      }
    case 'DUPLICATE_SLUG':
      return { message: 'Outro curso já usa este endereço. Escolha outro.', hint: 'slug' }
    case 'NO_SHOWCASE_BLOCK':
      return {
        message:
          'Para publicar o curso de entrada, uma aula publicada precisa ter um Estúdio que deixa publicar no Mural dos Criadores. Sem isso, a criança não abre o resto da trilha.',
        hint: 'showcase',
      }
    default:
      return { message: fallbackMessage }
  }
}
