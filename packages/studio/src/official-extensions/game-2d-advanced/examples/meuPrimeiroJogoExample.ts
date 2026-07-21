import type { ExtensionExample } from '#extensions'

/**
 * Exemplo "Meu primeiro jogo" (R29): a MENOR coisa jogável — um personagem que
 * anda com as setas, fundo e nada mais. É a ponte entre "começar do zero" (vazio)
 * e os exemplos completos. Ensina a receita (preparar → criar → a cada quadro →
 * desenhar → começar) e que o jogo abre no MENU (clique Jogar). IR do parser (one-off).
 */
export const meuPrimeiroJogoExample: ExtensionExample = {
  name: 'Meu primeiro jogo',
  experience: 'demo',
  description:
    'O comecinho de tudo: um personagem que anda com as SETAS, e só. Clique em Jogar no menu para começar. É a base de QUALQUER jogo — a partir daqui, adicione o que quiser (inimigos, pontos, telas). Abra e mexa à vontade.',
  ir: {
    html: [],
    css: [],
    extensions: [
      {
        extensionId: 'game-2d-advanced',
      },
    ],
    version: 2,
    behavior: {
      start: [
        {
          type: 'gk:setup',
          w: { type: 'num', value: 800 },
          h: { type: 'num', value: 600 },
          bg: '#1e2a3a',
          accent: '#ffd166',
        },
        {
          type: 'gk:setScreenText',
          screen: 'menu',
          title: { type: 'str', value: 'Meu primeiro jogo' },
          text: { type: 'str', value: 'Use as SETAS para andar. Clique em Jogar para comecar!' },
          button: { type: 'str', value: 'Jogar' },
        },
        {
          type: 'gk:createCharacter',
          varName: 'heroi',
          image: '',
          w: { type: 'num', value: 48 },
          h: { type: 'num', value: 48 },
          speed: { type: 'num', value: 260 },
          color: '#4ade80',
        },
      ],
      events: [],
      loops: [
        {
          type: 'gk:onUpdate',
          dtName: 'dt',
          body: [
            { type: 'gk:moveWithKeys', charVar: 'heroi', dtVar: 'dt' },
            { type: 'gk:keepOnScreen', charVar: 'heroi' },
          ],
        },
        {
          type: 'gk:onDraw',
          ctxName: 'ctx',
          body: [
            { type: 'gk:drawBackground', color: '#1e2a3a', grid: true },
            { type: 'gk:drawCharacter', charVar: 'heroi' },
          ],
        },
      ],
    },
  },
}
