import type { GuiaLivre } from './tipos'

/**
 * A experiência `sheet-vs-sprite` em exploração livre (Construtor, 02/11/2026): só a IDEIA e o convite à
 * investigação. Antes do teste, a fala pergunta e diz o que observar; o resultado só vem depois.
 * As chaves das falas começam com `sheet-vs-sprite-`.
 *
 * ⚠️ Exceção decidida pela responsável (02/11/2026): na Aula 6 do Meu Jeito o conceito É o recorte da folha
 * × o tamanho do sprite, então "recorte", "folha" e "quadro da folha" ficam; o convite à investigação vale
 * igual.
 *
 * A fala junta o que a criança ACABOU de ver (a largura de agora, já testada) com a próxima largura que
 * falta (`sheet-vs-sprite-<visto>-<pedido>`): quem testa em outra ordem é explicado e convidado do mesmo
 * jeito. Os recortes vêm antes do tamanho no jogo, que só abre com uma nave inteira à vista.
 *
 * ⚠️ Os rótulos citados são os da tela livre (`scene-livre/sheet-vs-sprite.tsx`): "Recorte de 16", "de 32"
 * e "de 64", "Bem menor" e "Bem maior".
 */
const VISTO = {
  64: 'Com 64, o jogo mostrou a folha inteira: as duas naves espremidas num quadrado só.',
  16: 'Com 16, o jogo mostrou só metade de uma nave, esticada.',
  32: 'Com 32, o jogo mostrou uma nave inteira: o recorte pegou um quadro da folha.',
} as const
const PEDIDO = {
  64: 'E se o recorte pegar a folha inteira, com 64, o que aparece no jogo? Escolha Recorte de 64 e observe o jogo.',
  16: 'E com um recorte menor, de 16, o que aparece no jogo? Escolha Recorte de 16 e observe o jogo.',
  32: 'E com 32, a largura de um quadro da folha, o que aparece no jogo? Escolha Recorte de 32 e observe o jogo.',
} as const
type Largura = keyof typeof VISTO
/** A ordem sugerida: a folha inteira, meia nave e, por último, o recorte de um quadro. */
const LARGURAS: Largura[] = [64, 16, 32]
const META: Record<Largura, string> = { 64: 'squeezed', 16: 'crop-half', 32: 'crop-whole' }

const speech: Record<string, string> = {
  'sheet-vs-sprite-size':
    'Você viu os três recortes, e só um deles mostra uma nave inteira. Agora, o tamanho da nave no jogo muda a folha? Com o Recorte de 32, deixe a nave do jogo bem maior ou bem menor e observe a folha.',
  'sheet-vs-sprite-complete':
    'Você comparou tudo. O recorte precisa ter o tamanho de UM quadro da folha: com 32, uma nave inteira; com 64, as duas espremidas; com 16, meia nave. O tamanho no jogo é outra escolha: a nave do jogo cresce ou encolhe, e a folha continua igual.',
}
const ABERTURA =
  'A folha da nave tem 64 de largura e 32 de altura, com dois quadros lado a lado. O jogo mostra só o pedaço da folha que o recorte pega, esticado no quadrado da nave.'
for (const pedido of LARGURAS)
  speech[`sheet-vs-sprite-start-${pedido}`] = `${ABERTURA} ${PEDIDO[pedido]}`
for (const visto of LARGURAS)
  for (const pedido of LARGURAS)
    if (visto !== pedido)
      speech[`sheet-vs-sprite-${visto}-${pedido}`] = `${VISTO[visto]} ${PEDIDO[pedido]}`

export const guia: GuiaLivre = {
  speech,
  guidance: (state, has, activity) => {
    const alvo = activity.setup?.goals
    const feito = (id: string) => has(id) || (!!alvo && !alvo.includes(id))
    const falta = LARGURAS.find((w) => !feito(META[w]))
    if (falta === undefined)
      return feito('size-apart') ? 'sheet-vs-sprite-complete' : 'sheet-vs-sprite-size'
    const { loaded, width } = state.sheet
    const agora = LARGURAS.find((w) => w === width)
    // A largura de agora só é explicada quando a criança a viu no jogo (e é outra que a pedida).
    if (!loaded || agora === undefined || agora === falta || !has(META[agora]))
      return `sheet-vs-sprite-start-${falta}`
    return `sheet-vs-sprite-${agora}-${falta}`
  },
}
