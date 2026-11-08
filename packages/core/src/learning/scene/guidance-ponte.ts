import type { SceneState } from './state'

/**
 * As falas do Zappy na experiência do Poder "A ponte apressada" (timed-bridge), Faísca.
 *
 * ⭐ 08/11/2026 (proposta "Experiências do Faísca", aprovada): falas curtas (no máximo 12
 * palavras), uma coisa por vez, na língua da tela nova: o personagem ANDA até a alavanca e até a
 * ponte, o relógio do jogo anda sozinho, e onde ele começa é uma peça que se troca ("quando puxa a
 * alavanca" ou "quando a partida começa"). Nada de bloco, regra, então, senão nem o nome
 * `ponteAberta`: o caderninho diz "A ponte está aberta?", e o nome fica para a montagem.
 *
 * `-idea` e `-bridge` são a ideia e o "No seu jogo:" do cartão dourado do fim.
 */
export const PONTE_SPEECH = {
  'bridge-start': 'A ponte leva ao sino. Ande até ela!',
  'bridge-closed': 'Levantada! Ande até a alavanca.',
  'bridge-hurry': 'Baixou! Corra até a ponte antes do 4.',
  'bridge-wait': 'Baixou! Espere o relógio chegar a 4.',
  'bridge-rose': 'Subiu sozinha! Saia e volte à alavanca.',
  'bridge-place': 'E se o relógio começar com a partida?',
  'bridge-free': 'Ande, puxe e compare o relógio.',
  'bridge-crossed': 'O sino tocou! E se esperar o relógio chegar a 4?',
  'bridge-crossed-again': 'O sino tocou! Toque em Jogar de novo e teste mais.',
  'bridge-clock-start': 'Agora o relógio conta desde o primeiro passo. Ande!',
  'bridge-clock-running': 'O relógio já está contando! Vá até a alavanca.',
  'bridge-clock-lowered': 'Baixou! Olhe o relógio da partida.',
  'bridge-clock-wait': 'O relógio acabou. Espere: a ponte sobe?',
  'bridge-clock-again': 'O relógio acabou. Saia e volte à alavanca.',
  'bridge-clock-back': 'Troque a peça de volta e compare os dois relógios.',
  'bridge-idea':
    'A alavanca baixa a ponte e começa o relógio. Depois de 4 segundos, o jogo sobe a ponte sozinho. Se o relógio começa com a partida, ele conta uma vez só.',
  'bridge-bridge':
    'No seu jogo: a alavanca vai baixar a ponte e, depois de 4 segundos, o jogo vai levantar a ponte de novo.',
  'bridge-complete': 'A alavanca baixa a ponte. Depois de 4, ela sobe.',
} as const

export const PONTE_GOALS = [
  'closed-start',
  'lever-opens',
  'in-time',
  'rises-alone',
  'pull-again',
  'timer-place',
] as const

/**
 * Qual fala vale agora, na ordem que a criança escolher.
 *
 * `rodando` é o relógio da partida já andando: na tela ele começa no PRIMEIRO PASSO do personagem
 * (decisão dela, 08/11/2026). Sem a tela (o servidor, o Admin), vale o que o estado já diz: algum
 * segundo passou.
 */
export function ponteGuidance(
  state: SceneState,
  has: (id: string) => boolean,
  tela: { rodando?: boolean } = {},
): keyof typeof PONTE_SPEECH {
  const b = state.bridge
  const rodando = tela.rodando ?? b.clock > 0
  const contando = b.timers.length > 0
  if (PONTE_GOALS.every(has)) return 'bridge-complete'
  if (b.at === 'stone') return has('rises-alone') ? 'bridge-crossed-again' : 'bridge-crossed'
  // Com o relógio da partida, a fala acompanha o relógio que já conta desde o primeiro passo.
  if (b.place === 'start') {
    if (!rodando) return 'bridge-clock-start'
    if (contando) return b.ponteAberta ? 'bridge-clock-lowered' : 'bridge-clock-running'
    if (b.ponteAberta) return has('timer-place') ? 'bridge-clock-back' : 'bridge-clock-wait'
    return 'bridge-clock-again'
  }
  if (!has('closed-start') && b.pulls === 0) return 'bridge-start'
  if (!has('lever-opens')) return 'bridge-closed'
  if (b.ponteAberta && contando) return has('in-time') ? 'bridge-wait' : 'bridge-hurry'
  if (!b.ponteAberta && b.rises > 0 && !has('pull-again')) return 'bridge-rose'
  if (!has('timer-place')) return 'bridge-place'
  return 'bridge-free'
}
