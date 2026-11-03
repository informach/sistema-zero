import { guia as cleanupNave } from '../cleanup'
import { guia as coordinatesNave } from '../coordinates'
import { guia as drawLoopNave } from '../draw-loop'
import { guia as gameStateNave } from '../game-state'
import { guia as layersNave } from '../layers'
import { guia as variableNave } from '../variable'
import { espelhoDoDino } from '../variante-dino'
import { guia as worldNave } from '../world'

/**
 * As cenas do Corre Dino em exploração livre que seguem a MESMA escolha de fala da Nave (02/11/2026):
 * `coordinates`, `world`, `draw-loop` e `layers` (Aulas 1 e 2), `cleanup` (Aula 6), `game-state`
 * (Aula 7) e `variable` (Aula 11). Só a IDEIA, com o Dino, os cactos e a floresta: nada de bloco,
 * área do Estúdio, regra, Se, então nem senão. Antes do teste, a fala pergunta e diz o que observar;
 * o resultado só vem na fala de DEPOIS dele. As comparações do fim são as dos roteiros do Dino (o
 * mapa do tesouro, o ator no camarim, o desenho animado, as figurinhas, a mochila, a chave da porta,
 * os gols contados de cabeça e o placar).
 *
 * ⚠️ Os rótulos citados são os das telas livres: as da Nave servem ao Dino (o elenco veste "o Dino")
 * em `coordinates`, `world`, `draw-loop` e `layers`; `cleanup`, `game-state` e `variable` têm tela do
 * Dino (`scene-livre/dino/`), com os mesmos botões e as palavras do Dino.
 */

export const COORDINATES_DINO_SPEECH = {
  'coordinates-dino-start':
    'O Dino está em x 110 e y 150. O que você acha que acontece se o x aumentar? Aumente só o x e observe para onde o Dino vai. Você também pode começar pelo y.',
  'coordinates-dino-y':
    'Um x maior levou o Dino para a direita. E o y? O que você acha que acontece se o y aumentar? Aumente só o y e observe o Dino.',
  'coordinates-dino-x':
    'Um y maior levou o Dino para baixo. E o x? Aumente só o x e observe para onde o Dino vai.',
  'coordinates-dino-origin-first':
    'Você levou o Dino para x 0 e y 0, o canto de cima, à esquerda. E se o x aumentar, para onde o Dino vai? Aumente só o x e observe.',
  'coordinates-dino-origin':
    'Um x maior levou o Dino para a direita, e um y maior, para baixo. E onde fica o x 0 com o y 0? Diminua o x e o y até 0 e observe em que canto o Dino fica.',
  'coordinates-dino-complete':
    'O x 0 com o y 0 é o canto de cima, à esquerda: é dali que o jogo começa a contar. O x conta da esquerda para a direita, e o y conta de cima para baixo, como num mapa do tesouro: tantos passos para o lado e tantos passos para baixo. Pode continuar escolhendo lugares.',
} as const

export const WORLD_DINO_SPEECH = {
  'world-dino-start':
    'Os bastidores e a tela do jogo estão vazios. O que você acha que acontece na tela quando o Dino passa a existir no jogo? Clique em Criar o Dino nos bastidores e compare os dois lados.',
  'world-dino-created':
    'O Dino passou a existir nos bastidores, com nome e lugar, e a tela do jogo continuou vazia: existir no jogo não é o mesmo que aparecer na tela. E para aparecer, o que muda? Clique em Mostrar o Dino na tela e compare os dois lados.',
  'world-dino-shown':
    'O mesmo Dino que já existia nos bastidores agora aparece na tela do jogo, no mesmo lugar. E se você tirar o Dino da tela, o Dino deixa de existir? Clique em Tirar o Dino da tela e observe os bastidores.',
  'world-dino-complete':
    'O Dino saiu da tela e continuou nos bastidores: existe no jogo mesmo sem aparecer, como um ator no camarim, que já chegou ao teatro e só aparece quando entra no palco. Pode mostrar e tirar o Dino da tela quantas vezes quiser.',
} as const

export const DRAW_LOOP_DINO_SPEECH = {
  'draw-loop-dino-start':
    'O Dino foi desenhado só no começo, e a tela não é apagada. O que você acha que acontece com a tela quando os quadros passam? Clique em Avançar 1 quadro e compare a tela com o x do Dino. Você também pode escolher outro jeito primeiro.',
  'draw-loop-dino-try-once':
    'Agora o Dino é desenhado só no começo, e a tela não é apagada. O que acontece com a tela quando os quadros passam? Clique em Avançar 1 quadro e compare a tela com o x do Dino.',
  'draw-loop-dino-frozen':
    'Os quadros passaram e o x do Dino mudou, mas a tela continuou igual: ninguém desenhou o Dino de novo. E se o Dino for desenhado em todo quadro? Escolha Desenhar em todo quadro e clique em Avançar 1 quadro algumas vezes.',
  'draw-loop-dino-frozen-erase':
    'Os quadros passaram e o x do Dino mudou, mas a tela continuou igual: ninguém desenhou o Dino de novo. Falta comparar mais um jeito: escolha Desenhar em todo quadro e Apagar a tela antes de desenhar, e clique em Avançar 1 quadro algumas vezes.',
  'draw-loop-dino-try-every':
    'Agora o Dino é desenhado em todo quadro, e a tela não é apagada. O que você acha que vai aparecer? Clique em Avançar 1 quadro algumas vezes e observe quantos Dinos ficam na tela.',
  'draw-loop-dino-trail':
    'O Dino foi desenhado em todo quadro, num lugar novo, e os desenhos velhos ficaram: a tela foi juntando Dinos. E se a tela for apagada antes de cada desenho? Escolha Apagar a tela antes de desenhar e clique em Avançar 1 quadro algumas vezes.',
  'draw-loop-dino-trail-once':
    'O Dino foi desenhado em todo quadro, e os desenhos velhos ficaram: a tela foi juntando Dinos. Falta comparar com o Dino desenhado só no começo: escolha Desenhar só no começo e clique em Avançar 1 quadro.',
  'draw-loop-dino-try-erase':
    'Agora, em todo quadro, a tela é apagada e o Dino é desenhado de novo. O que você acha que muda? Clique em Avançar 1 quadro algumas vezes e observe quantos Dinos ficam na tela.',
  'draw-loop-dino-moving-once':
    'Em todo quadro, a tela foi apagada e o Dino foi desenhado no lugar novo: um Dino só, andando. Falta comparar com o Dino desenhado só no começo: escolha Não apagar a tela e Desenhar só no começo, e clique em Avançar 1 quadro.',
  'draw-loop-dino-moving-trail':
    'Em todo quadro, a tela foi apagada e o Dino foi desenhado no lugar novo: um Dino só, andando. Falta comparar sem apagar: escolha Não apagar a tela e clique em Avançar 1 quadro algumas vezes.',
  'draw-loop-dino-try-clear':
    'Agora a tela vai ser apagada antes de cada quadro, e o Dino é desenhado só no começo. O que você acha que sobra na tela? Clique em Avançar 1 quadro e observe.',
  'draw-loop-dino-empty':
    'A tela ficou vazia: ela foi apagada, e ninguém desenhou o Dino de novo. Para o Dino voltar à tela, escolha Desenhar em todo quadro e clique em Avançar 1 quadro.',
  'draw-loop-dino-complete':
    'Para o Dino andar, em todo quadro o jogo apaga a tela e desenha o Dino de novo, no lugar novo, como um desenho animado feito com uma folha nova para cada imagem. Sem apagar, os desenhos velhos ficam; desenhando só no começo, a tela fica parada. Pode continuar trocando e comparando.',
} as const

export const LAYERS_DINO_SPEECH = {
  'layers-dino-start':
    'Só um pedacinho do Dino aparece. Agora a floresta é desenhada por último. O que você acha que acontece se o Dino for desenhado por último? Clique em Desenhar o Dino por último e observe a tela.',
  'layers-dino-front':
    'Com o Dino desenhado por último, o Dino apareceu inteiro, na frente da floresta. E se a floresta voltar a ser desenhada por último, o que acontece com o Dino? Clique em Desenhar a floresta por último e observe.',
  'layers-dino-covered':
    'Só a ordem mudou, e o Dino ficou escondido de novo: nada foi apagado. No jogo, o Dino precisa aparecer na frente da floresta. Clique em Desenhar o Dino por último e observe.',
  'layers-dino-complete':
    'Quem é desenhado por último fica na frente, como a última figurinha colada no álbum, que cobre a que já estava ali. Por isso, no jogo, a floresta é desenhada primeiro, e o Dino depois. Pode trocar a ordem quantas vezes quiser.',
} as const

export const CLEANUP_DINO_SPEECH = {
  'cleanup-dino-start':
    'Os cactos correm para a esquerda e saem pela borda da tela. Quando um cacto sai da tela, ele sai também do jogo? Clique em Passar 1 segundo até dois cactos saírem. Observe a tela, os bastidores e o número de cactos no grupo, que é a lista de cactos que o jogo guarda.',
  'cleanup-dino-on-first':
    'Agora o jogo tira quem sai da tela. O que você acha que acontece nos bastidores quando um cacto passa da borda da esquerda? Clique em Passar 1 segundo até dois cactos saírem e observe os bastidores e o número de cactos no grupo.',
  'cleanup-dino-stored':
    'Os cactos sumiram da tela, mas continuaram no grupo: o jogo ainda guarda e move cada um, mesmo sem ninguém ver, como o que fica esquecido no fundo da mochila. E se o jogo tirar do grupo quem sai da tela? Clique em Tirar do jogo quem sai da tela e, depois, em Passar 1 segundo até mais dois cactos saírem. Compare os bastidores.',
  'cleanup-dino-removed':
    'Tirando quem sai da tela, cada cacto que passou da borda da esquerda saiu do grupo e foi para os removidos. E sem isso, o que acontece com o cacto que sai da tela? Clique em Parar de tirar do jogo quem sai da tela e, depois, em Passar 1 segundo até dois cactos saírem. Observe os bastidores.',
  'cleanup-dino-complete':
    'Você comparou os dois jeitos. Sair da tela não tira o cacto do jogo: ele continua no grupo, e o jogo segue cuidando dele à toa. Quem tira é o próprio jogo, quando está combinado tirar os cactos que passam da borda. Assim, o grupo fica só com os cactos que ainda vêm pela pista. Pode continuar testando quando quiser.',
} as const

export const GAME_STATE_DINO_SPEECH = {
  'game-state-dino-start':
    'O Dino está na tela de início, e a partida ainda não começou. Os cactos já nascem agora? Clique em Deixar o tempo passar e observe o contador de cactos criados.',
  'game-state-dino-start-question':
    'A pergunta está ligada: a cada toque do relógio, o jogo pergunta se a partida já começou. Na tela de início, o que acontece com os cactos? Clique em Deixar o tempo passar, espere uns 3 segundos e observe o contador de cactos criados.',
  'game-state-dino-outside':
    'Sem a pergunta, os cactos nasceram na tela de início, antes de alguém jogar. E se, a cada toque do relógio, o jogo perguntar: a partida já começou? Clique em Ligar a pergunta e deixe o tempo passar uns 3 segundos na tela de início. Observe o contador.',
  'game-state-dino-waiting':
    'Na tela de início, a resposta foi não: o relógio tocou, e nenhum cacto nasceu. E quando a partida começar, qual vai ser a resposta? Clique em Começar a partida, deixe o tempo passar e observe o contador.',
  'game-state-dino-playing-first':
    'Jogando, a resposta foi sim: os cactos nasceram. E na tela de início, com a mesma pergunta ligada, o que acontece? Clique em Voltar à tela de início e deixe o tempo passar uns 3 segundos. Observe o contador.',
  'game-state-dino-without':
    'Com a pergunta ligada, a tela de início esperou, e a partida criou cactos. E sem a pergunta, o que acontece na tela de início? Clique em Desligar a pergunta e, se precisar, em Voltar à tela de início; depois, deixe o tempo passar. Observe o contador.',
  'game-state-dino-complete':
    'Você comparou os três casos. Sem a pergunta, os cactos nascem até na tela de início. Com a pergunta, a cada toque do relógio o jogo confere: se a partida já começou, a resposta é sim, e nasce um cacto; se ainda não começou, a resposta é não, e nada nasce. É como a porta que só abre com a chave certa, e aqui a chave é a partida ter começado. Pode continuar testando.',
} as const

export const VARIABLE_DINO_SPEECH = {
  'variable-dino-start':
    'Um jogo pode guardar um número sem mostrar para ninguém. Clique em Guardar o número 0 e observe duas coisas: a caixa pontos e a tela do jogo. O que aparece em cada uma?',
  'variable-dino-stored':
    'O número ficou guardado na caixa pontos, e a tela continuou sem número: guardar não é mostrar. E se o Dino ganhar um ponto agora, com o número fora da tela, o que acontece com pontos? Clique em Ganhar 1 ponto e compare a caixa com a tela.',
  'variable-dino-hide':
    'O número guardado está na tela. E se o número sair da tela, continua guardado e mudando? Clique em Tirar o número da tela, depois em Ganhar 1 ponto, e compare a caixa pontos com a tela.',
  'variable-dino-shown':
    'A tela mostrou o número que já estava guardado, como um recado para quem joga, e pontos continuou igual. E se o número sair da tela, continua mudando? Clique em Tirar o número da tela, depois em Ganhar 1 ponto, e compare a caixa pontos com a tela.',
  'variable-dino-shown-hidden':
    'A tela mostrou o número que já estava guardado, como um recado para quem joga, e pontos continuou igual. Agora o número está fora da tela. E se o Dino ganhar um ponto, pontos muda mesmo sem aparecer? Clique em Ganhar 1 ponto e compare a caixa com a tela.',
  'variable-dino-hidden':
    'Pontos mudou, e a tela nem ficou sabendo: o número guardado muda mesmo escondido. E quando a tela mostrar o número, qual vai aparecer? Clique em Mostrar o número na tela e compare com a caixa pontos.',
  'variable-dino-complete':
    'Você comparou guardar, mudar e mostrar. O jogo guarda o número na caixa pontos, e cada ponto ganho muda esse número, apareça ele ou não, como quem conta os gols de cabeça durante a partida: o número muda mesmo sem ninguém ver. Mostrar é como o placar, onde o número aparece para todo mundo: a tela lê o número guardado, sem mudar nada nele. Uma caixa que guarda um número se chama variável. Pode continuar testando.',
} as const

export const coordinates = espelhoDoDino('coordinates', coordinatesNave, COORDINATES_DINO_SPEECH)
export const world = espelhoDoDino('world', worldNave, WORLD_DINO_SPEECH)
export const drawLoop = espelhoDoDino('draw-loop', drawLoopNave, DRAW_LOOP_DINO_SPEECH)
export const layers = espelhoDoDino('layers', layersNave, LAYERS_DINO_SPEECH)
export const cleanup = espelhoDoDino('cleanup', cleanupNave, CLEANUP_DINO_SPEECH)
export const gameState = espelhoDoDino('game-state', gameStateNave, GAME_STATE_DINO_SPEECH)
export const variable = espelhoDoDino('variable', variableNave, VARIABLE_DINO_SPEECH)
