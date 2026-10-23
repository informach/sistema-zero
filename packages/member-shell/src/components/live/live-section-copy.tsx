/**
 * As frases das partes conduzidas da sala ao vivo (14/10/2026). Moram em `components/live/`
 * porque é a única pasta em que a criança pode ler "professora" (guarda `copy-vocabulario` do
 * Kids): o `LessonSections` as importa daqui. Valem nos dois apps (a comunidade adulta também
 * diz "parte" na sala).
 */
export const LIVE_SECTION_COPY = {
  /** O aviso de quando a professora abre outra parte e a tela da criança vai junto. */
  turmaNaParte: (numero: number) => `A turma está na parte ${numero}`,
  /**
   * Ao lado do "Próxima parte" travado: quem conduz ainda não abriu a seguinte. Sem "a professora"
   * (pode ser um professor) e sem nome, porque o `LessonSections` não recebe quem conduz.
   */
  esperaAProfessora: 'A próxima parte abre já já',
  /** O interruptor da atividade ampliada que mostra e esconde a transmissão. */
  transmissao: 'Transmissão',
  /**
   * O título curto da barra do flutuante (cabe no degrau pequeno, 300px): "Ao vivo" no encontro
   * e "Gravação" depois dele, quando a gravação ocupa o lugar da transmissão.
   */
  aoVivo: 'Ao vivo',
  gravacao: 'Gravação',
} as const
