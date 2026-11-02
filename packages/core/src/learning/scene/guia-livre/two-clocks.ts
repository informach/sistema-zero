import type { GuiaLivre } from './tipos'

/**
 * A experiência `two-clocks` em exploração livre (Construtor, 02/11/2026): só a IDEIA e o convite à
 * investigação. Antes do teste, a fala pergunta e diz o que observar; o resultado só vem depois.
 * As chaves das falas começam com `two-clocks-`.
 *
 * ⚠️ Exceção decidida pela responsável (02/11/2026): na Aula 7 do Meu Jeito o conceito é o dos dois
 * relógios, o do jogo (que faz nascer) e o da animação (que troca o desenho), então os dois aparecem pelo
 * nome; o convite à investigação vale igual.
 *
 * ⚠️⚠️ "Quadro" é SÓ o do jogo (o relógio de nascer conta quadros). O desenho da animação de cada pedra é
 * "desenho" ("desenho 1", "desenho 2", "desenhos por segundo"): com "quadro" para os dois, a criança não
 * separava os relógios, que é a ideia inteira da cena.
 *
 * A fala junta o que a criança ACABOU de descobrir (a última meta da lista dela) com a próxima que falta
 * (`two-clocks-<visto>-<pedido>`): quem testa em outra ordem é explicado e convidado do mesmo jeito.
 *
 * ⚠️ Os rótulos citados são os da tela livre (`scene-livre/two-clocks.tsx`): "A cada 20/40/80 quadros",
 * "2/8/16 desenhos por segundo", "Passar o tempo" e "Voltar ao começo".
 */
const VISTO = {
  each: 'Cada pedra nasceu mostrando o desenho 1: o giro dela começa na hora em que ela nasce.',
  more: 'Com o relógio de nascer em 20 quadros, nasceu mais pedra, e cada uma continuou girando no mesmo ritmo.',
  faster:
    'Com 16 desenhos por segundo, as pedras giraram mais rápido, e uma pedra continuou nascendo na mesma hora.',
} as const
const PEDIDO = {
  each: 'Deixe o tempo passar até nascerem três pedras e olhe o número em cima de cada uma na hora em que ela entra: qual desenho ela mostra? Clique em Passar o tempo.',
  more: 'E se só o relógio de nascer mudar, o que acontece com as pedras e com o giro de cada uma? Escolha A cada 20 quadros, deixe o giro em 8 desenhos por segundo, clique em Voltar ao começo e deixe o tempo passar.',
  faster:
    'E se só o giro mudar, o que acontece com o giro e com a hora de nascer? Escolha 16 desenhos por segundo, deixe o nascer em A cada 40 quadros, clique em Voltar ao começo e deixe o tempo passar.',
} as const
type Caso = keyof typeof VISTO
/** A ordem sugerida: o relógio de fábrica primeiro (cada pedra no desenho 1), depois um relógio de cada vez. */
const CASOS: Caso[] = ['each', 'more', 'faster']
const META: Record<Caso, string> = { each: 'each-one', more: 'more-rocks', faster: 'faster-spin' }

const speech: Record<string, string> = {
  'two-clocks-start': `Aqui há dois relógios: um faz nascer uma pedra a cada tantos quadros do jogo, e o outro troca o desenho de cada pedra. ${PEDIDO.each}`,
  'two-clocks-complete':
    'Você comparou tudo. São dois relógios: o do jogo conta quadros e faz nascer as pedras; o da animação troca o desenho de cada pedra. Mudar um não muda o outro. E cada pedra começa o giro dela no desenho 1, na hora em que nasce.',
}
for (const visto of CASOS)
  for (const pedido of CASOS)
    if (visto !== pedido)
      speech[`two-clocks-${visto}-${pedido}`] = `${VISTO[visto]} ${PEDIDO[pedido]}`

export const guia: GuiaLivre = {
  speech,
  guidance: (state, has, activity) => {
    const alvo = activity.setup?.goals
    const feito = (id: string) => has(id) || (!!alvo && !alvo.includes(id))
    const falta = CASOS.find((c) => !feito(META[c]))
    if (falta === undefined) return 'two-clocks-complete'
    // A última descoberta da criança entre as três é a que a fala explica.
    const ultima = [...state.evidence.discoveries]
      .reverse()
      .map((id) => CASOS.find((c) => META[c] === id))
      .find((c) => c !== undefined)
    return ultima ? `two-clocks-${ultima}-${falta}` : 'two-clocks-start'
  },
}
