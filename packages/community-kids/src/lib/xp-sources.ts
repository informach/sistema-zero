/**
 * Quanto vale cada coisa no placar: os cartões do fim da página do Ranking.
 *
 * ⚠️ Os NÚMEROS são do servidor (`members/src/domain/gamification/gamification.ts`,
 * `XP_VALUES`), e o `tests/xp-conformance.test.ts` trava os dois juntos. O kids não
 * depende do members, então o valor mora aqui repetido e o teste lê o de lá pelo
 * caminho. A tela-modelo dizia "+20 XP" por aula, e a aula vale 10: número de placar
 * que não bate com o que a criança ganha é promessa quebrada.
 *
 * Entram as fontes que QUALQUER criança alcança (aula, quiz, baú) e, só para quem já
 * abre o Estúdio livre, o jogo publicado no Mural. Produto vendido à parte não aparece
 * como caminho para quem não o tem.
 */
export const XP_SOURCE_VALUES = {
  aula: 10,
  quiz: 20,
  quizBonusMax: 10,
  bau: 25,
  publicar: 25,
} as const

export type XpSourceId = 'aula' | 'publicar' | 'quiz' | 'bau'

export interface XpSource {
  id: XpSourceId
  xp: number
  label: string
  /** Uma linha miúda embaixo, quando o número sozinho engana. */
  detail?: string
}

export function xpSources({ canPublish }: { canPublish: boolean }): XpSource[] {
  const v = XP_SOURCE_VALUES
  return [
    { id: 'aula', xp: v.aula, label: 'Terminar uma aula' },
    ...(canPublish
      ? [
          {
            id: 'publicar' as const,
            xp: v.publicar,
            label: 'Publicar um jogo no Mural',
            // O servidor dá o XP do jogo publicado uma vez por dia: republicar no
            // mesmo dia não soma de novo.
            detail: 'Vale uma vez por dia.',
          },
        ]
      : []),
    {
      id: 'quiz',
      xp: v.quiz,
      label: 'Passar num quiz',
      detail: `A nota alta vale até +${v.quizBonusMax}.`,
    },
    {
      id: 'bau',
      xp: v.bau,
      label: 'Abrir o baú de uma unidade',
      detail: 'Ele abre quando você termina todas as aulas dela.',
    },
  ]
}
