/**
 * Os textos da aba Desempenho. Moram junto do painel, que só baixa quando a criança abre a aba:
 * no dicionário do editor eles entrariam no pacote de abertura do modo Blocos, que tem teto.
 * O rótulo da aba (`pro.dock.performance`) continua no dicionário, porque a aba aparece fechada.
 */
import type { Locale } from '../../core/i18n/translator'

export const PERFORMANCE_COPY: Record<Locale, Record<string, string>> = {
  'pt-BR': {
    'perf.start': 'Medir o desempenho',
    'perf.stop': 'Parar de medir',
    'perf.off':
      'Veja se o jogo está rodando liso. Ao medir, o jogo começa de novo e a medida segue enquanto a gaveta estiver aberta.',
    'perf.on':
      'Medindo há {seconds} segundos. Medir quase não pesa no jogo, e a medida para quando você fecha a gaveta.',
    'perf.notRunning': 'Rode o jogo para ver os números.',
    'perf.off.python':
      'Veja se o programa está rodando liso. A medida segue enquanto a gaveta estiver aberta.',
    'perf.on.python':
      'Medindo há {seconds} segundos. Medir não pesa no programa, e a medida para quando você fecha a gaveta.',
    'perf.notRunning.python': 'Rode o programa para ver os números.',
    'perf.refused': 'Ainda não dá para medir este programa aqui.',
    'perf.program': 'Tempo do programa',
    'perf.program.done': 'O programa levou {seconds} segundos.',
    'perf.program.running': 'O programa está rodando há {seconds} segundos.',
    'perf.program.none': 'Rode o programa para ver quanto tempo ele leva.',
    'perf.program.note':
      'Este programa não desenha na tela: o que dá para medir é o tempo que ele leva.',
    'perf.collecting': 'Medindo… os primeiros números chegam em meio segundo.',
    'perf.fps': 'Quadros por segundo',
    'perf.fps.unit': 'por segundo',
    'perf.fps.note': 'O jogo pede 60. Abaixo de 30, ele parece travado.',
    'perf.frame': 'Tempo de cada quadro',
    'perf.frame.note': 'Para ficar liso, cada quadro cabe em 16 ms.',
    'perf.sprites': 'Coisas no jogo',
    'perf.sprites.unit': 'sprites',
    'perf.sprites.note': 'desenhados no último quadro',
    'perf.sprites.none': 'Este tipo de jogo ainda não conta o que desenha.',
    'perf.objects': 'Objetos na cena',
    'perf.objects.unit': 'objetos',
    'perf.objects.note': 'modelos, peças e efeitos ligados agora',
    'perf.draws': 'Desenhos por quadro',
    'perf.draws.unit': 'desenhos',
    'perf.draws.note': 'quantas vezes a placa de vídeo desenhou no último quadro',
    'perf.memory': 'Memória do jogo',
    'perf.memory.note': 'Este navegador não mostra a memória de um jogo.',
    'perf.noReading': 'Sem leitura',
    'perf.measured': 'medido',
    'perf.unavailable': 'indisponível',
    'perf.history': 'Últimos {seconds} segundos',
    'perf.history.slices': 'cada barra é meio segundo',
    'perf.slow.none': 'o jogo não ficou lento.',
    'perf.slow.one': 'o jogo ficou lento 1 vez.',
    'perf.slow.many': 'o jogo ficou lento {count} vezes.',
    'perf.slowest': 'O quadro mais lento levou {ms} ms.',
    'perf.page': 'Esta página não tem quadros de jogo para medir.',
  },
  en: {
    'perf.start': 'Measure performance',
    'perf.stop': 'Stop measuring',
    'perf.off':
      'See whether the game runs smoothly. Measuring starts the game over and keeps going while the drawer is open.',
    'perf.on':
      'Measuring for {seconds} seconds. Measuring barely weighs on the game, and it stops when you close the drawer.',
    'perf.notRunning': 'Run the game to see the numbers.',
    'perf.off.python':
      'See whether the program runs smoothly. The measure goes on while the drawer is open.',
    'perf.on.python':
      'Measuring for {seconds} seconds. Measuring does not weigh on the program, and it stops when you close the drawer.',
    'perf.notRunning.python': 'Run the program to see the numbers.',
    'perf.refused': 'This program cannot be measured here yet.',
    'perf.program': 'Program time',
    'perf.program.done': 'The program took {seconds} seconds.',
    'perf.program.running': 'The program has been running for {seconds} seconds.',
    'perf.program.none': 'Run the program to see how long it takes.',
    'perf.program.note':
      'This program does not draw on the screen: what can be measured is how long it takes.',
    'perf.collecting': 'Measuring… the first numbers arrive in half a second.',
    'perf.fps': 'Frames per second',
    'perf.fps.unit': 'per second',
    'perf.fps.note': 'The game asks for 60. Below 30, it looks stuck.',
    'perf.frame': 'Time of each frame',
    'perf.frame.note': 'To look smooth, each frame fits in 16 ms.',
    'perf.sprites': 'Things in the game',
    'perf.sprites.unit': 'sprites',
    'perf.sprites.note': 'drawn in the last frame',
    'perf.sprites.none': "This kind of game doesn't count what it draws yet.",
    'perf.objects': 'Objects in the scene',
    'perf.objects.unit': 'objects',
    'perf.objects.note': 'models, pieces and effects turned on now',
    'perf.draws': 'Draws per frame',
    'perf.draws.unit': 'draws',
    'perf.draws.note': 'how many times the graphics card drew in the last frame',
    'perf.memory': 'Game memory',
    'perf.memory.note': "This browser doesn't show a game's memory.",
    'perf.noReading': 'No reading',
    'perf.measured': 'measured',
    'perf.unavailable': 'unavailable',
    'perf.history': 'Last {seconds} seconds',
    'perf.history.slices': 'each bar is half a second',
    'perf.slow.none': "the game didn't slow down.",
    'perf.slow.one': 'the game slowed down once.',
    'perf.slow.many': 'the game slowed down {count} times.',
    'perf.slowest': 'The slowest frame took {ms} ms.',
    'perf.page': 'This page has no game frames to measure.',
  },
}
