import type { SceneState } from '../state'
import type { GuiaLivre } from './tipos'

/**
 * A experiência `draw-loop` em exploração livre (Construtor, 02/11/2026): só a IDEIA ("desenhar só no
 * começo" × "desenhar em todo quadro", "apagar a tela antes de desenhar") e o convite à investigação.
 * Antes do teste, a fala pergunta e diz o que observar; o resultado só vem depois. As chaves das falas
 * começam com `draw-loop-`. Nada de nome de bloco (o "Limpar a tela" do Estúdio é "apagar a tela"
 * aqui), regra, Se, então nem senão.
 *
 * ⚠️ Os rótulos citados são os da tela livre (`scene-livre/draw-loop.tsx`): "Desenhar só no começo",
 * "Desenhar em todo quadro", "Não apagar a tela", "Apagar a tela antes de desenhar" e "Avançar 1
 * quadro". As falas são estáticas e falam da nave, o elenco da Primeira nave.
 */
const speech = {
  'draw-loop-start':
    'A nave foi desenhada só no começo, e a tela não é apagada. O que você acha que acontece com a tela quando os quadros passam? Clique em Avançar 1 quadro e compare a tela com o x da nave. Se preferir, escolha outro jeito primeiro.',
  'draw-loop-try-once':
    'Agora a nave é desenhada só no começo, e a tela não é apagada. O que acontece com a tela quando os quadros passam? Clique em Avançar 1 quadro e compare a tela com o x da nave.',
  'draw-loop-frozen':
    'Os quadros passaram e o x da nave mudou, mas a tela continuou igual: ninguém desenhou a nave de novo. E se a nave for desenhada em todo quadro? Escolha Desenhar em todo quadro e avance alguns quadros.',
  'draw-loop-frozen-erase':
    'Os quadros passaram e o x da nave mudou, mas a tela continuou igual: ninguém desenhou a nave de novo. Falta comparar mais um jeito: escolha Desenhar em todo quadro e Apagar a tela antes de desenhar, e avance alguns quadros.',
  'draw-loop-try-every':
    'Agora a nave é desenhada em todo quadro, e a tela não é apagada. O que você acha que vai aparecer? Clique em Avançar 1 quadro algumas vezes e observe quantas naves ficam na tela.',
  'draw-loop-trail':
    'A nave foi desenhada em todo quadro, num lugar novo, e os desenhos velhos ficaram: a tela foi juntando naves. E se a tela for apagada antes de cada desenho? Escolha Apagar a tela antes de desenhar e avance alguns quadros.',
  'draw-loop-trail-once':
    'A nave foi desenhada em todo quadro, e os desenhos velhos ficaram: a tela foi juntando naves. Falta comparar com a nave desenhada só no começo: escolha Desenhar só no começo e avance um quadro.',
  'draw-loop-try-erase':
    'Agora, em todo quadro, a tela é apagada e a nave é desenhada de novo. O que você acha que muda? Avance alguns quadros e observe quantas naves ficam na tela.',
  'draw-loop-moving-once':
    'Em todo quadro, a tela foi apagada e a nave foi desenhada no lugar novo: uma nave só, andando. Falta comparar com a nave desenhada só no começo: escolha Não apagar a tela e Desenhar só no começo, e avance um quadro.',
  'draw-loop-moving-trail':
    'Em todo quadro, a tela foi apagada e a nave foi desenhada no lugar novo: uma nave só, andando. Falta comparar sem apagar: escolha Não apagar a tela e avance alguns quadros.',
  'draw-loop-try-clear':
    'Agora a tela vai ser apagada antes de cada quadro, e a nave é desenhada só no começo. O que você acha que sobra na tela? Clique em Avançar 1 quadro e observe.',
  'draw-loop-empty':
    'A tela ficou vazia: ela foi apagada, e ninguém desenhou a nave de novo. Para a nave voltar à tela, escolha Desenhar em todo quadro e avance um quadro.',
  'draw-loop-complete':
    'Para a nave andar, em todo quadro o jogo apaga a tela e desenha a nave de novo, no lugar novo. Sem apagar, os desenhos velhos ficam; desenhando só no começo, a tela fica parada. Pode continuar trocando e comparando.',
} as const

export type FalaDoDesenho = keyof typeof speech

/**
 * Qual fala vale agora: a do jeito escolhido (as duas escolhas formam quatro jeitos). Antes de o
 * jeito de agora ser testado, a fala pergunta; depois, explica e propõe o próximo jeito que falta,
 * na ordem da história (parado, rastro, andando), pulando o que já foi visto.
 */
function guidance(state: SceneState, has: (meta: string) => boolean): FalaDoDesenho {
  const r = state.render
  const parada = has('frozen'),
    rastro = has('trail'),
    anda = has('moving')
  if (parada && rastro && anda) return 'draw-loop-complete'
  const vazia = r.drawn.length === 0
  if (!r.loop) {
    // Apagando sem desenhar de novo: a tela vazia é a resposta da pergunta "o que sobra?".
    if (r.erase) return vazia ? 'draw-loop-empty' : 'draw-loop-try-clear'
    if (vazia) return 'draw-loop-empty'
    if (!parada) return rastro || anda ? 'draw-loop-try-once' : 'draw-loop-start'
    return rastro ? 'draw-loop-frozen-erase' : 'draw-loop-frozen'
  }
  if (!r.erase) {
    if (!rastro) return 'draw-loop-try-every'
    return anda ? 'draw-loop-trail-once' : 'draw-loop-trail'
  }
  if (!anda) return 'draw-loop-try-erase'
  return parada ? 'draw-loop-moving-trail' : 'draw-loop-moving-once'
}

export const guia: GuiaLivre = { speech, guidance }
