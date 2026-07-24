/**
 * Mensagens ESPECÍFICAS para os 409 do salvar curso (antes: toast genérico com a
 * mensagem crua do upstream). O `hint` diz à UI o que fazer além do toast:
 * `occupancy` → recarregar a ocupação das posições da carreira; `reload` → o curso
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
          'Esta posição da carreira acabou de ser ocupada por outro curso. A ocupação foi recarregada — escolha outra posição.',
        hint: 'occupancy',
      }
    case 'CONCURRENCY_CONFLICT':
      return {
        message:
          'Este curso foi alterado em outra aba ou por outra pessoa. Feche e reabra o formulário para editar sobre a versão mais recente.',
        hint: 'reload',
      }
    case 'DUPLICATE_SLUG':
      return { message: 'Este slug já está em uso por outro curso — escolha outro.', hint: 'slug' }
    case 'NO_SHOWCASE_BLOCK':
      return {
        message:
          'O curso-base precisa de uma aula publicada com bloco de Estúdio com vitrine (Publicar no Mural) antes de ser publicado — sem ela o aluno nunca destrava a etapa.',
        hint: 'showcase',
      }
    default:
      return { message: fallbackMessage }
  }
}
