/**
 * Os textos da CASCA da galeria no desenho das telas-modelo (11/09/2026): o cartão que abre a
 * grade e o cartão de fechamento da faixa lilás.
 *
 * Arquivo próprio pelo mesmo motivo do `sceneShellCopy.ts` e do `panelCopy.ts`: o `copy.ts`
 * passa de 1.800 linhas e é editado por mais de uma frente ao mesmo tempo.
 */
export const GALLERY_SHELL_COPY = {
  /**
   * O cartão amarelo que abre a grade. O nome é DIFERENTE do "Criar novo" do cabeçalho de
   * propósito: os e2e acham o botão do cabeçalho pelo nome, e o Playwright casa por PEDAÇO do
   * nome ("Criar novo" casaria com "Criar novo Comece…" e o clique acusaria dois botões).
   */
  newCardTitle: 'Nova criação',
  newCardHint: 'Um modelo, uma textura ou um céu.',
  /** O título do cartão lilás diz ONDE as criações estão. Nunca promete a nuvem que não há. */
  savedAccount: (count: number) =>
    count === 0
      ? 'Nenhuma criação na sua conta ainda'
      : count === 1
        ? '1 criação guardada na sua conta'
        : `${count} criações guardadas na sua conta`,
  savedDevice: (count: number) =>
    count === 0
      ? 'Nenhuma criação neste aparelho ainda'
      : count === 1
        ? '1 criação guardada neste aparelho'
        : `${count} criações guardadas neste aparelho`,
  savedHint:
    'Tudo é guardado sozinho enquanto você cria. Baixe tudo para ter uma cópia, e traga as criações de volta num aparelho novo.',
} as const
